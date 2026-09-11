//=====================================
// SNACK OFFICE
// MÓDULO: INVENTARIO
//=====================================
//=====================================
// PRODUCTOS
//=====================================

let productos =
    JSON.parse(localStorage.getItem("productos")) || [];

let indiceEditar = -1;


//=====================================
// GENERAR ID ÚNICO DE PRODUCTO
//=====================================

function generarIdProducto() {
    return "PROD-" +
        crypto.randomUUID()
            .split("-")[0]
            .toUpperCase();
}

//=====================================
// ASIGNAR ID A PRODUCTOS EXISTENTES
//=====================================

productos = productos.map(function(producto) {

    if (!producto.id) {
        producto.id = generarIdProducto();
    }

    return producto;
});

localStorage.setItem(
    "productos",
    JSON.stringify(productos)
);
function iniciarInventario() {

    const btnInventario = document.getElementById("btnInventario");

    btnInventario.addEventListener("click", mostrarInventario);

}


//=====================================
// MOSTRAR INVENTARIO
//=====================================

function mostrarInventario() {

    const contentArea = document.getElementById("contentArea");

    contentArea.innerHTML = `

        <div class="card-inventario">

            <div class="titulo-inventario">

                <span>📦</span>

                <h1>Inventario</h1>

            </div>

            <p class="subtitulo">
                Administra los productos de Snack Office.
            </p>


            <!-- ============================= -->
            <!-- HERRAMIENTAS EXCEL -->
            <!-- ============================= -->

            <div class="herramientas-inventario">

                <button id="btnImportarExcel">
                    📥 Cargar Excel
                </button>

                <button id="btnExportarExcel">
                    📤 Exportar Excel
                </button>

                <button id="btnRecuperarCategorias">
                 🏷️ Recuperar categorías
                </button>

                <button id="btnRecuperarCostos">
                 🔄 Recuperar costos maestro
                </button>

                 <input
                 type="file"
                 id="inputMaestroCostos"
                 accept=".xlsx,.xls"
                 style="display: none;"
                >

               
                <input
                    type="file"
                    id="inputExcel"
                    accept=".xlsx,.xls"
                    style="display: none;"
                >

            </div>


            <!-- ============================= -->
            <!-- FORMULARIO -->
            <!-- ============================= -->

            <div class="form-producto">

                <input
                    type="text"
                    id="producto"
                    placeholder="Nombre del producto"
                >

                <select id="categoriaProducto">
                    <option value="">Selecciona una categoría</option>
                    <option value="Botanas">🥨 Botanas</option>
                    <option value="Galletas">🍪 Galletas</option>
                    <option value="Dulces y chocolates">🍫 Dulces y chocolates</option>
                    <option value="Barras y snacks">🥜 Barras y snacks</option>
                    <option value="Chicles">🧊 Chicles</option>
                    <option value="Postres">🍰 Postres</option>
                    </select>
                

                <input
                    type="number"
                    id="precio"
                    placeholder="Precio"
                    min="0"
                    step="0.01"
                >

                <input
                   type="number"
                   id="costo"
                   placeholder="Costo unitario"
                   min="0"
                   step="0.01"
                >

                <input
                    type="number"
                    id="stock"
                    placeholder="Stock"
                    min="0"
                >

                <input
                    type="file"
                    id="imagenProducto"
                    accept="image/*"
                >

                <button id="btnGuardarProducto">
                    ➕ Agregar producto
                </button>

            </div>


            <!-- ============================= -->
            <!-- BÚSQUEDA -->
            <!-- ============================= -->

            <input
                type="text"
                id="buscarProducto"
                placeholder="🔎 Buscar producto..."
                class="buscador-inventario"
            >


            <!-- ============================= -->
            <!-- TABLA -->
            <!-- ============================= -->

            <table id="tablaProductos">

                <thead>

                    <tr>

                        <th>Producto</th>

                        <th>Precio</th>

                        <th>Stock</th>

                        <th>Acciones</th>

                    </tr>

                </thead>

                <tbody id="cuerpoProductos">

                </tbody>

            </table>

        </div>

    `;


    // Inicializar eventos del módulo

    configurarEventosInventario();

    mostrarProductos();

}
//=====================================
// CONVERTIR Y COMPRIMIR IMAGEN
//=====================================

