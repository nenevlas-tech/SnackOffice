# Lote visual consolidado — 2026-10-19

## Cambios incluidos
- Botones con relieve discreto, estados hover/active y foco visible.
- Ventas: categorías más compactas con estado activo, buscador delineado, tarjetas de producto con hover, precio más visible y stock coloreado por nivel.
- Ventas: métodos de pago en cuadrícula 2×2, botones inactivos delimitados y estado vacío del carrito centrado.
- Historial: dos tarjetas por fila en escritorio y una por fila en móvil.
- Clientes: resumen y tarjetas con jerarquía visual más clara y botones de estado de cuenta menos saturados.
- Administración > Promociones: miniaturas con respaldo local por SKU/nombre normalizado cuando `productos.imagen` está vacío o falla; aviso aclarado para indicar que guardar la configuración no registra una venta por sí solo.
- Login: fondo azul marino alineado con la identidad del sistema; botón naranja se conserva como acción principal.
- Clientes: iconos de resumen ajustados para mejorar reconocimiento, centrado y color por significado.
- Caché: versión de CSS y módulos actualizada para que el navegador cargue los cambios nuevos.
- Sidebar con estado activo más sutil.

## Validación realizada
- `node --check` en todos los archivos de `js/*.js`: aprobado.
- `git diff --check`: aprobado.
- 62 IDs HTML sin duplicados.
- Llaves CSS balanceadas.

## Pendiente de validar manualmente
- Apariencia y comportamiento real en navegador en escritorio y móvil.
- Que las imágenes de promociones se carguen con las URLs actuales de Supabase y los respaldos locales para los productos con nombres variantes.
- Flujo de venta, pagos, promociones y reportes de extremo a extremo.

No se ejecutaron SQL ni operaciones sobre Supabase. Estos resultados no equivalen a una aprobación funcional completa.
