// =====================================
// SNACK OFFICE - CATÁLOGO INICIAL
// =====================================
// Este catálogo permite que GitHub Pages arranque con productos
// aunque el navegador todavía no tenga localStorage.
//
// El catálogo se carga SOLO si no existe un catálogo previo.
// Si el usuario ya tiene productos, no se sobrescriben.

const CATALOGO_INICIAL = [
    {
        "id": "SO-001",
        "nombre": "Amaranth Chips",
        "categoria": "Botanas",
        "precio": 30.0,
        "costo": 10.61,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-002",
        "nombre": "Barra Gansito",
        "categoria": "Dulces y chocolates",
        "precio": 10.0,
        "costo": 3.76,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-003",
        "nombre": "Barras Soft & Chewy",
        "categoria": "Barras y snacks",
        "precio": 15.0,
        "costo": 3.66,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-004",
        "nombre": "Barritas Fresa",
        "categoria": "Barras y snacks",
        "precio": 15.0,
        "costo": 5.37,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-005",
        "nombre": "Barritas Moras",
        "categoria": "Barras y snacks",
        "precio": 10.0,
        "costo": 2.73,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-006",
        "nombre": "Barritas Piña",
        "categoria": "Barras y snacks",
        "precio": 15.0,
        "costo": 5.37,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-007",
        "nombre": "Brownies General Mills",
        "categoria": "Postres",
        "precio": 17.0,
        "costo": 8.91,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-008",
        "nombre": "Canelitas Chicas",
        "categoria": "Galletas",
        "precio": 10.0,
        "costo": 2.73,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-009",
        "nombre": "Canelitas Grande",
        "categoria": "Galletas",
        "precio": 20.0,
        "costo": 7.54,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-010",
        "nombre": "Cheetos Colmillos",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 10.0,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-011",
        "nombre": "Cheetos Flamin’ Hot",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-012",
        "nombre": "Cheetos Poffs",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.9,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-013",
        "nombre": "Cheetos Torciditos",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-014",
        "nombre": "Chip’S Fuego",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-015",
        "nombre": "Chip’S Jalapeño",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-016",
        "nombre": "Chip’S Sal",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-017",
        "nombre": "Chips Papatinas fuego",
        "categoria": "Botanas",
        "precio": 15.0,
        "costo": 10.97,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-018",
        "nombre": "Chokis",
        "categoria": "Galletas",
        "precio": 10.0,
        "costo": 4.07,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-019",
        "nombre": "Churritos Miguelito",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 10.0,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-020",
        "nombre": "Churrumais Limón",
        "categoria": "Botanas",
        "precio": 18.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-021",
        "nombre": "Coconut Almond Bites",
        "categoria": "Barras y snacks",
        "precio": 15.0,
        "costo": 3.96,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-022",
        "nombre": "Cremax Chocolate",
        "categoria": "Galletas",
        "precio": 15.0,
        "costo": 3.3,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-023",
        "nombre": "Cremax Fresa",
        "categoria": "Galletas",
        "precio": 15.0,
        "costo": 3.3,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-024",
        "nombre": "Cremax Vainilla",
        "categoria": "Galletas",
        "precio": 15.0,
        "costo": 3.3,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-025",
        "nombre": "Doraditas",
        "categoria": "Galletas",
        "precio": 15.0,
        "costo": 6.59,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-026",
        "nombre": "Doritos Nacho",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-027",
        "nombre": "Emperador Chocolate",
        "categoria": "Galletas",
        "precio": 10.0,
        "costo": 4.07,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-028",
        "nombre": "Emperador Vainilla",
        "categoria": "Galletas",
        "precio": 10.0,
        "costo": 4.07,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-029",
        "nombre": "Fritos Limón Y Sal",
        "categoria": "Botanas",
        "precio": 18.0,
        "costo": 10.97,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-030",
        "nombre": "Galleta Avena Taifeld´S",
        "categoria": "Galletas",
        "precio": 17.0,
        "costo": 6.57,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-031",
        "nombre": "Garden Veggie Straws",
        "categoria": "Botanas",
        "precio": 25.0,
        "costo": 10.2,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-032",
        "nombre": "Gaveti Chispi Chocs",
        "categoria": "Galletas",
        "precio": 17.0,
        "costo": 8.47,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-033",
        "nombre": "Mini Chocorroles",
        "categoria": "Dulces y chocolates",
        "precio": 12.0,
        "costo": 6.69,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-034",
        "nombre": "Mini Gansito",
        "categoria": "Dulces y chocolates",
        "precio": 12.0,
        "costo": 4.65,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-035",
        "nombre": "Mini Mamut",
        "categoria": "Dulces y chocolates",
        "precio": 8.0,
        "costo": 4.07,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-036",
        "nombre": "Mini Pingüinos",
        "categoria": "Dulces y chocolates",
        "precio": 12.0,
        "costo": 4.48,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-037",
        "nombre": "Peanut Butter Bites",
        "categoria": "Barras y snacks",
        "precio": 15.0,
        "costo": 3.09,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-038",
        "nombre": "Polvorones Chicos",
        "categoria": "Galletas",
        "precio": 10.0,
        "costo": 2.73,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-039",
        "nombre": "Polvorones Grande",
        "categoria": "Galletas",
        "precio": 20.0,
        "costo": 8.4,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-040",
        "nombre": "Principe Chico",
        "categoria": "Galletas",
        "precio": 10.0,
        "costo": 2.73,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-041",
        "nombre": "Principe Grande",
        "categoria": "Galletas",
        "precio": 20.0,
        "costo": 9.25,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-042",
        "nombre": "Pringles",
        "categoria": "Botanas",
        "precio": 27.0,
        "costo": 13.76,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-043",
        "nombre": "Quaker Chocolate",
        "categoria": "Barras y snacks",
        "precio": 15.0,
        "costo": 6.4,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-044",
        "nombre": "Rancheritos Original",
        "categoria": "Botanas",
        "precio": 18.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-045",
        "nombre": "Rip Van Wafers",
        "categoria": "Galletas",
        "precio": 17.0,
        "costo": 10.61,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-046",
        "nombre": "Ruffles Queso",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-047",
        "nombre": "Runners Chile Limón",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 10.97,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-048",
        "nombre": "Runners Fuego",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 8.97,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-049",
        "nombre": "Sabritas Original",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-050",
        "nombre": "Slim Pop",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 10.61,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-051",
        "nombre": "Snack Bites Tajin",
        "categoria": "Barras y snacks",
        "precio": 10.0,
        "costo": 3.39,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-052",
        "nombre": "Snackers Chicharron De Cerdo",
        "categoria": "Botanas",
        "precio": 25.0,
        "costo": 11.64,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-053",
        "nombre": "Takis Fuego",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 10.97,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-054",
        "nombre": "Takis Huakamoles",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 9.69,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-055",
        "nombre": "Takis Original",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 10.97,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-056",
        "nombre": "Takis Salsa Brava",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 9.69,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-057",
        "nombre": "Tostitos Flamin Hot",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-058",
        "nombre": "Tostitos Más Salsa Verde",
        "categoria": "Botanas",
        "precio": 20.0,
        "costo": 11.16,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-059",
        "nombre": "Trident Surtido",
        "categoria": "Chicles",
        "precio": 28.0,
        "costo": 13.98,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-060",
        "nombre": "Triki-Trakes",
        "categoria": "Galletas",
        "precio": 20.0,
        "costo": 8.35,
        "stock": 15,
        "imagen": ""
    },
    {
        "id": "SO-061",
        "nombre": "Trufas Italianas",
        "categoria": "Dulces y chocolates",
        "precio": 12.0,
        "costo": 5.1,
        "stock": 15,
        "imagen": ""
    }
];

export function inicializarCatalogo() {
    const clave = "catalogoInicialCargado";
    const productosGuardados = localStorage.getItem("productos");

    let productosActuales = [];

    if (productosGuardados) {
        try {
            const parsed = JSON.parse(productosGuardados);
            productosActuales = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn("⚠️ No se pudo leer el catálogo local:", error);
        }
    }

    // Si ya existe un catálogo, lo respetamos.
    if (productosActuales.length > 0) {
        localStorage.setItem(clave, "1");
        return;
    }

    // Si ya se inicializó antes y quedó vacío por decisión del usuario,
    // no lo volvemos a poblar automáticamente.
    if (localStorage.getItem(clave) === "1") {
        return;
    }

    localStorage.setItem("productos", JSON.stringify(CATALOGO_INICIAL));
    localStorage.setItem(clave, "1");

    console.log(
        `📦 Catálogo inicial cargado: ${CATALOGO_INICIAL.length} productos`
    );
}
