// =====================================
// SNACK OFFICE - MÓDULO DE VENTAS
// =====================================

import { registrarVentaEnJornada, registrarMovimientoCxC } from "./cortes-reportes.js";
import { supabase } from "./supabase.js";

// -------------------------------------
// CATEGORÍAS DE VENTA
// -------------------------------------
const ORDEN_CATEGORIAS_VENTA = [
    "Balance",
    "Frituras",
    "Galletas",
    "Pastelitos",
    "Premium",
    "Chicles",
    "Chocolates"
];

const ICONOS_CATEGORIA_VENTA = {
    "Balance": "🥤",
    "Frituras": "🥨",
    "Galletas": "🍪",
    "Pastelitos": "🍰",
    "Premium": "⭐",
    "Chicles": "🫧",
    "Chocolates": "🍫"
};

// -------------------------------------
// ESTADO DEL MÓDULO
// -------------------------------------
let carrito = [];
let categoriaActual = "";
let metodoPago = "Efectivo";
let clienteVenta = "";
let usarSaldoFavorVenta = false;
let clienteFavorSeleccionado = "";

// -------------------------------------
// INICIALIZACIÓN
// -------------------------------------
export async function iniciarVentas() {
    console.log("🛒 Módulo de ventas iniciado");

    await actualizarInventarioVentasDesdeSupabase();

    await cargarCxCDesdeSupabase();
    migrarCuentasPendientes();
    sincronizarClientes();
    configurarNavegacionVentas();
    configurarNuevaVenta();
    configurarMetodosPago();
    configurarEventosCxc();
    actualizarContadorCarrito();
}

// -------------------------------------
// EVENTOS CxC
// -------------------------------------
function configurarEventosCxc() {
    if (window.__snackOfficeCxcEventos) return;

    window.__snackOfficeCxcEventos = true;

    document.addEventListener("click", evento => {
        const boton = evento.target.closest(".btn-abonar-estado");
        if (!boton) return;

        evento.preventDefault();
        evento.stopPropagation();

        registrarAbonoPendiente(boton.dataset.cuenta || "");
    });
}

// -------------------------------------
// NAVEGACIÓN
// -------------------------------------
function configurarNavegacionVentas() {
    const btnNuevaVenta = document.getElementById("btnNuevaVenta");
    const btnHistorialVentas = document.getElementById("btnHistorialVentas");
    const btnPendientesVentas = document.getElementById("btnPendientesVentas");
    const btnClientesVentas = document.getElementById("btnClientesVentas");
    const btnCancelarVenta = document.getElementById("btnCancelarVenta");

    if (btnNuevaVenta) {
        btnNuevaVenta.addEventListener("click", async () => {
            await iniciarNuevaVenta();
        });
    }

    if (btnHistorialVentas) {
        btnHistorialVentas.addEventListener("click", () => {
            mostrarPantallaVentas("historialVentasScreen");
            cargarHistorialVentas();
        });
    }

    if (btnPendientesVentas) {
        btnPendientesVentas.addEventListener("click", async () => {
            mostrarPantallaVentas("pendientesVentasScreen");
            await cargarPendientesVentas();
        });
    }

    if (btnClientesVentas) {
        btnClientesVentas.addEventListener("click", () => {
            mostrarPantallaVentas("clientesVentasScreen");
            cargarClientesVentas();
        });
    }

    if (btnCancelarVenta) {
        btnCancelarVenta.addEventListener("click", cancelarVenta);
    }
}

async function iniciarNuevaVenta() {
    const inventarioActualizado = await actualizarInventarioVentasDesdeSupabase();
    if (!inventarioActualizado) return;

    carrito = [];
    categoriaActual = "";
    clienteVenta = "";
    metodoPago = "Efectivo";
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";

    const cliente = document.getElementById("clienteVenta");
    if (cliente) {
        cliente.value = "";
    }

    actualizarAvisoCliente();
    actualizarResumenPagoVenta();
    establecerMetodoPagoActivo("Efectivo");
    renderizarCarrito();
    mostrarPantallaVentas("nuevaVentaScreen");
    renderizarCategoriasVenta();
    cargarProductosVenta();
}

function configurarNuevaVenta() {
    const btnRegistrarVenta = document.getElementById("btnRegistrarVenta");
    const buscador = document.getElementById("buscarProductoVenta");
    const contenedorCategorias = document.getElementById("categoriasVenta");
    const btnVolver = document.getElementById("btnVolverCategorias");

    if (btnRegistrarVenta) {
        btnRegistrarVenta.addEventListener("click", registrarVenta);
    }

    if (buscador) {
        buscador.addEventListener("input", () => {
            cargarProductosVenta(buscador.value);
        });
    }

    const campoCliente = document.getElementById("clienteVenta");

    if (campoCliente) {
        campoCliente.addEventListener("input", actualizarAvisoCliente);
        campoCliente.addEventListener("blur", actualizarAvisoCliente);
    }

    const btnUsarSaldoFavor = document.getElementById("btnUsarSaldoFavorVenta");
    if (btnUsarSaldoFavor) {
        btnUsarSaldoFavor.addEventListener("click", () => {
            const nombre = campoCliente?.value.trim() || "";
            const resumen = obtenerResumenCliente(nombre);
            if (resumen.favor <= 0) {
                usarSaldoFavorVenta = false;
                actualizarAvisoCliente();
                return;
            }
            usarSaldoFavorVenta = !usarSaldoFavorVenta;
            clienteFavorSeleccionado = normalizarTexto(nombre);
            actualizarAvisoCliente();
            actualizarResumenPagoVenta();
        });
    }

    const buscarCliente = document.getElementById("buscarClienteVentas");
    if (buscarCliente) {
        buscarCliente.addEventListener("input", cargarClientesVentas);
    }

    document.getElementById("btnRefrescarClientes")?.addEventListener("click", cargarClientesVentas);

    document.getElementById("btnCerrarModalAbono")?.addEventListener("click", cerrarModalAbono);
    document.getElementById("btnCancelarAbonoCxc")?.addEventListener("click", cerrarModalAbono);
    document.getElementById("btnConfirmarAbonoCxc")?.addEventListener("click", confirmarAbonoCxc);
    document.getElementById("modalAbonoCxc")?.addEventListener("click", evento => {
        if (evento.target.id === "modalAbonoCxc") cerrarModalAbono();
    });

    document.getElementById("btnVolverClientes")?.addEventListener("click", () => {
        mostrarPantallaVentas("clientesVentasScreen");
        cargarClientesVentas();
    });

    if (contenedorCategorias && !contenedorCategorias.dataset.eventoConfigurado) {
        contenedorCategorias.dataset.eventoConfigurado = "true";

        contenedorCategorias.addEventListener("click", evento => {
            const boton = evento.target.closest(".categoria-venta");
            if (!boton) return;

            categoriaActual = boton.dataset.categoria || "";

            if (buscador) {
                buscador.value = "";
            }

            cargarProductosVenta();
        });
    }

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
        "historialVentasScreen",
        "pendientesVentasScreen",
        "clientesVentasScreen",
        "estadoCuentaClienteScreen"
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

async function actualizarInventarioVentasDesdeSupabase() {
    const { data, error } = await supabase
        .from("productos")
        .select("id,nombre,categoria,precio,costo,stock,imagen,fecha_caducidad")
        .order("id", { ascending: true });

    if (error) {
        console.error("❌ Error actualizando inventario para ventas:", error);
        alert("❌ No se pudo actualizar el inventario desde Supabase.\n\nRevisa la conexión con la base central.");
        return false;
    }

    const productosLocales = obtenerProductos();
    const imagenesLocales = new Map(
        productosLocales
            .filter(p => p && p.id && p.imagen)
            .map(p => [p.id, p.imagen])
    );

    const productosActualizados = (data || []).map(producto => ({
        id: String(producto.id),
        nombre: String(producto.nombre || ""),
        categoria: String(producto.categoria || ""),
        precio: Number(producto.precio) || 0,
        costo: Number(producto.costo) || 0,
        stock: Number(producto.stock) || 0,
        imagen: producto.imagen || imagenesLocales.get(String(producto.id)) || "",
        fecha_caducidad: producto.fecha_caducidad || null
    }));

    localStorage.setItem("productos", JSON.stringify(productosActualizados));
    renderizarCategoriasVenta();
    console.log(`☁️ Inventario de ventas actualizado: ${productosActualizados.length} productos.`);
    return true;
}

function renderizarCategoriasVenta() {
    const contenedor = document.getElementById("categoriasVenta");

    if (!contenedor) return;

    const productos = obtenerProductos();
    const conteo = new Map();

    productos.forEach(producto => {
        const categoria = String(producto?.categoria || "").trim();
        if (!categoria) return;

        conteo.set(categoria, (conteo.get(categoria) || 0) + 1);
    });

    const categorias = [...conteo.keys()].sort((a, b) => {
        const ia = ORDEN_CATEGORIAS_VENTA.indexOf(a);
        const ib = ORDEN_CATEGORIAS_VENTA.indexOf(b);

        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b, "es", { sensitivity: "base" });
    });

    contenedor.innerHTML = categorias.map(categoria => {
        const cantidad = conteo.get(categoria) || 0;
        const icono = ICONOS_CATEGORIA_VENTA[categoria] || "🛍️";
        const textoProductos = cantidad === 1 ? "producto" : "productos";

        return `
            <button type="button" class="categoria-venta" data-categoria="${categoria}">
                <span>${icono}</span>
                <strong>${categoria}</strong>
                <small>${cantidad} ${textoProductos}</small>
            </button>
        `;
    }).join("");

    console.log("📂 Categorías de ventas actualizadas:", categorias);
}

