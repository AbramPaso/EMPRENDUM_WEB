// =====================================================
// EMPRENDUM PRO — Dashboard Script
// =====================================================

const API_BASE = "http://localhost:3000/api";
const token = localStorage.getItem("token");
let usuarioActual = {};

// Helper de alertas
const mostrarAlerta = (titulo, texto, icon = 'success') => {
    Swal.fire({
        icon,
        title: titulo,
        text: texto,
        confirmButtonColor: '#0f172a',
        timer: icon === 'success' ? 2500 : undefined,
        timerProgressBar: icon === 'success'
    });
};

// Proteger inputs (solo letras / solo números)
function protegerInputsPerfil() {
    const inputsTexto = ['reg_nombre','reg_carrera','reg_religion','padre_nombre','madre_nombre','conyuge_nombre'];
    const inputsNumero = ['reg_cedula','reg_telefono','padre_telefono','madre_telefono','conyuge_telefono'];

    inputsTexto.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', e => {
                if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) return;
                if (!/^[a-zA-ZÀ-ÿ\s]$/.test(e.key)) e.preventDefault();
            });
        }
    });

    inputsNumero.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', e => {
                if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) return;
                if (['e','E','+','-','.'].includes(e.key)) e.preventDefault();
            });
        }
    });
}

// Datos estáticos de campos por unión (coinciden con la BD)
const datosProcedencia = {
    1: [
        {id:1,nombre:'AVCO'},{id:2,nombre:'AVCN'},{id:3,nombre:'AVLLOC'},
        {id:4,nombre:'AVOC'},{id:5,nombre:'AVSOC'},{id:6,nombre:'MVAE'},
        {id:7,nombre:'MVAC'},{id:8,nombre:'MVNOC'},{id:9,nombre:'MVP'},{id:10,nombre:'MVY'}
    ],
    2: [
        {id:11,nombre:'MVSUB'},{id:12,nombre:'MVNOR'},{id:13,nombre:'AVCOR'},
        {id:14,nombre:'MIVELLACEN'},{id:15,nombre:'AVOR'},{id:16,nombre:'AVC'},
        {id:17,nombre:'AVCS'},{id:18,nombre:'AVSOR'}
    ]
};

// Datos estáticos de campos de campaña (coinciden con la BD)
const camposPorUnion = {
    1: [
        {id:1,nombre:'AVCO'},{id:2,nombre:'AVCN'},{id:3,nombre:'AVLLOC'},
        {id:4,nombre:'AVOC'},{id:5,nombre:'AVSOC'},{id:6,nombre:'MVAE'},
        {id:7,nombre:'MVAC'},{id:8,nombre:'MVNOC'},{id:9,nombre:'MVP'},{id:10,nombre:'MVY'}
    ],
    2: [
        {id:11,nombre:'MVSUB'},{id:12,nombre:'MVNOR'},{id:13,nombre:'AVCOR'},
        {id:14,nombre:'MIVELLACEN'},{id:15,nombre:'AVOR'},{id:16,nombre:'AVC'},
        {id:17,nombre:'AVCS'},{id:18,nombre:'AVSOR'}
    ]
};

// =====================================================
// INIT
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    cargarEstadisticas();
    cargarPerfil();
});

// =====================================================
// NAVEGACIÓN
// =====================================================
function mostrarSeccion(idSeccion) {
    document.querySelectorAll(".section-view").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
    document.getElementById(idSeccion).classList.add("active");
    const navEl = document.getElementById("nav-" + idSeccion);
    if (navEl) navEl.classList.add("active");

    if (idSeccion === "companeros")  cargarCompaneros();
    if (idSeccion === "perfil")      cargarPerfil();
    if (idSeccion === "colportaje")  cargarCampana();
    if (idSeccion === "reportes")    cargarHistorialReportes();
    if (idSeccion === "campanas")    cargarSeccionCampanas();
    if (idSeccion === "libros")      cargarSeccionLibros();
}

// =====================================================
// 1. ESTADÍSTICAS / DASHBOARD
// =====================================================
async function cargarEstadisticas() {
    try {
        const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                cerrarSesion();
            }
            return;
        }

        const data = await res.json();
        const rol = data.rol_detectado;
        usuarioActual.rol = rol;

        // Badge de rol
        const badge = document.getElementById("rol-badge");
        if (badge) {
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
        }

        document.getElementById("vista-colportor").style.display = "none";
        document.getElementById("vista-director").style.display = "none";
        document.getElementById("vista-coach").style.display = "none";

        if (rol === 1) {
            document.getElementById("vista-director").style.display = "block";
            cargarGraficasDirector();
            cargarTablaCoaches();
            cargarTablaGlobalDirector();
        } else if (rol === 2) {
            document.getElementById("vista-coach").style.display = "block";
            document.getElementById("vista-colportor").style.display = "flex";
            cargarTablaCoach();
            llenarTarjetas(data);
        } else {
            document.getElementById("vista-colportor").style.display = "flex";
            llenarTarjetas(data);
        }
    } catch (e) {
        console.error("Error cargando estadísticas:", e);
    }
}

function llenarTarjetas(data) {
    document.getElementById("stat-colecciones").innerText = data.total_colecciones || 0;
    document.getElementById("stat-monto").innerText = "$" + (parseFloat(data.total_monto) || 0).toFixed(2);
    document.getElementById("stat-horas").innerText = data.total_horas || 0;
}

// =====================================================
// 2. GRÁFICAS DEL DIRECTOR
// =====================================================
async function cargarGraficasDirector() {
    try {
        const res = await fetch(`${API_BASE}/reports/director-charts`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.global) {
            const ddir = document.getElementById('dir-total-dinero');
            const dlb  = document.getElementById('dir-total-libros');
            const dhr  = document.getElementById('dir-total-horas');
            if (ddir) ddir.innerText = '$' + parseFloat(data.global.gran_total_dinero).toFixed(2);
            if (dlb)  dlb.innerText  = data.global.gran_total_libros;
            if (dhr)  dhr.innerText  = data.global.gran_total_horas;
        }

        if (window.chartZonas) window.chartZonas.destroy();
        window.chartZonas = new Chart(document.getElementById("graficaZonas"), {
            type: "bar",
            data: {
                labels: data.zonas.map(d => d.label),
                datasets: [{ label: "Recaudado ($)", data: data.zonas.map(d => d.total), backgroundColor: "#0f172a" }]
            }
        });

        if (window.chartUniones) window.chartUniones.destroy();
        window.chartUniones = new Chart(document.getElementById("graficaUniones"), {
            type: "bar",
            data: {
                labels: data.uniones.map(d => d.label),
                datasets: [{ label: "Ventas por Unión ($)", data: data.uniones.map(d => d.total), backgroundColor: ["#f59e0b","#0f172a"] }]
            }
        });

        const listaZonas   = document.getElementById('lista-resumen-zonas');
        const listaUniones = document.getElementById('lista-resumen-uniones');
        if (listaZonas) {
            listaZonas.innerHTML = '';
            data.zonas.forEach(z => {
                listaZonas.innerHTML += `<li style="padding:5px 0;border-bottom:1px dashed #eee;display:flex;justify-content:space-between;"><span>${z.label}</span><span style="font-weight:bold;color:#005a87;">$${parseFloat(z.total).toFixed(2)}</span></li>`;
            });
        }
        if (listaUniones) {
            listaUniones.innerHTML = '';
            data.uniones.forEach(u => {
                listaUniones.innerHTML += `<li style="padding:5px 0;border-bottom:1px dashed #eee;display:flex;justify-content:space-between;"><span>${u.label}</span><span style="font-weight:bold;color:#d9534f;">$${parseFloat(u.total).toFixed(2)}</span></li>`;
            });
        }
    } catch (e) { console.error("Error gráficas:", e); }
}

