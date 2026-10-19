import { supabase } from "./supabase.js?v=20261010-nitro1";

const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const normalizar = s => String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");

export function iniciarCatalogoClientes() {
  const btn=document.getElementById("btnCatalogoClientes");
  if(!btn || btn.dataset.inicializado==="true") return;
  btn.dataset.inicializado="true";
  btn.addEventListener("click",renderizar);
}
async function renderizar(){
  const area=document.getElementById("contentArea"); if(!area)return;
  area.innerHTML=`<section class="so-admin-modulo"><h1>👥 Catálogo de clientes</h1><p>Cargando catálogo central...</p></section>`;
  try{
    const {data,error}=await supabase.from("clientes").select("id,numero_original,nombre,clave_normalizada,activo,created_at").order("nombre");
    if(error)throw error;
    area.innerHTML=`<section class="so-admin-modulo">
      <div class="so-modulo-header"><div><h1>👥 Catálogo de clientes</h1><p>Importa el listado definitivo como CSV UTF-8 desde Excel. Se normalizan acentos/espacios para evitar duplicados.</p></div></div>
      <div class="so-panel"><h2>Importar clientes</h2><p>En Excel usa Guardar como → CSV UTF-8. El archivo debe incluir una columna con el nombre y opcionalmente número o folio original.</p>
      <input type="file" id="archivoClientesCsv" accept=".csv,text/csv">
      <button type="button" id="btnImportarClientes" class="so-btn-principal">Importar / actualizar catálogo</button>
      <p id="estadoImportarClientes" aria-live="polite"></p></div>
      <div class="so-panel"><h2>Clientes registrados (${data.length})</h2><div class="so-tabla-wrap"><table class="so-tabla"><thead><tr><th>Número original</th><th>Nombre</th><th>Estado</th></tr></thead><tbody>${data.map(c=>`<tr><td>${esc(c.numero_original||"—")}</td><td>${esc(c.nombre)}</td><td>${c.activo?"Activo":"Inactivo"}</td></tr>`).join("")||`<tr><td colspan="3">Aún no hay clientes cargados.</td></tr>`}</tbody></table></div></div>
    </section>`;
    area.querySelector("#btnImportarClientes").addEventListener("click",async()=>{
      const archivo=area.querySelector("#archivoClientesCsv").files[0], estado=area.querySelector("#estadoImportarClientes"), btn=area.querySelector("#btnImportarClientes");
      if(!archivo){alert("Selecciona el CSV exportado desde Excel.");return;}
      btn.disabled=true; estado.textContent="Leyendo archivo...";
      try{
        const texto=await archivo.text();
        const lineas=texto.replace(/^\uFEFF/,"").split(/\r?\n/).filter(l=>l.trim());
        if(lineas.length<2)throw new Error("El archivo no contiene filas de clientes.");
        const delim=(lineas[0].match(/;/g)||[]).length>(lineas[0].match(/,/g)||[]).length?";":",";
        const parseLinea=linea=>{const out=[];let val="",q=false;for(let i=0;i<linea.length;i++){const c=linea[i];if(c==='"'&&q&&linea[i+1]==='"'){val+='"';i++;}else if(c==='"'){q=!q;}else if(c===delim&&!q){out.push(val.trim());val="";}else val+=c;}out.push(val.trim());return out;};
        const headers=parseLinea(lineas[0]).map(h=>normalizar(h));
        const nameIndex=headers.findIndex(h=>/^(nombre|cliente|nombre del cliente|razon social)$/.test(h));
        const numIndex=headers.findIndex(h=>/^(numero|no\.?|num|folio|id|numero original)$/.test(h));
        if(nameIndex<0)throw new Error("No encontré una columna de nombre. Usa un encabezado como Nombre o Cliente.");
        const map=new Map();
        lineas.slice(1).forEach(linea=>{
          const cols=parseLinea(linea), nombre=(cols[nameIndex]||"").trim();
          if(!nombre)return;
          const clave=normalizar(nombre);
          if(!map.has(clave))map.set(clave,{nombre,clave_normalizada:clave,numero_original:numIndex>=0?(cols[numIndex]||null):null,activo:true});
        });
        const filas=[...map.values()];
        for(let i=0;i<filas.length;i+=100){
          const {error:upsertError}=await supabase.from("clientes").upsert(filas.slice(i,i+100),{onConflict:"clave_normalizada"});
          if(upsertError)throw upsertError;
        }
        estado.textContent=`Importación terminada: ${filas.length} clientes únicos procesados.`;
        alert(`Catálogo actualizado: ${filas.length} clientes únicos.`);
        await renderizar();
      }catch(err){estado.textContent="Error: "+(err.message||err);alert("No se pudo importar el catálogo:\n"+(err.message||err));}
      finally{btn.disabled=false;}
    });
  }catch(err){area.innerHTML=`<section class="so-admin-modulo"><h1>👥 Catálogo de clientes</h1><div class="so-vacio">No se pudo cargar el catálogo.<br><small>${esc(err.message||err)}</small></div><p>Instala primero supabase/catalogo-clientes.sql en Supabase.</p></section>`;}
}
