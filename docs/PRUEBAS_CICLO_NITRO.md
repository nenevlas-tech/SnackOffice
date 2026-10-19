# SnackOffice — Paquete de preparación para pruebas

## Qué se modificó en esta versión
- Se retiró el botón y el módulo de limpieza de pruebas que no funcionaban de forma confiable.
- El estado de cuenta consulta y muestra movimientos CxC generales del cliente además del detalle por venta. No crea un movimiento contable nuevo ni suma un cobro global inventado.
- Se añadieron exportaciones CSV compatibles con Excel para el resumen de reportes, el detalle de cada jornada y el corte actual.
- Se añadieron ajustes responsive para tablas, paneles y navegación en pantallas pequeñas.
- Se añadió el módulo Promociones (4x3, 3x2, 2x1 y precio promocional). Las promociones descuentan inventario por una RPC y se registran aparte, sin crear ventas normales ni comisiones.
- Se añadió una tabla central de clientes y una pantalla para importar el Excel convertido a CSV UTF-8. El importador normaliza espacios y acentos y evita duplicados por clave normalizada.
- Las ventas usan el catálogo central cuando ya tiene clientes: si está vacío, el modo de prueba anterior continúa permitido; una vez importado el catálogo, solo acepta nombres del catálogo para reducir duplicados.

## Instalación de cambios de base de datos
Ejecutar en Supabase SQL Editor, en este orden:
1. `supabase/catalogo-clientes.sql`
2. `supabase/promociones.sql`

Estos scripts crean la tabla de clientes y la tabla/RPC de promociones. No borran ventas ni inventario.

## Importar el catálogo definitivo
1. Abrir el Excel del dueño.
2. Guardar una copia como **CSV UTF-8**.
3. Entrar con MASTER o ADMIN a **Catálogo de clientes**.
4. Seleccionar el CSV y pulsar **Importar / actualizar catálogo**.
5. Verificar cantidad y nombres antes de empezar pruebas.

El CSV necesita una columna llamada `Nombre`, `Cliente`, `Nombre del cliente` o `Razón social`. Puede tener una columna opcional `Número`, `No`, `Folio` o `ID`. Si el Excel usa encabezados distintos, ajustar esos encabezados o el importador antes de importar.

## Pruebas obligatorias antes de publicar
- CxC: dos deudas de $15 y un abono de $50; confirmar deuda $0 y saldo a favor $20.
- Estado de cuenta: validar todas las ventas, artículos, cantidad, precio, método original y movimientos globales.
- Corte: exportar CSV, abrir en Excel y comparar importes con pantalla.
- Reporte cerrado: exportar detalle, comprobar productos, folios, clientes y métodos de pago.
- Promociones: probar 4x3, 3x2, 2x1 y precio promocional; comprobar stock exacto y confirmar que no se creó una venta ni comisión.
- Catálogo: importar una muestra CSV, importar la misma muestra por segunda vez y verificar que no duplica clientes.
- Responsive: probar desktop, tablet y móvil.
- Ciclo completo: abrir jornada, vender, abonar, cerrar jornada, consultar reporte y exportar.

## Limitaciones conocidas
- Los cambios JavaScript se validaron sintácticamente, pero no se han probado contra el proyecto Supabase real de esta entrega.
- Los scripts SQL requieren ejecutarse manualmente; no se ejecutan al abrir la página.
- El historial de movimientos muestra los registros que existen en `movimientos_cxc`. No puede reconstruir un movimiento bruto de $50 si ese evento nunca se guardó como fila independiente; por eso se evita inventar o duplicar ese importe.
- Antes de publicar, verificar permisos RLS y el tipo real de `productos.id` en el proyecto de destino.

## Actualización de validación por bloques — 2026-10-19

### Regla de promociones coincidentes
El dueño acepta mantener la regla actual: cuando varias promociones están activas, se prioriza la configuración con `updated_at` más reciente. Se conserva sin cambios en esta ronda.

### Validaciones estáticas agrupadas
- `node --check` para todos los archivos JavaScript del proyecto y respaldos: aprobado (17 archivos).
- `index.html`: 62 IDs; no hay IDs duplicados.
- Referencias locales de `index.html`: 3 examinadas; ninguna faltante.
- `css/styles.css`: llaves balanceadas (823 aperturas y 823 cierres).
- `git diff --check`: aprobado, sin errores de espacios.

### Alcance y pendientes
Estas verificaciones son estáticas. No demuestran por sí mismas la ejecución en navegador, ni la integración con Supabase, RLS, funciones RPC o transacciones financieras. Mantener pendientes las pruebas de integración y el ciclo completo en un entorno de prueba. No ejecutar scripts destructivos ni cerrar jornadas reales durante las validaciones.