// =====================================================
// 3. TABLAS DE USUARIOS
// =====================================================
async function cargarTablaCoach() {
    try {
        const res = await fetch(`${API_BASE}/reports/coach-team`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const usuarios = await res.json();

        const tbody = document.getElementById("tabla-coach-body");
        if (!tbody) return;
        tbody.innerHTML = "";

        usuarios.forEach(u => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #eee";

            let botones = `
                <button onclick="abrirModalBasico(${u.id})" style="cursor:pointer;background:none;border:none;color:#005a87;font-size:1.1rem;margin-right:8px;" title="Ver ficha">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="abrirModalDescarga(${u.id}, '${u.nombre_completo.replace(/'/g,"\\'")}'')" style="cursor:pointer;background:none;border:none;color:#e74c3c;font-size:1.1rem;" title="Descargar informe">
                    <i class="fas fa-file-pdf"></i>
                </button>
            `;

            if (usuarioActual.rol === 1) {
                botones += `
                    <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer;background:none;border:none;color:#d9534f;font-size:1.1rem;margin-right:8px;" title="Gestión maestra">
                        <i class="fas fa-cogs"></i>
                    </button>
                `;
            }

            tr.innerHTML = `
                <td style="padding:10px;font-weight:bold;">${u.nombre_completo}</td>
                <td style="padding:10px;">${u.total_colecciones} col.</td>
                <td style="padding:10px;color:green;">$${parseFloat(u.total_dinero).toFixed(2)}</td>
                <td style="padding:10px;">${botones}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error tabla coach:", e); }
}

async function cargarTablaGlobalDirector() {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/todos`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const usuarios = await res.json();

        const tbody = document.getElementById('tabla-director-colportores-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        usuarios.forEach(u => {
            let iconoRol = '<i class="fas fa-user" style="color:#ccc;margin-right:5px;" title="Colportor"></i>';
            if (u.rol_id === 2) iconoRol = '<i class="fas fa-star" style="color:#f0ad4e;margin-right:5px;" title="Coach"></i>';
            if (u.rol_id === 1) iconoRol = '<i class="fas fa-crown" style="color:#d9534f;margin-right:5px;" title="Director"></i>';

            const nombreZona = u.zona_nombre
                ? `<span style="color:#005a87;font-weight:500;">${u.zona_nombre}</span>`
                : '<span style="color:#ccc;">--</span>';

            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #eee";
            tr.innerHTML = `
                <td style="padding:10px;">${iconoRol}<strong>${u.nombre_completo}</strong></td>
                <td style="padding:10px;font-weight:bold;text-align:center;">${u.total_colecciones || 0}</td>
                <td style="padding:10px;font-weight:bold;color:green;">$${parseFloat(u.total_dinero || 0).toFixed(2)}</td>
                <td style="padding:10px;">${nombreZona}</td>
                <td style="padding:10px;text-align:center;">
                    <button onclick="abrirModalBasico(${u.id})" style="cursor:pointer;background:none;border:none;color:#005a87;font-size:1.1rem;margin-right:5px;" title="Ver ficha">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer;background:none;border:none;color:#d9534f;font-size:1.1rem;margin-right:5px;" title="Gestión maestra">
                        <i class="fas fa-cogs"></i>
                    </button>
                    <button onclick="abrirModalDescarga(${u.id}, '${u.nombre_completo.replace(/'/g,"\\'")}'')" style="cursor:pointer;background:none;border:none;color:#e74c3c;font-size:1.1rem;" title="Descargar informe">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error tabla global:", e); }
}

async function cargarTablaCoaches() {
    try {
        const res = await fetch(`${API_BASE}/users/lista-coaches`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const coaches = await res.json();

        const tbody = document.getElementById('tabla-coaches-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        coaches.forEach(c => {
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;"><strong>${c.nombre_completo}</strong></td>
                    <td style="padding:10px;">${c.zona_nombre || 'Sin Asignar'}</td>
                    <td style="padding:10px;">${c.equipo_cantidad} a cargo</td>
                    <td style="padding:10px;font-weight:bold;color:green;">$${parseFloat(c.total_zona_dinero).toFixed(2)}</td>
                    <td style="padding:10px;font-weight:bold;">${c.total_zona_colecciones}</td>
                    <td style="padding:10px;text-align:center;">
                        <button onclick="abrirModalCompleto(${c.id})" style="cursor:pointer;background:none;border:none;color:#e67e22;font-size:1.1rem;" title="Editar coach">
                            <i class="fas fa-user-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error tabla coaches:", e); }
}

async function actualizarTablas() {
    try {
        if (usuarioActual.rol === 1) {
            await Promise.all([
                cargarGraficasDirector(),
                cargarTablaCoaches(),
                cargarTablaGlobalDirector()
            ]);
        } else if (usuarioActual.rol === 2) {
            await cargarTablaCoach();
            const res = await fetch(`${API_BASE}/reports/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) llenarTarjetas(await res.json());
        }
    } catch (e) { console.error("Error actualizando tablas:", e); }
}

// =====================================================
// 4. MODALES DE GESTIÓN
// =====================================================

// Modal básico (ojo) — para Coach y Director
async function abrirModalBasico(id) {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            mostrarAlerta("Sin acceso", "No tienes permiso para ver este usuario.", "warning");
            return;
        }
        const u = await res.json();

        document.getElementById('gest_colecciones').innerText = u.total_colecciones || 0;
        document.getElementById('gest_monto').innerText = '$' + parseFloat(u.total_dinero || 0).toFixed(2);
        document.getElementById('gest_horas').innerText = u.total_horas || 0;
        document.getElementById('gest_estudios').innerText = u.total_estudios || 0;
        document.getElementById('gest_id_usuario').value = u.id;
        document.getElementById('gest_nombre').value = u.nombre_completo || '';
        document.getElementById('gest_telefono').value = u.telefono || '';
        document.getElementById('gest_carrera').value = u.carrera || '';
        document.getElementById('gest_password').value = '';

        document.getElementById('modalGestion').style.display = 'flex';
    } catch (e) {
        console.error("Error abrirModalBasico:", e);
        mostrarAlerta("Error", "No se pudo cargar la información.", "error");
    }
}

function cerrarModalGestion() {
    document.getElementById('modalGestion').style.display = 'none';
}

// Modal completo (engranaje) — solo Director
let pasoActual = 1;

