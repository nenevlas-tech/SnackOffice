# Registro atómico de ventas

## Qué resuelve

`registrar_venta_atomica.sql` agrega una función transaccional que valida y descuenta el inventario, registra la venta, aplica el saldo a favor central existente y crea el movimiento de CxC cuando la venta genera deuda. Si una validación o escritura falla, PostgreSQL revierte la operación completa.

## Orden obligatorio

1. Hacer respaldo de la base y probar primero en un entorno de pruebas.
2. Revisar el SQL con el esquema actual de SnackOffice.
3. Ejecutar `registrar_venta_atomica.sql` en Supabase SQL Editor.
4. Verificar que la función exista y probar con productos/cuentas de prueba.
5. Después publicar los archivos frontend que llaman a `registrar_venta_atomica`.

**No desplegar el frontend antes de ejecutar el SQL**, porque el registro de venta fallará si la función RPC todavía no existe.

## Límites de validación

- La función y el frontend pasaron revisión estática de sintaxis JavaScript.
- Este paquete no ejecutó el SQL en la instancia real de Supabase ni realizó ventas de prueba en la base de datos.
- Antes de producción se debe probar stock insuficiente, saldo a favor concurrente, venta a crédito, venta pagada, error de conexión y doble clic/reintento.
- La función usa las columnas reportadas en el CSV de estructura enviado el 14 de octubre de 2026. Si el esquema real cambia, no ejecutar sin adaptar y validar primero.
