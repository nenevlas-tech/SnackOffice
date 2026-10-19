# Botón temporal para reiniciar datos de prueba

## Propósito

El botón `🧹 Reiniciar datos de prueba` se muestra únicamente en **Corte de jornada** cuando la sesión es de rol `MASTER`. Solicita dos confirmaciones y llama a la RPC `public.reiniciar_datos_prueba_master(text)` en Supabase. La función vuelve a validar el rol MASTER en el servidor; ocultar el botón en el navegador no es la única barrera de seguridad.

## Qué elimina

- Todas las filas de `public.promociones`.
- Todos los movimientos de `public.movimientos_cxc`.
- Todas las ventas de `public.ventas`.
- Todas las jornadas/reportes de `public.jornadas`.
- Todas las claves de `public.snackoffice_operaciones_idempotentes`.

## Qué conserva

- Clientes, productos, existencias actuales, imágenes, perfiles y configuración.
- El stock se conserva tal como esté al pulsar el botón; no repone unidades vendidas durante pruebas.

## Instalación temporal

1. Confirmar que la base se usará exclusivamente para pruebas mientras el botón esté disponible.
2. En Supabase SQL Editor, ejecutar `supabase/reiniciar-datos-prueba-master.sql`. Instalar la función no borra datos.
3. Publicar la versión de `js/cortes-reportes.js` que incorpora el botón.
4. Entrar con usuario MASTER, abrir Corte de jornada y usar el botón solo después de verificar que no hay operaciones reales que conservar.
5. Al terminar las pruebas y antes de entregar SnackOffice, retirar el botón y su manejador de `js/cortes-reportes.js`, retirar la RPC de la base con `DROP FUNCTION public.reiniciar_datos_prueba_master(text);` y publicar una versión sin la herramienta.

## Advertencia

Esta herramienta es deliberadamente amplia: borra todas las filas de las tablas transaccionales listadas, no solo registros etiquetados como pruebas. No utilizar una vez que haya ventas reales. La operación SQL es transaccional; ante un error, Postgres revierte la transacción completa. La limpieza local de `localStorage` ocurre solo después de que Supabase confirma éxito.
