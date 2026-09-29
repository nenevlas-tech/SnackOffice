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

// Los productos del Local pueden tener IDs como PROD-XXXXXXXX.
// Por eso también relacionamos las imágenes con el NOMBRE del producto.
const CODIGOS_POR_NOMBRE = {
    "barritas pina": "SO-006",
    "chip’s sal": "SO-016",
    "runners chile limon": "SO-047",
    "chip’s jalapeño": "SO-015",
    "canelitas grande": "SO-008",
    "churrumais limon": "SO-020",
    "fritos limon y sal": "SO-029",
    "mini pinguinos": "SO-036",
    "chip’s fuego": "SO-014",
    "barras soft & chewy": "SO-003",
    "barrita gansito": "SO-002",
    "barra gansito": "SO-002",
    "barritas fresa": "SO-004",
    "barritas moras": "SO-005",
    "barritas pina": "SO-006",
    "brownies general mills": "SO-007",
    "canelitas chicas": "SO-008",
    "snack bites tajin": "SO-051",
    "peanut butter bites": "SO-037",
    "snackers chicharron de cerdo": "SO-052",
    "pringles": "SO-042",
    "quaker chocolate": "SO-043",
    "coconut almond bites": "SO-021",
    "principe chico": "SO-040",
    "fritos limon y sal": "SO-029",
    "rancheritos original": "SO-044",
    "churrumais limon": "SO-020",
    "takis fuego": "SO-053",
    "polvorones chicos": "SO-038",
    "polvorones grande": "SO-039",
    "runners chile limon": "SO-047",
    "sabritas original": "SO-049",
    "doritos nacho": "SO-026",
    "ruffles queso": "SO-046",
    "chip's sal": "SO-016",
    "chip's fuego": "SO-014",
    "takis huakamoles": "SO-054",
    "principe grande": "SO-041",
    "triki-trakes": "SO-060",
    "mini pinguinos": "SO-036",
    "mini gansito": "SO-034",
    "mini mamut": "SO-035",
    "chip's jalapeno": "SO-015",
    "cremax vainilla": "SO-024",
    "cremax chocolate": "SO-022",
    "doraditas": "SO-025",
    "cremax fresa": "SO-023",
    "rip van wafers": "SO-045",
    "gaveti chispi chocs": "SO-032"
};

function normalizarNombre(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

/**
 * Agrega las rutas de imagen al catálogo guardado en localStorage.
 * Funciona tanto con productos cuyo id es SO-XXX como con productos
 * importados anteriormente cuyo id tiene formato PROD-XXXXXXXX.
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
        console.warn(
            "⚠️ No se pudieron leer los productos para asignar imágenes.",
            error
        );
        return;
    }

    if (!Array.isArray(productos) || productos.length === 0) {
        return;
    }

    let cambios = 0;

    productos = productos.map((producto) => {
        const id = String(producto.id || "").trim();

        // 1. Primero intenta usar directamente un código SO-XXX.
        let codigo = IMAGENES_CATALOGO[id] ? id : null;

        // 2. Si el ID es PROD-XXXXXXXX, busca el código por nombre.
        if (!codigo) {
            const nombre = normalizarNombre(producto.nombre);
            codigo = CODIGOS_POR_NOMBRE[nombre] || null;
        }

        const imagen = codigo ? IMAGENES_CATALOGO[codigo] : null;

        if (imagen && producto.imagen !== imagen) {
            cambios++;
            return {
                ...producto,
                imagen
            };
        }

        return producto;
    });

    if (cambios > 0) {
        localStorage.setItem("productos", JSON.stringify(productos));
        console.log(`🖼️ Imágenes de catálogo asignadas: ${cambios}`);
    } else {
        console.log("🖼️ No hubo cambios en las imágenes del catálogo.");
    }
}
