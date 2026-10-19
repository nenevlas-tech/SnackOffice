# Validación de entrega SnackOffice — 2026-10-19

## Prueba 1 — Integridad estática
- 13 archivos JavaScript pasan `node --check`.
- 62 IDs HTML; no se encontraron duplicados.
- Las referencias locales de HTML y los 24 imports relativos de JavaScript apuntan a archivos existentes.
- Las 39 rutas definidas en el mapa local de imágenes existen.
- El ZIP v3 pasó `unzip -t` sin errores.

## Prueba 2 — Cálculos de promociones aislados
- 2×1 con precios mixtos: descuento $15.00, total $20.00.
- 3×2 con precios mixtos: descuento $10.00, total $50.00.
- Precio promocional: el descuento solo considera productos participantes; total de prueba $22.00.
- Promoción coincidente más reciente: se conserva la regla aprobada por el dueño.

## Prueba 3 — Protecciones de venta y abonos
- Cantidades fraccionarias, cero o negativas se rechazan antes de confirmar y antes de sincronizar inventario.
- Hay bloqueo de doble clic durante el registro de venta.
- La RPC de abonos exige clave de idempotencia, la clave es única y se rechaza su reutilización con datos diferentes.

## Alcance y pendientes
Estas pruebas son estáticas y de lógica aislada. No se creó ninguna venta ni abono real, no se ejecutaron migraciones y no se modificaron datos de Supabase. Queda pendiente una prueba integral controlada de registro de venta, inventario, pagos y abonos contra un entorno de pruebas, así como confirmar el despliegue/URL de acceso del cliente.
