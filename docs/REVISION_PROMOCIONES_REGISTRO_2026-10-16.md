# Revisión de registro de promociones — 16/10/2026

## Hallazgo corregido en el cliente
La función `registrar_venta_atomica` valida `p_venta->>'promocion_id'` contra `public.promociones_configuracion`, pero `guardarVentaEnSupabase()` no enviaba `promocion_id` en el objeto RPC. Esto podía hacer que el servidor rechazara una venta con descuento, aunque el carrito mostrara el total correcto.

Se agregó `promocion_id` al payload enviado a `registrar_venta_atomica`, manteniendo también `promocion_tipo` y `promocion_descuento`.

## Estado
- Corrección local aplicada a `js/ventas.js`.
- No se ejecutó SQL en Supabase.
- No se registró ninguna venta.
- No se validó el SQL contra un servidor PostgreSQL ni contra la base real.
- Antes de registrar ventas en producción, hay que confirmar que la función instalada en Supabase corresponde a `supabase/registrar_venta_atomica.sql` y que la migración `supabase/promociones_configuracion.sql` se aplicó correctamente.
