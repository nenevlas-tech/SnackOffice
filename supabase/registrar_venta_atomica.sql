-- SnackOffice: registra una venta, descuenta inventario y aplica saldo a favor
-- dentro de una sola transacción PostgreSQL.
-- Revisar en un entorno de pruebas antes de habilitar en producción.

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS promocion_tipo text NOT NULL DEFAULT 'NINGUNA',
  ADD COLUMN IF NOT EXISTS promocion_id uuid NULL,
  ADD COLUMN IF NOT EXISTS promocion_descuento numeric(12,2) NOT NULL DEFAULT 0;

create or replace function public.registrar_venta_atomica(p_venta jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_id bigint;
    v_cliente text;
    v_cliente_clave text;
    v_total numeric(12,2);
    v_saldo_favor_solicitado numeric(12,2);
    v_favor_disponible numeric(12,2) := 0;
    v_favor_restante numeric(12,2);
    v_favor_usado numeric(12,2);
    v_linea jsonb;
    v_producto record;
    v_solicitud record;
    v_cuenta record;
    v_saldo_favor_cuenta numeric(12,2);
    v_saldo_cuenta numeric(12,2);
    v_venta_insertada record;
    v_productos jsonb;
    v_productos_validados jsonb := '[]'::jsonb;
    v_total_calculado numeric(12,2) := 0;
    v_total_regular numeric(12,2) := 0;
    v_descuento_promocion numeric(12,2) := 0;
    v_descuento_detalle numeric(12,2) := 0;
    v_unidades_total integer := 0;
    v_unidades_gratis integer := 0;
    v_promocion_tipo text := 'NINGUNA';
    v_descuento_linea numeric(12,2) := 0;
    v_total_cobrado numeric(12,2) := 0;
    v_saldo_pendiente numeric(12,2) := 0;
    v_abonado numeric(12,2) := 0;
    v_saldo_favor_resultante numeric(12,2) := 0;
    v_desglose_total numeric(12,2) := 0;
    v_rol text;
    v_promocion_id uuid;
    v_promocion_productos jsonb := '[]'::jsonb;
    v_precio_promocional numeric(12,2);
    v_unidades_elegibles integer := 0;
begin
    select upper(rol) into v_rol
      from public.profiles
     where id = auth.uid() and coalesce(activo, true) = true
     limit 1;

    if auth.uid() is null or v_rol is null or v_rol not in ('MASTER', 'ADMIN', 'VENTAS') then
        raise exception 'Se requiere un perfil activo MASTER, ADMIN o VENTAS.'
            using errcode = '42501';
    end if;

    if p_venta is null or jsonb_typeof(p_venta) <> 'object' then
        raise exception 'Datos de venta inválidos.';
    end if;

    v_id := (p_venta->>'id')::bigint;
    v_cliente := coalesce(nullif(btrim(p_venta->>'cliente'), ''), 'Público general');
    v_cliente_clave := lower(regexp_replace(btrim(v_cliente), '\s+', ' ', 'g'));
    v_total := round((p_venta->>'total')::numeric, 2);
    v_total_cobrado := round(coalesce((p_venta->>'total_cobrado')::numeric, 0), 2);
    v_saldo_pendiente := round(coalesce((p_venta->>'saldo')::numeric, 0), 2);
    v_abonado := round(coalesce((p_venta->>'abonado')::numeric, 0), 2);
    v_saldo_favor_resultante := round(coalesce((p_venta->>'saldo_favor')::numeric, 0), 2);
    v_saldo_favor_solicitado := round(coalesce((p_venta->>'saldo_favor_aplicado')::numeric, 0), 2);
    v_productos := p_venta->'productos';

    if v_id is null or v_total is null or v_total <= 0 then
        raise exception 'La venta requiere identificador e importe válido.';
    end if;
    if jsonb_typeof(v_productos) <> 'array' or jsonb_array_length(v_productos) = 0 then
        raise exception 'La venta no contiene productos.';
    end if;
    if v_saldo_favor_solicitado < 0 or v_total_cobrado < 0 or v_saldo_pendiente < 0 or v_abonado < 0 or v_saldo_favor_resultante < 0 then
        raise exception 'Los importes de pago, saldo y saldo a favor no pueden ser negativos.';
    end if;
    if v_saldo_favor_resultante <> 0 then
        raise exception 'Una venta nueva no puede generar saldo a favor. Registra los excedentes mediante abonos CxC.';
    end if;
    if exists (select 1 from public.ventas where id = v_id) then
        raise exception 'La venta con identificador % ya existe. Actualiza la pantalla antes de intentar otra vez.', v_id;
    end if;

    -- Bloqueo de inventario en orden estable para evitar ventas concurrentes
    -- que consuman las mismas unidades.
    if exists (
        select 1 from jsonb_array_elements(v_productos) x(value)
         where coalesce(value->>'id', '') = ''
            or coalesce((value->>'cantidad')::integer, 0) <= 0
            or coalesce((value->>'cantidad')::numeric, 0) <> trunc(coalesce((value->>'cantidad')::numeric, 0))
    ) then
        raise exception 'Una línea de producto no tiene identificador o cantidad válida.';
    end if;

    for v_solicitud in
        select value->>'id' as id, sum((value->>'cantidad')::integer)::integer as cantidad,
               max(value->>'nombre') as nombre
          from jsonb_array_elements(v_productos) x(value)
         group by value->>'id'
         order by value->>'id'
    loop
        select id, nombre, stock
          into v_producto
          from public.productos
         where id = v_solicitud.id
         for update;

        if not found then
            raise exception 'No se encontró el producto %.', coalesce(v_solicitud.nombre, v_solicitud.id);
        end if;

        if coalesce(v_producto.stock, 0) < v_solicitud.cantidad then
            raise exception 'Stock insuficiente para %. Disponible: %.', v_producto.nombre, coalesce(v_producto.stock, 0);
        end if;
    end loop;

    -- La promoción solo puede venir de una configuración activa creada por ADMIN/MASTER.
    -- Las unidades gratis se eligen entre los productos incluidos, de menor a mayor precio.
    v_promocion_id := nullif(p_venta->>'promocion_id','')::uuid;
    v_promocion_tipo := 'NINGUNA';
    v_promocion_productos := '[]'::jsonb;
    v_precio_promocional := null;
    if v_promocion_id is not null then
        select tipo, producto_ids, precio_promocional
          into v_promocion_tipo, v_promocion_productos, v_precio_promocional
          from public.promociones_configuracion
         where id = v_promocion_id and activa = true;
        if not found then
            raise exception 'La promoción seleccionada ya no está activa. Actualiza la pantalla antes de registrar la venta.';
        end if;
        if v_promocion_tipo not in ('2x1','3x2','4x3','PRECIO_PROMO') then
            raise exception 'La configuración de promoción no es válida.';
        end if;
    end if;

    select coalesce(sum((x.value->>'cantidad')::integer),0)::integer
      into v_unidades_total
      from jsonb_array_elements(v_productos) x(value)
     where v_promocion_id is not null
       and exists (select 1 from jsonb_array_elements_text(v_promocion_productos) ids(id) where ids.id = x.value->>'id');
    v_unidades_elegibles := v_unidades_total;

    case v_promocion_tipo
      when 'NINGUNA' then v_unidades_gratis := 0;
      when '2x1' then v_unidades_gratis := floor(v_unidades_elegibles::numeric / 2)::integer;
      when '3x2' then v_unidades_gratis := floor(v_unidades_elegibles::numeric / 3)::integer;
      when '4x3' then v_unidades_gratis := floor(v_unidades_elegibles::numeric / 4)::integer;
      when 'PRECIO_PROMO' then v_unidades_gratis := 0;
      else raise exception 'Tipo de promoción de venta no válido.';
    end case;

    if v_promocion_tipo in ('2x1','3x2','4x3') then
        select coalesce(sum(precio),0)::numeric(12,2)
          into v_descuento_promocion
          from (
            select pr.precio::numeric as precio
              from jsonb_array_elements(v_productos) x(value)
              join public.productos pr on pr.id::text = x.value->>'id'
             cross join lateral generate_series(1, (x.value->>'cantidad')::integer) unidad
             where exists (select 1 from jsonb_array_elements_text(v_promocion_productos) ids(id) where ids.id = x.value->>'id')
             order by pr.precio asc, pr.id asc
             limit v_unidades_gratis
          ) unidades_gratis;
    elsif v_promocion_tipo = 'PRECIO_PROMO' and v_unidades_elegibles > 0 then
        if v_precio_promocional is null or v_precio_promocional <= 0 then
            raise exception 'La promoción de precio no tiene un importe válido.';
        end if;
        select coalesce(sum(pr.precio::numeric * (x.value->>'cantidad')::integer),0)::numeric(12,2)
          into v_total_regular
          from jsonb_array_elements(v_productos) x(value)
          join public.productos pr on pr.id::text = x.value->>'id'
         where exists (select 1 from jsonb_array_elements_text(v_promocion_productos) ids(id) where ids.id = x.value->>'id');
        v_descuento_promocion := greatest(0, round(v_total_regular - v_precio_promocional,2));
        v_total_regular := 0;
    else
        v_descuento_promocion := 0;
    end if;

    -- Recalcular cada línea con precio/costo central. No confiar en importes del navegador.
    for v_linea in select value from jsonb_array_elements(v_productos)
    loop
        select id, nombre, precio, costo
          into v_producto
          from public.productos
         where id = v_linea->>'id';

        if not found then
            raise exception 'No se encontró el producto %.', coalesce(v_linea->>'nombre', v_linea->>'id');
        end if;
        if coalesce((v_linea->>'cantidad')::integer, 0) <= 0 then
            raise exception 'La cantidad debe ser un entero positivo.';
        end if;
        v_total_regular := round(v_total_regular + (v_producto.precio::numeric * (v_linea->>'cantidad')::integer), 2);
        v_descuento_linea := round(coalesce((v_linea->>'descuento_promocion')::numeric,0),2);
        if v_descuento_linea < 0 or v_descuento_linea > (v_producto.precio::numeric * (v_linea->>'cantidad')::integer) then
            raise exception 'El descuento indicado para % no es válido.', v_producto.nombre;
        end if;
        if v_descuento_linea > 0 and (v_promocion_id is null or not exists (
            select 1 from jsonb_array_elements_text(v_promocion_productos) ids(id) where ids.id = v_producto.id::text
        )) then
            raise exception 'El producto % no pertenece a la promoción activa seleccionada.', v_producto.nombre;
        end if;
        v_descuento_detalle := round(v_descuento_detalle + v_descuento_linea,2);
        v_productos_validados := v_productos_validados || jsonb_build_array(
            jsonb_build_object(
                'id', v_producto.id,
                'nombre', v_producto.nombre,
                'precio', v_producto.precio,
                'costo', coalesce(v_producto.costo, 0),
                'cantidad', (v_linea->>'cantidad')::integer,
                'subtotal', round(v_producto.precio::numeric * (v_linea->>'cantidad')::integer - v_descuento_linea, 2),
                'descuento_promocion', v_descuento_linea,
                'promocion_tipo', v_promocion_tipo
            )
        );
    end loop;

    if round(v_descuento_detalle,2) <> round(v_descuento_promocion,2) then
        raise exception 'El descuento de promoción enviado (%) no coincide con el calculado en servidor (%). Actualiza el carrito.', v_descuento_detalle, v_descuento_promocion;
    end if;
    v_total_calculado := round(v_total_regular - v_descuento_promocion,2);
    if v_total_calculado <= 0 or v_total_calculado <> v_total then
        raise exception 'El total enviado (%) no coincide con el total calculado con precios centrales y promoción (%). Actualiza el carrito.', v_total, v_total_calculado;
    end if;

    if round(v_total_cobrado + v_saldo_favor_solicitado + v_saldo_pendiente, 2) <> v_total then
        raise exception 'El desglose financiero no coincide con el total de la venta.';
    end if;
    if round(v_abonado, 2) <> round(v_total_cobrado + v_saldo_favor_solicitado, 2) then
        raise exception 'El importe abonado no coincide con el dinero recibido y el saldo a favor aplicado.';
    end if;
    if v_saldo_pendiente > 0 and coalesce(p_venta->>'estado_pago', '') <> 'Pendiente' then
        raise exception 'Una venta con saldo pendiente debe tener estado Pendiente.';
    end if;
    if v_saldo_pendiente = 0 and coalesce(p_venta->>'estado_pago', '') = 'Pendiente' then
        raise exception 'Una venta sin saldo pendiente no puede tener estado Pendiente.';
    end if;

    if jsonb_typeof(coalesce(p_venta->'desglose_pago', '[]'::jsonb)) <> 'array' then
        raise exception 'El desglose de pago debe ser una lista.';
    end if;
    select coalesce(sum(round((x.value->>'importe')::numeric, 2)), 0)::numeric(12,2)
      into v_desglose_total
      from jsonb_array_elements(coalesce(p_venta->'desglose_pago', '[]'::jsonb)) x(value);
    if v_desglose_total <> v_total then
        raise exception 'El desglose de pago (%) no coincide con el total de venta (%).', v_desglose_total, v_total;
    end if;

    -- Bloquear las cuentas del cliente y validar saldo a favor central.
    if v_saldo_favor_solicitado > 0 then
        if v_cliente_clave in ('', 'publico general', 'público general') then
            raise exception 'Solo se puede aplicar saldo a favor a un cliente identificado.';
        end if;

        perform 1
          from public.ventas
         where lower(regexp_replace(btrim(coalesce(cliente, '')), '\s+', ' ', 'g')) = v_cliente_clave
         order by fecha, id
         for update;

        select coalesce(sum(saldo_favor), 0)::numeric(12,2)
          into v_favor_disponible
          from public.ventas
         where lower(regexp_replace(btrim(coalesce(cliente, '')), '\s+', ' ', 'g')) = v_cliente_clave;

        if v_favor_disponible < v_saldo_favor_solicitado then
            raise exception 'El saldo a favor cambió. Disponible: %, solicitado: %. Actualiza la pantalla e inténtalo nuevamente.', v_favor_disponible, v_saldo_favor_solicitado;
        end if;
    end if;

    -- Descontar el stock ya validado dentro de la misma transacción.
    for v_solicitud in
        select value->>'id' as id, sum((value->>'cantidad')::integer)::integer as cantidad
          from jsonb_array_elements(v_productos) x(value)
         group by value->>'id'
         order by value->>'id'
    loop
        update public.productos
           set stock = stock - v_solicitud.cantidad
         where id = v_solicitud.id;
    end loop;

    insert into public.ventas (
        id, folio, fecha, cliente, metodo_pago, desglose_pago,
        saldo_favor_aplicado, total_cobrado, total, estado_pago,
        abonado, saldo, saldo_favor, productos, jornada_id,
        promocion_tipo, promocion_id, promocion_descuento
    ) values (
        v_id,
        coalesce(p_venta->>'folio', v_id::text),
        coalesce((p_venta->>'fecha')::timestamptz, now()),
        v_cliente,
        p_venta->>'metodo_pago',
        coalesce(p_venta->'desglose_pago', '[]'::jsonb),
        v_saldo_favor_solicitado,
        coalesce((p_venta->>'total_cobrado')::numeric, 0),
        v_total,
        coalesce(p_venta->>'estado_pago', 'Pagado'),
        coalesce((p_venta->>'abonado')::numeric, 0),
        coalesce((p_venta->>'saldo')::numeric, 0),
        coalesce((p_venta->>'saldo_favor')::numeric, 0),
        v_productos_validados,
        p_venta->>'jornada_id',
        v_promocion_tipo,
        v_promocion_id,
        v_descuento_promocion
    ) returning * into v_venta_insertada;

    -- Consumir saldo a favor de las cuentas más antiguas. Cada uso queda
    -- vinculado a la cuenta de origen y se confirma junto con la nueva venta.
    v_favor_restante := v_saldo_favor_solicitado;
    if v_favor_restante > 0 then
        for v_cuenta in
            select id, cliente, saldo, saldo_favor, fecha
              from public.ventas
             where id <> v_id
               and lower(regexp_replace(btrim(coalesce(cliente, '')), '\s+', ' ', 'g')) = v_cliente_clave
               and coalesce(saldo_favor, 0) > 0
             order by fecha, id
             for update
        loop
            exit when v_favor_restante <= 0;
            v_favor_usado := least(v_favor_restante, coalesce(v_cuenta.saldo_favor, 0));
            v_saldo_favor_cuenta := round(coalesce(v_cuenta.saldo_favor, 0) - v_favor_usado, 2);
            v_saldo_cuenta := coalesce(v_cuenta.saldo, 0);

            update public.ventas
               set saldo_favor = v_saldo_favor_cuenta,
                   estado_pago = case when coalesce(saldo, 0) > 0 then 'Pendiente'
                                      when v_saldo_favor_cuenta > 0 then 'Saldo a favor'
                                      else 'Pagado' end
             where id = v_cuenta.id;

            insert into public.movimientos_cxc (
                venta_id, cliente, tipo, fecha, importe, metodo_pago,
                saldo_despues, saldo_favor_despues
            ) values (
                v_cuenta.id, v_cuenta.cliente, 'USO_SALDO_FAVOR', now(),
                v_favor_usado, 'Saldo a favor', v_saldo_cuenta, v_saldo_favor_cuenta
            );

            v_favor_restante := round(v_favor_restante - v_favor_usado, 2);
        end loop;
    end if;

    -- Registrar la creación de la deuda en la misma transacción.
    if coalesce((p_venta->>'saldo')::numeric, 0) > 0 then
        insert into public.movimientos_cxc (
            venta_id, cliente, tipo, fecha, importe, metodo_pago,
            saldo_despues, saldo_favor_despues
        ) values (
            v_id, v_cliente, 'VENTA', now(),
            (p_venta->>'saldo')::numeric, 'Pendiente',
            (p_venta->>'saldo')::numeric, 0
        );
    end if;

    return jsonb_build_object('ok', true, 'venta_id', v_id, 'folio', p_venta->>'folio',
                              'stock_actualizado', true,
                              'saldo_favor_aplicado', v_saldo_favor_solicitado);
end;
$$;

revoke all on function public.registrar_venta_atomica(jsonb) from public;
revoke all on function public.registrar_venta_atomica(jsonb) from anon;
grant execute on function public.registrar_venta_atomica(jsonb) to authenticated;
