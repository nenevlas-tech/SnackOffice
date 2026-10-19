import { supabase } from "./supabase.js?v=20261016-promos-config";
import { resolverImagenLocalProducto } from "./imagenes-iniciales.js?v=20261019-imgfix3";

const dinero = n => `$${Number(n || 0).toFixed(2)}`;
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const REGLAS = {
  "2x1": "2 × 1: por cada 2 unidades participantes, la unidad de menor precio queda gratis. Se pueden combinar productos incluidos.",
  "3x2": "3 × 2: por cada 3 unidades participantes, se cobra el precio de las 2 más caras. Se pueden combinar productos incluidos.",
  "4x3": "4 × 3: por cada 4 unidades participantes, se cobra el precio de las 3 más caras. Se pueden combinar productos incluidos.",
  "PRECIO_PROMO": "Precio promocional: el total definido se aplica al conjunto de productos incluidos en la promoción."
};

export function iniciarPromociones() {
  const btn = document.getElementById("btnPromociones");
  if (btn && btn.dataset.inicializado !== "true") {
    btn.dataset.inicializado = "true";
    btn.addEventListener("click", renderizarAdministracionPromociones);
  }
}

async function renderizarAdministracionPromociones() {
  const area = document.getElementById("contentArea");
  if (!area) return;
  area.innerHTML = `<section class="so-admin-modulo so-promociones"><h1>🏷️ Promociones</h1><p>Cargando configuración...</p></section>`;
  try {
    const [{data: productos, error: ep}, {data: promos, error: em}] = await Promise.all([
      supabase.from("productos").select("id,nombre,categoria,precio,stock,imagen").order("nombre"),
      supabase.from("promociones_configuracion").select("id,nombre,tipo,producto_ids,precio_promocional,activa,created_at,updated_at").order("updated_at", {ascending:false})
    ]);
    if (ep) throw ep;
    if (em) throw new Error("Falta aplicar supabase/promociones_configuracion.sql en Supabase: " + em.message);
    const lista = productos || [], configs = promos || [];
    area.innerHTML = `<section class="so-admin-modulo so-promociones">
      <div class="so-modulo-header so-promociones-hero"><div><span class="so-promociones-eyebrow">SNACK OFFICE · ADMINISTRACIÓN</span><h1>🏷️ Promociones</h1><p>Configura las promociones que reconocerá automáticamente la pantalla de Ventas.</p></div><div class="so-promociones-aviso"><strong>Importante</strong><span>La configuración se aplicará automáticamente en Ventas cuando se cumplan las condiciones de la promoción. Guardarla no registra una venta por sí sola.</span></div></div>
      <div class="so-panel so-promociones-panel"><div class="so-promociones-panel-titulo"><div><span class="so-promociones-paso">01 · CONFIGURACIÓN</span><h2 id="tituloFormPromo">Crear promoción</h2></div><p>Selecciona los productos que pueden combinarse para completar la promoción.</p></div>
      <form id="formConfigPromo" class="so-promocion-form">
        <label>Nombre de la promoción<input id="configPromoNombre" required maxlength="100" placeholder="Ej. Promo de botanas de octubre"></label>
        <label>Tipo de promoción<select id="configPromoTipo" required><option value="2x1">2 × 1</option><option value="3x2">3 × 2</option><option value="4x3">4 × 3</option><option value="PRECIO_PROMO">Precio promocional total</option></select><small id="configPromoRegla" class="so-promocion-regla">${REGLAS["2x1"]}</small></label>
        <label id="configPrecioLabel" hidden>Precio promocional del conjunto<input id="configPromoPrecio" type="number" min="0.01" step="0.01" placeholder="0.00"></label>
        <div class="so-promocion-seleccion"><h3>Productos incluidos</h3><p>La promoción se aplica solo a estos productos. Se permite combinarlos; el descuento de unidades gratis prioriza las de menor precio.</p><input id="buscarProductoConfigPromo" type="search" placeholder="Buscar producto..."><div class="so-promocion-productos" id="configPromoProductos">${lista.map(p=>{const fallback=resolverImagenLocalProducto(p);const imagen=p.imagen||fallback;return `<label class="so-promocion-producto" data-search="${esc((p.nombre+" "+p.categoria).toLowerCase())}"><input type="checkbox" class="config-promo-producto" value="${esc(p.id)}"><span class="so-promocion-producto-imagen">${imagen?`<img src="${esc(imagen)}" data-fallback="${esc(fallback||"")}" alt="" loading="lazy">`:`<span aria-hidden="true">▧</span>`}</span><span class="so-promocion-producto-info"><strong>${esc(p.nombre)}</strong><small>${esc(p.categoria||"")} · ${dinero(p.precio)}</small></span></label>`;}).join("")}</div></div>
        <div class="so-promocion-acciones"><button type="submit" class="so-btn-principal" id="btnGuardarConfigPromo">Guardar promoción</button><button type="button" class="so-btn-secundario" id="btnCancelarEdicionPromo" hidden>Cancelar edición</button></div><p id="estadoConfigPromo" aria-live="polite"></p>
      </form></div>
      <div class="so-panel so-promociones-historial"><div class="so-promociones-panel-titulo"><div><span class="so-promociones-paso">02 · PROMOCIONES CONFIGURADAS</span><h2>Promociones vigentes e históricas</h2></div><p>Activa o desactiva una promoción sin afectar inventario.</p></div><div class="so-tabla-wrap"><table class="so-tabla"><thead><tr><th>Promoción</th><th>Tipo / regla</th><th>Productos</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tablaConfigPromos">${configs.map(p=>filaPromo(p,lista)).join("")||`<tr><td colspan="5">Aún no hay promociones configuradas.</td></tr>`}</tbody></table></div></div>
    </section>`;
    const form=area.querySelector("#formConfigPromo"), tipo=area.querySelector("#configPromoTipo"), precioLabel=area.querySelector("#configPrecioLabel"), precio=area.querySelector("#configPromoPrecio"), regla=area.querySelector("#configPromoRegla"), estado=area.querySelector("#estadoConfigPromo");
    area.querySelectorAll(".so-promocion-producto-imagen img").forEach(img=>img.addEventListener("error",()=>{
      const fallback=img.dataset.fallback;
      if(fallback && img.getAttribute("src")!==fallback && !img.dataset.fallbackTried){img.dataset.fallbackTried="true";img.setAttribute("src",fallback);return;}
      const contenedor=img.parentElement;
      if(contenedor){contenedor.textContent="▧";contenedor.setAttribute("aria-label","Imagen no disponible");}
    }));
    let editarId=null;
    const actualizarRegla=()=>{regla.textContent=REGLAS[tipo.value];precioLabel.hidden=tipo.value!=="PRECIO_PROMO";precio.required=tipo.value==="PRECIO_PROMO";};
    tipo.addEventListener("change",actualizarRegla); actualizarRegla();
    area.querySelector("#buscarProductoConfigPromo").addEventListener("input",e=>{const q=e.target.value.toLowerCase();area.querySelectorAll(".so-promocion-producto[data-search]").forEach(el=>el.hidden=!el.dataset.search.includes(q));});
    area.querySelector("#btnCancelarEdicionPromo").addEventListener("click",()=>{editarId=null;form.reset();area.querySelector("#tituloFormPromo").textContent="Crear promoción";area.querySelector("#btnGuardarConfigPromo").textContent="Guardar promoción";area.querySelector("#btnCancelarEdicionPromo").hidden=true;actualizarRegla();});
    area.querySelector("#tablaConfigPromos").addEventListener("click",async e=>{
      const b=e.target.closest("button[data-action]"); if(!b)return; const p=configs.find(x=>String(x.id)===b.dataset.id); if(!p)return;
      if(b.dataset.action==="edit") {editarId=p.id;area.querySelector("#tituloFormPromo").textContent="Editar promoción";area.querySelector("#configPromoNombre").value=p.nombre;tipo.value=p.tipo;precio.value=p.precio_promocional??"";area.querySelectorAll(".config-promo-producto").forEach(c=>c.checked=(p.producto_ids||[]).map(String).includes(String(c.value)));area.querySelector("#btnGuardarConfigPromo").textContent="Guardar cambios";area.querySelector("#btnCancelarEdicionPromo").hidden=false;actualizarRegla();form.scrollIntoView({behavior:"smooth",block:"start"});}
      if(b.dataset.action==="toggle") {b.disabled=true;try{const {error}=await supabase.rpc("guardar_configuracion_promocion",{p_id:p.id,p_nombre:p.nombre,p_tipo:p.tipo,p_producto_ids:p.producto_ids,p_precio_promocional:p.precio_promocional,p_activa:!p.activa});if(error)throw error;await renderizarAdministracionPromociones();}catch(err){alert("No se pudo cambiar el estado: "+(err.message||err));b.disabled=false;}}
    });
    form.addEventListener("submit",async e=>{e.preventDefault();const nombre=area.querySelector("#configPromoNombre").value.trim(), ids=[...area.querySelectorAll(".config-promo-producto:checked")].map(c=>c.value), tipoValor=tipo.value, precioValor=tipoValor==="PRECIO_PROMO"?Number(precio.value):null;
      if(!ids.length){alert("Selecciona al menos un producto.");return;} if(tipoValor==="PRECIO_PROMO"&&(!Number.isFinite(precioValor)||precioValor<=0)){alert("Ingresa un precio promocional mayor a cero.");return;}
      const btn=area.querySelector("#btnGuardarConfigPromo");btn.disabled=true;estado.textContent="Guardando configuración...";
      try{const {error}=await supabase.rpc("guardar_configuracion_promocion",{p_id:editarId,p_nombre:nombre,p_tipo:tipoValor,p_producto_ids:ids,p_precio_promocional:precioValor,p_activa:true});if(error)throw error;alert("Promoción guardada. No se modificó el inventario.");await renderizarAdministracionPromociones();}
      catch(err){estado.textContent="No se pudo guardar: "+(err.message||err);alert("No se pudo guardar la promoción. Verifica la migración supabase/promociones_configuracion.sql.\n\n"+(err.message||err));btn.disabled=false;}
    });
  } catch(err) { area.innerHTML=`<section class="so-admin-modulo so-promociones"><h1>🏷️ Promociones</h1><div class="so-vacio">No se pudo cargar la configuración.<br><small>${esc(err.message||err)}</small></div><p>La migración local está en <code>supabase/promociones_configuracion.sql</code>. No se ha ejecutado automáticamente.</p></section>`; }
}
function filaPromo(p, productos) { const nombres=(p.producto_ids||[]).map(id=>productos.find(x=>String(x.id)===String(id))?.nombre||id).join(", ");return `<tr><td>${esc(p.nombre)}</td><td>${esc(p.tipo)}<br><small>${esc(REGLAS[p.tipo]||"")}</small></td><td>${esc(nombres)}</td><td><span class="promo-estado ${p.activa?"activa":"inactiva"}">${p.activa?"Activa":"Inactiva"}</span></td><td><button type="button" class="so-btn-secundario" data-action="edit" data-id="${esc(p.id)}">Editar</button> <button type="button" class="so-btn-secundario" data-action="toggle" data-id="${esc(p.id)}">${p.activa?"Desactivar":"Activar"}</button></td></tr>`; }
