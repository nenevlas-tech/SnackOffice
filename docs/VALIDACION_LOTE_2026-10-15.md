# SnackOffice — lote de correcciones y validación

Fecha: 2026-10-15
Base de trabajo: `SnackOffice_revision_local.zip`, que contiene el repositorio Git original y los cambios locales de revisión. El ZIP original `SnackOffice.zip` permanece sin modificar.

## Correcciones agrupadas en este lote

### Ventas atómicas
- La RPC exige un usuario autenticado con perfil activo `MASTER`, `ADMIN` o `VENTAS`.
- Se fija `search_path = public, pg_temp`.
- Se revocó la ejecución a `PUBLIC` y `anon`; se concede a `authenticated`.
- El total se recalcula con los precios centrales de `productos` y se rechaza si no coincide con el total enviado.
- El JSON histórico de productos se reconstruye con nombre, precio, costo y subtotal centrales.
- Se concilian total, saldo a favor aplicado, importe cobrado, saldo pendiente, abonado y suma del desglose.
- Se rechaza el saldo a favor resultante en una venta nueva y se exige estado `Pendiente` cuando queda saldo.

### Abonos CxC
- Se exige perfil activo `MASTER`, `ADMIN` o `VENTAS`.
- Se valida que exista método de pago.
- Se fija `search_path = public, pg_temp`.
- Se revocó ejecución a `PUBLIC` y `anon`; se concede a `authenticated`.

### Promociones
- Se corrigió la validación de rol para rechazar explícitamente perfil ausente/inactivo.
- La promoción mixta rechaza IDs de producto duplicados y bloquea/descuenta productos en orden estable por ID.

### Limpieza de pruebas
- La función SQL ya no elimina el catálogo central de clientes.
- El navegador ya no elimina la clave local `clientesSnackOffice` ni reinicia contadores locales de folios.
- El diálogo advierte que la limpieza elimina las tablas transaccionales indicadas y debe usarse solo con registros de prueba.
- No se restaura inventario por promociones ya ejecutadas: el stock actual se conserva como está.

## Validaciones ejecutadas
- `node --check` para todos los archivos `js/*.js`: aprobado.
- `git diff --check`: aprobado tras normalizar finales de línea de `.gitignore`.
- Revisión estática de permisos de las RPC: ventas, abonos y promociones ya rechazan explícitamente perfiles nulos; limpieza restringida a MASTER activo.
- Revisión estática del flujo de limpieza: preserva clientes y no reinicia folios del navegador.
- Comprobación estructural básica de los SQL (delimitadores y funciones): pendiente de ejecutar abajo.

## No validado todavía
- No hay `psql`, PostgreSQL ni parser PL/pgSQL instalado en este entorno; los SQL no se han ejecutado ni compilado en una base de pruebas.
- No se han ejecutado pruebas reales de concurrencia, idempotencia, cierre transaccional de jornada o pérdida de respuesta.
- La idempotencia de ventas, abonos y promociones sigue pendiente de implementación.
- El cierre de jornada sigue calculándose en parte en el navegador y requiere diseño transaccional coordinado.
- La limpieza continúa eliminando todos los registros de las tablas transaccionales listadas; no debe usarse con datos reales.
- No se ha ejecutado prueba funcional completa del navegador ni sincronización multidispositivo.

## Restricciones de entrega
- No ejecutar SQL en Supabase real sin autorización explícita.
- No generar aún ZIP definitivo: primero deben probarse los cambios SQL en entorno aislado y resolverse idempotencia/cierre de jornada.
- No hacer commit ni push hasta el final, después de la revisión de los resultados.

## Resultado adicional de pruebas locales del lote
- HTML: 66 IDs, sin duplicados.
- Referencias locales `src`/`href` encontradas en `index.html`: 3; ninguna faltante.
- Casos aritméticos del contrato financiero (pago completo, saldo a favor + pago, crédito pendiente, total manipulado y saldo a favor negativo): 5/5 se comportaron como se esperaba en la prueba aislada de las reglas.
- SQL: los 6 archivos pasan comprobaciones estructurales básicas de paréntesis y delimitadores `$$`. Esto NO sustituye un parser ni la ejecución de PostgreSQL.

## Siguiente lote recomendado
1. Implementar idempotencia coordinada para ventas, abonos y promociones (incluyendo clave persistente en frontend y registro único en PostgreSQL).
2. Diseñar cierre de jornada transaccional coordinado con `registrar_venta_atomica`.
3. Ejecutar migraciones y pruebas en una base aislada con esquema compatible.
4. Comparar explícitamente esta carpeta con `SnackOffice_nitro_venta_atomica_v1.zip` antes de preparar el ZIP integrado.

