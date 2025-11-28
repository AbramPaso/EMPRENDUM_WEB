// Helper para alertas bonitas
const mostrarAlerta = (titulo, texto, icon = 'success') => {
    Swal.fire({
        icon: icon,
        title: titulo,
        text: texto,
        confirmButtonColor: '#0f172a',
        timer: icon === 'success' ? 2000 : undefined
    });
};

// Función para proteger inputs (Solo letras / Solo números)
function protegerInputsPerfil() {
    const inputsTexto = ['reg_nombre', 'reg_carrera', 'reg_religion', 'padre_nombre', 'madre_nombre', 'conyuge_nombre'];
    const inputsNumero = ['reg_cedula', 'reg_telefono', 'padre_telefono', 'madre_telefono'];

    inputsTexto.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('keydown', e => {
                // Permitir teclas de control
                if(['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) return;
                // Solo letras y espacios
                if(!/^[a-zA-ZÀ-ÿ\s]$/.test(e.key)) e.preventDefault();
            });
        }
    });

    inputsNumero.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('keydown', e => {
                if(['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) return;
                // Bloquear e, E, +, -, .
                if(['e','E','+','-','.'].includes(e.key)) e.preventDefault();
            });
        }
    });
}



const datosProcedencia = {
    1: [ // UVOC
        {id: 1, nombre: 'AVCO'}, {id: 2, nombre: 'AVCN'}, 
        {id: 3, nombre: 'AVLLOC'}, {id: 4, nombre: 'AVOC'}, 
        {id: 5, nombre: 'AVSOC'}, {id: 6, nombre: 'MVAE'}, 
        {id: 7, nombre: 'MVAC'}, {id: 8, nombre: 'MVNOC'}, 
        {id: 9, nombre: 'MVP'}, {id: 10, nombre: 'MVY'}
    ],
    2: [ // UVO
        {id: 11, nombre: 'MVSUB'}, {id: 12, nombre: 'MVNOR'}, 
        {id: 13, nombre: 'AVCOR'}, {id: 14, nombre: 'MIVELLACEN'}, 
        {id: 15, nombre: 'AVOR'}, {id: 16, nombre: 'AVC'}, 
        {id: 17, nombre: 'AVCS'}, {id: 18, nombre: 'AVSOR'}
    ]
};

const API_BASE = "http://localhost:3000/api";
const token = localStorage.getItem("token");
let usuarioActual = {};

document.addEventListener("DOMContentLoaded", () => {
  if (!token) {
    window.location.href = "login.html";
    return;
  }
  cargarEstadisticas();
  cargarPerfil();
});

function mostrarSeccion(idSeccion) {
  document
    .querySelectorAll(".section-view")
    .forEach((sec) => sec.classList.remove("active"));
  document
    .querySelectorAll(".nav-links a")
    .forEach((link) => link.classList.remove("active"));
  document.getElementById(idSeccion).classList.add("active");
  document.getElementById("nav-" + idSeccion).classList.add("active");

  if (idSeccion === "companeros") cargarCompaneros();
  if (idSeccion === "perfil") cargarPerfil();
  if (idSeccion === "colportaje") cargarCampana();
  if (idSeccion === "reportes") cargarHistorialReportes();
}

// 1. CARGAR STATS

// --- FUNCIÓN PRINCIPAL DE CARGA ---
async function cargarEstadisticas() {
  try {
    const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const rol = data.rol_detectado;
      
      if (typeof usuarioActual === 'undefined') usuarioActual = {}; 
      usuarioActual.rol = rol; 

      // --- ACTUALIZAR BADGE ---
      const badge = document.getElementById("rol-badge");
      if (rol === 1) {
        badge.innerText = "DIRECTOR";
        badge.style.background = "#d9534f";
      } else if (rol === 2) {
        badge.innerText = "COACH";
        badge.style.background = "#f0ad4e";
      } else {
        badge.innerText = "COLPORTOR";
        badge.style.background = "#0275d8";
      }

      // --- OCULTAR TODO ---
      document.getElementById("vista-colportor").style.display = "none";
      document.getElementById("vista-director").style.display = "none";
      document.getElementById("vista-coach").style.display = "none";

      // --- MOSTRAR SEGÚN ROL ---

      // CASO 1: DIRECTOR (Vista Completa)
      if (rol === 1) {
        document.getElementById("vista-director").style.display = "block";
        cargarGraficasDirector();      
        cargarTablaCoaches();          
        
        // AQUÍ ES EL LUGAR CORRECTO: Solo si es Director cargamos su tabla global
        cargarTablaGlobalDirector();   // <--- ESTA ES LA LÍNEA CLAVE QUE FALTABA
      }

      // CASO 2: COACH (Vista Equipo)
      else if (rol === 2) {
        document.getElementById("vista-coach").style.display = "block";
        cargarTablaCoach(false);       
        document.getElementById("vista-colportor").style.display = "flex"; 
        llenarTarjetas(data);
      }

      // CASO 3: COLPORTOR (Vista Simple)
      else {
        document.getElementById("vista-colportor").style.display = "flex";
        llenarTarjetas(data);
      }
    }
  } catch (e) {
    console.error("Error cargando estadisticas:", e);
  }
}

function llenarTarjetas(data) {
  document.getElementById("stat-colecciones").innerText =
    data.total_colecciones || 0;
  document.getElementById("stat-monto").innerText =
    "$" + (parseFloat(data.total_monto) || 0).toFixed(2);
  document.getElementById("stat-horas").innerText = data.total_horas || 0;
}

