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
}

// 1. CARGAR STATS

async function cargarEstadisticas() {
  try {
    // 1. Obtenemos stats básicas para saber el ROL
    const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const rol = data.rol_detectado;
      usuarioActual.rol = rol; // Guardamos el rol globalmente

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

      // --- OCULTAR TODO PRIMERO ---
      document.getElementById("vista-colportor").style.display = "none";
      document.getElementById("vista-director").style.display = "none";
      document.getElementById("vista-coach").style.display = "none";

      // --- MOSTRAR SEGÚN ROL ---

      // CASO 1: DIRECTOR (Gráficas)
      if (rol === 1) {
        document.getElementById("vista-director").style.display = "block";
        cargarGraficasDirector();
        // El director también puede ver la tabla del coach si quiere, pero abajo
        document.getElementById("vista-coach").style.display = "block";
        cargarTablaCoach();
      }

      // CASO 2: COACH (Tabla)
      else if (rol === 2) {
        document.getElementById("vista-coach").style.display = "block";
        cargarTablaCoach();
        // Opcional: mostrar tarjetas resumen también
        document.getElementById("vista-colportor").style.display = "flex";
        llenarTarjetas(data);
      }

      // CASO 3: COLPORTOR (Tarjetas)
      else {
        document.getElementById("vista-colportor").style.display = "flex";
        llenarTarjetas(data);
      }
    }
  } catch (e) {
    console.error(e);
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
async function cargarGraficasDirector() {
  const res = await fetch(`${API_BASE}/reports/director-charts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  // Gráfica de Dinero
  new Chart(document.getElementById("graficaDinero"), {
    type: "bar", // Barras
    data: {
      labels: data.dinero.map((d) => d.zona),
      datasets: [
        {
          label: "Dólares Recaudados",
          data: data.dinero.map((d) => d.total),
          backgroundColor: [
            "#005a87",
            "#28a745",
            "#ffc107",
            "#dc3545",
            "#17a2b8",
          ],
        },
      ],
    },
  });

  // Gráfica de Libros
  new Chart(document.getElementById("graficaLibros"), {
    type: "doughnut", // Torta / Donut
    data: {
      labels: data.libros.map((d) => d.zona),
      datasets: [
        {
          label: "Colecciones",
          data: data.libros.map((d) => d.total),
          backgroundColor: [
            "#005a87",
            "#28a745",
            "#ffc107",
            "#dc3545",
            "#17a2b8",
          ],
        },
      ],
    },
  });
}

// --- LÓGICA DE TABLA (Coach y Director) ---
async function cargarTablaCoach() {
  try {
    const res = await fetch(`${API_BASE}/reports/coach-team`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usuarios = await res.json();

    const tbody = document.getElementById("tabla-coach-body");
    tbody.innerHTML = "";

    // VERIFICAMOS SI SOY DIRECTOR (Rol 1)
    // Asumimos que 'usuarioActual' se llenó en cargarEstadisticas()
    const soyDirector = (usuarioActual && usuarioActual.rol === 1);

    usuarios.forEach((u) => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #eee";

      // PREPARAMOS LOS BOTONES
      let botones = ``;

      // 1. BOTÓN OJO (👁️): Visible para TODOS (Abre modal básico)
      botones += `
        <button onclick="abrirModalBasico(${u.id})" style="cursor:pointer; background:none; border:none; color:#005a87; font-size: 1.1rem; margin-right:8px;" title="Ver y Editar Datos Básicos">
            <i class="fas fa-eye"></i>
        </button>
      `;

      // 2. BOTÓN ENGRANAJE (⚙️): SOLO para DIRECTOR (Abre modal avanzado)
      if (soyDirector) {
        botones += `
        <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer; background:none; border:none; color:#d9534f; font-size: 1.1rem; margin-right:8px;" title="Editar Todo">
            <i class="fas fa-cogs"></i>
        </button>
    `;
      }

      // 3. BOTÓN PDF: Visible para TODOS
      botones += `
        <button onclick="alert('Descargar PDF de ${u.nombre_completo}')" style="cursor:pointer; background:none; border:none; color:#d9534f;">
            <i class="fas fa-file-pdf"></i>
        </button>
      `;

      // RENDERIZAR FILA
      tr.innerHTML = `
            <td style="padding: 10px; font-weight:bold;">${u.nombre_completo}</td>
            <td style="padding: 10px;">${u.total_colecciones} col.</td>
            <td style="padding: 10px; color: green;">$${u.total_dinero}</td>
            <td style="padding: 10px;">
                ${botones}
            </td>
        `;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error cargando tabla:", error);
  }
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
document
  .getElementById("formReporteSemanal")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentYear = new Date().getFullYear();
    const inputColecciones = document.getElementById("sem_colecciones").value;
    const inputMonto = document.getElementById("sem_monto").value;
    const inputHoras = document.getElementById("sem_horas").value;
    const inputEstudios = document.getElementById("sem_estudios").value;

    const datos = {
      semana_numero: document.getElementById("sem_numero").value,
      anio: currentYear,
      colecciones: inputColecciones,
      monto: inputMonto,
      horas: inputHoras,
      estudios: inputEstudios,
    };

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
        alert("Reporte Enviado Exitosamente");
        e.target.reset();
        await cargarEstadisticas();
        mostrarSeccion("inicio");
      } else {
        alert("Error al enviar el reporte.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión.");
    }
  });

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

    // --- Textos del Header ---
    document.getElementById("headerNombre").innerText = data.nombre_completo || "Usuario";
    // Verificamos si existe el elemento antes de llenarlo (por seguridad)
    if(document.getElementById("nombreUsuarioDash")) {
        document.getElementById("nombreUsuarioDash").innerText = (data.nombre_completo || "Usuario").split(" ")[0];
    }
    document.getElementById("headerCarrera").innerText = data.carrera || "Estudiante";

    // --- IMAGEN DE PERFIL (Optimizada) ---
    const imgPerfil = document.getElementById('headerFoto');
    if(data.foto_perfil_url) {
        imgPerfil.src = `http://localhost:3000/${data.foto_perfil_url.replace(/\\/g, '/')}`;
    } else {
        imgPerfil.src = '../image/usuario-icon.webp';
    }
    // Si la imagen falla al cargar, ponemos el icono por defecto
    imgPerfil.onerror = function() { this.src = '../image/usuario-icon.webp'; };

    // --- Vista de Lectura ---
    document.getElementById("view_cedula").innerText = data.cedula || "";
    document.getElementById("view_telefono").innerText = data.telefono || "";
    document.getElementById("view_procedencia").innerText = data.lugar_procedencia || "";
    document.getElementById("view_religion").innerText = data.religion || "";
    document.getElementById("view_civil").innerText = data.estado_civil || "Soltero";
    document.getElementById("view_pensamiento").innerText = data.pensamiento_bio || "Sin pensamiento definido.";

    // --- Formularios de Edición ---
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

document
  .getElementById("formPersonales")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const datos = {
      nombre_completo: document.getElementById("reg_nombre").value,
      cedula: document.getElementById("reg_cedula").value,
      telefono: document.getElementById("reg_telefono").value,
      carrera: document.getElementById("reg_carrera").value,
      religion: document.getElementById("reg_religion").value,
      estado_civil: document.getElementById("reg_civil").value,
      union_procedencia: document.getElementById("reg_union").value,
      campo_procedencia: document.getElementById("reg_campo").value,
      lugar_procedencia: document.getElementById("reg_lugar_procedencia").value,
      padre_nombre: document.getElementById("padre_nombre").value,
      padre_telefono: document.getElementById("padre_telefono").value,
      madre_nombre: document.getElementById("madre_nombre").value,
      madre_telefono: document.getElementById("madre_telefono").value,
      rol_id: document.getElementById('gt_rol').value,
      direccion_origen: document.getElementById("reg_direccion").value,
      conyuge_nombre: document.getElementById("conyuge_nombre").value,
      padecimiento: document.getElementById("padecimiento").value,
    };

    const res = await fetch(`${API_BASE}/profile/personales`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(datos),
    });

    if (res.ok) {
      alert("Datos actualizados correctamente");
      document.getElementById("headerNombre").innerText = datos.nombre_completo;
      document.getElementById("headerCarrera").innerText = datos.carrera;
      document.getElementById("view_cedula").innerText = datos.cedula;
      document.getElementById("view_telefono").innerText = datos.telefono;
      document.getElementById("view_procedencia").innerText =
        datos.lugar_procedencia;
      document.getElementById("view_religion").innerText = datos.religion;
      document.getElementById("view_civil").innerText = datos.estado_civil;
      toggleEditProfile();
    }
  });

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
                alert("✅ Perfil maestro actualizado correctamente");
                
                // Cerrar modal manualmente (necesario tras usar cloneNode)
                document.getElementById('modalGestionTotal').style.display = 'none';
                
                // Recargar las tablas para ver los cambios
                if(typeof cargarTablaCoach === 'function') cargarTablaCoach();
                if(typeof cargarTablaGlobalDirector === 'function') cargarTablaGlobalDirector();
            } else {
                alert("❌ Error al guardar.");
            }
        } catch(e) { 
            console.error(e); 
            alert("❌ Error de conexión"); 
        }
    });

    // IMPORTANTE: Al clonar, los botones "Siguiente/Atrás" dentro del form pueden perder su función.
    // Como esos botones usan 'onclick="..."' en el HTML, deberían seguir funcionando bien.
    // Pero si el botón de cerrar (X) deja de servir, avísame.
}

