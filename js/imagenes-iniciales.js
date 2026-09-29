//=====================================
// SNACK OFFICE
// IMÁGENES INICIALES DEL CATÁLOGO
//=====================================

const IMAGENES_CATALOGO = {
    "SO-002": "img/productos/SO-002.jpg",
    "SO-003": "img/productos/SO-003.jpg",
    "SO-004": "img/productos/SO-004.jpg",
    "SO-005": "img/productos/SO-005.jpg",
    "SO-006": "img/productos/SO-006.jpg",
    "SO-007": "img/productos/SO-007.jpg",
    "SO-008": "img/productos/SO-008.jpg",
    "SO-014": "img/productos/SO-014.jpg",
    "SO-015": "img/productos/SO-015.jpg",
    "SO-016": "img/productos/SO-016.jpg",
    "SO-020": "img/productos/SO-020.jpg",
    "SO-021": "img/productos/SO-021.jpg",
    "SO-022": "img/productos/SO-022.jpg",
    "SO-023": "img/productos/SO-023.jpg",
    "SO-024": "img/productos/SO-024.jpg",
    "SO-025": "img/productos/SO-025.jpg",
    "SO-026": "img/productos/SO-026.jpg",
    "SO-029": "img/productos/SO-029.jpg",
    "SO-032": "img/productos/SO-032.jpg",
    "SO-034": "img/productos/SO-034.jpg",
    "SO-035": "img/productos/SO-035.jpg",
    "SO-036": "img/productos/SO-036.jpg",
    "SO-037": "img/productos/SO-037.jpg",
    "SO-038": "img/productos/SO-038.jpg",
    "SO-039": "img/productos/SO-039.jpg",
    "SO-040": "img/productos/SO-040.jpg",
    "SO-041": "img/productos/SO-041.jpg",
    "SO-042": "img/productos/SO-042.jpg",
    "SO-043": "img/productos/SO-043.jpg",
    "SO-044": "img/productos/SO-044.jpg",
    "SO-045": "img/productos/SO-045.jpg",
    "SO-046": "img/productos/SO-046.jpg",
    "SO-047": "img/productos/SO-047.jpg",
    "SO-049": "img/productos/SO-049.jpg",
    "SO-051": "img/productos/SO-051.jpg",
    "SO-052": "img/productos/SO-052.jpg",
    "SO-053": "img/productos/SO-053.jpg",
    "SO-054": "img/productos/SO-054.jpg",
    "SO-060": "img/productos/SO-060.jpg"
};

/**
 * Agrega las rutas de imagen al catálogo guardado en localStorage.
 * No reemplaza ni elimina productos; solo completa la propiedad imagen.
 */
export function inicializarImagenesCatalogo() {
    const guardados = localStorage.getItem("productos");

    if (!guardados) {
        return;
    }

    let productos;

    try {
        productos = JSON.parse(guardados);
    } catch (error) {
        console.warn("⚠️ No se pudieron leer los productos para asignar imágenes.", error);
        return;
    }

    if (!Array.isArray(productos) || productos.length === 0) {
        return;
    }

    let cambios = 0;

    productos = productos.map((producto) => {
        const codigo =
            producto.id ||
            producto.codigo ||
            producto.codigoCatalogo ||
            producto.codigo_catalogo;

        const imagen = codigo ? IMAGENES_CATALOGO[codigo] : null;

        if (imagen && producto.imagen !== imagen) {
            cambios++;
            return { ...producto, imagen };
        }

        return producto;
    });

    if (cambios > 0) {
        localStorage.setItem("productos", JSON.stringify(productos));
        console.log(`🖼️ Imágenes de catálogo asignadas: ${cambios}`);
    }
}
