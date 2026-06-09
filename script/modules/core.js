// =====================================================
// CORE — Globales, helpers compartidos, navegación
// =====================================================

const API_BASE = "http://localhost:3000/api";
const token = localStorage.getItem("token");
let usuarioActual = {};

// Helper SweetAlert2
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

// Protege inputs de perfil (letras / números)
function protegerInputsPerfil() {
    const inputsTexto  = ['reg_nombre','reg_carrera','reg_religion','padre_nombre','madre_nombre','conyuge_nombre'];
    const inputsNumero = ['reg_cedula','reg_telefono','padre_telefono','madre_telefono','conyuge_telefono'];

    inputsTexto.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => {
            if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) return;
            if (!/^[a-zA-ZÀ-ÿ\s]$/.test(e.key)) e.preventDefault();
        });
    });

    inputsNumero.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => {
            if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) return;
            if (['e','E','+','-','.'].includes(e.key)) e.preventDefault();
        });
    });
}

// Datos estáticos de campos por unión (para perfil de procedencia)
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

// Datos estáticos de campos por unión (para asignación de campaña)
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

// Carga zonas filtradas por unión en un <select>
async function cargarZonasEnSelect(selectId, unionId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Cargando...</option>';
    select.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/zonas?union_id=${unionId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Error');
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

// Carga todas las zonas sin filtro en un <select>
async function cargarTodasZonasEnSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '<option value="">Cargando...</option>';
    select.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/zonas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
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
// CERRAR SESIÓN
// =====================================================
function cerrarSesion() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}
