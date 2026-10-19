# Corrección de cobranza CxC en cortes

## Qué cambia
- `registrar_abono_cxc` registra un movimiento `COBRO_CXC` por el importe total realmente recibido.
- Los movimientos `ABONO` siguen representando la aplicación a cada deuda y `SALDO_FAVOR` el excedente.
- El corte contabiliza solamente `COBRO_CXC` como ingreso de cobranza, para no sumar dos veces las aplicaciones.
- El estado de cuenta identifica el cobro recibido por separado.

## Instalación
1. En Supabase SQL Editor, vuelve a ejecutar `supabase/registrar_abono_cxc.sql` completo. Es `CREATE OR REPLACE FUNCTION`; actualiza la función existente.
2. Reemplaza los archivos del proyecto con esta versión y recarga el navegador con Ctrl+F5.
3. No cierres la jornada de prueba actual hasta verificar el resultado.

## Importante sobre movimientos previos
Los abonos que se registraron antes de esta actualización no tienen un movimiento `COBRO_CXC` original. Esta actualización no inventa ni migra cobros históricos. Por eso, el resumen de cobranza de esos abonos previos puede no reflejarse como cobro total hasta que se concilien por separado. Valida con un nuevo abono de prueba en una jornada de pruebas.

## Prueba sugerida
- Crea dos deudas de $15 para un cliente de prueba.
- Registra un abono de $50, eligiendo deliberadamente el método correcto.
- Debe haber un solo `COBRO_CXC` de $50, dos movimientos `ABONO` por $15, y un `SALDO_FAVOR` por $20.
- El corte debe sumar $50 una sola vez en el método seleccionado, no $80 ni $30.