async function actualizarStockVentaEnSupabase() {
    const ids = [...new Set(carrito.map(producto => producto.id).filter(Boolean))];

    if (ids.length !== carrito.length) {
        alert("⚠️ No se pudo identificar uno de los productos de la venta. Actualiza el inventario e inténtalo nuevamente.");
        return false;
    }

    const { data, error } = await supabase
        .from("productos")
        .select("id,nombre,stock")
        .in("id", ids);

    if (error) {
        console.error("❌ Error consultando stock central:", error);
        alert("❌ No se pudo verificar el stock central. La venta no se registró.");
        return false;
    }

    const registrosActualizados = [];

    for (const productoCarrito of carrito) {
        const productoCentral = (data || []).find(
            producto => String(producto.id) === String(productoCarrito.id)
        );

        if (!productoCentral) {
            alert(`⚠️ No se encontró \"${productoCarrito.nombre}\" en Supabase. La venta no se registró.`);
            return false;
        }

        const stockActual = Number(productoCentral.stock);
        const cantidad = Number(productoCarrito.cantidad);

        if (!Number.isFinite(stockActual) || stockActual < cantidad) {
            alert(`⚠️ No hay suficiente stock de \"${productoCentral.nombre}\". Stock actual: ${stockActual}.`);
            return false;
        }

        registrosActualizados.push({
            id: productoCentral.id,
            stock: stockActual - cantidad
        });
    }

    const { error: updateError } = await supabase
        .from("productos")
        .upsert(registrosActualizados, { onConflict: "id" });

    if (updateError) {
        console.error("❌ Error actualizando stock en Supabase:", updateError);
        alert(`❌ No se pudo actualizar el stock central. La venta no se registró.\n\n${updateError.message}`);
        return false;
    }

    const productosLocales = obtenerProductos();
    registrosActualizados.forEach(actualizado => {
        const local = productosLocales.find(
            producto => String(producto.id) === String(actualizado.id)
        );
        if (local) local.stock = actualizado.stock;
    });
    localStorage.setItem("productos", JSON.stringify(productosLocales));

    return true;
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
            id: producto.id,
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
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";

    renderizarCarrito();
    mostrarPantallaVentas("ventasInicio");
}

function obtenerTotalVenta() {
    return carrito.reduce(
        (suma, producto) => suma + Number(producto.precio) * Number(producto.cantidad),
        0
    );
}

function actualizarTotal() {
    const elemento = document.getElementById("totalVenta");
    if (elemento) elemento.textContent = `$${obtenerTotalVenta().toFixed(2)}`;
    actualizarResumenPagoVenta();
}

function actualizarResumenPagoVenta() {
    const caja = document.getElementById("resumenPagoVenta");
    const subtotal = document.getElementById("subtotalVentaResumen");
    const aplicado = document.getElementById("saldoFavorAplicadoVenta");
    const restante = document.getElementById("restanteVentaResumen");
    if (!caja || !subtotal || !aplicado || !restante) return;

    const total = obtenerTotalVenta();
    const nombre = document.getElementById("clienteVenta")?.value.trim() || "";
    const resumen = obtenerResumenCliente(nombre);
    const usar = usarSaldoFavorVenta && clienteFavorSeleccionado === normalizarTexto(nombre);
    const montoAplicado = usar ? Math.min(resumen.favor, total) : 0;
    const montoRestante = Math.max(0, total - montoAplicado);

    if (total <= 0 || (montoAplicado <= 0 && resumen.favor <= 0)) {
        caja.style.display = "none";
        return;
    }

    caja.style.display = "grid";
    subtotal.textContent = `$${total.toFixed(2)}`;
    aplicado.textContent = `$${montoAplicado.toFixed(2)}`;
    restante.textContent = `$${montoRestante.toFixed(2)}`;
}