// --- LÓGICA DE GRÁFICAS (Solo Director) ---
// --- GRÁFICAS DEL DIRECTOR ---
async function cargarGraficasDirector() {
  try {
    const res = await fetch(`${API_BASE}/reports/director-charts`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();

    // 1. TARJETAS GLOBALES
    if(data.global) {
        if(document.getElementById('dir-total-dinero')) document.getElementById('dir-total-dinero').innerText = '$' + parseFloat(data.global.gran_total_dinero).toFixed(2);
        if(document.getElementById('dir-total-libros')) document.getElementById('dir-total-libros').innerText = data.global.gran_total_libros;
        if(document.getElementById('dir-total-horas')) document.getElementById('dir-total-horas').innerText = data.global.gran_total_horas;
    }

    // 2. GRÁFICA ZONAS (Barra)
    if(window.chartZonas) window.chartZonas.destroy();
    window.chartZonas = new Chart(document.getElementById("graficaZonas"), {
      type: "bar",
      data: {
        labels: data.zonas.map((d) => d.label),
        datasets: [{ label: "Recaudado ($)", data: data.zonas.map((d) => d.total), backgroundColor: "#0f172a" }],
      },
    });

    // 3. GRÁFICA UNIONES (Barra - CAMBIO SOLICITADO)
    if(window.chartUniones) window.chartUniones.destroy();
    window.chartUniones = new Chart(document.getElementById("graficaUniones"), {
      type: "bar", // Ahora es Barra
      data: {
        labels: data.uniones.map((d) => d.label),
        datasets: [{ label: "Ventas por Unión ($)", data: data.uniones.map((d) => d.total), backgroundColor: ["#f59e0b", "#0f172a"] }],
      },
    });

    // 4. RESUMEN DETALLADO (TEXTO) - NUEVO
    const listaZonas = document.getElementById('lista-resumen-zonas');
    const listaUniones = document.getElementById('lista-resumen-uniones');
    listaZonas.innerHTML = '';
    listaUniones.innerHTML = '';

    data.zonas.forEach(z => {
        listaZonas.innerHTML += `<li style="padding: 5px 0; border-bottom: 1px dashed #eee; display:flex; justify-content:space-between;"><span>${z.label}</span> <span style="font-weight:bold; color:#005a87;">$${parseFloat(z.total).toFixed(2)}</span></li>`;
    });

    data.uniones.forEach(u => {
        listaUniones.innerHTML += `<li style="padding: 5px 0; border-bottom: 1px dashed #eee; display:flex; justify-content:space-between;"><span>${u.label}</span> <span style="font-weight:bold; color:#d9534f;">$${parseFloat(u.total).toFixed(2)}</span></li>`;
    });

  } catch (e) { console.error("Error gráficas:", e); }
}

// --- LÓGICA DE TABLA (Coach y Director) ---
// --- TABLA DE COLPORTORES (Multiuso) ---
async function cargarTablaCoach(esDirector = false) {
  try {
    // Si es Director, pedimos TODOS. Si es Coach, pedimos SU equipo.
    // Nota: Tu backend '/reports/coach-team' ya maneja esto según el rol del token.
    const res = await fetch(`${API_BASE}/reports/coach-team`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usuarios = await res.json();

    // ELEGIR DÓNDE RENDERIZAR
    // Si es director, busca el ID de la tabla global. Si no, la tabla normal.
    const idTabla = esDirector ? "tabla-director-colportores-body" : "tabla-coach-body";
    const tbody = document.getElementById(idTabla);
    
    if (!tbody) return; // Seguridad
    tbody.innerHTML = "";

    usuarios.forEach((u) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #eee";

      let botones = ``;
      
      // Botón OJO (Todos)
      botones += `
        <button onclick="abrirModalBasico(${u.id})" style="cursor:pointer; background:none; border:none; color:#005a87; font-size: 1.1rem; margin-right:8px;">
            <i class="fas fa-eye"></i>
        </button>
      `;

      // Botón TUERCA (Solo Director)
      if (usuarioActual.rol === 1) {
        botones += `
        <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer; background:none; border:none; color:#d9534f; font-size: 1.1rem; margin-right:8px;">
            <i class="fas fa-cogs"></i>
        </button>
        `;
      }

      // Botón PDF (Todos)
      botones += `
        <button onclick="abrirModalDescarga(${u.id}, '${u.nombre_completo}')" style="cursor:pointer; background:none; border:none; color:#e74c3c; font-size: 1.1rem;" title="Descargar PDF">
           <i class="fas fa-file-pdf"></i>
        </button>
      `;

      tr.innerHTML = `
            <td style="padding: 10px; font-weight:bold;">${u.nombre_completo}</td>
            <td style="padding: 10px;">${u.total_colecciones} col.</td>
            <td style="padding: 10px; color: green;">$${u.total_dinero}</td>
            <td style="padding: 10px;">${botones}</td>
        `;
      tbody.appendChild(tr);
    });

  } catch (error) { console.error("Error tabla colportores:", error); }
}

//NUEVA FUNCIÓN
// 1. ABRIR MODAL CON DATOS
async function abrirModalGestion(id) {
  try {
    // Usamos la NUEVA ruta específica para gestión
    const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) throw new Error("Error cargando datos");
    const u = await res.json();

    // Llenar Stats (Solo lectura)
    document.getElementById('gest_colecciones').innerText = u.total_colecciones;
    document.getElementById('gest_monto').innerText = '$' + u.total_dinero;
    document.getElementById('gest_horas').innerText = u.total_horas;
    document.getElementById('gest_estudios').innerText = u.total_estudios;

    // Llenar Formulario de Edición
    document.getElementById('gest_id_usuario').value = u.id;
    document.getElementById('gest_nombre').value = u.nombre_completo;
    document.getElementById('gest_telefono').value = u.telefono || '';
    document.getElementById('gest_carrera').value = u.carrera || '';
    document.getElementById('gest_password').value = ''; // Limpiar campo password

    // Mostrar Modal
    document.getElementById('modalGestion').style.display = 'flex';

  } catch (error) {
    console.error(error);
    alert("No se pudo cargar la información.");
  }
}

// 2. CERRAR MODAL
function cerrarModalGestion() {
  document.getElementById('modalGestion').style.display = 'none';
}

