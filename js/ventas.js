// =====================================
// SNACK OFFICE - MÓDULO DE VENTAS
// =====================================

// -------------------------------------
// ESTADO DEL MÓDULO
// -------------------------------------
let carrito = [];
let categoriaActual = "";
let metodoPago = "Efectivo";
let clienteVenta = "";

// -------------------------------------
// INICIALIZACIÓN
// -------------------------------------
export function iniciarVentas() {
    console.log("🛒 Módulo de ventas iniciado");

    configurarNavegacionVentas();
    configurarNuevaVenta();
    configurarMetodosPago();
    actualizarContadorCarrito();
}

// -------------------------------------
// NAVEGACIÓN
// -------------------------------------
function configurarNavegacionVentas() {
    const btnNuevaVenta = document.getElementById("btnNuevaVenta");
    const btnHistorialVentas = document.getElementById("btnHistorialVentas");
    const btnCancelarVenta = document.getElementById("btnCancelarVenta");

    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener("click", iniciarNuevaVenta);
    }

    if (btnHistorialVentas) {
        btnHistorialVentas.addEventListener("click", () => {
            mostrarPantallaVentas("historialVentasScreen");
            cargarHistorialVentas();
        });
    }

    if (btnCancelarVenta) {
        btnCancelarVenta.addEventListener("click", cancelarVenta);
    }
}

function iniciarNuevaVenta() {
    carrito = [];
    categoriaActual = "";
    clienteVenta = "";
    metodoPago = "Efectivo";

    const cliente = document.getElementById("clienteVenta");
    if (cliente) {
        cliente.value = "";
    }

    establecerMetodoPagoActivo("Efectivo");
    renderizarCarrito();
    mostrarPantallaVentas("nuevaVentaScreen");
    cargarProductosVenta();
}

function configurarNuevaVenta() {
    const btnRegistrarVenta = document.getElementById("btnRegistrarVenta");
    const buscador = document.getElementById("buscarProductoVenta");
    const categorias = document.querySelectorAll(".categoria-venta");
    const btnVolver = document.getElementById("btnVolverCategorias");

    if (btnRegistrarVenta) {
        btnRegistrarVenta.addEventListener("click", registrarVenta);
    }

    if (buscador) {
        buscador.addEventListener("input", () => {
            cargarProductosVenta(buscador.value);
        });
    }

    categorias.forEach(boton => {
        boton.addEventListener("click", () => {
            categoriaActual = boton.dataset.categoria || "";

            if (buscador) {
                buscador.value = "";
            }

            cargarProductosVenta();
        });
    });

    if (btnVolver) {
        btnVolver.addEventListener("click", () => {
            categoriaActual = "";

            if (buscador) {
                buscador.value = "";
            }

            cargarProductosVenta();
        });
    }
}

// -------------------------------------
// FORMAS DE PAGO
// -------------------------------------
function configurarMetodosPago() {
    const botonesPago = document.querySelectorAll(".btn-pago");

    botonesPago.forEach(boton => {
        boton.addEventListener("click", () => {
            establecerMetodoPagoActivo(boton.dataset.pago || "Efectivo");
        });
    });
}

function establecerMetodoPagoActivo(metodo) {
    metodoPago = metodo;

    const botonesPago = document.querySelectorAll(".btn-pago");

    botonesPago.forEach(boton => {
        boton.classList.toggle("activo", boton.dataset.pago === metodo);
    });
}

// -------------------------------------
// PANTALLAS
// -------------------------------------
function mostrarPantallaVentas(pantalla) {
    const pantallas = [
        "ventasInicio",
        "nuevaVentaScreen",
        "historialVentasScreen"
    ];

    pantallas.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.display = "none";
        }
    });

    const pantallaActiva = document.getElementById(pantalla);
    if (pantallaActiva) {
        pantallaActiva.style.display = "block";
    }
}

// -------------------------------------
// INVENTARIO Y PRODUCTOS
// -------------------------------------
function obtenerProductos() {
    return JSON.parse(localStorage.getItem("productos")) || [];
}

function cargarProductosVenta(textoBusqueda = "") {
    const contenedor = document.getElementById("listaProductosVenta");

    if (!contenedor) {
        console.warn("⚠️ No se encontró listaProductosVenta.");
        return;
    }

    const productos = obtenerProductos();
    const texto = textoBusqueda.trim().toLowerCase();

    let productosFiltrados = productos.filter(producto => {
        if (!categoriaActual) {
            return false;
        }

        return normalizarTexto(producto.categoria) === normalizarTexto(categoriaActual);
    });

    if (texto !== "") {
        productosFiltrados = productosFiltrados.filter(producto =>
            String(producto.nombre || "").toLowerCase().includes(texto)
        );
    }

    contenedor.innerHTML = "";

    if (!categoriaActual) {
        contenedor.innerHTML = `
            <div class="mensaje-ventas">
                <span>🛍️</span>
                <p>Selecciona una categoría para ver los productos.</p>
            </div>
        `;

        actualizarTituloCategoria();
        return;
    }

    if (productosFiltrados.length === 0) {
        contenedor.innerHTML = `
            <div class="mensaje-ventas">
                <span>🔎</span>
                <p>No se encontraron productos.</p>
            </div>
        `;

        actualizarTituloCategoria();
        return;
    }

    productosFiltrados.forEach(producto => {
        const tarjeta = crearTarjetaProducto(producto);
        contenedor.appendChild(tarjeta);
    });

    actualizarTituloCategoria();
}