function convertirImagen(archivo) {

    return new Promise((resolve, reject) => {

        const lector = new FileReader();

        lector.onload = function (evento) {

            const imagenOriginal =
                new Image();

            imagenOriginal.onload = function () {

                const MAXIMO = 500;

                let ancho =
                    imagenOriginal.width;

                let alto =
                    imagenOriginal.height;

                if (ancho > alto) {

                    if (ancho > MAXIMO) {

                        alto =
                            alto *
                            (MAXIMO / ancho);

                        ancho = MAXIMO;

                    }

                } else {

                    if (alto > MAXIMO) {

                        ancho =
                            ancho *
                            (MAXIMO / alto);

                        alto = MAXIMO;

                    }

                }

                const canvas =
                    document.createElement("canvas");

                canvas.width = ancho;
                canvas.height = alto;

                const contexto =
                    canvas.getContext("2d");

                contexto.drawImage(
                    imagenOriginal,
                    0,
                    0,
                    ancho,
                    alto
                );

                resolve(
                    canvas.toDataURL(
                        "image/jpeg",
                        0.75
                    )
                );

            };

            imagenOriginal.onerror = reject;

            imagenOriginal.src =
                evento.target.result;

        };

        lector.onerror = reject;

        lector.readAsDataURL(archivo);

    });

}
//=====================================
// GUARDAR PRODUCTO
//=====================================

async function guardarProducto() {

    const nombre = document
        .getElementById("producto")
        .value
        .trim();

        const categoria =
        document.getElementById("categoriaProducto").value;

    const precio = Number(
        document.getElementById("precio").value
    );

    const costo = Number(
        document.getElementById("costo").value
    );


    const stock = Number(
        document.getElementById("stock").value
    );

    const archivoImagen =
    document.getElementById("imagenProducto").files[0];

let imagen = "";

if (archivoImagen) {

    imagen = await convertirImagen(archivoImagen);

} else if (indiceEditar !== -1) {

    imagen =
        productos[indiceEditar]?.imagen || "";

}


    //==============================
    // VALIDAR DATOS
    //==============================

    if (nombre === "") {

        alert("Ingresa el nombre del producto");

        return;
    }

    if (categoria === "") {

    alert("Selecciona una categoría");

    return;
}


    if (precio <= 0) {

        alert("Ingresa un precio válido");

        return;
    }

    if (costo < 0 || !Number.isFinite(costo)) {
        alert("Ingresa un costo válido");
        document.getElementById("costo").focus();
        return;
    }

    if (costo >= precio) {
       alert("El costo debe ser menor que el precio de venta");
       
       return;
    }

    if (stock < 0) {

        alert("El stock no puede ser negativo");

        return;
    }

    //==============================
    // CREAR PRODUCTO
    //==============================
 const productoAnterior =
    indiceEditar !== -1
        ? productos[indiceEditar]
        : null;

const producto = {

    id: productoAnterior?.id || generarIdProducto(),

    nombre: nombre,

    precio: precio,

    costo: costo,

    stock: stock,

    categoria: categoria,

    imagen: imagen

};

    //==============================
    // AGREGAR O EDITAR
    //==============================

    if (indiceEditar === -1) {

        productos.push(producto);

    } else {

        productos[indiceEditar] = producto;

        indiceEditar = -1;

    }


    //==============================
    // GUARDAR
    //==============================

    localStorage.setItem(
        "productos",
        JSON.stringify(productos)
    );


    //==============================
    // ACTUALIZAR PANTALLA
    //==============================

    mostrarProductos();


    //==============================
    // LIMPIAR FORMULARIO
    //==============================

    document.getElementById("producto").value = "";

    document.getElementById("precio").value = "";

    document.getElementById("costo").value = "";

    document.getElementById("stock").value = "";

    document.getElementById("imagenProducto").value = "";

    document.getElementById("categoriaProducto").value = "";

}
//=====================================
// MOSTRAR PRODUCTOS
//=====================================