// -------------------------------------
// REGISTRO DE VENTA
// -------------------------------------
async function registrarVenta() {
    if (carrito.length === 0) {
        alert("⚠️ No hay productos en el carrito.");
        return;
    }

    const campoCliente = document.getElementById("clienteVenta");
    const cliente = campoCliente ? campoCliente.value.trim() : "";
    const resumenCliente = obtenerResumenCliente(cliente);
    const saldoAplicable = usarSaldoFavorVenta && cliente ? Math.min(resumenCliente.favor, obtenerTotalVenta()) : 0;
    const restante = Math.max(0, obtenerTotalVenta() - saldoAplicable);

    if (metodoPago === "Pendiente" && cliente === "") {
        alert("⚠️ Para una venta pendiente debes ingresar el nombre del cliente.");
        campoCliente?.focus();
        return;
    }

    if (restante > 0 && metodoPago === "Pendiente" && cliente === "") {
        alert("⚠️ Ingresa el cliente para registrar el saldo pendiente.");
        campoCliente?.focus();
        return;
    }

    const confirmar = confirm(
        `¿Deseas registrar esta venta?\n\nTotal: $${obtenerTotalVenta().toFixed(2)}\nSaldo a favor aplicado: $${saldoAplicable.toFixed(2)}\nRestante: $${restante.toFixed(2)}`
    );

    if (!confirmar) return;

    const inventarioActualizado = await actualizarInventarioVentasDesdeSupabase();
    if (!inventarioActualizado) return;

    const productos = obtenerProductos();
    if (!verificarStockVenta(productos)) return;

    const stockActualizado = await actualizarStockVentaEnSupabase();
    if (!stockActualizado) return;

    if (saldoAplicable > 0) {
        consumirSaldoFavorCliente(cliente, saldoAplicable);
    }

    const ventaRegistrada = await guardarVentaHistorial({ saldoFavorAplicado: saldoAplicable, restante });
    if (!ventaRegistrada) return;

    if (ventaRegistrada && restante > 0 && metodoPago === "Pendiente") {
        guardarCuentaPendiente(ventaRegistrada);
    }

    registrarCliente(cliente, ventaRegistrada);

    if (document.getElementById("clientesVentasScreen")?.style.display !== "none") {
        cargarClientesVentas();
    }

    carrito = [];
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";
    renderizarCarrito();
    actualizarAvisoCliente();
    actualizarResumenPagoVenta();
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
async function guardarVentaHistorial(opciones = {}) {
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

    const saldoFavorAplicado = Number(opciones.saldoFavorAplicado || 0);
    const restante = Number.isFinite(Number(opciones.restante)) ? Number(opciones.restante) : total;
    const esPendiente = pagoRegistrado === "Pendiente" && restante > 0;
    const metodoFinal = restante <= 0 && saldoFavorAplicado > 0 ? "Saldo a favor" : pagoRegistrado;
    const desglosePago = [];

    if (saldoFavorAplicado > 0) desglosePago.push({ metodo: "Saldo a favor", importe: saldoFavorAplicado });
    if (restante > 0) desglosePago.push({ metodo: metodoFinal, importe: restante });

    let venta = {
        id: Date.now(),
        fecha: new Date().toLocaleString("es-MX"),
        fechaISO: new Date().toISOString(),
        cliente: cliente || "Público general",
        metodoPago: metodoFinal,
        desglosePago,
        saldoFavorAplicado,
        totalCobrado: restante > 0 && !esPendiente ? restante : 0,
        productos: carrito.map(producto => ({
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: producto.cantidad,
            subtotal: Number(producto.precio) * Number(producto.cantidad)
        })),
        total,
        estadoPago: esPendiente ? "Pendiente" : "Pagado",
        abonado: esPendiente ? 0 : restante,
        saldo: esPendiente ? restante : 0,
        saldoFavor: 0
    };

    venta = registrarVentaEnJornada(venta);

    const centralGuardada = await guardarVentaEnSupabase(venta);
    if (!centralGuardada) return null;

    historial.push(venta);
    localStorage.setItem("historialVentas", JSON.stringify(historial));

    if (esPendiente) {
        const movimiento = {
            tipo: "VENTA",
            cliente: venta.cliente,
            ventaId: venta.id,
            importe: Number(venta.saldo || venta.total),
            metodoPago: "Pendiente",
            saldoDespues: Number(venta.saldo),
            fecha: new Date().toISOString()
        };

        registrarMovimientoCxC(movimiento);
        const movimientoCentral = await guardarMovimientoCxCSupabase(movimiento);
        if (!movimientoCentral) return null;
    }

    return venta;
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

// -------------------------------------
// CUENTAS PENDIENTES
// -------------------------------------
function obtenerCuentasPendientes() {
    return JSON.parse(localStorage.getItem("cuentasPendientes")) || [];
}

// -------------------------------------
// CxC CENTRALIZADO EN SUPABASE
// -------------------------------------
async function guardarVentaEnSupabase(venta) {
    const registro = {
        id: Number(venta.id),
        folio: venta.folio || String(venta.id),
        fecha: new Date(venta.fechaISO || Date.now()).toISOString(),
        cliente: venta.cliente || "Público general",
        metodo_pago: venta.metodoPago || "Efectivo",
        desglose_pago: venta.desglosePago || [],
        saldo_favor_aplicado: Number(venta.saldoFavorAplicado || 0),
        total_cobrado: Number(venta.totalCobrado || 0),
        total: Number(venta.total || 0),
        estado_pago: venta.estadoPago || "Pagado",
        abonado: Number(venta.abonado || 0),
        saldo: Number(venta.saldo || 0),
        saldo_favor: Number(venta.saldoFavor || 0),
        productos: venta.productos || [],
        jornada_id: venta.jornadaId ? String(venta.jornadaId) : null
    };

    const { error } = await supabase.from("ventas").upsert(registro, { onConflict: "id" });

    if (error) {
        console.error("❌ Error guardando venta en Supabase:", error);
        alert(`❌ La venta se guardó localmente, pero no pudo sincronizarse con Supabase.\n\n${error.message}`);
        return false;
    }

    return true;
}

async function guardarMovimientoCxCSupabase(movimiento) {
    const registro = {
        venta_id: Number(movimiento.ventaId),
        cliente: movimiento.cliente || "Cliente sin nombre",
        tipo: movimiento.tipo || "MOVIMIENTO",
        fecha: new Date(movimiento.fecha || Date.now()).toISOString(),
        importe: Number(movimiento.importe || 0),
        metodo_pago: movimiento.metodoPago || null,
        saldo_despues: Number(movimiento.saldoDespues || 0),
        saldo_favor_despues: Number(movimiento.saldoFavorDespues || 0)
    };

    const { error } = await supabase.from("movimientos_cxc").insert(registro);

    if (error) {
        console.error("❌ Error guardando movimiento CxC en Supabase:", error);
        alert(`⚠️ El movimiento quedó localmente, pero no pudo sincronizarse con Supabase.\n\n${error.message}`);
        return false;
    }

    return true;
}

async function cargarCxCDesdeSupabase() {
    const { data: ventasCentral, error: ventasError } = await supabase
        .from("ventas")
        .select("id,folio,fecha,cliente,metodo_pago,desglose_pago,saldo_favor_aplicado,total_cobrado,total,estado_pago,abonado,saldo,saldo_favor,productos,jornada_id")
        .order("fecha", { ascending: true });

    if (ventasError) {
        console.error("❌ Error cargando ventas centrales:", ventasError);
        return false;
    }

    if (!ventasCentral || ventasCentral.length === 0) {
        return true;
    }

    const idsCxc = ventasCentral
        .filter(v => Number(v.saldo || 0) > 0 || Number(v.saldo_favor || 0) > 0 || v.estado_pago === "Pendiente")
        .map(v => Number(v.id));

    let movimientos = [];
    if (idsCxc.length) {
        const { data: movimientosCentral, error: movimientosError } = await supabase
            .from("movimientos_cxc")
            .select("id,venta_id,cliente,tipo,fecha,importe,metodo_pago,saldo_despues,saldo_favor_despues")
            .in("venta_id", idsCxc)
            .order("fecha", { ascending: true });

        if (movimientosError) {
            console.error("❌ Error cargando movimientos CxC:", movimientosError);
            return false;
        }

        movimientos = movimientosCentral || [];
    }

    const cuentas = ventasCentral
        .filter(v => Number(v.saldo || 0) > 0 || Number(v.saldo_favor || 0) > 0 || v.estado_pago === "Pendiente")
        .map(v => ({
            id: Number(v.id),
            ventaId: v.folio || v.id,
            jornadaId: v.jornada_id || "",
            cliente: v.cliente || "Cliente sin nombre",
            fecha: v.fecha ? new Date(v.fecha).toLocaleString("es-MX") : "",
            fechaISO: v.fecha || "",
            total: Number(v.total || 0),
            abonado: Number(v.abonado || 0),
            saldo: Number(v.saldo || 0),
            saldoFavor: Number(v.saldo_favor || 0),
            estado: v.saldo_favor > 0 && Number(v.saldo || 0) <= 0 ? "Saldo a favor" : (Number(v.saldo || 0) > 0 ? "Pendiente" : "Pagado"),
            productos: v.productos || [],
            movimientos: movimientos
                .filter(m => Number(m.venta_id) === Number(v.id))
                .map(m => ({
                    tipo: m.tipo,
                    fecha: m.fecha,
                    importe: Number(m.importe || 0),
                    metodoPago: m.metodo_pago || "",
                    saldoDespues: Number(m.saldo_despues || 0),
                    saldoFavorDespues: Number(m.saldo_favor_despues || 0)
                }))
        }));

    const cuentasLocales = obtenerCuentasPendientes();
    const cuentasMap = new Map(cuentasLocales.map(c => [String(c.id), c]));
    cuentas.forEach(cuenta => cuentasMap.set(String(cuenta.id), cuenta));
    localStorage.setItem("cuentasPendientes", JSON.stringify(Array.from(cuentasMap.values())));

    // Las ventas centrales se mezclan con el historial local existente.
    // Así no borramos datos históricos mientras terminamos la migración.
    const historial = ventasCentral.map(v => ({
        id: Number(v.id),
        folio: v.folio || v.id,
        fecha: v.fecha ? new Date(v.fecha).toLocaleString("es-MX") : "",
        fechaISO: v.fecha || "",
        cliente: v.cliente || "Público general",
        metodoPago: v.metodo_pago || "Efectivo",
        desglosePago: v.desglose_pago || [],
        saldoFavorAplicado: Number(v.saldo_favor_aplicado || 0),
        totalCobrado: Number(v.total_cobrado || 0),
        total: Number(v.total || 0),
        estadoPago: v.estado_pago || "Pagado",
        abonado: Number(v.abonado || 0),
        saldo: Number(v.saldo || 0),
        saldoFavor: Number(v.saldo_favor || 0),
        productos: v.productos || [],
        jornadaId: v.jornada_id || ""
    }));

    const historialLocal = JSON.parse(localStorage.getItem("historialVentas")) || [];
    const historialMap = new Map(historialLocal.map(v => [String(v.id), v]));
    historial.forEach(venta => historialMap.set(String(venta.id), venta));
    localStorage.setItem("historialVentas", JSON.stringify(Array.from(historialMap.values())));
    return true;
}

function migrarCuentasPendientes() {
    const cuentas = obtenerCuentasPendientes();
    let cambio = false;

    cuentas.forEach(cuenta => {
        if (!Array.isArray(cuenta.movimientos)) {
            cuenta.movimientos = [
                {
                    tipo: "VENTA",
                    fecha: new Date().toISOString(),
                    importe: Number(cuenta.total || 0),
                    metodoPago: "Pendiente"
                }
            ];

            const abonado = Number(cuenta.abonado || 0);
            if (abonado > 0) {
                cuenta.movimientos.push({
                    tipo: "ABONO",
                    fecha: new Date().toISOString(),
                    importe: abonado,
                    metodoPago: "No registrado"
                });
            }

            cambio = true;
        }
    });

    if (cambio) {
        localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
    }
}

function guardarCuentaPendiente(venta) {
    const cuentas = obtenerCuentasPendientes();

    const saldoInicial = Number(venta.saldo || Math.max(0, Number(venta.total) - Number(venta.saldoFavorAplicado || 0)));

    cuentas.push({
        id: venta.id,
        ventaId: venta.folio || venta.id,
        jornadaId: venta.jornadaId || "",
        cliente: venta.cliente,
        fecha: venta.fecha,
        total: Number(venta.total),
        abonado: 0,
        saldo: saldoInicial,
        saldoFavor: 0,
        estado: "Pendiente",
        productos: venta.productos || [],
        movimientos: [
            ...(Number(venta.saldoFavorAplicado || 0) > 0 ? [{
                tipo: "USO_SALDO_FAVOR",
                fecha: new Date().toISOString(),
                importe: Number(venta.saldoFavorAplicado),
                metodoPago: "Saldo a favor"
            }] : []),
            {
                tipo: "VENTA",
                fecha: new Date().toISOString(),
                importe: saldoInicial,
                metodoPago: "Pendiente"
            }
        ]
    });

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
}

function consumirSaldoFavorCliente(nombre, monto) {
    let restante = Number(monto || 0);
    if (restante <= 0) return 0;

    const cuentas = obtenerCuentasPendientes();
    const nombreNormalizado = normalizarTexto(nombre);

    for (const cuenta of cuentas) {
        if (restante <= 0) break;
        if (normalizarTexto(cuenta.cliente) !== nombreNormalizado) continue;

        const favor = Number(cuenta.saldoFavor || 0);
        if (favor <= 0) continue;

        const usado = Math.min(favor, restante);
        cuenta.saldoFavor = favor - usado;
        cuenta.estado = Number(cuenta.saldo || 0) > 0 ? "Pendiente" : (cuenta.saldoFavor > 0 ? "Saldo a favor" : "Pagado");
        cuenta.movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];
        cuenta.movimientos.push({
            tipo: "USO_SALDO_FAVOR",
            fecha: new Date().toISOString(),
            importe: usado,
            metodoPago: "Saldo a favor",
            saldoDespues: Number(cuenta.saldo || 0),
            saldoFavorDespues: cuenta.saldoFavor
        });

        registrarMovimientoCxC({
            tipo: "USO_SALDO_FAVOR",
            cliente: cuenta.cliente,
            ventaId: cuenta.ventaId || cuenta.id,
            importe: usado,
            metodoPago: "Saldo a favor",
            saldoDespues: Number(cuenta.saldo || 0),
            saldoFavorDespues: cuenta.saldoFavor
        });

        restante -= usado;
    }

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
    return Number(monto || 0) - restante;
}

function registrarCliente(nombre, venta) {
    const limpio = String(nombre || "").trim();
    if (!limpio || !venta || limpio.toLowerCase() === "público general") return;

    const clientes = JSON.parse(localStorage.getItem("clientesSnackOffice")) || [];
    const clave = normalizarTexto(limpio);
    let cliente = clientes.find(item => item.clave === clave);

    if (!cliente) {
        cliente = { clave, nombre: limpio, compras: 0, totalCompras: 0, ultimaCompra: "" };
        clientes.push(cliente);
    }

    cliente.nombre = limpio;
    cliente.compras = Number(cliente.compras || 0) + 1;
    cliente.totalCompras = Number(cliente.totalCompras || 0) + Number(venta.total || 0);
    cliente.ultimaCompra = venta.fecha || new Date().toLocaleString("es-MX");
    localStorage.setItem("clientesSnackOffice", JSON.stringify(clientes));
}

function sincronizarClientes() {
    const clientesMap = new Map();
    const agregarVenta = venta => {
        const nombre = String(venta.cliente || "").trim();
        if (!nombre || normalizarTexto(nombre) === "publico general") return;
        const clave = normalizarTexto(nombre);
        const actual = clientesMap.get(clave) || { clave, nombre, compras: 0, totalCompras: 0, ultimaCompra: "" };
        actual.nombre = nombre;
        actual.compras += 1;
        actual.totalCompras += Number(venta.total || 0);
        actual.ultimaCompra = venta.fecha || actual.ultimaCompra;
        clientesMap.set(clave, actual);
    };

    (JSON.parse(localStorage.getItem("historialVentas")) || []).forEach(agregarVenta);
    (JSON.parse(localStorage.getItem("jornadasArchivadas")) || []).forEach(j => (j.ventas || []).forEach(agregarVenta));
    (JSON.parse(localStorage.getItem("cuentasPendientes")) || []).forEach(c => {
        const nombre = String(c.cliente || "").trim();
        if (!nombre) return;
        const clave = normalizarTexto(nombre);
        if (!clientesMap.has(clave)) clientesMap.set(clave, { clave, nombre, compras: 0, totalCompras: 0, ultimaCompra: c.fecha || "" });
    });

    const clientes = Array.from(clientesMap.values());
    localStorage.setItem("clientesSnackOffice", JSON.stringify(clientes));
    return clientes;
}

function cargarClientesVentas() {
    const contenedor = document.getElementById("listaClientesVentas");
    if (!contenedor) return;

    const clientes = sincronizarClientes();
    const filtro = normalizarTexto(document.getElementById("buscarClienteVentas")?.value || "");
    const cuentas = obtenerCuentasPendientes();

    const datos = clientes.map(cliente => {
        const relacionadas = cuentas.filter(c => normalizarTexto(c.cliente) === cliente.clave);
        return {
            ...cliente,
            deuda: relacionadas.reduce((s, c) => s + Math.max(0, Number(c.saldo || 0)), 0),
            favor: relacionadas.reduce((s, c) => s + Math.max(0, Number(c.saldoFavor || 0)), 0)
        };
    }).filter(c => !filtro || normalizarTexto(c.nombre).includes(filtro));

    const total = document.getElementById("totalClientesVentas");
    const compras = document.getElementById("clientesConComprasVentas");
    const deuda = document.getElementById("deudaClientesVentas");
    const favor = document.getElementById("favorClientesVentas");
    if (total) total.textContent = clientes.length;
    if (compras) compras.textContent = clientes.filter(c => c.compras > 0).length;
    if (deuda) deuda.textContent = `$${datos.reduce((s,c)=>s+c.deuda,0).toFixed(2)}`;
    if (favor) favor.textContent = `$${datos.reduce((s,c)=>s+c.favor,0).toFixed(2)}`;

    contenedor.innerHTML = datos.length ? datos.map(c => `
        <article class="cliente-card-ventas">
            <div class="cliente-card-principal">
                <div class="cliente-avatar">👤</div>
                <div><h3>${c.nombre}</h3><p>${c.compras} compra${c.compras === 1 ? "" : "s"} · Última: ${c.ultimaCompra || "—"}</p></div>
            </div>
            <div class="cliente-card-metricas">
                <div><small>Total comprado</small><strong>$${c.totalCompras.toFixed(2)}</strong></div>
                <div><small>Pendiente</small><strong class="cliente-deuda">$${c.deuda.toFixed(2)}</strong></div>
                <div><small>A favor</small><strong class="cliente-favor">$${c.favor.toFixed(2)}</strong></div>
            </div>

            <div class="cliente-card-acciones">
                <button
                    type="button"
                    class="btn-ver-estado-cuenta"
                    data-cliente="${c.clave}">
                    📄 Ver estado de cuenta
                </button>
            </div>
        </article>
    `).join("") : `<div class="clientes-vacio">👥<h3>No hay clientes para mostrar</h3><p>Los compradores con nombre aparecerán aquí automáticamente.</p></div>`;

    contenedor.querySelectorAll(".btn-ver-estado-cuenta").forEach(boton => {
        boton.addEventListener("click", () => {
            mostrarPantallaVentas("estadoCuentaClienteScreen");
            cargarEstadoCuentaCliente(boton.dataset.cliente || "");
        });
    });
}

function cargarEstadoCuentaCliente(claveCliente) {
    const contenedor = document.getElementById("detalleEstadoCuentaCliente");
    const titulo = document.getElementById("nombreEstadoCuentaCliente");

    if (!contenedor) return;

    const clientes = sincronizarClientes();
    const cliente = clientes.find(c => c.clave === claveCliente);

    if (!cliente) {
        contenedor.innerHTML = `
            <div class="clientes-vacio">
                👤
                <h3>Cliente no encontrado</h3>
                <p>No fue posible recuperar la información del cliente.</p>
            </div>
        `;
        return;
    }

    if (titulo) {
        titulo.textContent = cliente.nombre;
    }

    const cuentas = obtenerCuentasPendientes()
        .filter(c => normalizarTexto(c.cliente) === cliente.clave);

    const deuda = cuentas.reduce((s, c) => s + Math.max(0, Number(c.saldo || 0)), 0);
    const favor = cuentas.reduce((s, c) => s + Math.max(0, Number(c.saldoFavor || 0)), 0);

    const resumenTotal = document.getElementById("estadoCuentaTotalComprado");
    const resumenDeuda = document.getElementById("estadoCuentaDeuda");
    const resumenFavor = document.getElementById("estadoCuentaFavor");

    if (resumenTotal) resumenTotal.textContent = `$${Number(cliente.totalCompras || 0).toFixed(2)}`;
    if (resumenDeuda) resumenDeuda.textContent = `$${deuda.toFixed(2)}`;
    if (resumenFavor) resumenFavor.textContent = `$${favor.toFixed(2)}`;

    const cuentasHTML = cuentas.length
        ? cuentas.map(cuenta => {
            const total = Number(cuenta.total || 0);
            const abonado = Number(cuenta.abonado || 0);
            const saldo = Math.max(0, Number(cuenta.saldo || 0));
            const saldoFavor = Math.max(0, Number(cuenta.saldoFavor || 0));
            const pagada = saldo <= 0;
            const movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];

            const movimientosHTML = movimientos.length
                ? movimientos.map(m => `
                    <div class="movimiento-cxc">
                        <span>${m.tipo === "VENTA" ? "🧾" : "💵"} ${m.tipo || "MOVIMIENTO"}</span>
                        <span>${m.metodoPago || "—"}</span>
                        <strong>${m.tipo === "VENTA" ? "+" : "-"}$${Number(m.importe || 0).toFixed(2)}</strong>
                    </div>
                `).join("")
                : `<p class="movimiento-cxc-vacio">Sin movimientos registrados.</p>`;

            return `
                <article class="estado-cuenta-card">
                    <div>
                        <h3>📒 Venta #${obtenerNumeroVentaPendiente(cuenta.id)}</h3>
                        <p>📅 ${cuenta.fecha || "—"}</p>
                        <p>🧾 Total: <strong>$${total.toFixed(2)}</strong></p>
                        <p>💵 Abonado: <strong>$${abonado.toFixed(2)}</strong></p>
                        <p class="saldo-pendiente">💰 Saldo: <strong>$${saldo.toFixed(2)}</strong></p>
                        ${saldoFavor > 0 ? `<p class="saldo-favor-pendiente">🟢 A favor: <strong>$${saldoFavor.toFixed(2)}</strong></p>` : ""}

                        <details class="historial-cxc-detalle">
                            <summary>Ver movimientos</summary>
                            <div class="movimientos-cxc-lista">${movimientosHTML}</div>
                        </details>
                    </div>

                    <div class="estado-cuenta-acciones">
                        ${
                            !pagada
                                ? `<button type="button" class="btn-abonar-estado" data-cuenta="${cuenta.id}">💵 Registrar abono</button>`
                                : saldoFavor > 0
                                    ? `<span>✓ Liquidada · A favor $${saldoFavor.toFixed(2)}</span>`
                                    : `<span>✓ Cuenta liquidada</span>`
                        }
                    </div>
                </article>
            `;
        }).join("")
        : `
            <div class="clientes-vacio">
                📄
                <h3>Sin cuentas a crédito</h3>
                <p>Este cliente no tiene cuentas pendientes registradas.</p>
            </div>
        `;

    contenedor.innerHTML = `
        <div class="estado-cuenta-resumen-cuentas">
            <h2>📒 Cuentas del cliente</h2>
            ${cuentasHTML}
        </div>

        <div class="estado-cuenta-movimientos">
            <h2>📌 Resumen</h2>
            <div class="movimientos-cxc-lista">
                <div class="movimiento-cxc">
                    <span>🛒 Compras</span>
                    <span>${cliente.compras || 0}</span>
                    <strong>$${Number(cliente.totalCompras || 0).toFixed(2)}</strong>
                </div>
                <div class="movimiento-cxc">
                    <span>💰 Deuda actual</span>
                    <span>Saldo</span>
                    <strong>$${deuda.toFixed(2)}</strong>
                </div>
                <div class="movimiento-cxc">
                    <span>🟢 Saldo a favor</span>
                    <span>Disponible</span>
                    <strong>$${favor.toFixed(2)}</strong>
                </div>
            </div>
        </div>
    `;

    contenedor.querySelectorAll(".btn-abonar-estado").forEach(boton => {
        boton.addEventListener("click", () => {
            registrarAbonoPendiente(boton.dataset.cuenta);
            cargarEstadoCuentaCliente(claveCliente);
        });
    });
}