function crearTarjetaProducto(producto) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "producto-venta";

    const imagen = producto.imagen
        ? `<img src="${producto.imagen}" alt="${producto.nombre}">`
        : `<span class="producto-icono">🛍️</span>`;

    tarjeta.innerHTML = `
        <div class="producto-info">
            <div class="producto-imagen">
                ${imagen}
            </div>

            <h3>${producto.nombre}</h3>

            <p class="producto-precio">
                $${Number(producto.precio).toFixed(2)}
            </p>

            <p class="producto-stock">
                Stock: ${producto.stock}
            </p>
        </div>

        <button type="button" class="btn-agregar-producto">
            ➕ Agregar
        </button>
    `;

    tarjeta.addEventListener("click", () => {
        agregarAlCarrito(producto);
    });

    return tarjeta;
}

function actualizarTituloCategoria() {
    const titulo = document.getElementById("tituloCategoria");

    if (!titulo) {
        return;
    }

    titulo.textContent = categoriaActual || "Productos disponibles";
}

function normalizarTexto(valor) {
    return String(valor || "").trim().toLowerCase();
}

// -------------------------------------
// CARRITO
// -------------------------------------
function agregarAlCarrito(producto) {
    const productoEnCarrito = carrito.find(
        item => item.nombre === producto.nombre
    );

    if (productoEnCarrito) {
        if (productoEnCarrito.cantidad >= Number(producto.stock)) {
            alert("⚠️ No hay más unidades disponibles de este producto.");
            return;
        }

        productoEnCarrito.cantidad++;
    } else {
        carrito.push({
            nombre: producto.nombre,
            precio: Number(producto.precio),
            stock: Number(producto.stock),
            cantidad: 1
        });
    }

    renderizarCarrito();
}

function actualizarContadorCarrito() {
    const contador = document.getElementById("contadorCarrito");

    if (!contador) {
        return;
    }

    const cantidad = carrito.reduce(
        (total, producto) => total + producto.cantidad,
        0
    );

    contador.textContent = cantidad;
}

