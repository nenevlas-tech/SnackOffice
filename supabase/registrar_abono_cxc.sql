-- SnackOffice: registra un abono y lo distribuye entre las deudas más antiguas del cliente.
-- Ejecutar en Supabase SQL Editor. La operación completa es transaccional.
-- Esta versión añade idempotencia: cada intento lógico debe conservar la misma clave UUID.

create table if not exists public.snackoffice_operaciones_idempotentes (
    idempotency_key uuid primary key,
    operation_type text not null,
    actor_id uuid not null,
    payload jsonb not null,
    result jsonb,
    created_at timestamptz not null default now()
);

revoke all on table public.snackoffice_operaciones_idempotentes from public, anon, authenticated;

create or replace function public.registrar_abono_cxc(
    p_venta_id bigint,
    p_monto numeric,
    p_metodo_pago text,
    p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_cliente text;
    v_clave_cliente text;
    v_venta record;
    v_restante numeric(12,2);
    v_aplicado numeric(12,2);
    v_saldo_despues numeric(12,2);
    v_favor_actual numeric(12,2);
    v_favor_generado numeric(12,2) := 0;
    v_total_aplicado numeric(12,2) := 0;
    v_deuda_cubierta numeric(12,2) := 0;
    v_target_encontrado boolean := false;
    v_aplicaciones jsonb := '[]'::jsonb;
    v_rol text;
    v_payload jsonb;
    v_result jsonb;
    v_inserted integer;
begin
    select upper(rol) into v_rol
      from public.profiles
     where id = auth.uid() and coalesce(activo, true) = true
     limit 1;

    if auth.uid() is null or v_rol is null or v_rol not in ('MASTER', 'ADMIN', 'VENTAS') then
        raise exception 'Se requiere un perfil activo MASTER, ADMIN o VENTAS.'
            using errcode = '42501';
    end if;

    if p_idempotency_key is null then
        raise exception 'Falta la clave de idempotencia del abono.' using errcode = '22023';
    end if;

    v_payload := jsonb_build_object(
        'venta_id', p_venta_id,
        'monto', round(p_monto, 2),
        'metodo_pago', lower(btrim(coalesce(p_metodo_pago, '')))
    );

    insert into public.snackoffice_operaciones_idempotentes
        (idempotency_key, operation_type, actor_id, payload)
    values
        (p_idempotency_key, 'ABONO_CXC', auth.uid(), v_payload)
    on conflict (idempotency_key) do nothing;

    get diagnostics v_inserted = row_count;

    if v_inserted = 0 then
        select payload, result
          into v_payload, v_result
          from public.snackoffice_operaciones_idempotentes
         where idempotency_key = p_idempotency_key
           and operation_type = 'ABONO_CXC'
           and actor_id = auth.uid();

        if not found then
            raise exception 'La clave de idempotencia ya pertenece a otra operación o usuario.' using errcode = '23505';
        end if;

        if v_payload <> jsonb_build_object(
            'venta_id', p_venta_id,
            'monto', round(p_monto, 2),
            'metodo_pago', lower(btrim(coalesce(p_metodo_pago, '')))
        ) then
            raise exception 'La clave de idempotencia ya fue usada con datos diferentes.' using errcode = '22023';
        end if;

        if v_result is null then
            raise exception 'La operación previa sigue sin resultado; actualiza y verifica antes de reintentar.' using errcode = '55000';
        end if;

        return v_result;
    end if;

    if p_metodo_pago is null or btrim(p_metodo_pago) = '' then
        raise exception 'Selecciona un método de pago válido.';
    end if;

    if p_monto is null or round(p_monto, 2) <= 0 then
        raise exception 'El monto del abono debe ser mayor que cero.';
    end if;

    select cliente
      into v_cliente
      from public.ventas
     where id = p_venta_id;

    if not found then
        raise exception 'No se encontró la venta seleccionada.';
    end if;

    v_clave_cliente := lower(regexp_replace(btrim(coalesce(v_cliente, '')), '\s+', ' ', 'g'));
    if v_clave_cliente = '' or v_clave_cliente = 'publico general' or v_clave_cliente = 'público general' then
        raise exception 'La cuenta no tiene un cliente válido asociado.';
    end if;

    v_restante := round(p_monto, 2);

    -- Se bloquean todas las ventas del cliente en orden estable para evitar
    -- que dos abonos concurrentes apliquen el mismo saldo simultáneamente.
    for v_venta in
        select id, cliente, fecha,
               coalesce(saldo, 0)::numeric(12,2) as saldo,
               coalesce(saldo_favor, 0)::numeric(12,2) as saldo_favor
          from public.ventas
         where lower(regexp_replace(btrim(coalesce(cliente, '')), '\s+', ' ', 'g')) = v_clave_cliente
         order by fecha asc, id asc
         for update
    loop
        if v_venta.id = p_venta_id and v_venta.saldo > 0 then
            v_target_encontrado := true;
        end if;

        if v_restante <= 0 then
            continue;
        end if;
        if v_venta.saldo <= 0 then
            continue;
        end if;

        v_aplicado := least(v_restante, v_venta.saldo);
        v_saldo_despues := round(v_venta.saldo - v_aplicado, 2);

        update public.ventas
           set abonado = round(coalesce(abonado, 0) + v_aplicado, 2),
               saldo = v_saldo_despues,
               estado_pago = case
                   when v_saldo_despues > 0 then 'Pendiente'
                   when coalesce(saldo_favor, 0) > 0 then 'Saldo a favor'
                   else 'Pagado'
               end
         where id = v_venta.id;

        insert into public.movimientos_cxc (
            venta_id, cliente, tipo, fecha, importe, metodo_pago,
            saldo_despues, saldo_favor_despues
        ) values (
            v_venta.id, v_venta.cliente, 'ABONO', now(), v_aplicado,
            coalesce(nullif(btrim(p_metodo_pago), ''), 'Efectivo'),
            v_saldo_despues, v_venta.saldo_favor
        );

        v_aplicaciones := v_aplicaciones || jsonb_build_array(jsonb_build_object(
            'venta_id', v_venta.id,
            'importe_aplicado', v_aplicado,
            'saldo_despues', v_saldo_despues
        ));
        v_total_aplicado := round(v_total_aplicado + v_aplicado, 2);
        v_deuda_cubierta := round(v_deuda_cubierta + v_aplicado, 2);
        v_restante := round(v_restante - v_aplicado, 2);
    end loop;

    if not v_target_encontrado then
        raise exception 'La cuenta seleccionada ya no tiene saldo pendiente. Actualiza el módulo e inténtalo nuevamente.';
    end if;

    -- Si sobra dinero después de cubrir las deudas, se conserva como saldo a favor
    -- en la venta desde la que se inició el abono, siguiendo el modelo actual de la app.
    if v_restante > 0 then
        select coalesce(saldo, 0), coalesce(saldo_favor, 0)
          into v_saldo_despues, v_favor_actual
          from public.ventas
         where id = p_venta_id;

        update public.ventas
           set saldo_favor = round(coalesce(saldo_favor, 0) + v_restante, 2),
               estado_pago = case when coalesce(saldo, 0) > 0 then 'Pendiente' else 'Saldo a favor' end
         where id = p_venta_id
         returning saldo_favor into v_favor_actual;

        insert into public.movimientos_cxc (
            venta_id, cliente, tipo, fecha, importe, metodo_pago,
            saldo_despues, saldo_favor_despues
        ) values (
            p_venta_id, v_cliente, 'SALDO_FAVOR', now(), v_restante,
            coalesce(nullif(btrim(p_metodo_pago), ''), 'Efectivo'),
            v_saldo_despues, v_favor_actual
        );

        v_favor_generado := v_restante;
        v_restante := 0;
    end if;

    -- Registrar el dinero realmente recibido una sola vez. Los movimientos ABONO
    -- y SALDO_FAVOR anteriores son el desglose contable de esta recepción, no cobros nuevos.
    insert into public.movimientos_cxc (
        venta_id, cliente, tipo, fecha, importe, metodo_pago,
        saldo_despues, saldo_favor_despues
    )
    select
        p_venta_id,
        v_cliente,
        'COBRO_CXC',
        now(),
        round(p_monto, 2),
        coalesce(nullif(btrim(p_metodo_pago), ''), 'Efectivo'),
        coalesce(v.saldo, 0),
        coalesce(v.saldo_favor, 0)
    from public.ventas v
    where v.id = p_venta_id;

    v_result := jsonb_build_object(
        'ok', true,
        'cliente', v_cliente,
        'monto_recibido', round(p_monto, 2),
        'total_aplicado', v_total_aplicado,
        'deuda_cubierta', v_deuda_cubierta,
        'saldo_favor_generado', v_favor_generado,
        'aplicaciones', v_aplicaciones,
        'idempotency_key', p_idempotency_key
    );

    update public.snackoffice_operaciones_idempotentes
       set result = v_result
     where idempotency_key = p_idempotency_key;

    return v_result;
end;
$$;

revoke all on function public.registrar_abono_cxc(bigint, numeric, text, uuid) from public;
revoke all on function public.registrar_abono_cxc(bigint, numeric, text, uuid) from anon;
grant execute on function public.registrar_abono_cxc(bigint, numeric, text, uuid) to authenticated;
-- Retira la firma antigua para impedir que clientes desactualizados evadan la clave obligatoria.
revoke all on function public.registrar_abono_cxc(bigint, numeric, text) from public, anon, authenticated;