// 3. GUARDAR CAMBIOS (Listener)
// Asegúrate de que este listener solo se agregue una vez (fuera de funciones)
const formGestion = document.getElementById('formGestionColportor');
if (formGestion) {
    formGestion.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('gest_id_usuario').value;
      const datos = {
        nombre_completo: document.getElementById('gest_nombre').value,
        telefono: document.getElementById('gest_telefono').value,
        carrera: document.getElementById('gest_carrera').value,
        nueva_password: document.getElementById('gest_password').value
      };

      if (!confirm("¿Guardar cambios?")) return;

      try {
        const res = await fetch(`${API_BASE}/users/gestion/update/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(datos)
        });

        if (res.ok) {
          alert("Datos actualizados");
          cerrarModalGestion();
          cargarTablaCoach(); // Refrescar la tabla para ver el nuevo nombre si cambió
        } else {
          alert("Error al actualizar");
        }
      } catch (error) {
        console.error(error);
        alert("Error de conexión");
      }
    });
}





// 2. ENVIAR REPORTE SEMANAL (DINÁMICO)
// ==========================================
// 2. ENVIAR REPORTE SEMANAL (CON VALIDACIÓN ANTI-NEGATIVOS)
// ==========================================

const formReporte = document.getElementById("formReporteSemanal");

if (formReporte) {
    
    // A. Protección en tiempo real (No permite escribir signos menos)
    const inputsNumericos = ['sem_numero', 'sem_colecciones', 'sem_monto', 'sem_horas', 'sem_estudios'];
    
    inputsNumericos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', (e) => {
                // Permitir teclas de control
                if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) return;
                // Bloquear signos matemáticos y exponente
                if (['e', 'E', '-', '+'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    });

    // B. Clonar para limpiar eventos viejos
    const newFormReporte = formReporte.cloneNode(true);
    formReporte.parentNode.replaceChild(newFormReporte, formReporte);

    // C. Listener de Envío
    newFormReporte.addEventListener("submit", async (e) => {
        e.preventDefault();

        const currentYear = new Date().getFullYear();
        
        // Captura de valores
        const semNumero = document.getElementById("sem_numero").value;
        const colecciones = document.getElementById("sem_colecciones").value;
        const monto = document.getElementById("sem_monto").value;
        const horas = document.getElementById("sem_horas").value;
        const estudios = document.getElementById("sem_estudios").value;

        // --- VALIDACIONES DE NEGATIVOS ---
        if (semNumero <= 0) return mostrarAlerta("Semana Inválida", "El número de semana debe ser mayor a 0.", "warning");
        if (colecciones < 0) return mostrarAlerta("Error en Colecciones", "No puedes poner números negativos.", "warning");
        if (monto < 0) return mostrarAlerta("Error en Monto", "El monto no puede ser negativo.", "warning");
        if (horas < 0) return mostrarAlerta("Error en Horas", "Las horas no pueden ser negativas.", "warning");
        if (estudios < 0) return mostrarAlerta("Error en Estudios", "No puedes poner números negativos.", "warning");

        const datos = {
            semana_numero: semNumero,
            anio: currentYear,
            colecciones: colecciones,
            monto: monto,
            horas: horas,
            estudios: estudios,
        };

        // Feedback visual
        const btn = newFormReporte.querySelector('button[type="submit"]');
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/reports/create-weekly`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(datos),
            });

            if (res.ok) {
                mostrarAlerta("¡Reporte Enviado!", "Tus datos se guardaron exitosamente.", "success");
                newFormReporte.reset();
                
                // Actualizar todo el dashboard
                await cargarEstadisticas();
                await cargarHistorialReportes();
                
                // Opcional: Volver al inicio
                mostrarSeccion("inicio");
            } else {
                mostrarAlerta("Error", "No se pudo enviar el reporte.", "error");
            }
        } catch (error) {
            console.error(error);
            mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
        } finally {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    });
}

// 3. CAMPAÑA INVIERNO
const datosCampana = {
  // ID 1 = UVOC (Occidental)
  1: {
    campos: [
      { id: 1, nombre: "AVCN" },
      { id: 2, nombre: "MVY" },
      { id: 3, nombre: "AVCOC" },
      { id: 4, nombre: "AVLLOC" },
      { id: 5, nombre: "MVP" },
      { id: 6, nombre: "AVSOC" },
      { id: 7, nombre: "AVOC" },
    ],
    zonas: [
      { id: 4, nombre: "Zona 1 (Carabobo-Cojedes)" },
      { id: 5, nombre: "Zona 2 (Yaracuy-Lara)" },
      { id: 6, nombre: "Zona 3 (Barinas-Portuguesa)" },
      { id: 7, nombre: "Zona 4 (Táchira-Mérida)" },
      { id: 8, nombre: "Zona 5 (Zulia-Falcón)" },
    ],
  },
  // ID 2 = UVO (Oriental)
  2: {
    campos: [
      { id: 8, nombre: "AVC" },
      { id: 9, nombre: "AVCOR" },
      { id: 10, nombre: "AVCS" },
      { id: 11, nombre: "MIVELLACEN" },
      { id: 12, nombre: "MIVENOR" },
      { id: 13, nombre: "AVOR" },
      { id: 14, nombre: "AVSOR" },
      { id: 15, nombre: "MIVESUB" },
    ],
    zonas: [
      { id: 1, nombre: "Zona 1 (Capital/Llanos)" },
      { id: 2, nombre: "Zona 2 (Oriente)" },
      { id: 3, nombre: "Zona 3 (Bolívar)" },
    ],
  },
};

function filtrarCampos() {
  const unionId = document.getElementById("camp_union").value;
  const selectCampo = document.getElementById("camp_campo");
  const selectZona = document.getElementById("camp_zona");

  selectCampo.innerHTML = '<option value="">Seleccione...</option>';
  selectZona.innerHTML = '<option value="">Seleccione...</option>';

  if (datosCampana[unionId]) {
    selectCampo.disabled = false;
    selectZona.disabled = false;

    // Llenamos los Campos
    datosCampana[unionId].campos.forEach((c) => {
      selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });

    // Llenamos las Zonas (AHORA USAMOS VALUE=ID, NO EL NOMBRE)
    datosCampana[unionId].zonas.forEach((z) => {
      // Enviamos el ID de la zona como value
      selectZona.innerHTML += `<option value="${z.id}">${z.nombre}</option>`;
    });
  } else {
    selectCampo.disabled = true;
    selectZona.disabled = true;
  }
}

async function cargarCampana() {
  try {
    const res = await fetch(`${API_BASE}/campana`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.union_trabajo_id) {
      document.getElementById("camp_union").value = data.union_trabajo_id;
      filtrarCampos();
      document.getElementById("camp_campo").value = data.campo_trabajo_id;

      if (data.lugar_colportar) {
        const partes = data.lugar_colportar.split(" - ");
        document.getElementById("camp_ciudad").value = partes[0] || "";
        if (partes[1]) document.getElementById("camp_zona").value = partes[1];
      }
    }
  } catch (e) {}
}