function mostrarProductos() {

    const cuerpo = document.getElementById("cuerpoProductos");

    const buscador = document
        .getElementById("buscarProducto")
        .value
        .toLowerCase()
        .trim();


    cuerpo.innerHTML = "";


    productos.forEach(function(producto, index) {

        if (
            !producto.nombre
                .toLowerCase()
                .includes(buscador)
        ) {

            return;

        }


        cuerpo.innerHTML += `

            <tr>

                <td>
                    ${producto.nombre}
                </td>

                <td>
                    $${Number(producto.precio).toFixed(2)}
                </td>

                <td>
                    ${producto.stock}
                </td>

                <td>

                    <button
                        class="btn-editar"
                        data-index="${index}"
                    >
                        ✏️ Editar
                    </button>


                    <button
                        class="btn-eliminar"
                        data-index="${index}"
                    >
                        🗑️ Eliminar
                    </button>

                </td>

            </tr>

        `;

    });
 

}

//=====================================
// EDITAR PRODUCTO
//=====================================

function editarProducto(index) {

    const producto = productos[index];

    if (!producto) {
        return;
    }

    document.getElementById("producto").value = producto.nombre;
    document.getElementById("precio").value = producto.precio;
    document.getElementById("costo").value = producto.costo;
    document.getElementById("stock").value = producto.stock;
    document.getElementById("categoriaProducto").value = producto.categoria;

    indiceEditar = index;

    document.getElementById("btnGuardarProducto").textContent = "💾 Guardar cambios";
}


//=====================================
// ELIMINAR PRODUCTO
//=====================================

function eliminarProducto(index) {

    const producto = productos[index];

    if (!producto) {
        return;
    }

    const confirmar = confirm(
        `¿Deseas eliminar el producto "${producto.nombre}"?`
    );

    if (!confirmar) {
        return;
    }

    productos.splice(index, 1);

    localStorage.setItem(
        "productos",
        JSON.stringify(productos)
    );

    mostrarProductos();
}
// RECUPERAR CATEGORÍAS DESDE EXCEL
//=====================================

function recuperarCategoriasExcel(filas) {

    if (!Array.isArray(filas) || filas.length === 0) {
        alert("El archivo de categorías está vacío.");
        return;
    }

    let actualizados = 0;
    let nuevos = 0;

    filas.forEach(function (fila) {

        const nombre = String(
            fila.PRODUCTO ??
            fila.Producto ??
            fila.producto ??
            ""
        ).trim();

        const categoria = String(
            fila.CATEGORIA ??
            fila.Categoría ??
            fila.Categoria ??
            fila.categoria ??
            ""
        ).trim();

        if (nombre === "" || categoria === "") {
            return;
        }

        const productoExistente =
            productos.find(function (producto) {

                return String(producto.nombre || "")
                    .trim()
                    .toLowerCase() ===
                    nombre.toLowerCase();

            });

        if (productoExistente) {

            productoExistente.categoria = categoria;

            actualizados++;

        } else {

            productos.push({

                id: generarIdProducto(),

                nombre: nombre,

                precio: Number(
                    fila.PRECIO ??
                    fila.Precio ??
                    0
                ) || 0,

                costo: 0,

                stock: Number(
                    fila.STOCK ??
                    fila.Stock ??
                    0
                ) || 0,

                categoria: categoria,

                imagen: ""

            });

            nuevos++;

        }

    });

    localStorage.setItem(
        "productos",
        JSON.stringify(productos)
    );

    mostrarProductos();

    alert(
        "Categorías recuperadas correctamente.\n\n" +
        "Productos actualizados: " + actualizados + "\n" +
        "Productos nuevos: " + nuevos
    );
}
//=====================================
// RECUPERAR COSTOS DESDE EXCEL MAESTRO
//=====================================

//=====================================
// RECUPERAR COSTOS DESDE EXCEL MAESTRO
//=====================================

