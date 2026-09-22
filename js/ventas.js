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
    const btnPendientesVentas = document.getElementById("btnPendientesVentas");
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

    if (btnPendientesVentas) {
        btnPendientesVentas.addEventListener("click", () => {
            mostrarPantallaVentas("pendientesVentasScreen");
            cargarPendientesVentas();
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

    actualizarAvisoCliente();
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

    const campoCliente = document.getElementById("clienteVenta");

    if (campoCliente) {
        campoCliente.addEventListener("input", actualizarAvisoCliente);
        campoCliente.addEventListener("blur", actualizarAvisoCliente);
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
        "historialVentasScreen",
        "pendientesVentasScreen"
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

    const ventaRegistrada = guardarVentaHistorial();

    if (ventaRegistrada && metodoPago === "Pendiente") {
        guardarCuentaPendiente(ventaRegistrada);
    }

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

    const esPendiente = pagoRegistrado === "Pendiente";

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
        total,
        estadoPago: esPendiente ? "Pendiente" : "Pagado",
        abonado: esPendiente ? 0 : total,
        saldo: esPendiente ? total : 0
    };

    historial.push(venta);
    localStorage.setItem("historialVentas", JSON.stringify(historial));

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

function guardarCuentaPendiente(venta) {
    const cuentas = obtenerCuentasPendientes();

    cuentas.push({
        id: venta.id,
        cliente: venta.cliente,
        fecha: venta.fecha,
        total: Number(venta.total),
        abonado: 0,
        saldo: Number(venta.total),
        saldoFavor: 0,
        estado: "Pendiente",
        productos: venta.productos || []
    });

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
}

function cargarPendientesVentas() {
    const contenedor = document.getElementById("listaPendientesVentas");

    if (!contenedor) return;

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
    const indice = historial.findIndex(venta => venta.id === idVenta);
    return indice >= 0 ? indice + 1 : "—";
}

function registrarAbonoPendiente(idCuenta) {
    const cuentas = obtenerCuentasPendientes();
    const cuenta = cuentas.find(item => item.id === idCuenta);

    if (!cuenta) return;

    const saldoActual = Number(cuenta.saldo || 0);
    const saldoFavorActual = Number(cuenta.saldoFavor || 0);

    if (saldoActual <= 0) {
        alert(
            saldoFavorActual > 0
                ? `Esta cuenta ya está liquidada y tiene $${saldoFavorActual.toFixed(2)} a favor.`
                : "Esta cuenta ya está liquidada."
        );
        return;
    }

    const entrada = prompt(
        `Saldo pendiente: $${saldoActual.toFixed(2)}\n\nIngresa el monto del abono:`
    );

    if (entrada === null) return;

    const monto = Number(entrada);

    if (!Number.isFinite(monto) || monto <= 0) {
        alert("⚠️ Ingresa un monto válido mayor a cero.");
        return;
    }

    const nuevoSaldo = Math.max(0, saldoActual - monto);
    const excedente = Math.max(0, monto - saldoActual);

    cuenta.abonado = Number(cuenta.abonado || 0) + monto;
    cuenta.saldo = nuevoSaldo;
    cuenta.saldoFavor = saldoFavorActual + excedente;
    cuenta.estado = nuevoSaldo > 0 ? "Pendiente" : "Pagado";

    localStorage.setItem("cuentasPendientes", JSON.stringify(cuentas));
    actualizarVentaHistorialConAbono(cuenta);
    cargarPendientesVentas();
    actualizarAvisoCliente();

    if (excedente > 0) {
        alert(
            `✅ Abono registrado. La cuenta quedó liquidada y el cliente tiene $${cuenta.saldoFavor.toFixed(2)} a favor.`
        );
    } else if (cuenta.saldo === 0) {
        alert("✅ Cuenta liquidada correctamente.");
    } else {
        alert(
            `✅ Abono registrado. Saldo restante: $${cuenta.saldo.toFixed(2)}`
        );
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

    if (!campoCliente || !aviso) return;

    const nombre = campoCliente.value.trim();

    if (!nombre) {
        aviso.style.display = "none";
        aviso.textContent = "";
        aviso.className = "estado-cliente-venta";
        return;
    }

    const resumen = obtenerResumenCliente(nombre);
    const deuda = resumen.deuda;
    const favor = resumen.favor;

    aviso.style.display = "block";

    if (deuda > 0 && favor > 0) {
        aviso.className = "estado-cliente-venta aviso-mixto";
        aviso.textContent = `⚠️ Debe $${deuda.toFixed(2)} · 🟢 Tiene $${favor.toFixed(2)} a favor`;
        return;
    }

    if (deuda > 0) {
        aviso.className = "estado-cliente-venta aviso-deuda";
        aviso.textContent = `⚠️ Cliente con saldo pendiente: $${deuda.toFixed(2)}`;
        return;
    }

    if (favor > 0) {
        aviso.className = "estado-cliente-venta aviso-favor";
        aviso.textContent = `🟢 Cliente con saldo a favor: $${favor.toFixed(2)}`;
        return;
    }

    aviso.style.display = "none";
    aviso.textContent = "";
    aviso.className = "estado-cliente-venta";
}

