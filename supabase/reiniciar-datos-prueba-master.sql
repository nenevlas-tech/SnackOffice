-- SnackOffice: RPC temporal para reiniciar datos durante pruebas.
-- Ejecutar este archivo una vez en Supabase SQL Editor para instalar la función.
-- Instalar la función NO borra datos. El borrado solo ocurre desde el botón MASTER.
-- IMPORTANTE: elimina TODAS las transacciones de las tablas indicadas; no usar después de iniciar operación real.

CREATE OR REPLACE FUNCTION public.reiniciar_datos_prueba_master(p_confirmacion text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol text;
    v_promociones bigint := 0;
    v_movimientos bigint := 0;
    v_ventas bigint := 0;
    v_jornadas bigint := 0;
    v_idempotencias bigint := 0;
BEGIN
    SELECT UPPER(rol)
      INTO v_rol
      FROM public.profiles
     WHERE id = auth.uid()
       AND COALESCE(activo, true) = true
     LIMIT 1;

    IF auth.uid() IS NULL OR v_rol IS DISTINCT FROM 'MASTER' THEN
        RAISE EXCEPTION 'Acción permitida únicamente para un usuario MASTER activo.'
            USING ERRCODE = '42501';
    END IF;

    IF p_confirmacion IS DISTINCT FROM 'REINICIAR DATOS DE PRUEBA' THEN
        RAISE EXCEPTION 'Confirmación inválida. No se realizaron cambios.'
            USING ERRCODE = '42501';
    END IF;

    -- Una sola transacción: si cualquier sentencia falla, Postgres revierte todo.
    DELETE FROM public.promociones;
    GET DIAGNOSTICS v_promociones = ROW_COUNT;

    DELETE FROM public.movimientos_cxc;
    GET DIAGNOSTICS v_movimientos = ROW_COUNT;

    DELETE FROM public.ventas;
    GET DIAGNOSTICS v_ventas = ROW_COUNT;

    DELETE FROM public.jornadas;
    GET DIAGNOSTICS v_jornadas = ROW_COUNT;

    -- Esta tabla guarda claves de idempotencia para operaciones transaccionales.
    DELETE FROM public.snackoffice_operaciones_idempotentes;
    GET DIAGNOSTICS v_idempotencias = ROW_COUNT;

    RETURN jsonb_build_object(
        'promociones_eliminadas', v_promociones,
        'movimientos_cxc_eliminados', v_movimientos,
        'ventas_eliminadas', v_ventas,
        'jornadas_eliminadas', v_jornadas,
        'idempotencias_eliminadas', v_idempotencias,
        'clientes_conservados', true,
        'productos_conservados', true,
        'stock_conservado_sin_reposicion', true,
        'perfiles_conservados', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reiniciar_datos_prueba_master(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reiniciar_datos_prueba_master(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reiniciar_datos_prueba_master(text) TO authenticated;