## Revisión adicional de Storage (lote siguiente)
- Se detectó que `supabase/imagenes-storage.sql` aún permitía INSERT/UPDATE/DELETE a `anon`, contrario a la intención de seguridad documentada anteriormente.
- Se actualizó la migración para mantener lectura pública y exigir sesión autenticada más perfil activo MASTER/ADMIN para INSERT/UPDATE/DELETE.
- Las políticas conocidas se eliminan antes de recrearse para que la migración sea repetible.
- Pendiente: validar las políticas en Supabase/PostgreSQL de pruebas y confirmar el esquema real de `profiles` y la forma de carga de imágenes.

## Revisión agrupada adicional — permisos, CxC y limpieza

### Hallazgos confirmados en los archivos actuales
- `registrar_abono_cxc(bigint, numeric, text)` no acepta clave idempotente. Un reintento tras pérdida de respuesta puede volver a aplicar el cobro.
- `registrar_venta_atomica(jsonb)` rechaza un ID de venta existente, pero no devuelve el resultado original ni protege un reintento con un nuevo ID.
- `limpiar_registros_pruebas()` elimina todos los registros de `promociones`, `movimientos_cxc`, `ventas` y `jornadas`; la función no filtra por marcador de prueba. No usar en una base con operaciones reales.
- Las políticas Storage restringen escrituras a perfiles activos MASTER/ADMIN. Aún falta probar que las políticas compilen en Supabase y comprobar si la aplicación necesita limitar actualización/eliminación al propietario del objeto.
- Las funciones de ventas y abonos son transaccionales, pero la atomicidad por sí sola no garantiza idempotencia ante reintentos.

### Validaciones repetidas en esta ronda
- `node --check` para todos los archivos `js/*.js`: aprobado.
- `git diff --check`: aprobado.
- Se inspeccionaron permisos y validaciones de `registrar_venta_atomica.sql`, `registrar_abono_cxc.sql`, `limpiar-registros-pruebas.sql` e `imagenes-storage.sql`.
- No hay `psql`, `postgres` ni `docker` disponibles en este entorno; no se ejecutaron migraciones ni pruebas transaccionales reales.

### Próximo lote de implementación
1. Definir tabla/registro común de idempotencia con clave, huella de payload y resultado persistido; la clave debe generarse y conservarse en frontend por operación.
2. Integrar esa clave a ventas, abonos y promociones sin cambiar el comportamiento de operaciones históricas.
3. Implementar cierre de jornada en RPC que comparta el bloqueo con registro de ventas y recalcule el resumen en servidor.
4. Rediseñar la limpieza para requerir identificación explícita de entorno/datos de prueba o mantenerla deshabilitada cuando existan operaciones reales.

Estas acciones son pendientes; no se afirma que ya estén implementadas.

## Lote de seguridad — bloqueo de limpieza (continuación)

Se modificó `supabase/limpiar-registros-pruebas.sql` para que la RPC `limpiar_registros_pruebas()` falle de forma segura salvo que `public.snackoffice_control.limpieza_pruebas_habilitada` esté explícitamente en `true`. La tabla de control se crea con el valor predeterminado `false` y se revoca el acceso directo a `PUBLIC`, `anon` y `authenticated`. La habilitación se documenta solo para una base de pruebas aislada.

### Validación local ejecutada
- Todos los archivos JavaScript pasan `node --check`.
- `git diff --check` pasa sin errores.
- Comprobaciones estáticas del SQL de limpieza: valor por defecto deshabilitado, guardia del interruptor, guardia MASTER, revocación a `anon` y nota transaccional: 5/5.

### Limitación
No se ejecutó esta migración en PostgreSQL ni Supabase. Antes de migrar, hay que verificar si ya existe `public.snackoffice_control` con otro esquema, ya que `CREATE TABLE IF NOT EXISTS` no modifica una tabla existente.


## Bloque de idempotencia y cierre — revisión complementaria

- Reinspeccionados los puntos de llamada de ventas y abonos y las definiciones SQL correspondientes.
- Confirmado: la venta usa `Date.now()` como ID y no conserva un intento pendiente durable antes de la llamada RPC; ventas y abonos carecen de clave idempotente independiente.
- Confirmado: el cierre de jornada calcula el resumen en el cliente antes de actualizar la fila central. El filtro `estado = ABIERTA` evita cerrar dos veces la misma fila, pero no hace atómico el resumen con ventas y abonos concurrentes.
- Corregida la documentación de limpieza para reflejar que el catálogo de clientes se conserva.
- No se implementó una solución incompleta basada en suposiciones del esquema. Se requiere verificar la estructura real de tablas, restricciones y funciones de jornada antes de diseñar y ejecutar una migración coordinada.

## Bloque de integración RPC (revisión estática)

Fecha: 2026-10-15.