function renderizarCarrito() {
    const contenedor = document.getElementById("carritoVenta");

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = "";

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <p>No hay productos agregados.</p>
        `;

        actualizarTotal();
        actualizarContadorCarrito();
        return;
    }

    carrito.forEach((producto, indice) => {
        const item = document.createElement("div");
        item.className = "item-carrito";

        const subtotal = producto.precio * producto.cantidad;

        item.innerHTML = `
            <div>
                <strong>${producto.nombre}</strong>

                <p>
                    $${producto.precio.toFixed(2)} × ${producto.cantidad}
                </p>

                <p>
                    Subtotal: $${subtotal.toFixed(2)}
                </p>
            </div>

            <div>
                <button type="button" data-accion="menos">➖</button>
                <button type="button" data-accion="mas">➕</button>
                <button type="button" data-accion="eliminar">🗑️</button>
            </div>
        `;

        item.querySelector('[data-accion="menos"]')
            .addEventListener("click", () => disminuirCantidad(indice));

        item.querySelector('[data-accion="mas"]')
            .addEventListener("click", () => aumentarCantidad(indice));

        item.querySelector('[data-accion="eliminar"]')
            .addEventListener("click", () => eliminarDelCarrito(indice));

        contenedor.appendChild(item);
    });

    actualizarTotal();
    actualizarContadorCarrito();
}

function aumentarCantidad(indice) {
    const producto = carrito[indice];

    if (!producto) {
        return;
    }

    if (producto.cantidad >= producto.stock) {
        alert("⚠️ No hay más stock disponible.");
        return;
    }

    producto.cantidad++;
    renderizarCarrito();
}

function disminuirCantidad(indice) {
    const producto = carrito[indice];

    if (!producto) {
        return;
    }

    if (producto.cantidad > 1) {
        producto.cantidad--;
    } else {
        carrito.splice(indice, 1);
    }

    renderizarCarrito();
}

function eliminarDelCarrito(indice) {
    carrito.splice(indice, 1);
    renderizarCarrito();
}

function cancelarVenta() {
    const confirmar = confirm("¿Deseas cancelar la venta actual?");

    if (!confirmar) {
        return;
    }

    carrito = [];
    clienteVenta = "";
    categoriaActual = "";
    metodoPago = "Efectivo";

    renderizarCarrito();
    mostrarPantallaVentas("ventasInicio");
}

function actualizarTotal() {
    const elemento = document.getElementById("totalVenta");

    if (!elemento) {
        return;
    }

    const total = carrito.reduce(
        (suma, producto) =>
            suma + producto.precio * producto.cantidad,
        0
    );

    elemento.textContent = `$${total.toFixed(2)}`;
}

// -------------------------------------
// REGISTRO DE VENTA
// -------------------------------------
function registrarVenta() {
    if (carrito.length === 0) {
        alert("⚠️ No hay productos en el carrito.");
        return;
    }

    const campoCliente = document.getElementById("clienteVenta");
    const cliente = campoCliente ? campoCliente.value.trim() : "";

    if (metodoPago === "Pendiente" && cliente === "") {
        alert("⚠️ Para una venta pendiente debes ingresar el nombre del cliente.");
        campoCliente?.focus();
        return;
    }

    const confirmar = confirm("¿Deseas registrar esta venta?");

    if (!confirmar) {
        return;
    }

    const productos = obtenerProductos();

    if (!verificarStockVenta(productos)) {
        return;
    }

    descontarStockVenta(productos);
    localStorage.setItem("productos", JSON.stringify(productos));

    guardarVentaHistorial();

    carrito = [];
    renderizarCarrito();
}

function verificarStockVenta(productos) {
    for (const productoCarrito of carrito) {
        const productoInventario = productos.find(
            producto => producto.nombre === productoCarrito.nombre
        );

        if (!productoInventario) {
            alert(
                `⚠️ No se encontró el producto "${productoCarrito.nombre}" en el inventario.`
            );
            return false;
        }

        if (Number(productoInventario.stock) < productoCarrito.cantidad) {
            alert(
                `⚠️ No hay suficiente stock de "${productoCarrito.nombre}".`
            );
            return false;
        }
    }

    return true;
}

function descontarStockVenta(productos) {
    for (const productoCarrito of carrito) {
        const productoInventario = productos.find(
            producto => producto.nombre === productoCarrito.nombre
        );

        productoInventario.stock =
            Number(productoInventario.stock) - productoCarrito.cantidad;
    }
}

// -------------------------------------
// HISTORIAL
// -------------------------------------
function guardarVentaHistorial() {
    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];

    const campoCliente = document.getElementById("clienteVenta");
    const cliente = campoCliente ? campoCliente.value.trim() : "";

    const botonPagoActivo = document.querySelector(".btn-pago.activo");
    const pagoRegistrado = botonPagoActivo
        ? botonPagoActivo.dataset.pago
        : metodoPago || "Efectivo";

    const total = carrito.reduce(
        (suma, producto) =>
            suma + Number(producto.precio) * Number(producto.cantidad),
        0
    );

    const venta = {
        id: Date.now(),
        fecha: new Date().toLocaleString("es-MX"),
        cliente: cliente || "Público general",
        metodoPago: pagoRegistrado,
        productos: carrito.map(producto => ({
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: producto.cantidad,
            subtotal: Number(producto.precio) * Number(producto.cantidad)
        })),
        total
    };

    historial.push(venta);
    localStorage.setItem("historialVentas", JSON.stringify(historial));
}

function cargarHistorialVentas() {
    const contenedor = document.getElementById("listaHistorialVentas");

    if (!contenedor) {
        return;
    }

    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];

    contenedor.innerHTML = "";

    if (historial.length === 0) {
        contenedor.innerHTML = `
            <p>No hay ventas registradas.</p>
        `;
        return;
    }

    historial
        .slice()
        .reverse()
        .forEach((venta, indice) => {
            const tarjeta = crearTarjetaHistorial(venta, historial.length - indice);
            contenedor.appendChild(tarjeta);
        });
}

function crearTarjetaHistorial(venta, numeroVenta) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "historial-venta";

    const productosHTML = (venta.productos || [])
        .map(producto => `
            <p>
                <strong>${producto.nombre}</strong> —
                ${producto.cantidad} ×
                $${Number(producto.precio).toFixed(2)} =
                $${Number(producto.subtotal).toFixed(2)}
            </p>
        `)
        .join("");

    tarjeta.innerHTML = `
        <div>
            <h3>🧾 Venta #${numeroVenta}</h3>

            <p>📅 ${venta.fecha}</p>

            <p>
                👤 <strong>Cliente:</strong>
                ${venta.cliente || "Público general"}
            </p>

            <p>
                💳 <strong>Forma de pago:</strong>
                ${venta.metodoPago || "Efectivo"}
            </p>

            <hr>

            <div>
                ${productosHTML}
            </div>

            <h3>
                Total: $${Number(venta.total).toFixed(2)}
            </h3>
        </div>
    `;

    return tarjeta;
}
