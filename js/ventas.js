// =====================================
// SNACK OFFICE - MÓDULO DE VENTAS
// =====================================

import { registrarVentaEnJornada, registrarMovimientoCxC } from "./cortes-reportes.js?v=20261010-nitro1";
import { supabase } from "./supabase.js?v=20261007-1";

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
let catalogoClientesCentral = [];
let promocionesActivasVentas = [];
let promocionActivaCarrito = null;
// Evita que dos clics rápidos inicien ventas concurrentes en esta pestaña.
// No sustituye la idempotencia del lado de PostgreSQL.
let registroVentaEnCurso = false;

// -------------------------------------
// INICIALIZACIÓN
// -------------------------------------
export async function iniciarVentas() {
    console.log("🛒 Módulo de ventas iniciado");

    // Los controles quedan conectados aunque una consulta remota falle.
    configurarNavegacionVentas();
    configurarNuevaVenta();
    configurarMetodosPago();
    configurarEventosCxc();
    configurarPromocionVenta();
    actualizarContadorCarrito();
    try { await cargarPromocionesActivasVentas(); } catch (error) { console.error("No se pudieron cargar promociones activas:", error); }

    try { await actualizarInventarioVentasDesdeSupabase(); }
    catch (error) { console.error("No se pudo sincronizar inventario al iniciar Ventas:", error); }
    try { await cargarCatalogoClientesCentral(); }
    catch (error) { console.error("No se pudo cargar catálogo de clientes:", error); }
    try { await cargarCxCDesdeSupabase(); }
    catch (error) { console.error("No se pudo cargar CxC al iniciar Ventas:", error); }
    migrarCuentasPendientes();
    sincronizarClientes();
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
    const btnClientesVentas = document.getElementById("btnClientesVentas");
    const btnCancelarVenta = document.getElementById("btnCancelarVenta");

    if (btnNuevaVenta && btnNuevaVenta.dataset.inicializado !== "true") {
        btnNuevaVenta.dataset.inicializado = "true";
        btnNuevaVenta.addEventListener("click", async () => { await iniciarNuevaVenta(); });
    }

    if (btnHistorialVentas && btnHistorialVentas.dataset.inicializado !== "true") {
        btnHistorialVentas.dataset.inicializado = "true";
        btnHistorialVentas.addEventListener("click", () => {
            mostrarPantallaVentas("historialVentasScreen"); cargarHistorialVentas();
        });
    }

    if (btnClientesVentas && btnClientesVentas.dataset.inicializado !== "true") {
        btnClientesVentas.dataset.inicializado = "true";
        btnClientesVentas.addEventListener("click", async () => {
            mostrarPantallaVentas("clientesVentasScreen");
            try { await cargarCatalogoClientesCentral(); } catch (error) { console.warn("No se pudo actualizar catálogo de clientes:", error); }
            cargarClientesVentas();
        });
    }

    if (btnCancelarVenta && btnCancelarVenta.dataset.inicializado !== "true") {
        btnCancelarVenta.dataset.inicializado = "true";
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
    const promoRegla = document.getElementById("promocionVentaRegla"); if (promoRegla) promoRegla.textContent = "Consultando promociones vigentes...";
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

async function cargarCatalogoClientesCentral() {
    try {
        const { data, error } = await supabase
            .from("clientes")
            .select("nombre,clave_normalizada,numero_original")
            .eq("activo", true)
            .order("nombre");
        if (error) {
            // El catálogo central se instala como parte de la preparación del Excel definitivo.
            console.info("Catálogo central de clientes todavía no instalado; se mantiene compatibilidad temporal.", error.message);
            return;
        }
        catalogoClientesCentral = data || [];
        const campo = document.getElementById("clienteVenta");
        if (!campo) return;
        let lista = document.getElementById("clientesCatalogoOpciones");
        if (!lista) {
            lista = document.createElement("datalist");
            lista.id = "clientesCatalogoOpciones";
            campo.insertAdjacentElement("afterend", lista);
            campo.setAttribute("list", lista.id);
        }
        lista.innerHTML = catalogoClientesCentral.map(c => `<option value="${String(c.nombre || "").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}"></option>`).join("");
    } catch (error) {
        console.warn("No se pudo cargar el catálogo central de clientes:", error);
    }
}

const REGLAS_PROMOCION_VENTA = {
    NINGUNA: "No hay una promoción aplicable a los productos del carrito.",
    "2x1": "2 × 1: por cada 2 unidades participantes, la unidad de menor precio queda gratis. Se pueden combinar productos incluidos.",
    "3x2": "3 × 2: por cada 3 unidades participantes, se cobran las 2 más caras. Se pueden combinar productos incluidos.",
    "4x3": "4 × 3: por cada 4 unidades participantes, se cobran las 3 más caras. Se pueden combinar productos incluidos.",
    "PRECIO_PROMO": "Precio promocional configurado por Administración para el conjunto de productos participantes."
};

async function cargarPromocionesActivasVentas() {
    const { data, error } = await supabase.from("promociones_configuracion")
        .select("id,nombre,tipo,producto_ids,precio_promocional,activa")
        .eq("activa", true).order("updated_at", { ascending: false });
    if (error) throw error;
    promocionesActivasVentas = data || [];
    cargarProductosVenta(document.getElementById("buscarProductoVenta")?.value || "");
    actualizarResumenPromocionVenta();
}

function obtenerPromocionAplicable() {
    const idsCarrito = new Set(carrito.map(p => String(p.id)));
    // Una venta aplica una promoción configurada. Si hay varias coincidentes, se prioriza la más recientemente actualizada.
    return promocionesActivasVentas.find(p => (p.producto_ids || []).some(id => idsCarrito.has(String(id)))) || null;
}

function tipoPromocionVenta() {
    return promocionActivaCarrito?.tipo || "NINGUNA";
}

function calcularPromocionVenta() {
    const promo = obtenerPromocionAplicable();
    promocionActivaCarrito = promo;
    const elegibles = new Set((promo?.producto_ids || []).map(String));
    const unidadesElegibles = carrito.filter(p => elegibles.has(String(p.id))).flatMap(p => Array.from({length:Number(p.cantidad||0)}, () => ({id:String(p.id), precio:Number(p.precio||0)})));
    const regular = carrito.reduce((s,p) => s + Number(p.precio||0) * Number(p.cantidad||0), 0);
    const regularElegible = unidadesElegibles.reduce((s,u)=>s+u.precio,0);
    let gratis = 0, descuento = 0;
    const tipo = promo?.tipo || "NINGUNA";
    const grupo = tipo === "2x1" ? 2 : tipo === "3x2" ? 3 : tipo === "4x3" ? 4 : 0;
    const gratisPorProducto = new Map();
    if (grupo) {
        gratis = Math.floor(unidadesElegibles.length / grupo);
        const masBaratas = [...unidadesElegibles].sort((a,b)=>a.precio-b.precio || a.id.localeCompare(b.id)).slice(0,gratis);
        masBaratas.forEach(u=>{gratisPorProducto.set(u.id,(gratisPorProducto.get(u.id)||0)+1);descuento+=u.precio;});
    } else if (tipo === "PRECIO_PROMO" && unidadesElegibles.length) {
        descuento = Math.max(0, regularElegible - Number(promo.precio_promocional || 0));
        // Repartir el descuento proporcionalmente entre productos participantes; la última línea absorbe el redondeo.
        let restante = descuento, lineas = carrito.filter(p=>elegibles.has(String(p.id)));
        lineas.forEach((p,i)=>{const base=Number(p.precio)*Number(p.cantidad);const parte=i===lineas.length-1?restante:Math.round((descuento*(base/regularElegible))*100)/100;gratisPorProducto.set(String(p.id),parte/Math.max(Number(p.precio),0.01));restante=Math.round((restante-parte)*100)/100;});
    }
    descuento = Math.round(descuento*100)/100;
    return {promo,tipo,unidades:unidadesElegibles.length,gratis,descuento,regular,total:Math.max(0,Math.round((regular-descuento)*100)/100),gratisPorProducto,elegibles,regularElegible};
}

function configurarPromocionVenta() {
    actualizarResumenPromocionVenta();
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
            contenedorCategorias.querySelectorAll(".categoria-venta").forEach(item => {
                const activa = item.dataset.categoria === categoriaActual;
                item.classList.toggle("active", activa);
                item.setAttribute("aria-pressed", String(activa));
            });

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
            <button type="button" class="categoria-venta${categoria === categoriaActual ? " active" : ""}" data-categoria="${categoria}" aria-pressed="${categoria === categoriaActual ? "true" : "false"}">
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
    const stockActual = Number(producto.stock || 0);
    tarjeta.classList.add(stockActual < 5 ? "stock-bajo" : stockActual >= 10 ? "stock-alto" : "stock-medio");
    const promosProducto = promocionesActivasVentas.filter(p => (p.producto_ids || []).map(String).includes(String(producto.id)));
    if (promosProducto.length) tarjeta.classList.add("producto-con-promocion");
    const etiquetaPromo = promosProducto.length ? `<span class="producto-promo-badge">🏷️ ${promosProducto.map(p=>String(p.tipo).toUpperCase()).join(" · ")}</span>` : "";

    const imagen = producto.imagen
        ? `<img src="${producto.imagen}" alt="${producto.nombre}">`
        : `<span class="producto-icono">🛍️</span>`;

    tarjeta.setAttribute("role", "button");
    tarjeta.setAttribute("tabindex", "0");
    tarjeta.setAttribute("aria-label", `Agregar ${producto.nombre} al carrito`);
    tarjeta.innerHTML = `
        <div class="producto-info">
            ${etiquetaPromo}
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

    tarjeta.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        agregarAlCarrito(producto);
    });
    tarjeta.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
            event.preventDefault();
            agregarAlCarrito(producto);
        }
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
    return String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
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
        actualizarResumenPromocionVenta();
        return;
    }

    carrito.forEach((producto, indice) => {
        const item = document.createElement("div");
        item.className = "item-carrito";

        const calculoPromo = calcularPromocionVenta();
        const descuentoLinea = Math.min(producto.precio * producto.cantidad, (calculoPromo.gratisPorProducto.get(String(producto.id)) || 0) * producto.precio);
        const subtotalRegular = producto.precio * producto.cantidad;
        const subtotal = Math.max(0, subtotalRegular - descuentoLinea);

        item.innerHTML = `
            <div>
                <strong>${producto.nombre}</strong>

                <p>
                    $${producto.precio.toFixed(2)} × ${producto.cantidad}
                </p>

                <p>
                    Subtotal: $${subtotal.toFixed(2)}${descuentoLinea > 0 ? ` <span class="venta-descuento">(descuento ${`$${descuentoLinea.toFixed(2)}`})</span>` : ""}
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
    actualizarResumenPromocionVenta();
}

function actualizarResumenPromocionVenta() {
    const el = document.getElementById("promocionVentaResumen");
    if (!el) return;
    const c = calcularPromocionVenta();
    const regla = document.getElementById("promocionVentaRegla");
    if (regla) regla.textContent = c.promo ? `${c.promo.nombre}: ${REGLAS_PROMOCION_VENTA[c.tipo] || "Promoción activa."}` : (promocionesActivasVentas.length ? "Selecciona productos participantes para detectar una promoción automáticamente." : "No hay promociones activas configuradas por Administración.");
    if (!carrito.length) { el.textContent = "Agrega productos al carrito para revisar si participan en una promoción activa."; return; }
    if (!c.promo || !c.unidades) { el.textContent = "Los productos seleccionados no completan o no participan en una promoción activa. Se cobrarán a precio normal."; return; }
    el.innerHTML = `<strong>${escaparTexto(c.promo.nombre)}</strong> · Productos participantes: ${c.unidades} unidades<br>Subtotal de la venta: <strong>$${c.regular.toFixed(2)}</strong> · Descuento estimado: <strong>$${c.descuento.toFixed(2)}</strong> · Total: <strong>$${c.total.toFixed(2)}</strong>`;
}
function escaparTexto(v) { return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function aumentarCantidad(indice) {
    const producto = carrito[indice];

    if (!producto) {
        return;
    }

    // SnackOffice vende todos los productos por pieza completa.
    if (!Number.isInteger(Number(producto.cantidad)) || !Number.isInteger(Number(producto.stock))) {
        alert("La cantidad y las existencias deben ser números enteros de piezas.");
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
    const promoRegla = document.getElementById("promocionVentaRegla"); if (promoRegla) promoRegla.textContent = "Consultando promociones vigentes...";
    usarSaldoFavorVenta = false;
    clienteFavorSeleccionado = "";

    renderizarCarrito();
    mostrarPantallaVentas("ventasInicio");
}

function obtenerTotalVenta() {
    return calcularPromocionVenta().total;
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
    if (registroVentaEnCurso) {
        alert("⏳ Ya hay una venta en proceso. Espera la confirmación antes de volver a intentarlo.");
        return;
    }

    registroVentaEnCurso = true;
    try {
        await registrarVentaInterna();
    } finally {
        registroVentaEnCurso = false;
    }
}

async function registrarVentaInterna() {
    if (carrito.length === 0) {
        alert("⚠️ No hay productos en el carrito.");
        return;
    }

    // Validación defensiva antes de confirmar o llamar a Supabase: las ventas
    // solo admiten piezas completas, aunque el carrito se altere desde consola.
    const cantidadInvalida = carrito.find(producto =>
        !Number.isInteger(Number(producto.cantidad)) || Number(producto.cantidad) <= 0
    );
    if (cantidadInvalida) {
        alert(`La cantidad de "${cantidadInvalida.nombre}" debe ser un número entero de piezas mayor que cero. Corrige el carrito antes de registrar la venta.`);
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

    // El stock y el saldo a favor se aplican en la misma transacción central
    // que registra la venta. No se modifica inventario ni saldo local antes.
    const ventaRegistrada = await guardarVentaHistorial({ saldoFavorAplicado: saldoAplicable, restante });
    if (!ventaRegistrada) return;

    // Supabase es la fuente de verdad para ventas y CxC. La RPC ya guardó
    // la cuenta pendiente; recargarla reemplaza cualquier copia local obsoleta.
    // No volver a llamar guardarCuentaPendiente(): eso duplicaba el saldo
    // cuando la venta central y la cuenta local compartían el mismo registro.
    await cargarCxCDesdeSupabase();

    registrarCliente(cliente, ventaRegistrada);

    if (document.getElementById("clientesVentasScreen")?.style.display !== "none") {
        cargarClientesVentas();
    }

    // Después de registrar la venta, reiniciamos la pantalla de Nueva venta
    // para dejar el carrito, cliente y método de pago listos para una nueva operación.
    await iniciarNuevaVenta();
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
    if (cliente) {
        await cargarCatalogoClientesCentral();
        if (!catalogoClientesCentral.length) {
            alert("No se pudo verificar el catálogo central de clientes. La venta no se registró; intenta actualizar y vuelve a probar.");
            campoCliente?.focus();
            return null;
        }
    }
    if (cliente && catalogoClientesCentral.length) {
        const clave = normalizarTexto(cliente);
        const clienteCatalogado = catalogoClientesCentral.find(c =>
            normalizarTexto(c.clave_normalizada || c.nombre) === clave || normalizarTexto(c.nombre) === clave
        );
        if (!clienteCatalogado) {
            alert("Este cliente no está en el catálogo autorizado. Selecciona un nombre existente para evitar duplicados.");
            campoCliente?.focus();
            return null;
        }
    }

    const botonPagoActivo = document.querySelector(".btn-pago.activo");
    const pagoRegistrado = botonPagoActivo
        ? botonPagoActivo.dataset.pago
        : metodoPago || "Efectivo";

    const total = obtenerTotalVenta();

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
        productos: carrito.map(producto => {
            const cPromo = calcularPromocionVenta();
            const descuento = Math.min(Number(producto.precio) * Number(producto.cantidad), (cPromo.gratisPorProducto.get(String(producto.id)) || 0) * Number(producto.precio));
            return { id: String(producto.id), nombre: producto.nombre, precio: Number(producto.precio), cantidad: Number(producto.cantidad), subtotal: Number((Number(producto.precio) * Number(producto.cantidad) - descuento).toFixed(2)), descuento_promocion: Number(descuento.toFixed(2)) };
        }),
        promocion_tipo: tipoPromocionVenta(),
        promocion_id: calcularPromocionVenta().promo?.id || null,
        promocion_descuento: Number(calcularPromocionVenta().descuento.toFixed(2)),
        total,
        estadoPago: esPendiente ? "Pendiente" : "Pagado",
        abonado: Number(saldoFavorAplicado || 0) + (esPendiente ? 0 : restante),
        saldo: esPendiente ? restante : 0,
        saldoFavor: 0
    };

    venta = await registrarVentaEnJornada(venta);
    if (!venta) return null;

    const centralGuardada = await guardarVentaEnSupabase(venta);
    if (!centralGuardada) return null;

    historial.push(venta);
    localStorage.setItem("historialVentas", JSON.stringify(historial));

    if (esPendiente) {
        registrarMovimientoCxC({
            tipo: "VENTA",
            cliente: venta.cliente,
            ventaId: venta.id,
            importe: Number(venta.saldo || venta.total),
            metodoPago: "Pendiente",
            saldoDespues: Number(venta.saldo),
            fecha: new Date().toISOString()
        });
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
            <h3>🧾 Venta #${venta.folio || numeroVenta}</h3>

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
            <p><strong>Subtotal antes de promoción:</strong> $${(Number(venta.total || 0) + Number(venta.promocion_descuento || 0)).toFixed(2)}</p>
            <p><strong>Promoción aplicada:</strong> ${venta.promocion_tipo && venta.promocion_tipo !== "NINGUNA" ? venta.promocion_tipo : ((venta.productos || []).find(p => p.promocion_tipo && p.promocion_tipo !== "NINGUNA")?.promocion_tipo || "Sin promoción")}</p>
            <p><strong>Descuento promocional:</strong> -$${Number(venta.promocion_descuento || (venta.productos || []).reduce((s,p)=>s+Number(p.descuento_promocion||0),0)).toFixed(2)}</p>
            <p><strong>Estado de pago:</strong> ${venta.estadoPago || "Pagado"}</p>

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
        promocion_tipo: venta.promocion_tipo || "NINGUNA",
        promocion_id: venta.promocion_id || null,
        promocion_descuento: Number(venta.promocion_descuento || 0),
        jornada_id: venta.jornadaId ? String(venta.jornadaId) : null
    };

    const { data, error } = await supabase.rpc("registrar_venta_atomica", {
        p_venta: registro
    });

    if (error || !data?.ok) {
        console.error("❌ Error registrando venta de forma atómica:", error || data);
        alert(`❌ La venta no se confirmó. No se debe cobrar ni repetir hasta verificar el estado.\n\n${error?.message || data?.mensaje || "Error en la operación central."}`);
        return false;
    }

    // La base central valida la existencia real del saldo a favor y confirma
    // que aplicó exactamente el importe solicitado antes de devolver éxito.
    venta.stockCentralConfirmado = true;
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

    // Traemos movimientos de todas las ventas para que el estado de cuenta
    // pueda mostrar también compras ya liquidadas.
    const idsCxc = ventasCentral.map(v => Number(v.id));

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

    // Conservamos cuentas locales antiguas solo si todavía no existe su venta en Supabase.
    // Para las ventas centrales, Supabase es la fuente de verdad y evita reintroducir saldos obsoletos.
    const cuentasLocales = obtenerCuentasPendientes();
    const idsVentasCentral = new Set(ventasCentral.map(v => String(v.id)));
    const cuentasMap = new Map(
        cuentasLocales
            .filter(c => !idsVentasCentral.has(String(c.id)))
            .map(c => [String(c.id), c])
    );
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
        movimientos: movimientos
            .filter(m => Number(m.venta_id) === Number(v.id))
            .map(m => ({ tipo: m.tipo, fecha: m.fecha, importe: Number(m.importe || 0), metodoPago: m.metodo_pago || "", saldoDespues: Number(m.saldo_despues || 0), saldoFavorDespues: Number(m.saldo_favor_despues || 0) })),
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

    const clientesConMovimientos = sincronizarClientes();
    const filtro = normalizarTexto(document.getElementById("buscarClienteVentas")?.value || "");
    const cuentas = obtenerCuentasPendientes();
    const mapaClientes = new Map();
    // El catálogo maestro es la fuente de clientes; el historial solo aporta compras y saldos.
    catalogoClientesCentral.forEach(c => {
        const clave = normalizarTexto(c.clave_normalizada || c.nombre);
        if (!clave || clave === "publico general") return;
        mapaClientes.set(clave, { clave, nombre: c.nombre, numeroOriginal: c.numero_original || "", compras: 0, totalCompras: 0, ultimaCompra: "" });
    });
    clientesConMovimientos.forEach(c => {
        const clave = normalizarTexto(c.clave || c.nombre);
        if (!clave || clave === "publico general") return;
        const actual = mapaClientes.get(clave) || { clave, nombre: c.nombre, numeroOriginal: "", compras: 0, totalCompras: 0, ultimaCompra: "" };
        actual.compras = Number(c.compras || 0);
        actual.totalCompras = Number(c.totalCompras || 0);
        actual.ultimaCompra = c.ultimaCompra || "";
        mapaClientes.set(clave, actual);
    });
    const clientes = Array.from(mapaClientes.values());

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
                <div><h3>${c.nombre}</h3><p>${c.numeroOriginal ? `Número original: ${c.numeroOriginal} · ` : ""}${c.compras} compra${c.compras === 1 ? "" : "s"} · Última: ${c.ultimaCompra || "Sin compras"}</p></div>
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
    `).join("") : `<div class="clientes-vacio">👥<h3>No hay clientes para mostrar</h3><p>Los clientes del catálogo maestro aparecen aquí aunque todavía no tengan compras.</p></div>`;

    contenedor.querySelectorAll(".btn-ver-estado-cuenta").forEach(boton => {
        boton.addEventListener("click", () => {
            mostrarPantallaVentas("estadoCuentaClienteScreen");
            cargarEstadoCuentaCliente(boton.dataset.cliente || "");
        });
    });
}

async function cargarEstadoCuentaCliente(claveCliente) {
    const contenedor = document.getElementById("detalleEstadoCuentaCliente");
    const titulo = document.getElementById("nombreEstadoCuentaCliente");
    if (!contenedor) return;

    const clientes = sincronizarClientes();
    const todosClientes = new Map();
    catalogoClientesCentral.forEach(c => {
        const clave = normalizarTexto(c.clave_normalizada || c.nombre);
        if (clave) todosClientes.set(clave, { clave, nombre: c.nombre, numeroOriginal: c.numero_original || "", compras: 0, totalCompras: 0, ultimaCompra: "" });
    });
    clientes.forEach(c => {
        const clave = normalizarTexto(c.clave || c.nombre);
        if (!clave) return;
        const previo = todosClientes.get(clave) || { clave, nombre: c.nombre, numeroOriginal: "", compras: 0, totalCompras: 0, ultimaCompra: "" };
        Object.assign(previo, { compras: Number(c.compras || 0), totalCompras: Number(c.totalCompras || 0), ultimaCompra: c.ultimaCompra || "" });
        todosClientes.set(clave, previo);
    });
    const cliente = todosClientes.get(normalizarTexto(claveCliente)) || Array.from(todosClientes.values()).find(c => normalizarTexto(c.nombre) === normalizarTexto(claveCliente));
    if (!cliente) {
        contenedor.innerHTML = `<div class="clientes-vacio">👤<h3>Cliente no encontrado</h3><p>No fue posible recuperar la información del cliente.</p></div>`;
        return;
    }
    if (titulo) titulo.textContent = cliente.nombre;

    // Historial global de movimientos del cliente, independiente de la venta a la que
    // la RPC haya asociado técnicamente cada aplicación o saldo a favor.
    let movimientosCliente = [];
    try {
        const { data, error } = await supabase
            .from("movimientos_cxc")
            .select("id,venta_id,cliente,tipo,fecha,importe,metodo_pago,saldo_despues,saldo_favor_despues")
            .ilike("cliente", cliente.nombre)
            .order("fecha", { ascending: false });
        if (error) throw error;
        movimientosCliente = data || [];
    } catch (error) {
        console.warn("No se pudo cargar el historial global de CxC:", error);
    }

    let ventasCliente = [];
    try {
        const { data: ventasCentrales, error: ventasError } = await supabase
            .from("ventas")
            .select("id,folio,fecha,cliente,metodo_pago,desglose_pago,total_cobrado,total,estado_pago,abonado,saldo,saldo_favor,productos,jornada_id,promocion_tipo,promocion_id,promocion_descuento")
            .ilike("cliente", cliente.nombre)
            .order("fecha", { ascending: false });
        if (ventasError) throw ventasError;
        ventasCliente = (ventasCentrales || []).map(v => ({
            id: Number(v.id),
            folio: v.folio || v.id,
            fecha: v.fecha ? new Date(v.fecha).toLocaleString("es-MX") : "",
            fechaISO: v.fecha || "",
            cliente: v.cliente || cliente.nombre,
            metodoPago: v.metodo_pago || "",
            desglosePago: v.desglose_pago || [],
            totalCobrado: Number(v.total_cobrado || 0),
            total: Number(v.total || 0),
            estadoPago: v.estado_pago || "",
            abonado: Number(v.abonado || 0),
            saldo: Number(v.saldo || 0),
            saldoFavor: Number(v.saldo_favor || 0),
            productos: Array.isArray(v.productos) ? v.productos : [],
            promocion_tipo: v.promocion_tipo || "NINGUNA",
            promocion_id: v.promocion_id || null,
            promocion_descuento: Number(v.promocion_descuento || 0),
            jornadaId: v.jornada_id || ""
        }));
    } catch (error) {
        console.warn("No se pudo consultar el historial central del cliente; se usa el historial local como respaldo.", error);
        const historial = JSON.parse(localStorage.getItem("historialVentas")) || [];
        ventasCliente = historial
            .filter(v => normalizarTexto(v.cliente) === cliente.clave)
            .sort((a, b) => new Date(b.fechaISO || b.fecha || 0) - new Date(a.fechaISO || a.fecha || 0));
    }
    const cuentas = obtenerCuentasPendientes().filter(c => normalizarTexto(c.cliente) === cliente.clave);
    const cuentaPorId = new Map(cuentas.map(c => [String(c.id), c]));
    const totalCompradoCentral = ventasCliente.reduce((s, venta) => s + Number(venta.total || 0), 0);

    // Las cuentas pendientes son fuente de saldos; el historial aporta todas las compras.
    const deuda = cuentas.reduce((s, c) => s + Math.max(0, Number(c.saldo || 0)), 0);
    const favor = cuentas.reduce((s, c) => s + Math.max(0, Number(c.saldoFavor || 0)), 0);
    const resumenTotal = document.getElementById("estadoCuentaTotalComprado");
    const resumenDeuda = document.getElementById("estadoCuentaDeuda");
    const resumenFavor = document.getElementById("estadoCuentaFavor");
    if (resumenTotal) resumenTotal.textContent = `$${totalCompradoCentral.toFixed(2)}`;
    if (resumenDeuda) resumenDeuda.textContent = `$${deuda.toFixed(2)}`;
    if (resumenFavor) resumenFavor.textContent = `$${favor.toFixed(2)}`;

    const ventasHTML = ventasCliente.length ? ventasCliente.map(venta => {
        const cuenta = cuentaPorId.get(String(venta.id)) || {};
        const total = Number(venta.total || cuenta.total || 0);
        const saldo = Math.max(0, Number(cuenta.saldo ?? venta.saldo ?? 0));
        const abonado = Number(cuenta.abonado ?? venta.abonado ?? Math.max(0, total - saldo));
        const saldoFavor = Math.max(0, Number(cuenta.saldoFavor ?? venta.saldoFavor ?? 0));
        const productos = Array.isArray(venta.productos) ? venta.productos : (Array.isArray(cuenta.productos) ? cuenta.productos : []);
        const productosHTML = productos.length ? `
            <div class="estado-cuenta-productos-wrap">
              <table class="estado-cuenta-productos"><thead><tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th><th>Importe</th></tr></thead>
              <tbody>${productos.map(p => {
                  const cantidad = Number(p.cantidad || 0);
                  const precio = Number(p.precio || 0);
                  const subtotal = Number(p.subtotal ?? precio * cantidad);
                  return `<tr><td>${String(p.nombre || "Producto").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</td><td>${cantidad}</td><td>$${precio.toFixed(2)}</td><td>$${subtotal.toFixed(2)}</td></tr>`;
              }).join("")}</tbody></table>
            </div>` : `<p class="movimiento-cxc-vacio">No hay desglose de productos guardado para esta venta.</p>`;
        const pagos = Array.isArray(venta.desglosePago) ? venta.desglosePago : [];
        // CxC se enfoca en compras, deuda, abonos y saldo a favor.
        // Los métodos de pago se consultan en los reportes de ventas/caja, no aquí.
        const movimientos = Array.isArray(cuenta.movimientos) ? cuenta.movimientos : (Array.isArray(venta.movimientos) ? venta.movimientos : []);
        const movimientosHTML = movimientos.length ? movimientos.map(m => `
            <div class="movimiento-cxc"><span>${m.tipo || "MOVIMIENTO"}<small class="movimiento-cxc-fecha">${m.fecha ? new Date(m.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "Fecha no disponible"}</small></span><strong>${m.tipo === "VENTA" ? "+" : "−"}$${Number(m.importe || 0).toFixed(2)}</strong></div>`).join("") : `<p class="movimiento-cxc-vacio">Sin movimientos de CxC registrados para esta venta.</p>`;
        const pagada = saldo <= 0;
        return `<article class="estado-cuenta-card estado-cuenta-card-detallada">
          <div class="estado-cuenta-contenido">
            <h3>🧾 Venta #${venta.folio || venta.id}</h3>
            <p>📅 ${venta.fecha || cuenta.fecha || "Fecha no disponible"}</p>
            ${productosHTML}
            <div class="estado-cuenta-promocion">
              <p><strong>Promoción aplicada:</strong> ${venta.promocion_tipo && venta.promocion_tipo !== "NINGUNA" ? venta.promocion_tipo : (productos.find(p => p.promocion_tipo && p.promocion_tipo !== "NINGUNA")?.promocion_tipo || "Sin promoción registrada")}</p>
              <p><strong>Subtotal antes de descuento:</strong> $${(total + Number(venta.promocion_descuento || productos.reduce((s,p)=>s+Number(p.descuento_promocion||0),0))).toFixed(2)}</p>
              <p><strong>Descuento promocional:</strong> -$${Number(venta.promocion_descuento || productos.reduce((s,p)=>s+Number(p.descuento_promocion||0),0)).toFixed(2)}</p>
            </div>
            <p>🧾 Total de venta: <strong>$${total.toFixed(2)}</strong></p>
            <p>💵 Abonado: <strong>$${abonado.toFixed(2)}</strong></p>
            <p class="saldo-pendiente">💰 Saldo pendiente: <strong>$${saldo.toFixed(2)}</strong></p>
            ${saldoFavor > 0 ? `<p class="saldo-favor-pendiente">🟢 Saldo a favor: <strong>$${saldoFavor.toFixed(2)}</strong></p>` : ""}
            ${(cuenta.movimientos || venta.movimientos) ? `<details class="historial-cxc-detalle"><summary>Ver movimientos de esta cuenta</summary><div class="movimientos-cxc-lista">${movimientosHTML}</div></details>` : ""}
          </div>
          <div class="estado-cuenta-acciones">${saldo > 0 ? `<button type="button" class="btn-abonar-estado" data-cuenta="${venta.id}">💵 Registrar abono</button>` : `<span>✓ ${pagada ? "Venta liquidada" : "Cuenta pendiente"}${saldoFavor > 0 ? ` · A favor $${saldoFavor.toFixed(2)}` : ""}</span>`}</div>
        </article>`;
    }).join("") : `<div class="clientes-vacio">📄<h3>Sin compras registradas</h3><p>Este cliente todavía no tiene ventas en el historial disponible.</p></div>`;

    const escaparTexto = valor => String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const movimientosGlobalesHTML = movimientosCliente.length ? `
      <section class="estado-cuenta-movimientos estado-cuenta-movimientos-global">
        <h2>💸 Movimientos generales del cliente</h2>
        <p class="movimiento-cxc-vacio">Los importes muestran los movimientos registrados por venta; no se suma un cobro global adicional para evitar duplicidades.</p>
        <div class="movimientos-cxc-lista">
          ${movimientosCliente.map(m => `
            <div class="movimiento-cxc">
              <span>${m.tipo === "VENTA" ? "🧾 Venta a crédito" : m.tipo === "COBRO_CXC" ? "💰 Cobro recibido" : m.tipo === "ABONO" ? "💵 Abono aplicado a deuda" : m.tipo === "SALDO_FAVOR" ? "🟢 Saldo a favor generado" : escaparTexto(m.tipo || "Movimiento")}</span>
              <span>Venta #${escaparTexto(m.venta_id ?? "—")}<small class="movimiento-cxc-fecha">${m.fecha ? new Date(m.fecha).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "Fecha no disponible"}</small></span>
              <strong>${m.tipo === "VENTA" ? "+" : "−"}$${Number(m.importe || 0).toFixed(2)}</strong>
            </div>`).join("")}
        </div>
      </section>` : "";

    contenedor.innerHTML = `<div class="estado-cuenta-resumen-cuentas"><h2>📒 Historial de compras</h2>${ventasHTML}</div>
      ${movimientosGlobalesHTML}
      <div class="estado-cuenta-movimientos"><h2>📌 Resumen</h2><div class="movimientos-cxc-lista">
        <div class="movimiento-cxc"><span>🛒 Compras</span><span>${ventasCliente.length}</span><strong>$${totalCompradoCentral.toFixed(2)}</strong></div>
        <div class="movimiento-cxc"><span>💰 Deuda actual</span><span>Saldo</span><strong>$${deuda.toFixed(2)}</strong></div>
        <div class="movimiento-cxc"><span>🟢 Saldo a favor</span><span>Disponible</span><strong>$${favor.toFixed(2)}</strong></div>
      </div></div>`;

    contenedor.querySelectorAll(".btn-abonar-estado").forEach(boton => {
        boton.addEventListener("click", () => {
            registrarAbonoPendiente(boton.dataset.cuenta);
            cargarEstadoCuentaCliente(claveCliente);
        });
    });
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

function obtenerClaveIdempotenciaAbono(cuentaId, monto, metodoPago) {
    const claveStorage = "snackoffice_abono_pendiente";
    const payload = {
        venta_id: Number(cuentaId),
        monto: Math.round(Number(monto) * 100) / 100,
        metodo_pago: String(metodoPago || "").trim().toLowerCase()
    };

    try {
        const pendiente = JSON.parse(localStorage.getItem(claveStorage) || "null");
        if (pendiente && pendiente.payload
            && pendiente.payload.venta_id === payload.venta_id
            && pendiente.payload.monto === payload.monto
            && pendiente.payload.metodo_pago === payload.metodo_pago
            && pendiente.idempotency_key) {
            return pendiente.idempotency_key;
        }

        // No reemplazar una operación ambigua: podría haberse confirmado en Supabase.
        if (pendiente?.idempotency_key) {
            throw new Error("Hay un abono anterior cuyo resultado aún debe verificarse en Supabase. Actualiza CxC y revisa sus movimientos antes de iniciar otro abono.");
        }

        const idempotencyKey = globalThis.crypto?.randomUUID
            ? globalThis.crypto.randomUUID()
            : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0;
                return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
            });

        localStorage.setItem(claveStorage, JSON.stringify({
            idempotency_key: idempotencyKey,
            payload
        }));
        return idempotencyKey;
    } catch (error) {
        throw error;
    }
}

async function confirmarAbonoCxc() {
    const modal = document.getElementById("modalAbonoCxc");
    const montoInput = document.getElementById("montoAbonoCxc");
    const metodoInput = document.getElementById("metodoAbonoCxc");
    if (!modal || !montoInput || !metodoInput) return;

    const cuentaId = Number(modal.dataset.cuentaId);
    const monto = Number(montoInput.value);
    const metodoPagoAbono = metodoInput.value;

    if (!Number.isFinite(monto) || monto <= 0) {
        alert("⚠️ Ingresa un monto válido mayor a cero.");
        montoInput.focus();
        return;
    }

    if (!Number.isSafeInteger(cuentaId) || cuentaId <= 0) {
        alert("⚠️ No se identificó la cuenta seleccionada. Cierra el formulario y vuelve a intentarlo.");
        return;
    }

    let idempotencyKey;
    try {
        idempotencyKey = obtenerClaveIdempotenciaAbono(cuentaId, monto, metodoPagoAbono);
    } catch (error) {
        alert(`⚠️ ${error.message}`);
        return;
    }

    const boton = document.getElementById("btnConfirmarAbonoCxc");
    if (boton) {
        boton.disabled = true;
        boton.textContent = "Procesando abono…";
    }

    try {
        // La RPC aplica el pago dentro de una única transacción en Supabase,
        // distribuyéndolo entre las deudas más antiguas del cliente.
        const { data: resultado, error } = await supabase.rpc("registrar_abono_cxc", {
            p_venta_id: cuentaId,
            p_monto: Math.round(monto * 100) / 100,
            p_metodo_pago: metodoPagoAbono,
            p_idempotency_key: idempotencyKey
        });

        if (error) {
            console.error("❌ Error registrando abono centralizado:", error);
            alert(`⚠️ Supabase devolvió un error al registrar el abono. No vuelvas a enviarlo todavía: si la conexión se interrumpió después de confirmar la transacción, el abono podría haberse aplicado. Actualiza la información de CxC y verifica los movimientos antes de intentar otra vez.\n\nDetalle: ${error.message}`);
            return;
        }

        // Mantener la clave persistida hasta confirmar también la actualización local.
        // Si falla la recarga, el usuario podrá reintentar con la misma clave y
        // PostgreSQL devolverá el resultado anterior sin volver a cobrar.
        const actualizado = await cargarCxCDesdeSupabase();
        if (!actualizado) {
            alert("⚠️ El abono se confirmó en Supabase, pero no se pudo refrescar la información local. La clave del intento se conserva: actualiza CxC antes de iniciar otro abono.");
            cerrarModalAbono();
            return;
        }

        localStorage.removeItem("snackoffice_abono_pendiente");
        const cuentasActualizadas = obtenerCuentasPendientes();
        const cuentaActualizada = cuentasActualizadas.find(c => String(c.id) === String(cuentaId));
        localStorage.setItem("cuentasPendientes", JSON.stringify(cuentasActualizadas));

        // Mantiene el historial local de compatibilidad actualizado cuando la cuenta sigue activa.
        if (cuentaActualizada) actualizarVentaHistorialConAbono(cuentaActualizada);

        cerrarModalAbono();
        actualizarAvisoCliente();

        const estado = document.getElementById("estadoCuentaClienteScreen");
        if (estado && estado.style.display !== "none") {
            const nombreCliente = resultado?.cliente || cuentaActualizada?.cliente || "";
            cargarEstadoCuentaCliente(normalizarTexto(nombreCliente));
        }

        const aplicado = Number(resultado?.total_aplicado || 0);
        const favorGenerado = Number(resultado?.saldo_favor_generado || 0);
        const totalDeuda = Number(resultado?.deuda_cubierta || aplicado);
        let mensaje = `✅ Abono de $${monto.toFixed(2)} registrado. Se aplicaron $${aplicado.toFixed(2)} a las deudas del cliente.`;
        if (favorGenerado > 0) {
            mensaje += `\n\n🟢 Saldo a favor generado: $${favorGenerado.toFixed(2)}.`;
        }
        if (totalDeuda <= 0 && favorGenerado <= 0) {
            mensaje = "✅ El abono se registró correctamente.";
        }
        alert(mensaje);
    } catch (error) {
        console.error("❌ Error inesperado registrando abono:", error);
        alert("⚠️ Ocurrió un error de comunicación durante el registro. No repitas el abono hasta actualizar CxC y verificar si el movimiento quedó registrado en Supabase.");
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.textContent = "💵 Registrar abono";
        }
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