async function cargarPendientesVentas() {
    const contenedor = document.getElementById("listaPendientesVentas");

    if (!contenedor) return;

    await cargarCxCDesdeSupabase();
    const cuentas = obtenerCuentasPendientes();
    actualizarResumenPendientes(cuentas);
    contenedor.innerHTML = "";

    if (cuentas.length === 0) {
        contenedor.innerHTML = `
            <div class="mensaje-pendientes">
                <span>📒</span>
                <h3>No hay cuentas pendientes</h3>
                <p>Las ventas registradas como pendientes aparecerán aquí.</p>
            </div>
        `;
        return;
    }

    cuentas.slice().reverse().forEach(cuenta => {
        contenedor.appendChild(crearTarjetaPendiente(cuenta));
    });
}

function actualizarResumenPendientes(cuentas) {
    const activas = cuentas.filter(cuenta => Number(cuenta.saldo) > 0);
    const saldoTotal = activas.reduce(
        (suma, cuenta) => suma + Number(cuenta.saldo || 0),
        0
    );
    const abonadoTotal = cuentas.reduce(
        (suma, cuenta) => suma + Number(cuenta.abonado || 0),
        0
    );

    const favorTotal = cuentas.reduce(
        (suma, cuenta) => suma + Number(cuenta.saldoFavor || 0),
        0
    );

    const cantidad = document.getElementById("totalCuentasPendientes");
    const saldo = document.getElementById("saldoPendienteTotal");
    const abonado = document.getElementById("totalAbonadoPendientes");
    const favor = document.getElementById("saldoFavorTotal");

    if (cantidad) cantidad.textContent = activas.length;
    if (saldo) saldo.textContent = `$${saldoTotal.toFixed(2)}`;
    if (abonado) abonado.textContent = `$${abonadoTotal.toFixed(2)}`;
    if (favor) favor.textContent = `$${favorTotal.toFixed(2)}`;
}