document.getElementById("formCampana").addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = {
    union_id: document.getElementById("camp_union").value,
    campo_id: document.getElementById("camp_campo").value,
    zona: document.getElementById("camp_zona").value,
    ciudad: document.getElementById("camp_ciudad").value,
  };
  const res = await fetch(`${API_BASE}/campana/asignar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(datos),
  });
  if (res.ok) alert("Asignación guardada correctamente");
});

// 4. PERFIL
function toggleEditProfile() {
  const mode =
    document.getElementById("editProfileMode").style.display === "none";
  document.getElementById("viewProfileMode").style.display = mode
    ? "none"
    : "block";
  document.getElementById("editProfileMode").style.display = mode
    ? "block"
    : "none";
}

async function cargarPerfil() {
  try {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    // --- 1. LÓGICA DE SELECTS (Unión y Campo) ---
    // Usamos los IDs 'reg_union' y 'reg_campo' que definimos en el HTML
    const unionInput = document.getElementById('reg_union');
    const campoInput = document.getElementById('reg_campo');

    if (unionInput && data.union_procedencia_id) {
        // A. Asignamos la Unión
        unionInput.value = data.union_procedencia_id;
        
        // B. ¡IMPORTANTE! Ejecutamos el filtro manual para llenar las opciones del Campo
        // (Asegúrate de tener la función filtrarProcedenciaPerfil definida en tu archivo)
        filtrarProcedenciaPerfil(); 

        // C. Ahora que el select de Campo tiene opciones, le asignamos el valor
        if (data.campo_procedencia_id && campoInput) {
            campoInput.value = data.campo_procedencia_id;
        }
    }

    // --- 2. Textos del Header ---
    document.getElementById("headerNombre").innerText = data.nombre_completo || "Usuario";
    if(document.getElementById("nombreUsuarioDash")) {
        document.getElementById("nombreUsuarioDash").innerText = (data.nombre_completo || "Usuario").split(" ")[0];
    }
    document.getElementById("headerCarrera").innerText = data.carrera || "Estudiante";

    // --- 3. IMAGEN DE PERFIL ---
    const imgPerfil = document.getElementById('headerFoto');
    if(data.foto_perfil_url) {
        imgPerfil.src = `http://localhost:3000/${data.foto_perfil_url.replace(/\\/g, '/')}`;
    } else {
        imgPerfil.src = '../image/usuario-icon.webp';
    }
    imgPerfil.onerror = function() { this.src = '../image/usuario-icon.webp'; };

    // --- 4. Vista de Lectura ---
    document.getElementById("view_cedula").innerText = data.cedula || "";
    document.getElementById("view_telefono").innerText = data.telefono || "";
    document.getElementById("view_procedencia").innerText = data.lugar_procedencia || "";
    document.getElementById("view_religion").innerText = data.religion || "";
    document.getElementById("view_civil").innerText = data.estado_civil || "Soltero";
    document.getElementById("view_pensamiento").innerText = data.pensamiento_bio || "Sin pensamiento definido.";

    // --- 5. Formularios de Edición ---
    document.getElementById("pensamiento_input").value = data.pensamiento_bio || "";
    document.getElementById("reg_nombre").value = data.nombre_completo || "";
    document.getElementById("reg_cedula").value = data.cedula || "";
    document.getElementById("reg_telefono").value = data.telefono || "";
    document.getElementById("reg_carrera").value = data.carrera || "";
    document.getElementById("reg_religion").value = data.religion || "";
    document.getElementById("reg_lugar_procedencia").value = data.lugar_procedencia || "";
    
    if (data.estado_civil) document.getElementById("reg_civil").value = data.estado_civil;

    document.getElementById("padre_nombre").value = data.padre_nombre || "";
    document.getElementById("padre_telefono").value = data.padre_telefono || "";
    document.getElementById("madre_nombre").value = data.madre_nombre || "";
    document.getElementById("madre_telefono").value = data.madre_telefono || "";
    document.getElementById("reg_direccion").value = data.direccion_origen || "";
    document.getElementById("conyuge_nombre").value = data.conyuge_nombre || "";
    document.getElementById("padecimiento").value = data.padecimiento_medico || "";

  } catch (e) {
    console.error("Error cargando perfil:", e);
  }
}

document.getElementById("formBio").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData();
  const fileInput = document.getElementById("foto_perfil_input");
  if (fileInput.files[0]) formData.append("foto_perfil", fileInput.files[0]);
  const nuevoPensamiento = document.getElementById("pensamiento_input").value;
  formData.append("pensamiento", nuevoPensamiento);

  const res = await fetch(`${API_BASE}/profile/bio`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.ok) {
    alert("Biografía actualizada");
    document.getElementById("view_pensamiento").innerText = nuevoPensamiento;
    if (fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("headerFoto").src = e.target.result;
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
    toggleEditProfile();
  }
});

// --- GUARDAR PERFIL PERSONAL (CON VALIDACIÓN PRO) ---
const formPersonales = document.getElementById("formPersonales");

