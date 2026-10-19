-- SnackOffice: persistir el detalle de promociones aplicadas a cada venta.
-- Ejecutar una sola vez en Supabase antes de instalar la versión actualizada
-- de registrar_venta_atomica.sql. No modifica ventas existentes.

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS promocion_tipo text NOT NULL DEFAULT 'NINGUNA',
  ADD COLUMN IF NOT EXISTS promocion_id uuid NULL,
  ADD COLUMN IF NOT EXISTS promocion_descuento numeric(12,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ventas.promocion_tipo IS 'Tipo de promoción validada por la función registrar_venta_atomica.';
COMMENT ON COLUMN public.ventas.promocion_id IS 'Identificador de la configuración de promoción aplicada, cuando exista.';
COMMENT ON COLUMN public.ventas.promocion_descuento IS 'Descuento promocional validado en servidor.';
