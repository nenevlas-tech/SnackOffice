# Lote de correcciones: navegación, promociones y catálogo de clientes

## Cambios locales
- La navegación de Ventas se conecta antes de consultar Supabase, y cada consulta inicial tiene manejo de error independiente para evitar que un fallo remoto deje sin eventos a Nueva venta, Historial o Clientes.
- Se retiró el acceso independiente a Promociones del menú de Ventas. La selección 2x1, 3x2 y 4x3 vive dentro de Nueva venta y actualiza la regla, unidades gratis, descuento y total.
- El cálculo del descuento considera grupos completos; unidades sobrantes se cobran a precio normal. Las unidades sin cargo se asignan a los artículos de menor precio.
- La función SQL local `registrar_venta_atomica` recalcula el descuento con precios centrales y valida que coincida con el detalle enviado antes de guardar la venta.
- En el módulo de administración, el texto de la regla cambia al seleccionar 2x1, 3x2, 4x3 o precio promocional.
- Se agregó una lista de referencia de 52 clientes desde `LISTA.xlsx` para el autocompletado de ventas mientras el catálogo central esté vacío/no disponible.
- Se generaron `docs/LISTA_CLIENTES_IMPORTACION.csv` y `supabase/importar_clientes_lista.sql` para cargar el listado al catálogo central. El SQL no se ha ejecutado.
- Se actualizaron los identificadores de versión de módulos para evitar que el navegador reutilice las versiones anteriores en caché.

## Pendiente antes de pruebas funcionales
1. Revisar visualmente la navegación y la tarjeta de promoción en el navegador.
2. Aplicar/revisar en un entorno de pruebas la versión local de `supabase/registrar_venta_atomica.sql` antes de probar ventas con promoción. No se ejecutó SQL en la base real.
3. Importar la lista a `public.clientes` con el SQL incluido, previa revisión y autorización, para que el catálogo quede centralizado en Supabase.
4. Probar 2x1/3x2/4x3 con cantidades exactas y sobrantes, pago normal, pendiente y saldo a favor; confirmar inventario, historial, comisión y CxC.

## Límite de validación
Se validó sintaxis de JavaScript y unicidad de IDs HTML de forma local. No se probó una venta real contra Supabase ni se afirma que el lote esté listo para producción.