if (formPersonales) {
    // 1. Activamos la protección de teclas (para que no escriban números en nombres)
    // (Asegúrate de tener la función protegerInputsPerfil() definida al inicio del archivo)
    protegerInputsPerfil();

    // 2. Clonamos para limpiar eventos viejos y evitar duplicados
    const newFormPersonales = formPersonales.cloneNode(true);
    formPersonales.parentNode.replaceChild(newFormPersonales, formPersonales);

    // 3. Listener de Envío
    newFormPersonales.addEventListener("submit", async (e) => {
        e.preventDefault();

        // --- VALIDACIONES PREVIAS (SweetAlert) ---
        const nombre = document.getElementById("reg_nombre").value.trim();
        const cedula = document.getElementById("reg_cedula").value.trim();
        const telefono = document.getElementById("reg_telefono").value.trim();

        if (nombre.length < 3) {
            return mostrarAlerta("Nombre Inválido", "El nombre es muy corto.", "warning");
        }
        if (cedula.length < 7) {
            return mostrarAlerta("Cédula Inválida", "Debe tener al menos 7 dígitos.", "warning");
        }
        if (telefono.length < 10) {
            return mostrarAlerta("Teléfono Inválido", "Verifique el número (min 10 dígitos).", "warning");
        }

        // --- RECOPILAR DATOS ---
        // Usamos IDs seguros (reg_union y reg_campo que ya arreglamos en el HTML)
        const unionInput = document.getElementById("reg_union");
        const campoInput = document.getElementById("reg_campo");

        const datos = {
            nombre_completo: nombre,
            cedula: cedula,
            telefono: telefono,
            carrera: document.getElementById("reg_carrera").value,
            religion: document.getElementById("reg_religion").value,
            estado_civil: document.getElementById("reg_civil").value,
            
            // Lógica inteligente: Si no existe el select, envía null
            union_procedencia: unionInput ? unionInput.value : null,
            campo_procedencia: campoInput ? campoInput.value : null,
            
            lugar_procedencia: document.getElementById("reg_lugar_procedencia").value,
            
            padre_nombre: document.getElementById("padre_nombre").value,
            padre_telefono: document.getElementById("padre_telefono").value,
            madre_nombre: document.getElementById("madre_nombre").value,
            madre_telefono: document.getElementById("madre_telefono").value,
            
            direccion_origen: document.getElementById("reg_direccion").value,
            conyuge_nombre: document.getElementById("conyuge_nombre").value,
            padecimiento: document.getElementById("padecimiento").value,
        };

        // --- ENVIAR AL BACKEND ---
        // Feedback visual en el botón
        const btnGuardar = newFormPersonales.querySelector('button[type="submit"]');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/profile/personales`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(datos),
            });

            if (res.ok) {
                mostrarAlerta("¡Perfil Actualizado!", "Tus datos se guardaron correctamente.", "success");
                
                // Actualizar vista de lectura inmediatamente
                document.getElementById("headerNombre").innerText = datos.nombre_completo;
                document.getElementById("view_cedula").innerText = datos.cedula;
                document.getElementById("view_telefono").innerText = datos.telefono;
                document.getElementById("view_procedencia").innerText = datos.lugar_procedencia;
                document.getElementById("view_religion").innerText = datos.religion;
                document.getElementById("view_civil").innerText = datos.estado_civil;
                
                toggleEditProfile(); // Cerrar edición
            } else {
                mostrarAlerta("Error", "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            console.error(error);
            mostrarAlerta("Error de Conexión", "Intenta nuevamente.", "error");
        } finally {
            // Restaurar botón
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    });
}

// 5. COMPAÑEROS
async function cargarCompaneros() {
  const container = document.getElementById("listaCompaneros");
  container.innerHTML =
    '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando...</p></div>';
  try {
    const res = await fetch(`${API_BASE}/users/lista`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Error al cargar lista.");
    const users = await res.json();
    if (users.length === 0) {
      container.innerHTML = "<p>No hay compañeros registrados aún.</p>";
      return;
    }
    container.innerHTML = "";
    users.forEach((u) => {
      let foto = u.foto_perfil_url
        ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, "/")}`
        : '../image/usuario-icon.webp';
      container.innerHTML += `<div class="colleague-card" onclick="verDetalle(${
        u.id
      })"><img src="${foto}" class="colleague-pic" onerror="this.src='https://via.placeholder.com/150'"><h4 class="colleague-name">${
        u.nombre_completo
      }</h4><span class="colleague-role">${
        u.carrera || "Estudiante"
      }</span></div>`;
    });
  } catch (e) {
    container.innerHTML =
      "<p>Error cargando lista. Asegúrate de que el servidor esté corriendo.</p>";
  }
}
//DETALLE DE LOS COMPA;EROS
async function verDetalle(id) {
  try {
    const res = await fetch(`${API_BASE}/users/detalle/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const u = await res.json();

    // 1. Textos
    document.getElementById("modalNombre").innerText = u.nombre_completo;
    document.getElementById("modalCarrera").innerText = u.carrera || "Estudiante";
    document.getElementById("modalLugar").innerText = u.lugar_colportar || "No especificado";
    document.getElementById("modalTelefono").innerText = u.telefono || "Privado";
    document.getElementById("modalPensamiento").innerText = u.pensamiento_bio || "Sin pensamiento.";

    // 2. Lógica de Imagen (CORREGIDA)
    let foto = u.foto_perfil_url
      ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, "/")}`
      : '../image/usuario-icon.webp';

    // AQUI ESTABA EL ERROR: Primero seleccionamos la etiqueta
    const imgElement = document.getElementById("modalFoto");
    
    // Luego asignamos la fuente y el evento de error
    imgElement.src = foto;
    imgElement.onerror = function() { this.src = '../image/usuario-icon.webp'; };

    // 3. Mostrar Modal
    document.getElementById("modalCompanero").style.display = "flex";
  } catch (error) {
    console.error("Error al ver detalle:", error);
  }
}

function cerrarModal() {
  document.getElementById("modalCompanero").style.display = "none";
}
function cerrarSesion() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

document
  .getElementById("formInformeMensual")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentYear = new Date().getFullYear();
    const formData = new FormData();
    formData.append("mes", document.getElementById("mes_reporte").value);
    formData.append("anio", currentYear);
    formData.append(
      "informe",
      document.getElementById("archivo_informe").files[0]
    );
    const res = await fetch(`${API_BASE}/reports/upload-monthly`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      alert("Informe Subido Correctamente");
      e.target.reset();
    }
  });
  

  // --- 1. ABRIR MODAL BÁSICO (OJO) ---
async function abrirModalBasico(id) {
    // Reutilizamos el modal 'modalGestion' que ya tenías para cosas básicas
    // Asegúrate de que en el HTML ese modal NO tenga los inputs de Zona/Campo/Unión
    try {
        const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const u = await res.json();

        // Llenar Stats
        document.getElementById('gest_colecciones').innerText = u.total_colecciones || 0;
        document.getElementById('gest_monto').innerText = '$' + (u.total_dinero || 0);
        document.getElementById('gest_horas').innerText = u.total_horas || 0;
        document.getElementById('gest_estudios').innerText = u.total_estudios || 0;

        // Llenar Datos Personales
        document.getElementById('gest_id_usuario').value = u.id;
        document.getElementById('gest_nombre').value = u.nombre_completo;
        document.getElementById('gest_telefono').value = u.telefono || '';
        document.getElementById('gest_carrera').value = u.carrera || '';
        document.getElementById('gest_password').value = ''; 

        // IMPORTANTE: Asegúrate de borrar los inputs de zona del HTML de este modal si quedaron ahí.
        
        document.getElementById('modalGestion').style.display = 'flex';
    } catch (e) { console.error(e); }
}