function crearTarjetaPendiente(cuenta) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "pendiente-venta";

    const total = Number(cuenta.total || 0);
    const abonado = Number(cuenta.abonado || 0);
    const saldo = Number(cuenta.saldo || 0);
    const saldoFavor = Number(cuenta.saldoFavor || 0);
    const pagada = saldo <= 0 && saldoFavor <= 0;
    const tieneFavor = saldoFavor > 0;

    const movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];
    const movimientosHTML = movimientos.length
        ? movimientos.map(movimiento => `
            <div class="movimiento-cxc">
                <span>${movimiento.tipo === "VENTA" ? "🧾" : "💵"} ${movimiento.tipo || "MOVIMIENTO"}</span>
                <span>${movimiento.metodoPago || "—"}</span>
                <strong>${movimiento.tipo === "VENTA" ? "+" : "-"}$${Number(movimiento.importe || 0).toFixed(2)}</strong>
            </div>
        `).join("")
        : `<p class="movimiento-cxc-vacio">Sin movimientos registrados.</p>`;

    tarjeta.innerHTML = `
        <div class="pendiente-venta-info">
            <div class="pendiente-venta-cabecera">
                <div>
                    <h3>📒 ${cuenta.cliente || "Cliente sin nombre"}</h3>
                    <p>Venta #${obtenerNumeroVentaPendiente(cuenta.id)}</p>
                </div>
                <span class="estado-pendiente ${pagada ? "pagado" : ""} ${tieneFavor ? "favor" : ""}">
                    ${tieneFavor ? "Saldo a favor" : pagada ? "Pagado" : "Pendiente"}
                </span>
            </div>

            <p>📅 ${cuenta.fecha}</p>
            <p>🧾 Total: <strong>$${total.toFixed(2)}</strong></p>
            <p>💵 Abonado: <strong>$${abonado.toFixed(2)}</strong></p>
            ${saldo > 0 ? `<p class="saldo-pendiente">💰 Saldo: <strong>$${saldo.toFixed(2)}</strong></p>` : ""}
            ${tieneFavor ? `<p class="saldo-favor-pendiente">🟢 A favor: <strong>$${saldoFavor.toFixed(2)}</strong></p>` : ""}

            <details class="historial-cxc-detalle">
                <summary>Ver movimientos</summary>
                <div class="movimientos-cxc-lista">${movimientosHTML}</div>
            </details>
        </div>

        <div class="pendiente-venta-acciones">
            ${
                tieneFavor
                    ? `<span class="pendiente-liquidada">✓ Cuenta liquidada · A favor $${saldoFavor.toFixed(2)}</span>`
                    : pagada
                        ? `<span class="pendiente-liquidada">✓ Cuenta liquidada</span>`
                        : `<button type="button" class="btn-abonar-pendiente">💵 Registrar abono</button>`
            }
        </div>
    `;

    const btnAbonar = tarjeta.querySelector(".btn-abonar-pendiente");
    if (btnAbonar) {
        btnAbonar.addEventListener("click", () => registrarAbonoPendiente(cuenta.id));
    }

    return tarjeta;
}

