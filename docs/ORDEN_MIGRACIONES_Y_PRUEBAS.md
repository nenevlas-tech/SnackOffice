
## Validación de Storage (hallazgo de seguridad)
- La versión recuperada de `imagenes-storage.sql` permitía escribir a `anon`; se corrigió localmente.
- Lectura pública se conserva para que las imágenes se vean en todos los dispositivos.
- INSERT/UPDATE/DELETE requieren usuario autenticado con perfil activo `MASTER` o `ADMIN`.
- Pruebas requeridas: lectura sin sesión, escritura anónima rechazada, escritura de MASTER/ADMIN activo permitida y escritura de VENTAS/perfil inactivo rechazada.
- No ejecutar en producción hasta probar las políticas en entorno aislado.


## Bloqueo de seguridad de limpieza (lote actual)

`supabase/limpiar-registros-pruebas.sql` crea `public.snackoffice_control` con `limpieza_pruebas_habilitada = false` por defecto. La RPC MASTER falla de forma segura mientras el interruptor no se active administrativamente. Para probarla, usar únicamente una base aislada, habilitar temporalmente el interruptor y volver a desactivarlo al finalizar. La migración no debe ejecutarse en producción sin revisar primero el esquema/tabla de control existente y el alcance de borrado.

## Dependencias de jornada que deben verificarse antes de probar ventas

La aplicación llama `obtener_jornada_actual()` y `obtener_siguiente_folio_jornada(p_jornada_id)`, pero sus definiciones no están incluidas en los SQL disponibles en este paquete. Antes de probar el ciclo de venta, confirmar en el proyecto Supabase correcto que ambas funciones existen, sus parámetros/retornos coinciden con `js/cortes-reportes.js`, y sus permisos no permiten uso anónimo ni perfiles inactivos. No recrearlas ni reemplazarlas a ciegas: primero comparar sus definiciones y tablas con el esquema real.