// --- EVENTO GUARDAR (MODAL BÁSICO / OJO) ---
// Coloca esto AL FINAL de tu archivo script-dashboard.js

const formBasico = document.getElementById('formGestionColportor');

if (formBasico) {
    // TRUCO ANTI-DUPLICADOS:
    // Clonamos el formulario para borrar cualquier "evento fantasma" anterior.
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

        if(!confirm("¿Estás seguro de guardar los cambios básicos?")) return;

        try {
            const res = await fetch(`${API_BASE}/users/gestion/update/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if(res.ok) {
                alert("Datos actualizados correctamente");
                
                // Cerrar modal manualmente porque cloneNode rompe el onclick del HTML a veces
                document.getElementById('modalGestion').style.display = 'none';
                
                // Recargar tablas si existen las funciones
                if(typeof cargarTablaCoach === 'function') cargarTablaCoach();
                if(typeof cargarTablaGlobalDirector === 'function') cargarTablaGlobalDirector();
            } else {
                alert("Error al actualizar");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión");
        }
    });
    
    // IMPORTANTE: Como clonamos el form, hay que reconectar el botón Cancelar
    // Busca el botón que dice "Cancelar" dentro del nuevo form y dale vida de nuevo
    const btnCancelar = newForm.querySelector('button[type="button"]');
    if(btnCancelar) {
        btnCancelar.onclick = function() {
            document.getElementById('modalGestion').style.display = 'none';
        };
    }
}

// --- CARGAR TABLA GLOBAL (SOLO DIRECTOR) ---
async function cargarTablaGlobalDirector() {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/todos`, { headers: { 'Authorization': `Bearer ${token}` } });
        const usuarios = await res.json();
        
        const tbody = document.getElementById('tabla-director-body');
        if(!tbody) return; // Seguridad por si la tabla no está visible
        tbody.innerHTML = '';

        usuarios.forEach(u => {
            // Lógica de Iconos según rango
            let iconoRol = '<i class="fas fa-user" style="color:#aaa" title="Colportor"></i>'; 
            if(u.rol_id === 2) iconoRol = '<i class="fas fa-star" style="color:#f0ad4e" title="Coach"></i>';
            if(u.rol_id === 1) iconoRol = '<i class="fas fa-crown" style="color:#d9534f" title="Director"></i>';

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            tr.innerHTML = `
                <td style="padding: 10px;">${iconoRol} <strong>${u.nombre_completo}</strong></td>
                <td style="padding: 10px;">${u.zona_nombre || '<span style="color:#ccc">Sin Zona</span>'}</td>
                <td style="padding: 10px; font-weight:bold; color: green;">$${u.total_dinero}</td>
                <td style="padding: 10px; text-align: center;">
                    <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer; background:none; border:none; color:#d9534f; font-size: 1.1rem;">
                        <i class="fas fa-cogs"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error tabla global:", e); }
}