// --- 2. ABRIR MODAL AVANZADO (ENGRANAJE) ---

let pasoActual = 1;

// 1. ABRIR EL MODAL Y LLENAR TODO
async function abrirModalCompleto(id) {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const u = await res.json();

        document.getElementById('gt_rol').value = u.rol_id || 3;
        // Resetear al Paso 1
        pasoActual = 1;
        mostrarPaso(1);
        document.getElementById('gt_id_usuario').value = u.id;

        // --- PASO 1: DATOS PERSONALES ---
        document.getElementById('gt_nombre').value = u.nombre_completo || '';
        document.getElementById('gt_cedula').value = u.cedula || '';
        document.getElementById('gt_telefono').value = u.telefono || '';
        document.getElementById('gt_carrera').value = u.carrera || '';
        document.getElementById('gt_religion').value = u.religion || '';
        document.getElementById('gt_civil').value = u.estado_civil || 'Soltero';
        document.getElementById('gt_procedencia').value = u.lugar_procedencia || '';

        if(u.fecha_nacimiento) {
            document.getElementById('gt_fecha_nac').value = u.fecha_nacimiento.toString().substring(0, 10);
        } else {
            document.getElementById('gt_fecha_nac').value = '';
        }

        // --- PASO 2: FAMILIA (Datos Extra) ---
        // Nota: Asegúrate que tu backend envíe estos campos (padre_nombre, etc.)
        document.getElementById('gt_padre').value = u.padre_nombre || '';
        document.getElementById('gt_tlf_padre').value = u.padre_telefono || '';
        document.getElementById('gt_madre').value = u.madre_nombre || '';
        document.getElementById('gt_tlf_madre').value = u.madre_telefono || '';
        document.getElementById('gt_direccion').value = u.direccion_origen || '';
        document.getElementById('gt_salud').value = u.padecimiento_medico || '';

        // --- PASO 3: CAMPAÑA Y SEGURIDAD ---
        document.getElementById('gt_rol').value = u.rol_id || 3;
        document.getElementById('gt_password').value = '';

        // Configurar los Selects de Campaña
        const unionId = u.union_trabajo_id || '';
        document.getElementById('gt_union').value = unionId;
        
        // Disparamos el filtro manualmente para llenar los selects de Campo y Zona
        filtrarCamposGestion(); 

        // Esperamos un momento o asignamos directamente si hay datos
        if(unionId) {
            document.getElementById('gt_campo').value = u.campo_trabajo_id || '';
            document.getElementById('gt_zona').value = u.zona_id || '';
        }

        // Mostrar el Modal
        document.getElementById('modalGestionTotal').style.display = 'flex';

    } catch (e) { 
        console.error(e); 
        alert("Error cargando datos del colportor."); 
    }
}

// 2. CONTROL DE PASOS (Siguiente / Atrás)
function cambiarPaso(nuevoPaso) {
    pasoActual = nuevoPaso;
    mostrarPaso(pasoActual);
}

function mostrarPaso(paso) {
    // Ocultar todos
    document.getElementById('paso-1').style.display = 'none';
    document.getElementById('paso-2').style.display = 'none';
    document.getElementById('paso-3').style.display = 'none';
    // Mostrar el actual
    document.getElementById(`paso-${paso}`).style.display = 'block';
}

function cerrarModalTotal() {
    document.getElementById('modalGestionTotal').style.display = 'none';
}

// 3. SELECTS DINÁMICOS (Igual que en Invierno 2025)
function filtrarCamposGestion() {
    const unionId = document.getElementById('gt_union').value;
    const selectCampo = document.getElementById('gt_campo');
    const selectZona = document.getElementById('gt_zona');
    
    selectCampo.innerHTML = '<option value="">Seleccione...</option>';
    selectZona.innerHTML = '<option value="">Seleccione...</option>';
    
    // Usamos la variable global 'datosCampana' que ya tienes definida arriba
    if (datosCampana[unionId]) {
        selectCampo.disabled = false;
        selectZona.disabled = false;
        
        datosCampana[unionId].campos.forEach(c => {
            selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });

        datosCampana[unionId].zonas.forEach(z => {
            selectZona.innerHTML += `<option value="${z.id}">${z.nombre}</option>`;
        });
    } else {
        selectCampo.disabled = true;
        selectZona.disabled = true;
    }
}

// 4. GUARDAR TODO (SUBMIT)
// --- LÓGICA DE GUARDADO DEL WIZARD (MODAL GRANDE) ---
// Pegar esto AL FINAL del archivo script-dashboard.js

const formTotal = document.getElementById('formGestionTotal');

