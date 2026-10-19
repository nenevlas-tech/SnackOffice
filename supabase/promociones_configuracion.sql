-- SnackOffice: promociones configurables. Esta migración NO descuenta inventario.
-- Revisar y aplicar manualmente en un entorno de pruebas antes de producción.

CREATE TABLE IF NOT EXISTS public.promociones_configuracion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 100),
  tipo text NOT NULL CHECK (tipo IN ('2x1','3x2','4x3','PRECIO_PROMO')),
  producto_ids jsonb NOT NULL CHECK (jsonb_typeof(producto_ids) = 'array' AND jsonb_array_length(producto_ids) > 0),
  precio_promocional numeric(12,2),
  activa boolean NOT NULL DEFAULT true,
  creada_por uuid,
  actualizada_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promociones_config_precio_check CHECK ((tipo <> 'PRECIO_PROMO') OR (precio_promocional IS NOT NULL AND precio_promocional > 0))
);

ALTER TABLE public.promociones_configuracion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.promociones_configuracion FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.promociones_configuracion TO authenticated;
DROP POLICY IF EXISTS promociones_config_select_authenticated ON public.promociones_configuracion;
CREATE POLICY promociones_config_select_authenticated ON public.promociones_configuracion
FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.guardar_configuracion_promocion(
  p_id uuid,
  p_nombre text,
  p_tipo text,
  p_producto_ids jsonb,
  p_precio_promocional numeric DEFAULT NULL,
  p_activa boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rol text; v_id uuid;
BEGIN
  SELECT upper(rol) INTO v_rol FROM public.profiles
   WHERE id = auth.uid() AND coalesce(activo,true)=true LIMIT 1;
  IF auth.uid() IS NULL OR v_rol NOT IN ('MASTER','ADMIN') THEN
    RAISE EXCEPTION 'Solo ADMIN o MASTER puede configurar promociones.' USING ERRCODE='42501';
  END IF;
  IF p_nombre IS NULL OR length(btrim(p_nombre)) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'El nombre debe tener entre 1 y 100 caracteres.'; END IF;
  IF p_tipo NOT IN ('2x1','3x2','4x3','PRECIO_PROMO') THEN RAISE EXCEPTION 'Tipo de promoción no válido.'; END IF;
  IF jsonb_typeof(p_producto_ids) <> 'array' OR jsonb_array_length(p_producto_ids)=0 THEN RAISE EXCEPTION 'Selecciona al menos un producto.'; END IF;
  IF p_tipo='PRECIO_PROMO' AND (p_precio_promocional IS NULL OR p_precio_promocional<=0) THEN RAISE EXCEPTION 'El precio promocional debe ser mayor a cero.'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_producto_ids) x(id) WHERE NOT EXISTS (SELECT 1 FROM public.productos pr WHERE pr.id::text=x.id)) THEN
    RAISE EXCEPTION 'La promoción incluye un producto que no existe en el catálogo.';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.promociones_configuracion(nombre,tipo,producto_ids,precio_promocional,activa,creada_por,actualizada_por)
    VALUES (btrim(p_nombre),p_tipo,p_producto_ids,CASE WHEN p_tipo='PRECIO_PROMO' THEN p_precio_promocional ELSE NULL END,coalesce(p_activa,true),auth.uid(),auth.uid()) RETURNING id INTO v_id;
  ELSE
    UPDATE public.promociones_configuracion SET nombre=btrim(p_nombre),tipo=p_tipo,producto_ids=p_producto_ids,
      precio_promocional=CASE WHEN p_tipo='PRECIO_PROMO' THEN p_precio_promocional ELSE NULL END,
      activa=coalesce(p_activa,true),actualizada_por=auth.uid(),updated_at=now()
     WHERE id=p_id RETURNING id INTO v_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'No se encontró la promoción que deseas editar.'; END IF;
  END IF;
  RETURN jsonb_build_object('id',v_id,'guardada',true,'inventario_modificado',false,'venta_generada',false,'comision_generada',false);
END; $$;

REVOKE ALL ON FUNCTION public.guardar_configuracion_promocion(uuid,text,text,jsonb,numeric,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_configuracion_promocion(uuid,text,text,jsonb,numeric,boolean) TO authenticated;