async function abrirModalCompleto(id) {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            mostrarAlerta("Sin acceso", "No tienes permiso para gestionar este usuario.", "warning");
            return;
        }
        const u = await res.json();

        pasoActual = 1;
        mostrarPaso(1);

        document.getElementById('gt_id_usuario').value = u.id;
        document.getElementById('gt_nombre').value = u.nombre_completo || '';
        document.getElementById('gt_cedula').value = u.cedula || '';
        document.getElementById('gt_telefono').value = u.telefono || '';
        document.getElementById('gt_carrera').value = u.carrera || '';
        document.getElementById('gt_religion').value = u.religion || '';
        document.getElementById('gt_civil').value = u.estado_civil || 'Soltero';
        document.getElementById('gt_procedencia').value = u.lugar_procedencia || '';
        document.getElementById('gt_fecha_nac').value = u.fecha_nacimiento
            ? String(u.fecha_nacimiento).substring(0, 10)
            : '';

        document.getElementById('gt_padre').value = u.padre_nombre || '';
        document.getElementById('gt_tlf_padre').value = u.padre_telefono || '';
        document.getElementById('gt_madre').value = u.madre_nombre || '';
        document.getElementById('gt_tlf_madre').value = u.madre_telefono || '';
        document.getElementById('gt_direccion').value = u.direccion_origen || '';
        document.getElementById('gt_salud').value = u.padecimiento_medico || '';

        document.getElementById('gt_rol').value = u.rol_id || 3;
        document.getElementById('gt_password').value = '';

        const unionId = u.union_trabajo_id || '';
        document.getElementById('gt_union').value = unionId;
        filtrarCamposGestion();

        if (unionId) {
            document.getElementById('gt_campo').value = u.campo_trabajo_id || '';
            document.getElementById('gt_zona').value = u.zona_id || '';
        }

        document.getElementById('modalGestionTotal').style.display = 'flex';
    } catch (e) {
        console.error("Error abrirModalCompleto:", e);
        mostrarAlerta("Error", "No se pudo cargar los datos del colportor.", "error");
    }
}

function cambiarPaso(nuevoPaso) {
    pasoActual = nuevoPaso;
    mostrarPaso(pasoActual);
}

function mostrarPaso(paso) {
    ['paso-1','paso-2','paso-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const current = document.getElementById(`paso-${paso}`);
    if (current) current.style.display = 'block';
}

function cerrarModalTotal() {
    document.getElementById('modalGestionTotal').style.display = 'none';
}

function filtrarCamposGestion() {
    const unionId = document.getElementById('gt_union').value;
    const selectCampo = document.getElementById('gt_campo');
    const selectZona = document.getElementById('gt_zona');

    selectCampo.innerHTML = '<option value="">Seleccione...</option>';
    selectZona.innerHTML  = '<option value="">Seleccione...</option>';

    if (camposPorUnion[unionId]) {
        selectCampo.disabled = false;
        camposPorUnion[unionId].forEach(c => {
            selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    } else {
        selectCampo.disabled = true;
    }

    // Cargar zonas de la API según la unión seleccionada
    if (unionId) {
        cargarZonasEnSelect('gt_zona', unionId);
    } else {
        selectZona.disabled = true;
    }
}

// =====================================================
// 5. REPORTE SEMANAL
// =====================================================
const formReporte = document.getElementById("formReporteSemanal");

if (formReporte) {
    const inputsNumericos = ['sem_numero','sem_colecciones','sem_monto','sem_horas','sem_estudios'];
    inputsNumericos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', e => {
                if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Enter'].includes(e.key)) return;
                if (['e','E','-','+'].includes(e.key)) e.preventDefault();
            });
        }
    });

    formReporte.addEventListener("submit", async (e) => {
        e.preventDefault();

        const semNumero  = parseInt(document.getElementById("sem_numero").value);
        const colecciones = parseInt(document.getElementById("sem_colecciones").value) || 0;
        const monto      = parseFloat(document.getElementById("sem_monto").value) || 0;
        const horas      = parseFloat(document.getElementById("sem_horas").value) || 0;
        const estudios   = parseInt(document.getElementById("sem_estudios").value) || 0;

        if (!semNumero || semNumero <= 0 || semNumero > 52) {
            return mostrarAlerta("Semana inválida", "El número de semana debe estar entre 1 y 52.", "warning");
        }
        if (colecciones < 0 || monto < 0 || horas < 0 || estudios < 0) {
            return mostrarAlerta("Valores inválidos", "No se permiten números negativos.", "warning");
        }

        const datos = {
            semana_numero: semNumero,
            anio: new Date().getFullYear(),
            colecciones,
            monto,
            horas,
            estudios
        };

        const btn = formReporte.querySelector('button[type="submit"]');
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/reports/create-weekly`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Reporte enviado!", "Tus datos se guardaron exitosamente.", "success");
                formReporte.reset();
                await cargarEstadisticas();
                await cargarHistorialReportes();
                mostrarSeccion("inicio");
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo enviar el reporte.", "error");
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

// =====================================================
// 6. CAMPAÑA (Selección de zona y campo de trabajo)
// =====================================================

// Cargar zonas desde la API en un select
async function cargarZonasEnSelect(selectId, unionId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Cargando...</option>';
    select.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/zonas?union_id=${unionId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error cargando zonas');
        const zonas = await res.json();

        select.innerHTML = '<option value="">Seleccione zona...</option>';
        zonas.forEach(z => {
            select.innerHTML += `<option value="${z.id}">${z.nombre}</option>`;
        });
        select.disabled = false;
    } catch (e) {
        select.innerHTML = '<option value="">Error al cargar</option>';
        console.error("Error cargando zonas:", e);
    }
}

function filtrarCampos() {
    const unionId = document.getElementById("camp_union").value;
    const selectCampo = document.getElementById("camp_campo");
    const selectZona  = document.getElementById("camp_zona");

    selectCampo.innerHTML = '<option value="">Seleccione...</option>';
    selectZona.innerHTML  = '<option value="">Seleccione...</option>';

    if (camposPorUnion[unionId]) {
        selectCampo.disabled = false;
        camposPorUnion[unionId].forEach(c => {
            selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
        cargarZonasEnSelect('camp_zona', unionId);
    } else {
        selectCampo.disabled = true;
        selectZona.disabled = true;
    }
}

async function cargarCampana() {
    try {
        const res = await fetch(`${API_BASE}/campana`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.union_trabajo_id) {
            document.getElementById("camp_union").value = data.union_trabajo_id;
            filtrarCampos();

            // Esperar a que las zonas carguen, luego restaurar el valor
            setTimeout(() => {
                if (data.campo_trabajo_id) {
                    document.getElementById("camp_campo").value = data.campo_trabajo_id;
                }
                if (data.zona_id) {
                    document.getElementById("camp_zona").value = data.zona_id;
                }
            }, 600);
        }

        if (data.lugar_colportar) {
            document.getElementById("camp_ciudad").value = data.lugar_colportar;
        }
    } catch (e) {
        console.error("Error cargarCampana:", e);
    }
}

document.getElementById("formCampana").addEventListener("submit", async (e) => {
    e.preventDefault();
    const datos = {
        union_id: document.getElementById("camp_union").value,
        campo_id: document.getElementById("camp_campo").value,
        zona:     document.getElementById("camp_zona").value,
        ciudad:   document.getElementById("camp_ciudad").value
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/campana/asignar`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            mostrarAlerta("¡Guardado!", "Asignación guardada correctamente.", "success");
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo guardar la asignación.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});

// =====================================================
// 7. PERFIL
// =====================================================
function toggleEditProfile() {
    const mode = document.getElementById("editProfileMode").style.display === "none";
    document.getElementById("viewProfileMode").style.display = mode ? "none" : "block";
    document.getElementById("editProfileMode").style.display = mode ? "block" : "none";
}

function filtrarProcedenciaPerfil() {
    const unionSelect = document.getElementById('reg_union');
    const campoSelect = document.getElementById('reg_campo');
    if (!unionSelect || !campoSelect) return;

    const unionId = unionSelect.value;
    campoSelect.innerHTML = '<option value="">Seleccione...</option>';

    if (datosProcedencia[unionId]) {
        campoSelect.disabled = false;
        datosProcedencia[unionId].forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombre;
            campoSelect.appendChild(opt);
        });
    } else {
        campoSelect.disabled = true;
    }
}