function obtenerNumeroVentaPendiente(idVenta) {
    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];
    const venta = historial.find(item => item.id === idVenta);
    return venta?.folio || idVenta || "—";
}

async function registrarAbonoPendiente(idCuenta) {
    await cargarCxCDesdeSupabase();
    const cuentas = obtenerCuentasPendientes();
    const cuenta = cuentas.find(item => String(item.id) === String(idCuenta));
    if (!cuenta) return;

    const saldoActual = Number(cuenta.saldo || 0);
    const saldoFavorActual = Number(cuenta.saldoFavor || 0);

    if (saldoActual <= 0) {
        alert(saldoFavorActual > 0
            ? `Esta cuenta ya está liquidada y tiene $${saldoFavorActual.toFixed(2)} a favor.`
            : "Esta cuenta ya está liquidada.");
        return;
    }

    abrirModalAbono(cuenta);
}

function abrirModalAbono(cuenta) {
    const modal = document.getElementById("modalAbonoCxc");
    const nombre = document.getElementById("modalAbonoCliente");
    const saldo = document.getElementById("modalAbonoSaldo");
    const monto = document.getElementById("montoAbonoCxc");
    const metodo = document.getElementById("metodoAbonoCxc");
    if (!modal || !monto || !metodo) {
        crearModalAbonoCxc();
    }

    const modalReal = document.getElementById("modalAbonoCxc");
    const montoReal = document.getElementById("montoAbonoCxc");
    const metodoReal = document.getElementById("metodoAbonoCxc");

    if (!modalReal || !montoReal || !metodoReal) {
        alert("⚠️ No se pudo abrir el registro de abono. Actualiza Snack Office con Ctrl + Shift + R.");
        return;
    }

    const nombreReal = document.getElementById("modalAbonoCliente");
    const saldoReal = document.getElementById("modalAbonoSaldo");

    if (nombreReal) nombreReal.textContent = cuenta.cliente || "Cliente sin nombre";
    if (saldoReal) saldoReal.textContent = `$${Number(cuenta.saldo || 0).toFixed(2)}`;
    modalReal.dataset.cuentaId = cuenta.id;
    montoReal.value = "";
    metodoReal.value = "Efectivo";
    modalReal.style.display = "flex";
    setTimeout(() => montoReal.focus(), 50);
}