if (formTotal) {
    // 1. EL TRUCO: Clonamos el formulario para borrar cualquier evento "fantasma" anterior
    const newFormTotal = formTotal.cloneNode(true);
    formTotal.parentNode.replaceChild(newFormTotal, formTotal);

    // 2. Ahora escuchamos el evento en el formulario NUEVO y LIMPIO
    newFormTotal.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        if(!confirm("¿Estás seguro de guardar TODOS los cambios?")) return;

        // Recopilamos los datos
        const id = document.getElementById('gt_id_usuario').value;
        const datos = {
            // Paso 1
            nombre_completo: document.getElementById('gt_nombre').value,
            cedula: document.getElementById('gt_cedula').value,
            telefono: document.getElementById('gt_telefono').value,
            carrera: document.getElementById('gt_carrera').value,
            religion: document.getElementById('gt_religion').value,
            lugar_procedencia: document.getElementById('gt_procedencia').value,
            estado_civil: document.getElementById('gt_civil').value,
            fecha_nacimiento: document.getElementById('gt_fecha_nac').value,            
            // Paso 2
            padre_nombre: document.getElementById('gt_padre').value,
            padre_telefono: document.getElementById('gt_tlf_padre').value,
            madre_nombre: document.getElementById('gt_madre').value,
            madre_telefono: document.getElementById('gt_tlf_madre').value,
            direccion_origen: document.getElementById('gt_direccion').value,
            padecimiento: document.getElementById('gt_salud').value,
            // Paso 3
            union_id: document.getElementById('gt_union').value,
            campo_id: document.getElementById('gt_campo').value,
            zona_id: document.getElementById('gt_zona').value,
            nueva_password: document.getElementById('gt_password').value,
            rol_id: document.getElementById('gt_rol').value,
            
        };

        try {
            const res = await fetch(`${API_BASE}/users/gestion/update/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if(res.ok) {
                alert(" Perfil maestro actualizado correctamente");
                
                // Cerrar modal manualmente (necesario tras usar cloneNode)
                document.getElementById('modalGestionTotal').style.display = 'none';
                
                // Recargar las tablas para ver los cambios
                await actualizarTablas();
              } else {
                alert(" Error al guardar.");
            }
        } catch(e) { 
            console.error(e); 
            alert(" Error de conexión"); 
        }
    });

    // IMPORTANTE: Al clonar, los botones "Siguiente/Atrás" dentro del form pueden perder su función.
    // Como esos botones usan 'onclick="..."' en el HTML, deberían seguir funcionando bien.
    // Pero si el botón de cerrar (X) deja de servir, avísame.
}


// --- EVENTO GUARDAR (MODAL BÁSICO / OJO) ---
const formBasico = document.getElementById('formGestionColportor');

if (formBasico) {
    const newForm = formBasico.cloneNode(true);
    formBasico.parentNode.replaceChild(newForm, formBasico);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('gest_id_usuario').value;
        const datos = {
            nombre_completo: document.getElementById('gest_nombre').value,
            telefono: document.getElementById('gest_telefono').value,
            carrera: document.getElementById('gest_carrera').value,
            nueva_password: document.getElementById('gest_password').value
        };

        if(!confirm("¿Guardar cambios básicos?")) return;

        try {
            // USAMOS LA NUEVA RUTA QUE SOLO TOCA LO BASICO
            const res = await fetch(`${API_BASE}/users/gestion/update-basic/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if(res.ok) {
                alert("Datos básicos actualizados");
                document.getElementById('modalGestion').style.display = 'none';
                // Refrescamos todo
               await actualizarTablas();
              } else {
                alert("Error al actualizar");
            }
        } catch (error) { console.error(error); alert("Error de conexión"); }
    });
    
    // Reconectar botón cancelar
    const btnCancelar = newForm.querySelector('button[type="button"]');
    if(btnCancelar) btnCancelar.onclick = function() { document.getElementById('modalGestion').style.display = 'none'; };
}

// --- CARGAR TABLA GLOBAL (SOLO DIRECTOR) ---
async function cargarTablaGlobalDirector() {
    try {
        // Esta ruta ya trae a TODOS (Coaches y Colportores)
        const res = await fetch(`${API_BASE}/users/gestion/todos`, { headers: { 'Authorization': `Bearer ${token}` } });
        const usuarios = await res.json();
        
        const tbody = document.getElementById('tabla-director-colportores-body');
        if(!tbody) return; 
        tbody.innerHTML = '';

        usuarios.forEach(u => {
            // LÓGICA DE ICONOS (Aquí es donde diferenciamos)
            let iconoRol = '<i class="fas fa-user" style="color:#ccc; margin-right:5px;" title="Colportor"></i>'; 
            
            // Si es Coach (Rol 2), le ponemos la estrella
            if (u.rol_id === 2) {
                iconoRol = '<i class="fas fa-star" style="color:#f0ad4e; margin-right:5px;" title="Coach"></i>';
            }
            // Si es Director (Rol 1 - por si acaso aparece), corona
            if (u.rol_id === 1) {
                iconoRol = '<i class="fas fa-crown" style="color:#d9534f; margin-right:5px;" title="Director"></i>';
            }

            // Formato de Zona
            const nombreZona = u.zona_nombre 
                ? `<span style="color:#005a87; font-weight:500;">${u.zona_nombre}</span>` 
                : '<span style="color:#ccc;">--</span>';

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            
            tr.innerHTML = `
                <td style="padding: 10px;">
                    ${iconoRol} <strong>${u.nombre_completo}</strong>
                </td>
                <td style="padding: 10px; font-weight:bold; text-align: center;">
                    ${u.total_colecciones || 0}
                </td>
                <td style="padding: 10px; font-weight:bold; color: green;">
                    $${u.total_dinero || '0.00'}
                </td>
                <td style="padding: 10px;">
                    ${nombreZona}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="abrirModalBasico(${u.id})" style="cursor:pointer; background:none; border:none; color:#005a87; font-size: 1.1rem; margin-right: 5px;" title="Ver Ficha">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer; background:none; border:none; color:#d9534f; font-size: 1.1rem; margin-right: 5px;" title="Gestión Maestra">
                        <i class="fas fa-cogs"></i>
                    </button>
                    <button onclick="abrirModalDescarga(${u.id}, '${u.nombre_completo}')" style="cursor:pointer; background:none; border:none; color:#e74c3c; font-size: 1.1rem;" title="Descargar PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error tabla global:", e); }
}


// --- TABLA DE COACHES ---
async function cargarTablaCoaches() {
    try {
        const res = await fetch(`${API_BASE}/users/lista-coaches`, { headers: { 'Authorization': `Bearer ${token}` } });
        const coaches = await res.json();
        
        const tbody = document.getElementById('tabla-coaches-body');
        if(!tbody) return;
        tbody.innerHTML = '';

        coaches.forEach(c => {
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">
                        <strong>${c.nombre_completo}</strong>
                    </td>
                    <td style="padding: 10px;">${c.zona_nombre || 'Sin Asignar'}</td>
                    <td style="padding: 10px;">${c.equipo_cantidad} a cargo</td>
                    <td style="padding: 10px; font-weight:bold; color: green;">$${c.total_zona_dinero}</td>
                    <td style="padding: 10px; font-weight:bold;">${c.total_zona_colecciones}</td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="abrirModalCompleto(${c.id})" style="cursor:pointer; background:none; border:none; color:#e67e22; font-size:1.1rem;">
                            <i class="fas fa-user-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch(e) { console.error("Error tabla coaches:", e); }
}

// --- FUNCIÓN MAESTRA PARA REFRESCAR TODO ---
async function actualizarTablas() {
    console.log("🔄 Refrescando datos del sistema...");
    
    try {
        // Si soy DIRECTOR, recargo todo mi panel
        if (usuarioActual.rol === 1) {
            await cargarGraficasDirector();      // 1. Gráficas y Totales ($)
            await cargarTablaCoaches();          // 2. Tabla Amarilla (Liderazgo)
            await cargarTablaGlobalDirector();   // 3. Tabla Azul (General)
        } 
        // Si soy COACH, recargo mi tabla
        else if (usuarioActual.rol === 2) {
            await cargarTablaCoach(false);       // Tabla de mi equipo
            // Opcional: Refrescar tarjetas personales si las usas
            const res = await fetch(`${API_BASE}/reports/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } });
            if(res.ok) llenarTarjetas(await res.json());
        }
        console.log("✅ Datos refrescados correctamente.");
    } catch (e) {
        console.error("Error al refrescar tablas:", e);
    }
}