function recuperarCostosDesdeMaestro(archivo) {

    const lector = new FileReader();

    lector.onload = function (e) {

        try {

            const datos = e.target.result;

            const libro = XLSX.read(datos, {
                type: "array"
            });

            // Buscar hoja Catalogo
            const nombreHoja = libro.SheetNames.find(
                nombre =>
                    nombre
                        .trim()
                        .toLowerCase() === "catalogo"
            );

            if (!nombreHoja) {

                alert(
                    "❌ No se encontró la hoja 'Catalogo' en el Excel maestro."
                );

                return;
            }

            console.log(
                "📋 Hoja utilizada para recuperar costos:",
                nombreHoja
            );

            const hoja = libro.Sheets[nombreHoja];

            const filas = XLSX.utils.sheet_to_json(
                hoja,
                {
                    defval: null,
                    range: 3
                }
            );

            console.log(
                "📊 Filas del catálogo maestro:",
                filas
            );

            // =====================================
            // CREAR MAPA DE COSTOS
            // =====================================

            const costosMaestro = {};

            filas.forEach(function (fila) {

                const nombre =
                    fila["Producto"] ??
                    fila["PRODUCTO"] ??
                    fila["producto"] ??
                    "";

                const costo =
                    fila["Costo unitario"] ??
                    fila["Costo Unitario"] ??
                    fila["COSTO UNITARIO"] ??
                    fila["Costo"] ??
                    fila["COSTO"] ??
                    null;

                const nombreNormalizado =
                    String(nombre)
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .trim()
                        .toLowerCase();

                const costoNumerico =
                    Number(costo);

                if (
                    nombreNormalizado !== "" &&
                    Number.isFinite(costoNumerico)
                ) {

                    costosMaestro[nombreNormalizado] =
                        costoNumerico;

                }

            });

            console.log(
                "💰 Costos encontrados en maestro:",
                Object.keys(costosMaestro).length
            );

            // =====================================
            // ACTUALIZAR INVENTARIO
            // =====================================

            let actualizados = 0;
            let noEncontrados = 0;

            productos.forEach(function (producto) {

                const nombreNormalizado =
                    String(producto.nombre || "")
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .trim()
                        .toLowerCase();

                if (
                    Object.prototype.hasOwnProperty.call(
                        costosMaestro,
                        nombreNormalizado
                    )
                ) {

                    producto.costo =
                        costosMaestro[nombreNormalizado];

                    actualizados++;

                } else {

                    noEncontrados++;

                    console.warn(
                        "⚠️ Producto sin costo en maestro:",
                        producto.nombre
                    );

                }

            });

            // =====================================
            // GUARDAR
            // =====================================

            localStorage.setItem(
                "productos",
                JSON.stringify(productos)
            );

            mostrarProductos();

            // =====================================
            // RESULTADOS
            // =====================================

            console.log(
                "🔄 Costos recuperados desde el maestro."
            );

            console.log(
                "Productos actualizados:",
                actualizados
            );

            console.log(
                "Productos no encontrados:",
                noEncontrados
            );

            alert(
                "✅ Recuperación completada.\n\n" +
                "Productos actualizados: " +
                actualizados +
                "\n" +
                "Productos no encontrados: " +
                noEncontrados +
                "\n\n" +
                "Solo se modificó el costo unitario."
            );

        } catch (error) {

            console.error(
                "❌ Error al recuperar costos:",
                error
            );

            alert(
                "❌ No se pudo leer el Excel maestro."
            );

        }

    };

    lector.readAsArrayBuffer(archivo);

}

// ========================================
// IMPORTAR PRODUCTOS DESDE EXCEL
// ========================================

