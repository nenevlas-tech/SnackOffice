# Lote 2 — Idempotencia y cierre de jornada

Fecha de revisión: 2026-10-15
Base: `SnackOffice_nitro_venta_atomica_v1.zip` integrada en el repositorio recuperado.

## Hallazgos confirmados por lectura del código

### Ventas
- `js/ventas.js` llama `registrar_venta_atomica` con `p_venta` solamente.
- `supabase/registrar_venta_atomica.sql` valida duplicidad por ID de venta y bloquea inventario, pero no recibe una clave de idempotencia independiente ni devuelve el resultado original de una operación ya confirmada.
- La comprobación de ID duplicado genera una excepción; por sí sola no resuelve el caso en que el cliente reintenta con un ID nuevo tras perder la respuesta.

### Abonos CxC
- `js/ventas.js` llama `registrar_abono_cxc` con `p_venta_id`, `p_monto` y `p_metodo_pago`.
- La función distribuye el abono dentro de una transacción, pero no recibe una clave de idempotencia. Un reintento después de perder la respuesta puede volver a cobrar el importe.

### Cierre de jornada
- `js/cortes-reportes.js` obtiene ventas, movimientos y estado CxC en el cliente, calcula `resumenFinal` y después actualiza `jornadas` a `CERRADA`.
- El cálculo y el cierre no forman una sola transacción del servidor. Una venta o un abono concurrente podría quedar fuera del resumen archivado.
- Para implementar una RPC de cierre correctamente hay que inspeccionar el esquema real de `jornadas`, las funciones actuales de apertura/folio y las fuentes exactas usadas por `calcularResumen`.

## Diseño requerido antes de implementar

1. Añadir una clave de operación persistente para cada intento lógico de venta, abono y promoción. Los reintentos deben reutilizar la misma clave.
2. Guardar la huella de los datos normalizados y el resultado de la operación dentro de la misma transacción que sus efectos financieros.
3. Misma clave y mismos datos: devolver el resultado previamente confirmado. Misma clave con datos distintos: rechazar.
4. Mantener compatibilidad con ventas históricas y definir retención/limpieza de claves sin borrar evidencia contable.
5. Cierre de jornada en una RPC que bloquee la fila de jornada, coordine con `registrar_venta_atomica`, vuelva a calcular el resumen en el servidor y marque el cierre en la misma transacción.
6. Definir el comportamiento de abonos concurrentes con el cierre y el instante de corte para movimientos CxC.

## Casos de prueba obligatorios

- Venta confirmada con respuesta perdida; reintento con la misma clave no descuenta stock ni crea venta/CxC dos veces.
- Abono confirmado con respuesta perdida; reintento no genera un segundo cobro.
- Misma clave con payload modificado se rechaza.
- Dos solicitudes simultáneas con la misma clave producen un solo efecto.
- Dos claves distintas permiten operaciones legítimas independientes.
- Fallo antes del commit no deja clave/resultados parciales ni efectos financieros.
- Venta compitiendo con cierre: o queda confirmada antes y aparece en el resumen, o el cierre gana y la venta se rechaza.
- Abono compitiendo con cierre: se incluye según una regla temporal consistente y documentada.
- Concurrencia con cierre de jornada y obtención del siguiente folio.

## Estado

Este archivo documenta el diagnóstico y los criterios de aceptación. No implementa todavía idempotencia ni una RPC de cierre. No se ha ejecutado SQL en Supabase ni en un PostgreSQL de pruebas.


## Resultado de la revisión coordinada del 2026-10-15

Se volvió a inspeccionar el flujo real de `js/ventas.js`, `supabase/registrar_venta_atomica.sql`, `supabase/registrar_abono_cxc.sql` y `js/cortes-reportes.js`. El diagnóstico se mantiene: no es seguro declarar resuelta la idempotencia con cambios solo del navegador, porque la clave y el resultado deben persistirse en la misma transacción de PostgreSQL.

### Riesgos adicionales confirmados

- El identificador de venta se genera con `Date.now()` y la venta solo se guarda en `localStorage` después de que la RPC devuelve éxito. Si se pierde la respuesta tras el commit, el navegador no tiene un registro durable del intento original para recuperarlo con certeza.
- La RPC de abono tampoco recibe una clave persistente de operación. No se debe reintentar automáticamente tras una respuesta ambigua.
- El cierre actual actualiza una jornada solo si sigue `ABIERTA`, lo cual evita dos cierres exitosos de la misma fila; sin embargo, el resumen se calcula en el cliente y no queda serializado con la creación de ventas/abonos.
- `docs/RESET_DATOS_PRUEBA.md` se corrigió para reflejar que el catálogo de clientes se conserva y que la RPC no elimina la tabla `clientes`.

### Decisión de seguridad

No se añadió una migración parcial de idempotencia ni una RPC de cierre inventando el esquema de la base. Para terminar ese cambio hace falta validar el esquema real de `ventas`, `movimientos_cxc`, `jornadas`, las funciones `obtener_jornada_actual` y `obtener_siguiente_folio_jornada`, y las restricciones existentes. Mientras tanto, estos casos permanecen como bloqueadores de la validación integral; no se consideran aprobados.


## Mitigación temporal de reintentos ambiguos — 2026-10-15

Se ajustaron los mensajes de error de `confirmarAbonoCxc()` para no asegurar incorrectamente que no hubo cambios cuando el cliente recibe un error de comunicación. Ahora se indica que debe refrescarse CxC y verificarse el movimiento antes de reintentar. Esto reduce el riesgo de duplicar un abono por un reintento manual, pero **no reemplaza la idempotencia del lado de PostgreSQL** y no resuelve por sí solo los casos de respuesta perdida.

## Mitigación local adicional — 2026-10-15

Se añadió en `js/ventas.js` una guarda de módulo (`registroVentaEnCurso`) alrededor del flujo de registro de venta. Dos clics rápidos en la misma pestaña no inician dos flujos de venta concurrentes; el segundo intento muestra un aviso y se descarta mientras el primero está en curso. La guarda se libera con `finally`, incluso cuando hay una salida temprana o una excepción.

**Límite importante:** esta guarda solo coordina una pestaña del navegador. No protege contra otro dispositivo, recarga, pérdida de respuesta después del commit, ni reintentos manuales posteriores. No es idempotencia de PostgreSQL y no habilita todavía las pruebas de cobro.