// --- LÓGICA DE DESCARGAS ---

// 1. ABRIR MODAL DE DESCARGA
function abrirModalDescarga(id, nombre) {
    document.getElementById('descarga_user_id').value = id;
    document.getElementById('descarga_user_name').value = nombre;
    document.getElementById('span-nombre-descarga').innerText = nombre.split(' ')[0]; // Solo el primer nombre
    
    // Poner mes actual por defecto
    const fecha = new Date();
    document.getElementById('descarga_mes').value = fecha.getMonth() + 1; // +1 porque Enero es 0
    document.getElementById('descarga_anio').value = fecha.getFullYear();

    document.getElementById('modalDescarga').style.display = 'flex';
}

// 2. DESCARGAR INDIVIDUAL
async function descargarIndividual() {
    const userId = document.getElementById('descarga_user_id').value;
    const mes = document.getElementById('descarga_mes').value;
    const anio = document.getElementById('descarga_anio').value;

    try {
        const res = await fetch(`${API_BASE}/reports/get-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ userId, mes, anio })
        });

        const data = await res.json();

        if (data.found) {
            // Abrir el archivo en nueva pestaña
            // Ajustamos la ruta para que sea válida en el navegador
            const urlLimpia = `http://localhost:3000/${data.url.replace(/\\/g, '/')}`;
            window.open(urlLimpia, '_blank');
        } else {
            alert(" " + data.message);
        }
    } catch (e) {
        console.error(e);
        alert("Error al buscar el archivo.");
    }
}

// 3. DESCARGAR MASIVO (ZIP)
async function descargarMasivo() {
    const mes = document.getElementById('descarga_mes').value;
    const anio = document.getElementById('descarga_anio').value;

    if(!confirm(`¿Generar archivo ZIP con los informes del ${mes}/${anio}?`)) return;

    // Feedback visual (cambiar texto botón)
    const btn = document.querySelector('#modalDescarga button[onclick="descargarMasivo()"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';
    btn.disabled = true;

    try {
        // Hacemos la petición pidiendo el archivo (blob)
        const res = await fetch(`${API_BASE}/reports/download-zip`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ mes, anio })
        });

        if (res.ok) {
            // 1. Convertimos la respuesta en un "Blob" (Archivo binario)
            const blob = await res.blob();
            
            // 2. Creamos un enlace invisible para forzar la descarga
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Informes_Mes_${mes}_${anio}.zip`; // Nombre del archivo
            document.body.appendChild(a);
            a.click(); // Simulamos el clic
            a.remove(); // Limpiamos
            window.URL.revokeObjectURL(url);

            alert(" Archivo ZIP descargado exitosamente.");
        } else {
            const errorData = await res.json();
            alert(" " + (errorData.message || "No se pudo descargar."));
        }

    } catch (e) {
        console.error(e);
        alert("Error de conexión al descargar.");
    } finally {
        // Restaurar botón
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

function filtrarProcedenciaPerfil() {
    // Ahora buscamos DIRECTAMENTE los IDs que acabamos de poner en el HTML
    const unionSelect = document.getElementById('reg_union');
    const campoSelect = document.getElementById('reg_campo');

    // Si no existen (por ejemplo en otra vista), no hacemos nada
    if (!unionSelect || !campoSelect) return;

    const unionId = unionSelect.value;
    
    // Limpiar select
    campoSelect.innerHTML = '<option value="">Seleccione...</option>';
    
    if (datosProcedencia[unionId]) {
        campoSelect.disabled = false;
        datosProcedencia[unionId].forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.nombre;
            campoSelect.appendChild(option);
        });
    } else {
        campoSelect.disabled = true;
    }
}

// --- CARGAR HISTORIAL DE REPORTES (TABLA) ---
async function cargarHistorialReportes() {
    try {
        const res = await fetch(`${API_BASE}/reports/my-reports`, { headers: { Authorization: `Bearer ${token}` } });
        const reportes = await res.json();
        
        const tbody = document.getElementById('tabla-historial-reportes');
        if(!tbody) return;
        tbody.innerHTML = '';

        if (reportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">No hay reportes registrados aún.</td></tr>';
            return;
        }

        reportes.forEach(r => {
            const tr = document.createElement('tr');
            
            // Formateamos la fecha un poco más limpia si es necesario
            // (Asumiendo que r.fecha_formato viene DD/MM/YYYY)
            
            tr.innerHTML = `
                <td>
                    <span class="badge-week">Semana ${r.semana_numero}</span>
                </td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">
                    <i class="far fa-calendar-alt" style="margin-right:5px;"></i> ${r.fecha_formato}
                </td>
                <td style="text-align: center; font-weight: 500;">
                    ${r.colecciones_vendidas}
                </td>
                <td style="text-align: right;">
                    <span class="value-money">$${parseFloat(r.monto_dolares).toFixed(2)}</span>
                </td>
                <td style="text-align: center;">
                    <span class="value-hours">${r.horas_trabajadas} h</span>
                </td>
                <td style="text-align: center; color: var(--text-muted);">
                    ${r.estudios_biblicos}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error historial:", e); }
}