### Coincidencias revisadas
- `js/ventas.js` invoca `registrar_venta_atomica` con `p_venta`; coincide con la firma del SQL incluido.
- `js/ventas.js` invoca `registrar_abono_cxc` con `p_venta_id`, `p_monto` y `p_metodo_pago`; coincide con la firma del SQL incluido.
- `js/promociones.js` invoca `registrar_promocion_mixta` con `p_items`, `p_tipo` y `p_precio_promocional`; coincide con la firma del SQL incluido.
- `js/limpieza-pruebas.js` invoca `limpiar_registros_pruebas()` sin argumentos; coincide con la firma del SQL incluido.
- `js/cortes-reportes.js` depende de `obtener_jornada_actual()` y `obtener_siguiente_folio_jornada(p_jornada_id)`. Sus definiciones no están en los SQL de este paquete y deben verificarse en la base objetivo antes de ejecutar pruebas integrales.

### Riesgos que permanecen abiertos
- La venta usa un identificador basado en `Date.now()` y no transmite una clave de idempotencia separada. El bloqueo del botón o el manejo de errores en interfaz no evita duplicados ante una respuesta perdida y un nuevo intento.
- El abono tampoco transmite clave de idempotencia; un error de red puede dejar incierto si se confirmó. La interfaz ahora advierte verificar CxC antes de repetir, pero esto no reemplaza la protección transaccional.
- `cerrarJornada()` construye el resumen desde datos consultados en el cliente y después actualiza la jornada. Debe evaluarse una RPC transaccional para impedir que una venta/abono concurrente quede fuera del corte.
- No se ha ejecutado SQL en PostgreSQL/Supabase en esta revisión. Las coincidencias de firmas son una revisión estática de archivos locales, no prueba de que las funciones instaladas en Supabase tengan la misma versión.

### Estado
JavaScript: `node --check` correcto para todos los archivos `js/*.js`.
Git: `git diff --check` correcto.
SQL: pendiente de validar en un entorno PostgreSQL aislado y de comparar con el esquema real antes de migrar.

## Bloque de validación integral local — 2026-10-15

### Comparación con `SnackOffice_nitro_venta_atomica_v1.zip`
Se comparó la base local contra el ZIP Nitro por ruta relativa. Los archivos no son idénticos en todos los casos: `js/ventas.js`, `supabase/registrar_venta_atomica.sql`, `supabase/registrar_abono_cxc.sql` y `supabase/promociones.sql` contienen cambios locales respecto del ZIP. `index.html`, `js/cortes-reportes.js` y `js/promociones.js` sí coinciden byte a byte en esta muestra. Por tanto, la carpeta activa contiene cambios intencionales que deben preservarse al integrar; no se debe reemplazar ciegamente por el ZIP Nitro.

### Comprobaciones repetidas
- `node --check` en todos los archivos `js/*.js`: aprobado.
- `git diff --check`: aprobado.
- Parseo de `index.html`: 66 IDs, sin IDs duplicados; 3 referencias locales comprobadas, ninguna faltante.
- Inventario de llamadas RPC en JS: `limpiar_registros_pruebas`, `obtener_jornada_actual`, `registrar_abono_cxc`, `registrar_promocion_mixta`, `registrar_venta_atomica`.

### Pendientes antes de preparar el ZIP final
- Verificar contra la base objetivo las funciones y firmas reales, especialmente las dos funciones de jornada.
- La revisión local no reemplaza ejecución SQL ni pruebas de navegador, concurrencia, rollback o sincronización entre dispositivos.
- Idempotencia para ventas, abonos y promociones, y cierre de jornada transaccional, continúan pendientes.
- No se ejecutó SQL en Supabase, no se creó ZIP final y no se hizo commit ni push.

## Revisión del lote de idempotencia CxC
- `registrar_abono_cxc.sql` define la clave UUID, registra el payload y conserva el resultado dentro de la misma transacción de la RPC; la nueva firma es `(bigint, numeric, text, uuid)` y revoca la firma anterior para evitar llamadas sin clave.
- `js/ventas.js` conserva la misma clave persistida si la RPC devuelve error o si falla la recarga de CxC tras confirmarse el abono. Esto permite que un reintento del mismo payload reutilice la clave, en lugar de crear una operación nueva.
- Validación pendiente: ejecutar la migración en una base aislada compatible y probar reintentos concurrentes, payload distinto con misma clave, pérdida de respuesta y permisos efectivos. No se ejecutó esta migración en Supabase real.


## Corrección funcional — retirar módulo Pendientes de Ventas

- Se retiró el botón `Pendientes` de la navegación de Ventas y su pantalla `pendientesVentasScreen` del HTML.
- Se retiró el cableado de navegación y el renderizado exclusivo de esa pantalla de `js/ventas.js`.
- Se conserva la lógica de cuentas/CxC y el modal de abonos, porque se utilizan desde el catálogo/estado de cuenta de clientes; no se eliminaron datos ni tablas de Supabase.
- Validación local pendiente tras esta edición: sintaxis JS, revisión del HTML y búsqueda de referencias huérfanas. No se ejecutó SQL ni se alteró Supabase.
