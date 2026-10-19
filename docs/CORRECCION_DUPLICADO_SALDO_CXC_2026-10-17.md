# Corrección de saldo duplicado en CxC — 2026-10-17

## Hallazgo
Después de registrar una venta pendiente, el flujo recargaba las cuentas desde Supabase y después agregaba otra vez la misma cuenta a `localStorage` mediante `guardarCuentaPendiente()`. El resumen sumaba ambas copias, aunque el historial de compras mostrara una sola venta.

## Cambio aplicado
- Supabase queda como fuente de verdad para la cuenta de la venta recién registrada.
- Se elimina la segunda inserción local posterior a la recarga central.
- El historial muestra el folio central de la jornada (`venta.folio`) cuando está disponible, en lugar de calcular un número visual independiente.
- Se incrementa la versión de compilación para evitar caché del módulo.

## Alcance y seguridad
No se ejecutaron consultas ni modificaciones contra Supabase y no se borraron registros. Las cuentas locales se reconstruyen desde la información central al recargar el módulo.

## Validación pendiente en navegador
1. Recargar con Ctrl+F5.
2. Abrir Clientes y actualizar.
3. Confirmar que la deuda de Abigail quede en $15.00, no $30.00, si la base central contiene una sola venta pendiente de $15.
4. Confirmar que el folio del historial coincida con el folio central de la jornada.
5. No repetir la venta hasta confirmar el saldo.
