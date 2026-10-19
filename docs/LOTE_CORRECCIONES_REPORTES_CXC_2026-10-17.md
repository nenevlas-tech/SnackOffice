# Lote de correcciones: reportes detallados y CxC — 17/10/2026

## Cambios integrados en esta versión
- Corte de jornada: tabla detallada de movimientos CxC con fecha/hora, tipo, cliente, venta, método, importe, saldo posterior y saldo a favor posterior.
- Corte de jornada: indicadores estimados de utilidad y comisión calculados por producto usando el costo guardado en el detalle validado de la venta; la comisión sigue la regla de 25% sobre el margen positivo neto de cada línea.
- Reporte histórico: añade utilidad y comisión estimadas por venta y en el resumen económico.
- Exportación CSV del corte: incluye campos de promoción, descuento, utilidad y comisión.
- Exportación CSV del detalle histórico: conserva el desglose de productos, pagos y saldos e incluye metadatos de promoción.
- Estado de cuenta del cliente: cada movimiento individual y global muestra fecha y hora del registro.
- Los movimientos ABONO y SALDO_FAVOR son el desglose de aplicación; solo COBRO_CXC representa el ingreso recibido para evitar doble conteo.

## Notas de validación
- Se ejecutó `node --check` para `js/cortes-reportes.js` y `js/ventas.js` sin errores de sintaxis.
- No se ejecutó SQL ni se modificó Supabase desde esta preparación.
- No se cerró la jornada, no se registraron ventas/abonos y no se ejecutó la limpieza de pruebas.
- Probar visualmente en el navegador el corte actual, el detalle histórico y el estado de cuenta antes de considerar el lote validado.

## Ajuste adicional — CxC sin métodos de pago en movimientos (2026-10-19)
- La vista de estado de cuenta se centra en compras, saldos, abonos, liquidaciones y saldo a favor.
- Se retiró el método de pago de las filas de movimientos de CxC y del historial global del cliente; el método permanece disponible en los módulos de ventas/caja/reportes.
- Se retiró la línea de forma de pago original de las tarjetas de cuenta para respetar la decisión de mantener CxC enfocada en saldos y movimientos.
- Validación ejecutada: `node --check js/ventas.js` y `git diff --check`, ambos aprobados.
- Pendiente: validar la presentación en navegador con datos de prueba.
