# SnackOffice — lote integrado de correcciones (16/10/2026)

## Cambios de interfaz y lógica
- Normalización común de nombres de clientes: elimina diacríticos, espacios redundantes y diferencias de mayúsculas.
- La validación de venta vuelve a consultar el catálogo central antes de aceptar un cliente y bloquea con un mensaje claro si el catálogo no puede verificarse.
- La pantalla Clientes combina el catálogo maestro de Supabase con el historial transaccional: muestra clientes sin compras y conserva sus métricas de compras/saldos.
- El estado de cuenta permite abrir clientes del catálogo aunque todavía no tengan compras.
- Historial y estado de cuenta muestran tipo de promoción, subtotal estimado antes del descuento y descuento promocional cuando la venta guarda esos datos.
- Cortes y reportes ya no presentan métodos de pago como si fueran cobranza CxC; muestran movimientos de cobranza reales y total recibido.
- Reporte de ventas amplía fecha/hora y detalla promoción, descuento, método/estado y líneas de producto.
- Tabla de movimientos CxC añade fecha/hora y saldo posterior.
- Comisiones: la utilidad considera el costo de todas las unidades y la comisión usa el ingreso neto por línea después del descuento promocional, limitada al margen positivo.
- Corte y reporte muestran la fecha/hora de apertura junto con la fecha de la jornada y el cierre, para distinguirlas.
- Se conservan las protecciones del botón de reinicio; no se ejecuta ni habilita la limpieza.

## Requisito de Supabase para detalle de promociones
El script `supabase/registrar_venta_atomica.sql` ahora añade de forma idempotente las columnas `promocion_tipo`, `promocion_id` y `promocion_descuento` y persiste esos datos. Ejecutar el script completo en Supabase antes de probar el registro de ventas con la versión integrada. Las ventas históricas reciben `NINGUNA` y descuento 0 por defecto; no se inventan datos históricos de promociones.

## Orden recomendado
1. Respaldar el ZIP y conservarlo sin modificar.
2. Ejecutar en Supabase `supabase/registrar_venta_atomica.sql` completo (incluye los `ALTER TABLE IF NOT EXISTS` y reemplaza la RPC).
3. Reemplazar los archivos locales por el contenido del ZIP integrado.
4. Recargar con Ctrl+Shift+R e iniciar sesión.
5. Verificar Clientes > búsqueda Abigail; abrir estado de cuenta sin compras; después hacer la prueba pendiente solo una vez.
6. Revisar Reportes/Cortes/Comisiones con las ventas existentes.

## Limitaciones de validación local
El ZIP se valida por integridad y sintaxis JavaScript. No se ejecutan escrituras contra el proyecto Supabase real desde esta revisión. No registrar ventas ni limpiar datos hasta completar las pruebas guiadas.


## Nota de interpretación de comisiones
- Se usa el costo guardado en el detalle de venta cuando existe; así no cambia una comisión histórica si Administración modifica el costo del producto después.
- Para datos antiguos que no guardaban el costo en cada línea, se usa como respaldo el costo actual del inventario. Esos cálculos históricos pueden variar respecto del costo que existía al vender.
- La utilidad se calcula como ingreso neto de la línea menos el costo de todas las unidades; la comisión aplica al margen positivo de cada línea. Esta regla debe validarse con el dueño antes de considerarla definitiva.
