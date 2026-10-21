-- SnackOffice: eliminación segura de productos solo para MASTER y ADMIN activos.
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- No elimina ningún producto por sí mismo; solo instala la función autorizada.

CREATE OR REPLACE FUNCTION public.eliminar_producto_autorizado(p_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rol text;
    v_id text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para eliminar productos.'
            USING ERRCODE = '42501';
    END IF;

    SELECT UPPER(BTRIM(rol))
      INTO v_rol
      FROM public.profiles
     WHERE id = auth.uid()
       AND COALESCE(activo, false) = true
     LIMIT 1;

    IF v_rol IS NULL OR v_rol NOT IN ('MASTER', 'ADMIN') THEN
        RAISE EXCEPTION 'Solo un usuario MASTER o ADMIN activo puede eliminar productos.'
            USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.productos
     WHERE id::text = BTRIM(p_id)
     RETURNING id::text INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró el producto solicitado.'
            USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_build_object(
        'eliminado', true,
        'producto_id', v_id
    );
END;
$$;

-- El borrado directo no se concede a los usuarios del navegador.
REVOKE DELETE ON TABLE public.productos FROM PUBLIC, anon, authenticated;

-- Solo las sesiones autenticadas pueden invocar la función; la función valida el rol.
REVOKE ALL ON FUNCTION public.eliminar_producto_autorizado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_producto_autorizado(text) TO authenticated;