function crearModalAbonoCxc() {
    if (document.getElementById("modalAbonoCxc")) return;

    const modal = document.createElement("div");
    modal.id = "modalAbonoCxc";
    modal.className = "modal-abono-cxc";
    modal.style.cssText = [
        "position:fixed",
        "inset:0",
        "z-index:99999",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:20px",
        "background:rgba(7,26,65,.52)"
    ].join(";");

    modal.innerHTML = `
        <div style="
            position:relative;
            width:min(440px,100%);
            padding:28px;
            border-radius:20px;
            background:#fff;
            box-shadow:0 25px 70px rgba(7,26,65,.25);
            box-sizing:border-box;
            font-family:inherit;
        ">
            <button type="button" id="btnCerrarModalAbono" style="
                position:absolute;top:12px;right:14px;width:34px;height:34px;
                border:0;border-radius:50%;background:#f1f5f9;color:#475569;
                font-size:24px;cursor:pointer;
            ">×</button>

            <div style="font-size:27px;margin-bottom:10px;">💵</div>
            <h2 style="margin:0;color:#071a41;">Registrar abono</h2>
            <p id="modalAbonoCliente" style="color:#64748b;font-weight:700;">Cliente</p>

            <div style="
                margin:16px 0;padding:14px 16px;border:1px solid #fed7aa;
                border-radius:12px;background:#fff7ed;
            ">
                <small style="display:block;color:#9a3412;font-weight:700;">Saldo pendiente</small>
                <strong id="modalAbonoSaldo" style="display:block;color:#ea580c;font-size:24px;">$0.00</strong>
            </div>

            <label style="display:block;margin:12px 0 6px;font-weight:800;color:#334155;">
                Monto del abono
            </label>
            <input type="number" id="montoAbonoCxc" min="0.01" step="0.01" placeholder="0.00"
                style="width:100%;min-height:44px;padding:10px 12px;border:1px solid #dbe2ea;border-radius:10px;box-sizing:border-box;">

            <label style="display:block;margin:12px 0 6px;font-weight:800;color:#334155;">
                Forma de pago
            </label>
            <select id="metodoAbonoCxc"
                style="width:100%;min-height:44px;padding:10px 12px;border:1px solid #dbe2ea;border-radius:10px;box-sizing:border-box;">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Tarjeta">💳 Tarjeta</option>
                <option value="Transferencia">🔄 Transferencia</option>
            </select>

            <p style="color:#64748b;font-size:12px;line-height:1.45;">
                Si el abono supera el saldo, el excedente se conservará como saldo a favor.
            </p>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button type="button" id="btnCancelarAbonoCxc"
                    style="padding:10px 15px;border:0;border-radius:10px;background:#eef2f7;color:#475569;font-weight:800;cursor:pointer;">
                    Cancelar
                </button>
                <button type="button" id="btnConfirmarAbonoCxc"
                    style="padding:10px 15px;border:0;border-radius:10px;background:#ff5a16;color:#fff;font-weight:800;cursor:pointer;">
                    💵 Registrar abono
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("btnCerrarModalAbono")?.addEventListener("click", cerrarModalAbono);
    document.getElementById("btnCancelarAbonoCxc")?.addEventListener("click", cerrarModalAbono);
    document.getElementById("btnConfirmarAbonoCxc")?.addEventListener("click", confirmarAbonoCxc);
}

function cerrarModalAbono() {
    const modal = document.getElementById("modalAbonoCxc");
    if (modal) {
        modal.style.display = "none";
        modal.dataset.cuentaId = "";
    }
}

async function confirmarAbonoCxc() {
    const modal = document.getElementById("modalAbonoCxc");
    const montoInput = document.getElementById("montoAbonoCxc");
    const metodoInput = document.getElementById("metodoAbonoCxc");
    if (!modal || !montoInput || !metodoInput) return;

    const cuentas = obtenerCuentasPendientes();
    const cuenta = cuentas.find(item => String(item.id) === String(modal.dataset.cuentaId));
    if (!cuenta) {
        cerrarModalAbono();
        return;
    }

    const monto = Number(montoInput.value);
    const metodoPagoAbono = metodoInput.value;

    if (!Number.isFinite(monto) || monto <= 0) {
        alert("⚠️ Ingresa un monto válido mayor a cero.");
        montoInput.focus();
        return;
    }

    const saldoActual = Number(cuenta.saldo || 0);
    const nuevoSaldo = Math.max(0, saldoActual - monto);
    const excedente = Math.max(0, monto - saldoActual);

    cuenta.abonado = Number(cuenta.abonado || 0) + monto;
    cuenta.saldo = nuevoSaldo;
    cuenta.saldoFavor = Number(cuenta.saldoFavor || 0) + excedente;
    cuenta.estado = nuevoSaldo > 0 ? "Pendiente" : "Pagado";
    cuenta.movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : [];

    cuenta.movimientos.push({
        tipo: "ABONO",
        fecha: new Date().toISOString(),
        importe: monto,
        metodoPago: metodoPagoAbono,
        saldoDespues: nuevoSaldo,
        saldoFavorDespues: cuenta.saldoFavor
    });

    const { error: ventaUpdateError } = await supabase
        .from("ventas")
        .update({
            abonado: Number(cuenta.abonado),
            saldo: Number(cuenta.saldo),
            saldo_favor: Number(cuenta.saldoFavor),
            estado_pago: cuenta.saldoFavor > 0 ? "Saldo a favor" : cuenta.estado
        })
        .eq("id", Number(cuenta.id));

    if (ventaUpdateError) {
        console.error("❌ Error actualizando cuenta en Supabase:", ventaUpdateError);
        alert(`❌ No se pudo actualizar la cuenta central. El abono no se aplicó.\n\n${ventaUpdateError.message}`);
        return;
    }

    const movimientoCentral = await guardarMovimientoCxCSupabase({
        tipo: "ABONO",
        cliente: cuenta.cliente,
        ventaId: cuenta.id,
        importe: monto,
        metodoPago: metodoPagoAbono,
        saldoDespues: nuevoSaldo,
        saldoFavorDespues: cuenta.saldoFavor,
        fecha: new Date().toISOString()
    });

    if (!movimientoCentral) return;

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));

    registrarMovimientoCxC({
        tipo: "ABONO",
        cliente: cuenta.cliente,
        ventaId: cuenta.ventaId || cuenta.id,
        importe: monto,
        metodoPago: metodoPagoAbono,
        saldoDespues: nuevoSaldo,
        saldoFavorDespues: cuenta.saldoFavor
    });

    actualizarVentaHistorialConAbono(cuenta);
    cerrarModalAbono();
    cargarPendientesVentas();
    actualizarAvisoCliente();

    const estado = document.getElementById("estadoCuentaClienteScreen");
    if (estado && estado.style.display !== "none") {
        cargarEstadoCuentaCliente(normalizarTexto(cuenta.cliente || ""));
    }

    if (excedente > 0) {
        alert(`✅ Abono registrado. La cuenta quedó liquidada y el cliente tiene $${cuenta.saldoFavor.toFixed(2)} a favor.`);
    } else if (nuevoSaldo === 0) {
        alert("✅ Cuenta liquidada correctamente.");
    } else {
        alert(`✅ Abono registrado. Saldo restante: $${nuevoSaldo.toFixed(2)}`);
    }
}


function actualizarVentaHistorialConAbono(cuenta) {
    const historial =
        JSON.parse(localStorage.getItem("historialVentas")) || [];
    const venta = historial.find(item => item.id === cuenta.id);

    if (!venta) return;

    venta.abonado = Number(cuenta.abonado);
    venta.saldo = Number(cuenta.saldo);
    venta.saldoFavor = Number(cuenta.saldoFavor || 0);
    venta.estadoPago = cuenta.saldoFavor > 0 ? "Saldo a favor" : cuenta.estado;

    localStorage.setItem("historialVentas", JSON.stringify(historial));
}

// -------------------------------------
// ESTADO DEL CLIENTE
// -------------------------------------
function obtenerResumenCliente(nombre) {
    const clienteNormalizado = normalizarTexto(nombre);

    if (!clienteNormalizado) {
        return { deuda: 0, favor: 0 };
    }

    const cuentas = obtenerCuentasPendientes();

    return cuentas
        .filter(cuenta => normalizarTexto(cuenta.cliente) === clienteNormalizado)
        .reduce(
            (resumen, cuenta) => {
                resumen.deuda += Math.max(0, Number(cuenta.saldo || 0));
                resumen.favor += Math.max(0, Number(cuenta.saldoFavor || 0));
                return resumen;
            },
            { deuda: 0, favor: 0 }
        );
}

function actualizarAvisoCliente() {
    const campoCliente = document.getElementById("clienteVenta");
    const aviso = document.getElementById("estadoClienteVenta");
    const cajaFavor = document.getElementById("saldoFavorVentaBox");
    const montoFavor = document.getElementById("saldoFavorDisponibleVenta");
    const botonFavor = document.getElementById("btnUsarSaldoFavorVenta");

    if (!campoCliente || !aviso) return;

    const nombre = campoCliente.value.trim();
    const normalizado = normalizarTexto(nombre);

    if (clienteFavorSeleccionado && clienteFavorSeleccionado !== normalizado) {
        usarSaldoFavorVenta = false;
        clienteFavorSeleccionado = "";
    }

    if (!nombre) {
        aviso.style.display = "none";
        aviso.textContent = "";
        aviso.className = "estado-cliente-venta";
        if (cajaFavor) cajaFavor.style.display = "none";
        actualizarResumenPagoVenta();
        return;
    }

    const resumen = obtenerResumenCliente(nombre);
    const deuda = resumen.deuda;
    const favor = resumen.favor;

    if (deuda > 0 && favor > 0) {
        aviso.style.display = "block";
        aviso.className = "estado-cliente-venta aviso-mixto";
        aviso.textContent = `⚠️ Debe $${deuda.toFixed(2)} · 🟢 Tiene $${favor.toFixed(2)} a favor`;
    } else if (deuda > 0) {
        aviso.style.display = "block";
        aviso.className = "estado-cliente-venta aviso-deuda";
        aviso.textContent = `⚠️ Cliente con saldo pendiente: $${deuda.toFixed(2)}`;
    } else if (favor > 0) {
        aviso.style.display = "block";
        aviso.className = "estado-cliente-venta aviso-favor";
        aviso.textContent = `🟢 Cliente con saldo a favor: $${favor.toFixed(2)}`;
    } else {
        aviso.style.display = "none";
        aviso.textContent = "";
        aviso.className = "estado-cliente-venta";
    }

    if (cajaFavor && montoFavor && botonFavor) {
        if (favor > 0) {
            cajaFavor.style.display = "flex";
            montoFavor.textContent = `$${favor.toFixed(2)}`;
            botonFavor.textContent = usarSaldoFavorVenta ? "No usar saldo a favor" : "Usar saldo a favor";
            botonFavor.classList.toggle("activo", usarSaldoFavorVenta);
        } else {
            cajaFavor.style.display = "none";
        }
    }

    actualizarResumenPagoVenta();
}