function importarProductosExcel(filas) {

    if (!Array.isArray(filas) || filas.length === 0) {

        alert("No se encontraron productos en la hoja Catalogo.");

        return;
    }


    console.log(
        "📦 Productos normalizados:",
        filas
    );


    const productosImportados = [];


    filas.forEach(function (fila, index) {

        const nombre =
            String(fila.Producto || "").trim();

        const categoria =
            String(fila.Categoria || "").trim();

        const precio =
            Number(fila.Precio);

        const costo =
            Number(fila.Costo);

        const stock =
            Number(fila.Stock);


        // ==================================
        // VALIDAR FILA
        // ==================================

        if (
            nombre === "" ||
            !Number.isFinite(precio) ||
            precio <= 0 ||
            !Number.isFinite(costo) ||
            costo < 0 ||
            !Number.isFinite(stock) ||
            stock < 0
        ) {

            console.warn(
                `⚠️ Fila ${index + 1} ignorada: datos inválidos.`,
                fila
            );

            return;
        }


        // ==================================
        // CREAR PRODUCTO
        // ==================================
        productosImportados.push({

    id: fila.ID || generarIdProducto(),

    nombre: nombre,

    categoria:
        fila.Categoria ||
        fila.Categoría ||
        fila.CATEGORIA ||
        fila.CATEGORÍA ||
        "",

    precio: precio,

    costo: Number(fila.Costo) || 0,

    stock: stock

});

    });


    // ==================================
    // VERIFICAR RESULTADOS
    // ==================================

    if (productosImportados.length === 0) {

        alert(
            "No se encontraron productos válidos en la hoja Catalogo."
        );

        return;
    }


    console.log(
        "✅ Productos listos para importar:",
        productosImportados
    );


    // ==================================
    // CONFIRMAR IMPORTACIÓN
    // ==================================

    const confirmar = confirm(

        `📦 Productos encontrados: ${productosImportados.length}\n\n` +

        `Se importarán desde la hoja "Catalogo":\n` +

        `• Producto\n` +

        `• Categoría\n` +

        `• Precio de venta\n` +

        `• Costo unitario\n` +

        `• Inventario inicial + entradas\n\n` +

        `La utilidad y la comisión se calcularán automáticamente.\n\n` +

        `¿Deseas reemplazar el inventario actual?`

    );


    if (!confirmar) {

        console.log(
            "❌ Importación cancelada por el usuario."
        );

        return;
    }


    // ==================================
    // REEMPLAZAR INVENTARIO
    // ==================================

    const productosActualizados = productosImportados.map(
    function (productoImportado) {

        const productoExistente =
            productos.find(function (producto) {
                return producto.id === productoImportado.id;
            });

        if (productoExistente) {

            return {
                ...productoExistente,
                ...productoImportado,
                imagen: productoExistente.imagen || ""
            };

        }

        return {
            ...productoImportado,
            imagen: ""
        };

    }
);

productos = productosActualizados;

localStorage.setItem(
    "productos",
    JSON.stringify(productos)
);

    // ==================================
    // ACTUALIZAR PANTALLA
    // ==================================

    mostrarProductos();


    console.log(
        `✅ Importación completada: ${productos.length} productos.`
    );


    alert(
        `✅ Inventario actualizado correctamente.\n\n` +
        `Productos importados: ${productos.length}`
    );

}
function configurarEventosInventario() {

    const btnImportar = document.getElementById("btnImportarExcel");
    const inputExcel = document.getElementById("inputExcel");
    const btnExportar = document.getElementById("btnExportarExcel");
    const btnPlantilla = document.getElementById("btnPlantillaExcel");
    const btnGuardar = document.getElementById("btnGuardarProducto");
    const buscador = document.getElementById("buscarProducto");
    const btnRecuperarCategorias =
        document.getElementById("btnRecuperarCategorias");

    const btnRecuperarCostos =
        document.getElementById("btnRecuperarCostos");

    const inputMaestroCostos =
        document.getElementById("inputMaestroCostos");

    if (btnRecuperarCostos && inputMaestroCostos) {

        btnRecuperarCostos.addEventListener("click", function () {

        inputMaestroCostos.click();

    });

    inputMaestroCostos.addEventListener("change", function (evento) {

        const archivo = evento.target.files[0];

        if (!archivo) {
            return;
        }

        recuperarCostosDesdeMaestro(archivo);

    });

}

    btnRecuperarCategorias.addEventListener(
    "click",
    function () {

        const input =
            document.createElement("input");

        input.type = "file";
        input.accept = ".xlsx,.xls";

        input.addEventListener(
            "change",
            function (event) {

                const archivo =
                    event.target.files[0];

                if (!archivo) {
                    return;
                }

                const lector = new FileReader();

                lector.onload = function (e) {

                    try {

                        const datos =
                            new Uint8Array(
                                e.target.result
                            );

                        const libro =
                            XLSX.read(datos, {
                                type: "array"
                            });

                        const nombreHoja =
                            libro.SheetNames[0];

                        const hoja =
                            libro.Sheets[nombreHoja];

                        const filas =
                            XLSX.utils.sheet_to_json(
                                hoja
                            );

                        recuperarCategoriasExcel(
                            filas
                        );

                    } catch (error) {

                        console.error(
                            "Error al recuperar categorías:",
                            error
                        );

                        alert(
                            "No se pudo leer el archivo."
                        );

                    }

                };

                lector.readAsArrayBuffer(archivo);

            }
        );

        input.click();

    }
);


    console.log("Configurando eventos del inventario...");
    console.log("Botón guardar:", btnGuardar);

    //=================================
    // EDITAR Y ELIMINAR PRODUCTOS
    //=================================

    document
        .getElementById("cuerpoProductos")
        .addEventListener("click", function(event) {

            const botonEditar = event.target.closest(".btn-editar");
            const botonEliminar = event.target.closest(".btn-eliminar");

            if (botonEditar) {

                const index = Number(botonEditar.dataset.index);

                editarProducto(index);
            }

            if (botonEliminar) {

                const index = Number(botonEliminar.dataset.index);

                eliminarProducto(index);
            }

        });


    //=================================
    // IMPORTAR EXCEL
    //=================================

    btnImportar.addEventListener("click", function () {

        inputExcel.click();

    });

    inputExcel.addEventListener("change", function (evento) {

        const archivo = evento.target.files[0];

        if (!archivo) {
            console.log("❌ No se seleccionó archivo.");
            return;
        }

        console.log("📁 Archivo seleccionado:", archivo.name);

        const lector = new FileReader();

        lector.onload = function (e) {

            try {

                const datos = e.target.result;

                const libro = XLSX.read(datos, {
                    type: "array"
                });

                // ========================================
                // DETECTAR ESTRUCTURA DEL EXCEL
                // ========================================

                const hojas = libro.SheetNames.map(function(nombre) {
                    return nombre.trim().toLowerCase();
                });

                console.log("📚 Hojas disponibles:", libro.SheetNames);

                // ========================================
                // CASO 1: NUESTRO EXCEL
                // Tiene hoja "Catalogo"
                // ========================================

                const indiceCatalogo = hojas.indexOf("catalogo");

                if (indiceCatalogo !== -1) {

                    const nombreHoja = libro.SheetNames[indiceCatalogo];

                    console.log("📋 Excel detectado: CATALOGO");
                    console.log("📋 Hoja seleccionada:", nombreHoja);

                    const hoja = libro.Sheets[nombreHoja];

                    const filas = XLSX.utils.sheet_to_json(hoja, {
                        defval: null
                    });

                    console.log("📊 Datos de Catalogo:", filas);

                    // ========================================
                    // NORMALIZAR CATALOGO
                    // ========================================

                    const filasNormalizadas = filas.map(function(fila) {

                        const producto =
                            fila["Producto"] ??
                            fila["PRODUCTO"] ??
                            fila["producto"] ??
                            "";

                        const categoria =
                            Object.entries(fila).find(([clave]) =>
                                clave
                                    .normalize("NFD")
                                    .replace(/[\u0300-\u036f]/g, "")
                                    .trim()
                                    .toLowerCase() === "categoria"
                            )?.[1] ?? "";

                        const precio =
                            fila["Precio venta"] ??
                            fila["Precio Venta"] ??
                            fila["PRECIO VENTA"] ??
                            fila["Precio"] ??
                            fila["PRECIO"] ??
                            null;

                        const costo =
                            fila["Costo unitario"] ??
                            fila["Costo Unitario"] ??
                            fila["COSTO UNITARIO"] ??
                            fila["Costo"] ??
                            fila["COSTO"] ??
                            null;

                        const inventarioInicial =
                            fila["Inventario inicial"] ??
                            fila["Inventario Inicial"] ??
                            fila["INVENTARIO INICIAL"] ??
                            0;

                        const entradas =
                            fila["Entradas"] ??
                            fila["ENTRADAS"] ??
                            0;

                        return {
    ID:
        fila.ID ??
        fila.Id ??
        fila.id ??
        "",

    Producto:
        String(producto).trim(),

    Categoria:
        String(categoria).trim(),

    Precio:
        Number(precio),

    Costo:
        Number(
            fila.Costo ??
            fila["Costo unitario"] ??
            0
        ),

    Stock:
        Number(stock)
};

                    });

                    console.log(
                        "📦 Datos normalizados del Catalogo:",
                        filasNormalizadas
                    );

                    if (filasNormalizadas.length === 0) {
                        alert("El archivo no contiene productos.");
                        return;
                    }

                    const confirmar = confirm(
                        `📦 Productos encontrados: ${filasNormalizadas.length}\n\n` +
                        `¿Deseas importar estos productos al inventario?`
                    );

                    if (!confirmar) {
                        console.log("❌ Importación cancelada por el usuario.");
                        return;
                    }

                    console.log("✅ Usuario confirmó la importación.");
                    importarProductosExcel(filasNormalizadas);
                    return;
                }

                // ========================================
                // CASO 2: EXCEL DE ELLOS
                // Tiene hoja "Inventario"
                // ========================================

                const nombreHoja =
                    libro.SheetNames.find(nombre => {

                        const nombreNormalizado =
                            nombre
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .trim()
                                .toLowerCase();

                        return (
                            nombreNormalizado === "catalogo" ||
                            nombreNormalizado === "inventario"
                        );

                    });

                if (!nombreHoja) {

                    console.log(
                        "📚 Hojas encontradas en el maestro:",
                        libro.SheetNames
                    );

                    alert(
                        "❌ No se encontró una hoja compatible.\n\n" +
                        "Se esperaba 'Catalogo' o 'Inventario'."
                    );

                    return;
                }

                console.log(
                    "📋 Hoja utilizada para recuperar costos:",
                    nombreHoja
                );

                const hoja = libro.Sheets[nombreHoja];

                const filas = XLSX.utils.sheet_to_json(hoja, {
                    defval: null
                });

                const filasNormalizadas = filas.map(function(fila) {

                    const producto =
                        fila["Producto"] ??
                        fila["PRODUCTO"] ??
                        fila["producto"] ??
                        "";

                    const precio =
                        fila["Precio"] ??
                        fila["PRECIO"] ??
                        fila["precio"] ??
                        null;

                    const stock =
                        fila["Stock"] ??
                        fila["STOCK"] ??
                        fila["stock"] ??
                        0;

                    const categoria =
                        Object.entries(fila).find(([clave]) =>
                            clave
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .trim()
                                .toLowerCase() === "categoria"
                        )?.[1] ?? "";

                   return {
    ID:
        fila.ID ||
        fila.Id ||
        fila.id ||
        "",

    Producto:
        String(producto).trim(),

    Categoria:
        String(categoria).trim(),

    Precio:
        Number(precio),

    Costo:
        Number(
            fila.Costo ??
            fila["Costo unitario"] ??
            0
        ),

    Stock:
        Number(stock)
};

                });

                console.log(
                    "📦 Datos normalizados del Inventario:",
                    filasNormalizadas
                );

                if (filasNormalizadas.length === 0) {
                    alert("El archivo no contiene productos.");
                    return;
                }

                const confirmar = confirm(
                    `📦 Productos encontrados: ${filasNormalizadas.length}\n\n` +
                    `¿Deseas importar estos productos al inventario?`
                );

                if (!confirmar) {
                    console.log("❌ Importación cancelada por el usuario.");
                    return;
                }

                console.log("✅ Usuario confirmó la importación.");
                importarProductosExcel(filasNormalizadas);
                return;

            } catch (error) {

                console.error("Error al leer Excel:", error);
                alert("No se pudo leer el archivo Excel.");

            }

        };

        lector.readAsArrayBuffer(archivo);

        // Permitir volver a seleccionar el mismo archivo
        inputExcel.value = "";

    });

//=================================
// EXPORTAR EXCEL
//=================================

btnExportar.addEventListener("click", function () {

    if (productos.length === 0) {
        alert("No hay productos para exportar.");
        return;
    }

    const datosExcel = productos.map(function (producto) {

        return {
            ID: producto.id,
            Producto: producto.nombre,
            Categoria: producto.categoria || "",
            Precio: producto.precio,
            Costo: producto.costo || 0,
            Stock: producto.stock
        };

    });

    const hoja = XLSX.utils.json_to_sheet(datosExcel);

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Inventario"
    );

    XLSX.writeFile(
        libro,
        "SnackOffice_Inventario.xlsx"
    );

});

    //=================================
    // GUARDAR PRODUCTO
    //=================================

    btnGuardar.addEventListener("click", function () {

        console.log("🔥 CLICK EN AGREGAR PRODUCTO");

        guardarProducto();

    });


    //=================================
    // BUSCAR PRODUCTO
    //=================================

    buscador.addEventListener("input", function () {

        mostrarProductos();

    });

}

//=====================================
// EXPORTAR MÓDULO
//=====================================

export { iniciarInventario };