async function cargarPerfil() {
    try {
        const res = await fetch(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        // Selects de procedencia
        const unionInput = document.getElementById('reg_union');
        const campoInput = document.getElementById('reg_campo');
        if (unionInput && data.union_procedencia_id) {
            unionInput.value = data.union_procedencia_id;
            filtrarProcedenciaPerfil();
            if (data.campo_procedencia_id && campoInput) {
                campoInput.value = data.campo_procedencia_id;
            }
        }

        // Header
        document.getElementById("headerNombre").innerText = data.nombre_completo || "Usuario";
        document.getElementById("headerCarrera").innerText = data.carrera || "Estudiante";

        // Foto de perfil
        const imgPerfil = document.getElementById('headerFoto');
        if (data.foto_perfil_url) {
            imgPerfil.src = `http://localhost:3000/${data.foto_perfil_url.replace(/\\/g, '/')}`;
        } else {
            imgPerfil.src = '../image/usuario-icon.webp';
        }
        imgPerfil.onerror = function() { this.src = '../image/usuario-icon.webp'; };

        // Vista lectura
        document.getElementById("view_cedula").innerText    = data.cedula || "--";
        document.getElementById("view_telefono").innerText  = data.telefono || "--";
        document.getElementById("view_procedencia").innerText = data.lugar_procedencia || "--";
        document.getElementById("view_religion").innerText  = data.religion || "--";
        document.getElementById("view_civil").innerText     = data.estado_civil || "--";
        document.getElementById("view_pensamiento").innerText = data.pensamiento_bio || "Sin pensamiento definido.";

        // Formulario edición
        document.getElementById("pensamiento_input").value  = data.pensamiento_bio || "";
        document.getElementById("reg_nombre").value         = data.nombre_completo || "";
        document.getElementById("reg_cedula").value         = data.cedula || "";
        document.getElementById("reg_telefono").value       = data.telefono || "";
        document.getElementById("reg_carrera").value        = data.carrera || "";
        document.getElementById("reg_religion").value       = data.religion || "";
        document.getElementById("reg_lugar_procedencia").value = data.lugar_procedencia || "";
        if (data.estado_civil) document.getElementById("reg_civil").value = data.estado_civil;

        document.getElementById("padre_nombre").value       = data.padre_nombre || "";
        document.getElementById("padre_telefono").value     = data.padre_telefono || "";
        document.getElementById("madre_nombre").value       = data.madre_nombre || "";
        document.getElementById("madre_telefono").value     = data.madre_telefono || "";
        document.getElementById("reg_direccion").value      = data.direccion_origen || "";
        document.getElementById("conyuge_nombre").value     = data.conyuge_nombre || "";

        const conyTel = document.getElementById("conyuge_telefono");
        if (conyTel) conyTel.value = data.conyuge_telefono || "";

        document.getElementById("padecimiento").value       = data.padecimiento_medico || "";

    } catch (e) { console.error("Error cargarPerfil:", e); }
}

// Form Bio
document.getElementById("formBio").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById("foto_perfil_input");
    if (fileInput.files[0]) formData.append("foto_perfil", fileInput.files[0]);
    formData.append("pensamiento", document.getElementById("pensamiento_input").value);

    try {
        const res = await fetch(`${API_BASE}/profile/bio`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        if (res.ok) {
            mostrarAlerta("¡Bio actualizada!", "", "success");
            const nuevoPensamiento = document.getElementById("pensamiento_input").value;
            document.getElementById("view_pensamiento").innerText = nuevoPensamiento;
            if (fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = ev => { document.getElementById("headerFoto").src = ev.target.result; };
                reader.readAsDataURL(fileInput.files[0]);
            }
            toggleEditProfile();
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo actualizar.", "error");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    }
});

// Form Datos Personales
const formPersonales = document.getElementById("formPersonales");
if (formPersonales) {
    protegerInputsPerfil();

    formPersonales.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre   = document.getElementById("reg_nombre").value.trim();
        const cedula   = document.getElementById("reg_cedula").value.trim();
        const telefono = document.getElementById("reg_telefono").value.trim();

        if (nombre.length < 3)   return mostrarAlerta("Nombre inválido", "El nombre es muy corto.", "warning");
        if (cedula.length < 7)   return mostrarAlerta("Cédula inválida", "Debe tener al menos 7 dígitos.", "warning");
        if (telefono.length < 10) return mostrarAlerta("Teléfono inválido", "Debe tener al menos 10 dígitos.", "warning");

        const unionInput = document.getElementById("reg_union");
        const campoInput = document.getElementById("reg_campo");
        const conyTel    = document.getElementById("conyuge_telefono");

        const datos = {
            nombre_completo:    nombre,
            cedula:             cedula,
            telefono:           telefono,
            carrera:            document.getElementById("reg_carrera").value,
            religion:           document.getElementById("reg_religion").value,
            estado_civil:       document.getElementById("reg_civil").value,
            union_procedencia:  unionInput ? unionInput.value : null,
            campo_procedencia:  campoInput ? campoInput.value : null,
            lugar_procedencia:  document.getElementById("reg_lugar_procedencia").value,
            padre_nombre:       document.getElementById("padre_nombre").value,
            padre_telefono:     document.getElementById("padre_telefono").value,
            madre_nombre:       document.getElementById("madre_nombre").value,
            madre_telefono:     document.getElementById("madre_telefono").value,
            direccion_origen:   document.getElementById("reg_direccion").value,
            conyuge_nombre:     document.getElementById("conyuge_nombre").value,
            conyuge_telefono:   conyTel ? conyTel.value : null,
            padecimiento:       document.getElementById("padecimiento").value
        };

        const btnGuardar = formPersonales.querySelector('button[type="submit"]');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/profile/personales`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Perfil actualizado!", "Tus datos se guardaron correctamente.", "success");
                document.getElementById("headerNombre").innerText       = datos.nombre_completo;
                document.getElementById("view_cedula").innerText        = datos.cedula;
                document.getElementById("view_telefono").innerText      = datos.telefono;
                document.getElementById("view_procedencia").innerText   = datos.lugar_procedencia;
                document.getElementById("view_religion").innerText      = datos.religion;
                document.getElementById("view_civil").innerText         = datos.estado_civil;
                toggleEditProfile();
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            mostrarAlerta("Error de Conexión", "Intenta nuevamente.", "error");
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    });
}

// =====================================================
// 8. COMPAÑEROS
// =====================================================
async function cargarCompaneros() {
    const container = document.getElementById("listaCompaneros");
    container.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando...</p></div>';

    try {
        const res = await fetch(`${API_BASE}/users/lista`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al cargar lista.");
        const users = await res.json();

        if (users.length === 0) {
            container.innerHTML = "<p>No hay compañeros registrados aún.</p>";
            return;
        }

        container.innerHTML = "";
        users.forEach(u => {
            const foto = u.foto_perfil_url
                ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, "/")}`
                : '../image/usuario-icon.webp';

            container.innerHTML += `
                <div class="colleague-card" onclick="verDetalle(${u.id})">
                    <img src="${foto}" class="colleague-pic" onerror="this.src='../image/usuario-icon.webp'">
                    <h4 class="colleague-name">${u.nombre_completo}</h4>
                    <span class="colleague-role">${u.carrera || "Estudiante"}</span>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = "<p>Error cargando lista. Verifica que el servidor esté corriendo.</p>";
    }
}

async function verDetalle(id) {
    try {
        const res = await fetch(`${API_BASE}/users/detalle/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const u = await res.json();

        document.getElementById("modalNombre").innerText    = u.nombre_completo || "--";
        document.getElementById("modalCarrera").innerText   = u.carrera || "Estudiante";
        document.getElementById("modalLugar").innerText     = u.lugar_colportar || "No especificado";
        document.getElementById("modalTelefono").innerText  = u.telefono || "Privado";
        document.getElementById("modalPensamiento").innerText = u.pensamiento_bio || "Sin pensamiento.";

        const imgEl = document.getElementById("modalFoto");
        imgEl.src = u.foto_perfil_url
            ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, "/")}`
            : '../image/usuario-icon.webp';
        imgEl.onerror = function() { this.src = '../image/usuario-icon.webp'; };

        document.getElementById("modalCompanero").style.display = "flex";
    } catch (e) {
        console.error("Error verDetalle:", e);
    }
}

function cerrarModal() {
    document.getElementById("modalCompanero").style.display = "none";
}

// =====================================================
// 9. INFORME MENSUAL
// =====================================================
document.getElementById("formInformeMensual").addEventListener("submit", async (e) => {
    e.preventDefault();
    const archivo = document.getElementById("archivo_informe").files[0];
    if (!archivo) return mostrarAlerta("Sin archivo", "Debes seleccionar un archivo.", "warning");

    const formData = new FormData();
    formData.append("mes", document.getElementById("mes_reporte").value);
    formData.append("anio", new Date().getFullYear());
    formData.append("informe", archivo);

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/reports/upload-monthly`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            mostrarAlerta("¡Informe subido!", "El archivo se guardó correctamente.", "success");
            e.target.reset();
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo subir el archivo.", "error");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});

// =====================================================
// 10. HISTORIAL DE REPORTES
// =====================================================
async function cargarHistorialReportes() {
    try {
        const res = await fetch(`${API_BASE}/reports/my-reports`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const reportes = await res.json();

        const tbody = document.getElementById('tabla-historial-reportes');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (reportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No hay reportes registrados aún.</td></tr>';
            return;
        }

        reportes.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge-week">Semana ${r.semana_numero}</span></td>
                <td style="color:var(--text-muted);font-size:0.85rem;">
                    <i class="far fa-calendar-alt" style="margin-right:5px;"></i>${r.fecha_formato}
                </td>
                <td style="text-align:center;font-weight:500;">${r.colecciones_vendidas}</td>
                <td style="text-align:right;"><span class="value-money">$${parseFloat(r.monto_dolares).toFixed(2)}</span></td>
                <td style="text-align:center;"><span class="value-hours">${r.horas_trabajadas} h</span></td>
                <td style="text-align:center;color:var(--text-muted);">${r.estudios_biblicos}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error historial:", e); }
}

// =====================================================
// 11. DESCARGAS DE INFORMES
// =====================================================
function abrirModalDescarga(id, nombre) {
    document.getElementById('descarga_user_id').value = id;
    document.getElementById('descarga_user_name').value = nombre;
    document.getElementById('span-nombre-descarga').innerText = nombre.split(' ')[0];
    const fecha = new Date();
    document.getElementById('descarga_mes').value  = fecha.getMonth() + 1;
    document.getElementById('descarga_anio').value = fecha.getFullYear();
    document.getElementById('modalDescarga').style.display = 'flex';
}

async function descargarIndividual() {
    const userId = document.getElementById('descarga_user_id').value;
    const mes    = document.getElementById('descarga_mes').value;
    const anio   = document.getElementById('descarga_anio').value;

    try {
        const res = await fetch(`${API_BASE}/reports/get-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId, mes, anio })
        });

        const data = await res.json();

        if (data.found) {
            const urlLimpia = `http://localhost:3000/${data.url}`;
            window.open(urlLimpia, '_blank');
        } else {
            mostrarAlerta("Sin informe", data.message, "warning");
        }
    } catch (e) {
        mostrarAlerta("Error", "No se pudo buscar el archivo.", "error");
    }
}

async function descargarMasivo() {
    const mes  = document.getElementById('descarga_mes').value;
    const anio = document.getElementById('descarga_anio').value;

    if (!confirm(`¿Generar archivo ZIP con los informes del ${mes}/${anio}?`)) return;

    const btn = document.querySelector('#modalDescarga button[onclick="descargarMasivo()"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/reports/download-zip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ mes, anio })
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Informes_Mes_${mes}_${anio}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            mostrarAlerta("¡Descargado!", "Archivo ZIP listo.", "success");
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo descargar.", "error");
        }
    } catch (e) {
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// =====================================================
// 12. MODAL BÁSICO GUARDAR (Coach / Director)
// =====================================================
const formBasico = document.getElementById('formGestionColportor');
if (formBasico) {
    formBasico.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('gest_id_usuario').value;
        const datos = {
            nombre_completo: document.getElementById('gest_nombre').value,
            telefono:        document.getElementById('gest_telefono').value,
            carrera:         document.getElementById('gest_carrera').value,
            nueva_password:  document.getElementById('gest_password').value
        };

        if (!confirm("¿Guardar cambios básicos?")) return;

        try {
            const res = await fetch(`${API_BASE}/users/gestion/update-basic/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Guardado!", "Datos básicos actualizados.", "success");
                document.getElementById('modalGestion').style.display = 'none';
                await actualizarTablas();
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo actualizar.", "error");
            }
        } catch (error) {
            mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
        }
    });
}

// =====================================================
// 13. MODAL COMPLETO GUARDAR (Solo Director)
// =====================================================
const formTotal = document.getElementById('formGestionTotal');
if (formTotal) {
    formTotal.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!confirm("¿Estás seguro de guardar TODOS los cambios?")) return;

        const id = document.getElementById('gt_id_usuario').value;
        const datos = {
            nombre_completo:  document.getElementById('gt_nombre').value,
            cedula:           document.getElementById('gt_cedula').value,
            telefono:         document.getElementById('gt_telefono').value,
            carrera:          document.getElementById('gt_carrera').value,
            religion:         document.getElementById('gt_religion').value,
            lugar_procedencia: document.getElementById('gt_procedencia').value,
            estado_civil:     document.getElementById('gt_civil').value,
            fecha_nacimiento: document.getElementById('gt_fecha_nac').value,
            padre_nombre:     document.getElementById('gt_padre').value,
            padre_telefono:   document.getElementById('gt_tlf_padre').value,
            madre_nombre:     document.getElementById('gt_madre').value,
            madre_telefono:   document.getElementById('gt_tlf_madre').value,
            direccion_origen: document.getElementById('gt_direccion').value,
            padecimiento:     document.getElementById('gt_salud').value,
            union_id:         document.getElementById('gt_union').value,
            campo_id:         document.getElementById('gt_campo').value,
            zona_id:          document.getElementById('gt_zona').value,
            nueva_password:   document.getElementById('gt_password').value,
            rol_id:           document.getElementById('gt_rol').value
        };

        try {
            const res = await fetch(`${API_BASE}/users/gestion/update/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Guardado!", "Perfil maestro actualizado correctamente.", "success");
                document.getElementById('modalGestionTotal').style.display = 'none';
                await actualizarTablas();
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "Error al guardar.", "error");
            }
        } catch (e) {
            mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
        }
    });
}

// =====================================================
// 14. CERRAR SESIÓN
// =====================================================
function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// =====================================================
// 15. HELPER: Cargar todas las zonas en un select
// =====================================================
async function cargarTodasZonasEnSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Cargando...</option>';
    select.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/zonas`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Error');
        const zonas = await res.json();
        select.innerHTML = '<option value="">Seleccione zona...</option>';
        zonas.forEach(z => {
            select.innerHTML += `<option value="${z.id}">${z.nombre}</option>`;
        });
        select.disabled = false;
    } catch (e) {
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}

// =====================================================
// 16. SECCIÓN CAMPAÑAS
// =====================================================
async function cargarSeccionCampanas() {
    const rol = usuarioActual.rol;

    // Ocultar todas las sub-vistas
    const vistas = ['vista-campanas-director','vista-inscripcion-colportor','vista-aprobacion-inscripciones'];
    vistas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (rol === 1) {
        document.getElementById('vista-campanas-director').style.display = 'block';
        document.getElementById('vista-aprobacion-inscripciones').style.display = 'block';
        await Promise.all([cargarCampanasAdmin(), cargarInscripcionesPendientes()]);
    } else if (rol === 2) {
        document.getElementById('vista-aprobacion-inscripciones').style.display = 'block';
        await cargarInscripcionesPendientes();
    } else {
        document.getElementById('vista-inscripcion-colportor').style.display = 'block';
        await cargarInscripcionColportor();
    }
}

async function cargarCampanasAdmin() {
    try {
        const res = await fetch(`${API_BASE}/campanas`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const campanas = await res.json();

        const tbody = document.getElementById('tabla-campanas-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (campanas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">No hay campañas creadas.</td></tr>';
            return;
        }

        campanas.forEach(c => {
            const estadoBadge = c.estado === 'activa'
                ? '<span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:0.8rem;">ACTIVA</span>'
                : '<span style="background:#f1f5f9;color:#64748b;padding:3px 10px;border-radius:20px;font-size:0.8rem;">Inactiva</span>';

            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;font-weight:bold;">${c.nombre}</td>
                    <td style="padding:10px;color:#64748b;">${c.descripcion || '--'}</td>
                    <td style="padding:10px;font-size:0.85rem;">${c.fecha_inicio ? c.fecha_inicio.toString().substring(0,10) : '--'} → ${c.fecha_fin ? c.fecha_fin.toString().substring(0,10) : '--'}</td>
                    <td style="padding:10px;">${estadoBadge}</td>
                    <td style="padding:10px;text-align:center;">
                        ${c.estado !== 'activa' ? `<button onclick="activarCampana(${c.id})" style="background:#16a34a;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;margin-right:5px;" title="Activar"><i class="fas fa-play"></i></button>` : ''}
                        <button onclick="eliminarCampana(${c.id})" style="background:#e11d48;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarCampanasAdmin:", e); }
}

async function activarCampana(id) {
    const conf = await Swal.fire({
        title: '¿Activar esta campaña?',
        text: 'Se desactivarán todas las demás campañas.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, Activar'
    });
    if (!conf.isConfirmed) return;

    try {
        const res = await fetch(`${API_BASE}/campanas/${id}/toggle`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            mostrarAlerta('¡Campaña Activada!', '', 'success');
            await cargarCampanasAdmin();
        } else {
            const err = await res.json();
            mostrarAlerta('Error', err.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function eliminarCampana(id) {
    const conf = await Swal.fire({
        title: '¿Eliminar campaña?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, Eliminar'
    });
    if (!conf.isConfirmed) return;

    try {
        const res = await fetch(`${API_BASE}/campanas/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            mostrarAlerta('Eliminada', '', 'success');
            await cargarCampanasAdmin();
        } else {
            const err = await res.json();
            mostrarAlerta('Error', err.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function cargarInscripcionColportor() {
    const bloqueInscribirse = document.getElementById('bloque-inscribirse');
    const estadoMsg = document.getElementById('estado-inscripcion-msg');
    if (!bloqueInscribirse || !estadoMsg) return;

    try {
        const res = await fetch(`${API_BASE}/campanas/inscripcion-estado`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        bloqueInscribirse.style.display = 'none';
        estadoMsg.style.display = 'none';

        if (data.estado === 'sin_campana') {
            estadoMsg.style.display = 'block';
            estadoMsg.style.background = '#f1f5f9';
            estadoMsg.style.color = '#64748b';
            estadoMsg.innerText = 'No hay ninguna campaña activa en este momento.';
        } else if (data.estado === 'no_inscrito') {
            bloqueInscribirse.style.display = 'block';
            await cargarTodasZonasEnSelect('select_zona_inscripcion');
        } else if (data.estado === 'pendiente') {
            estadoMsg.style.display = 'block';
            estadoMsg.style.background = '#fffbeb';
            estadoMsg.style.color = '#b45309';
            estadoMsg.innerText = '⏳ Tu solicitud está pendiente de aprobación.';
        } else if (data.estado === 'aprobado') {
            estadoMsg.style.display = 'block';
            estadoMsg.style.background = '#dcfce7';
            estadoMsg.style.color = '#166534';
            estadoMsg.innerText = '✅ ¡Estás inscrito y aprobado en la campaña activa!';
        } else if (data.estado === 'rechazado') {
            estadoMsg.style.display = 'block';
            estadoMsg.style.background = '#fff1f2';
            estadoMsg.style.color = '#e11d48';
            estadoMsg.innerText = '❌ Tu inscripción fue rechazada. Puedes volver a solicitar.';
            bloqueInscribirse.style.display = 'block';
            await cargarTodasZonasEnSelect('select_zona_inscripcion');
        }
    } catch (e) { console.error("Error cargarInscripcionColportor:", e); }
}

async function solicitarInscripcionCampana() {
    const zonaId = document.getElementById('select_zona_inscripcion').value;
    if (!zonaId) return mostrarAlerta('Zona requerida', 'Selecciona una zona para inscribirte.', 'warning');

    try {
        const res = await fetch(`${API_BASE}/campanas/inscribir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ zona_id: zonaId })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta('¡Solicitud Enviada!', data.message, 'success');
            await cargarInscripcionColportor();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function cargarInscripcionesPendientes() {
    try {
        const res = await fetch(`${API_BASE}/campanas/inscripciones/pendientes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const inscripciones = await res.json();

        const tbody = document.getElementById('tabla-inscripciones-pendientes');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (inscripciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No hay inscripciones pendientes.</td></tr>';
            return;
        }

        inscripciones.forEach(i => {
            const fecha = i.fecha_solicitud ? new Date(i.fecha_solicitud).toLocaleDateString('es-VE') : '--';
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;"><strong>${i.nombre_completo}</strong><br><small style="color:#94a3b8;">${i.telefono || ''}</small></td>
                    <td style="padding:10px;">${i.zona_nombre || '--'}</td>
                    <td style="padding:10px;font-size:0.85rem;color:#64748b;">${fecha}</td>
                    <td style="padding:10px;text-align:center;">
                        <button onclick="responderInscripcion(${i.id},'aprobado')" style="background:#16a34a;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;margin-right:5px;">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button onclick="responderInscripcion(${i.id},'rechazado')" style="background:#e11d48;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarInscripcionesPendientes:", e); }
}

async function responderInscripcion(id, estado) {
    try {
        const res = await fetch(`${API_BASE}/campanas/inscripciones/${id}/responder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ estado })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta(estado === 'aprobado' ? '¡Aprobado!' : 'Rechazado', data.message, estado === 'aprobado' ? 'success' : 'info');
            await cargarInscripcionesPendientes();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

// Form crear campaña
const formNuevaCampana = document.getElementById('formNuevaCampana');
if (formNuevaCampana) {
    formNuevaCampana.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            nombre:      document.getElementById('nueva_camp_nombre').value.trim(),
            descripcion: document.getElementById('nueva_camp_descripcion').value.trim(),
            fecha_inicio: document.getElementById('nueva_camp_inicio').value,
            fecha_fin:    document.getElementById('nueva_camp_fin').value
        };
        if (!datos.nombre) return mostrarAlerta('Nombre requerido', '', 'warning');

        const btn = formNuevaCampana.querySelector('button[type="submit"]');
        const textoOrig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/campanas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });
            if (res.ok) {
                mostrarAlerta('¡Campaña creada!', '', 'success');
                formNuevaCampana.reset();
                await cargarCampanasAdmin();
            } else {
                const err = await res.json();
                mostrarAlerta('Error', err.message, 'error');
            }
        } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
        finally {
            btn.innerHTML = textoOrig;
            btn.disabled = false;
        }
    });
}

// =====================================================
// 17. SECCIÓN LIBROS / INVENTARIO
// =====================================================

// Caché de datos para los selects de libros
let catalogoLibros = [];
let stockGlobalData = [];
let zonasData = [];
let colportoresData = [];

async function cargarSeccionLibros() {
    const rol = usuarioActual.rol;

    const vistaDir    = document.getElementById('vista-libros-director');
    const vistaCoach  = document.getElementById('vista-libros-coach');
    const vistaColp   = document.getElementById('vista-mis-libros');
    const vistaTransf = document.getElementById('vista-transferencias');

    if (vistaDir)    vistaDir.style.display    = 'none';
    if (vistaCoach)  vistaCoach.style.display  = 'none';
    if (vistaColp)   vistaColp.style.display   = 'none';
    if (vistaTransf) vistaTransf.style.display = 'none';

    // Cargar catálogo siempre (usado en selects)
    await cargarCatalogoLibros();

    if (rol === 1) {
        if (vistaDir)    vistaDir.style.display    = 'block';
        if (vistaTransf) vistaTransf.style.display = 'block';
        await Promise.all([
            cargarStockGlobal(),
            cargarZonasParaLibros(),
            cargarTransferenciasPendientes()
        ]);
    } else if (rol === 2) {
        if (vistaCoach)  vistaCoach.style.display  = 'block';
        if (vistaTransf) vistaTransf.style.display = 'block';
        await Promise.all([
            cargarStockCoach(),
            cargarColportoresCoach(),
            cargarTransferenciasPendientes()
        ]);
    } else {
        if (vistaColp) vistaColp.style.display = 'block';
        await cargarMisLibros();
    }
}

async function cargarCatalogoLibros() {
    try {
        const res = await fetch(`${API_BASE}/libros`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        catalogoLibros = await res.json();

        // Llenar select para agregar stock
        const sel = document.getElementById('select_libro_stock');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccione Libro...</option>';
            catalogoLibros.forEach(l => {
                sel.innerHTML += `<option value="${l.id}">${l.titulo} ($${parseFloat(l.precio).toFixed(2)})</option>`;
            });
        }

        // Llenar select de libro para transferencias
        const selTrans = document.getElementById('trans_libro');
        if (selTrans) {
            selTrans.innerHTML = '<option value="">Seleccione Libro...</option>';
            catalogoLibros.forEach(l => {
                selTrans.innerHTML += `<option value="${l.id}">${l.titulo}</option>`;
            });
        }
    } catch (e) { console.error("Error cargarCatalogoLibros:", e); }
}

async function cargarStockGlobal() {
    try {
        const res = await fetch(`${API_BASE}/libros/stock`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        stockGlobalData = await res.json();

        const tbody = document.getElementById('tabla-stock-global');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (stockGlobalData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">Sin stock registrado.</td></tr>';
        } else {
            stockGlobalData.forEach(s => {
                tbody.innerHTML += `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px;font-weight:bold;">${s.titulo}</td>
                        <td style="padding:10px;text-align:center;">${s.cantidad_total}</td>
                        <td style="padding:10px;text-align:center;color:#b45309;">${s.cantidad_asignada}</td>
                        <td style="padding:10px;text-align:center;font-weight:bold;color:#16a34a;">${s.cantidad_disponible}</td>
                    </tr>
                `;
            });
        }

        // Llenar select de stock para asignar a zona
        const selStock = document.getElementById('asig_stock_id');
        if (selStock) {
            selStock.innerHTML = '<option value="">Seleccione Stock de Libro...</option>';
            stockGlobalData.forEach(s => {
                selStock.innerHTML += `<option value="${s.stock_id}">${s.titulo} (Disp: ${s.cantidad_disponible})</option>`;
            });
        }
    } catch (e) { console.error("Error cargarStockGlobal:", e); }
}

async function cargarZonasParaLibros() {
    try {
        const res = await fetch(`${API_BASE}/zonas`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        zonasData = await res.json();

        const sel = document.getElementById('asig_zona');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccione Zona...</option>';
            zonasData.forEach(z => {
                sel.innerHTML += `<option value="${z.id}">${z.nombre}</option>`;
            });
        }
    } catch (e) { console.error("Error cargarZonasParaLibros:", e); }
}

async function agregarStockGlobal() {
    const libro_id = document.getElementById('select_libro_stock').value;
    const cantidad = parseInt(document.getElementById('cantidad_stock').value);

    if (!libro_id) return mostrarAlerta('Libro requerido', 'Selecciona un libro.', 'warning');
    if (!cantidad || cantidad <= 0) return mostrarAlerta('Cantidad inválida', 'Ingresa una cantidad positiva.', 'warning');

    try {
        const res = await fetch(`${API_BASE}/libros/stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ libro_id, cantidad })
        });
        if (res.ok) {
            mostrarAlerta('¡Stock añadido!', '', 'success');
            document.getElementById('cantidad_stock').value = '';
            await cargarStockGlobal();
        } else {
            const err = await res.json();
            mostrarAlerta('Error', err.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function asignarStockZona() {
    const zona_id = document.getElementById('asig_zona').value;
    const stock_campana_id = document.getElementById('asig_stock_id').value;
    const cantidad = parseInt(document.getElementById('asig_zona_cant').value);

    if (!zona_id) return mostrarAlerta('Zona requerida', '', 'warning');
    if (!stock_campana_id) return mostrarAlerta('Libro requerido', '', 'warning');
    if (!cantidad || cantidad <= 0) return mostrarAlerta('Cantidad inválida', '', 'warning');

    try {
        const res = await fetch(`${API_BASE}/libros/zona/asignar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ zona_id, stock_campana_id, cantidad })
        });
        if (res.ok) {
            mostrarAlerta('¡Asignado!', 'Libros asignados a la zona.', 'success');
            document.getElementById('asig_zona_cant').value = '';
            await cargarStockGlobal();
        } else {
            const err = await res.json();
            mostrarAlerta('Error', err.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function cargarStockCoach() {
    try {
        const res = await fetch(`${API_BASE}/libros/stock-zona`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const stockZona = await res.json();

        const sel = document.getElementById('coach_asig_stock_zona');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccione Libro (Stock Zona)...</option>';
            stockZona.forEach(s => {
                sel.innerHTML += `<option value="${s.asignacion_zona_id}">${s.titulo} (Disp: ${s.disponible})</option>`;
            });
        }
    } catch (e) { console.error("Error cargarStockCoach:", e); }
}

async function cargarColportoresCoach() {
    try {
        const res = await fetch(`${API_BASE}/reports/coach-team`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        colportoresData = await res.json();

        const sel = document.getElementById('coach_asig_colportor');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccione Colportor...</option>';
            colportoresData.forEach(c => {
                sel.innerHTML += `<option value="${c.id}">${c.nombre_completo}</option>`;
            });
        }
    } catch (e) { console.error("Error cargarColportoresCoach:", e); }
}

async function asignarStockColportor() {
    const colportor_id = document.getElementById('coach_asig_colportor').value;
    const asignacion_zona_id = document.getElementById('coach_asig_stock_zona').value;
    const cantidad = parseInt(document.getElementById('coach_asig_cant').value);

    if (!colportor_id) return mostrarAlerta('Colportor requerido', '', 'warning');
    if (!asignacion_zona_id) return mostrarAlerta('Libro requerido', '', 'warning');
    if (!cantidad || cantidad <= 0) return mostrarAlerta('Cantidad inválida', '', 'warning');

    try {
        const res = await fetch(`${API_BASE}/libros/colportor/asignar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ colportor_id, asignacion_zona_id, cantidad })
        });
        if (res.ok) {
            mostrarAlerta('¡Entregado!', 'Libros asignados al colportor.', 'success');
            document.getElementById('coach_asig_cant').value = '';
            await cargarStockCoach();
        } else {
            const err = await res.json();
            mostrarAlerta('Error', err.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function cargarMisLibros() {
    try {
        const res = await fetch(`${API_BASE}/libros/mis-libros`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const libros = await res.json();

        const tbody = document.getElementById('tabla-mis-libros');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (libros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No tienes libros asignados aún.</td></tr>';
            return;
        }

        libros.forEach(l => {
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;font-weight:bold;">${l.titulo}</td>
                    <td style="padding:10px;color:#64748b;">${l.autor || '--'}</td>
                    <td style="padding:10px;text-align:right;">$${parseFloat(l.precio).toFixed(2)}</td>
                    <td style="padding:10px;text-align:center;font-weight:bold;color:#0f172a;">${l.cantidad}</td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarMisLibros:", e); }
}

// Form agregar libro al catálogo
const formNuevoLibro = document.getElementById('formNuevoLibro');
if (formNuevoLibro) {
    formNuevoLibro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            titulo: document.getElementById('libro_titulo').value.trim(),
            autor:  document.getElementById('libro_autor').value.trim(),
            precio: document.getElementById('libro_precio').value
        };
        if (!datos.titulo) return mostrarAlerta('Título requerido', '', 'warning');

        const btn = formNuevoLibro.querySelector('button[type="submit"]');
        const textoOrig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/libros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });
            if (res.ok) {
                mostrarAlerta('¡Libro añadido!', '', 'success');
                formNuevoLibro.reset();
                await cargarCatalogoLibros();
            } else {
                const err = await res.json();
                mostrarAlerta('Error', err.message, 'error');
            }
        } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
        finally {
            btn.innerHTML = textoOrig;
            btn.disabled = false;
        }
    });
}

// =====================================================
// 18. TRANSFERENCIAS
// =====================================================

async function cargarTransferenciasPendientes() {
    try {
        const res = await fetch(`${API_BASE}/transferencias/pendientes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const transferencias = await res.json();

        const tbody = document.getElementById('tabla-transferencias-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (transferencias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No hay transferencias pendientes.</td></tr>';
            return;
        }

        transferencias.forEach(t => {
            const origen  = t.origen_tipo  === 'zona' ? `Zona ${t.origen_zona_id}`  : `Colportor #${t.origen_usuario_id}`;
            const destino = t.destino_tipo === 'zona' ? `Zona ${t.destino_zona_id}` : `Colportor #${t.destino_usuario_id}`;
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;font-weight:bold;">${t.libro_titulo}</td>
                    <td style="padding:10px;text-align:center;">${t.cantidad}</td>
                    <td style="padding:10px;">${origen}</td>
                    <td style="padding:10px;">${destino}</td>
                    <td style="padding:10px;color:#64748b;">${t.solicitante_nombre}</td>
                    <td style="padding:10px;text-align:center;">
                        <button onclick="responderTransferencia(${t.id},'aprobado')" style="background:#16a34a;color:white;border:none;padding:5px 8px;border-radius:5px;cursor:pointer;margin-right:4px;" title="Aprobar">
                            <i class="fas fa-check"></i>
                        </button>
                        <button onclick="responderTransferencia(${t.id},'rechazado')" style="background:#e11d48;color:white;border:none;padding:5px 8px;border-radius:5px;cursor:pointer;" title="Rechazar">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarTransferenciasPendientes:", e); }
}

async function cargarOpcionesTransfer(lado) {
    const tipoId = `trans_${lado}_tipo`;
    const selId  = `trans_${lado}_id`;
    const tipo = document.getElementById(tipoId)?.value;
    const sel  = document.getElementById(selId);
    if (!sel) return;

    sel.innerHTML = '<option value="">Cargando...</option>';
    sel.disabled = true;

    try {
        if (tipo === 'zona') {
            const res = await fetch(`${API_BASE}/zonas`, { headers: { Authorization: `Bearer ${token}` } });
            const zonas = await res.json();
            sel.innerHTML = '<option value="">Seleccione zona...</option>';
            zonas.forEach(z => { sel.innerHTML += `<option value="${z.id}">${z.nombre}</option>`; });
        } else {
            // colportor
            const res = await fetch(`${API_BASE}/reports/coach-team`, { headers: { Authorization: `Bearer ${token}` } });
            const usuarios = await res.json();
            sel.innerHTML = '<option value="">Seleccione colportor...</option>';
            usuarios.forEach(u => { sel.innerHTML += `<option value="${u.id}">${u.nombre_completo}</option>`; });
        }
        sel.disabled = false;
    } catch (e) {
        sel.innerHTML = '<option value="">Error al cargar</option>';
    }
}

async function solicitarTransferencia() {
    const libro_id    = document.getElementById('trans_libro').value;
    const cantidad    = parseInt(document.getElementById('trans_cant').value);
    const origen_tipo = document.getElementById('trans_origen_tipo').value;
    const origen_id   = document.getElementById('trans_origen_id').value;
    const destino_tipo = document.getElementById('trans_destino_tipo').value;
    const destino_id  = document.getElementById('trans_destino_id').value;

    if (!libro_id || !cantidad || cantidad <= 0) return mostrarAlerta('Datos incompletos', 'Selecciona libro y cantidad.', 'warning');
    if (!origen_id)  return mostrarAlerta('Origen requerido', 'Selecciona el origen.', 'warning');
    if (!destino_id) return mostrarAlerta('Destino requerido', 'Selecciona el destino.', 'warning');

    try {
        const res = await fetch(`${API_BASE}/transferencias/solicitar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ libro_id, cantidad, origen_tipo, origen_id, destino_tipo, destino_id })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta('¡Solicitud enviada!', data.message, 'success');
            // Limpiar selects
            document.getElementById('trans_cant').value = '';
            document.getElementById('trans_origen_id').innerHTML = '<option value="">Seleccione origen...</option>';
            document.getElementById('trans_destino_id').innerHTML = '<option value="">Seleccione destino...</option>';
            await cargarTransferenciasPendientes();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function responderTransferencia(id, estado) {
    try {
        const res = await fetch(`${API_BASE}/transferencias/${id}/responder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ estado })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta(estado === 'aprobado' ? '¡Transferencia aprobada!' : 'Transferencia rechazada', data.message, estado === 'aprobado' ? 'success' : 'info');
            await cargarTransferenciasPendientes();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}
