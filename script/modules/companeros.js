// =====================================================
// COMPAÑEROS — Directorio de equipo
// =====================================================

const ROLES_LABEL = { 1: 'Director', 2: 'Coach' };
let _zonasCache = [];  // zonas de campaña activa, cargadas una vez

async function cargarCompaneros(filtro = 'auto', zonaId = null) {
    const container = document.getElementById("listaCompaneros");
    container.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando...</p></div>';

    let url = `${API_BASE}/users/directorio`;
    const params = new URLSearchParams();
    if (filtro !== 'auto') params.set('filtro', filtro);
    if (zonaId && filtro === 'zona') params.set('zona_id', zonaId);
    if ([...params].length) url += '?' + params.toString();

    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const users = await res.json();

        // Marcar botón activo
        document.querySelectorAll('.btn-filtro-dir').forEach(b => b.classList.remove('active'));
        const keyBtn = (filtro === 'auto' || filtro === 'todos') ? 'todos' : filtro;
        const btnActivo = document.getElementById(`btn-dir-${keyBtn}`);
        if (btnActivo) btnActivo.classList.add('active');

        if (users.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px;">No hay compañeros para mostrar.</p>';
            return;
        }

        container.innerHTML = '';
        users.forEach(u => {
            const foto = u.foto_perfil_url
                ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, '/')}`
                : '../image/usuario-icon.webp';
            const badge = ROLES_LABEL[u.rol_id]
                ? `<span class="colleague-badge">${ROLES_LABEL[u.rol_id]}</span>` : '';
            container.innerHTML += `
                <div class="colleague-card" onclick="verDetalle(${u.id})">
                    <img src="${foto}" class="colleague-pic" onerror="this.src='../image/usuario-icon.webp'">
                    ${badge}
                    <h4 class="colleague-name">${u.nombre_completo}</h4>
                    <span class="colleague-role">${u.carrera || 'Estudiante'}</span>
                </div>`;
        });
    } catch (e) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;">Error cargando directorio. Verifica que el servidor esté corriendo.</p>';
    }
}

// Rellena el select de zonas con la lista recibida (nombre + descripción)
function _poblarSelectZona(zonas) {
    const sel = document.getElementById('select-zona-filtro');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona zona…</option>';
    zonas.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z.id;
        opt.textContent = z.descripcion ? `${z.nombre} — ${z.descripcion}` : z.nombre;
        sel.appendChild(opt);
    });
}

// Abre el filtro de unión (oculta zona hasta que se elija unión)
function abrirFiltroUnion() {
    const selZ = document.getElementById('select-zona-filtro');
    const selU = document.getElementById('select-union-filtro');
    if (selU) { selU.style.display = 'inline-block'; selU.value = ''; }
    if (selZ) { selZ.style.display = 'none'; selZ.value = ''; }
}

// Inicializa filtros del director (solo se ejecuta una vez por sesión de tab)
async function inicializarFiltrosDirectorio() {
    const filtros = document.getElementById('filtros-directorio');
    if (!filtros || usuarioActual.rol !== 1) return;
    if (filtros.dataset.init) return;
    filtros.dataset.init = '1';
    filtros.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/zonas/campana`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        _zonasCache = await res.json();

        // Poblar select de zonas con todas las zonas
        _poblarSelectZona(_zonasCache);

        // Poblar select de uniones (deduplicar por union_id)
        const selUnion = document.getElementById('select-union-filtro');
        if (selUnion) {
            const vistas = new Set();
            _zonasCache.forEach(z => {
                if (z.union_id && !vistas.has(z.union_id)) {
                    vistas.add(z.union_id);
                    const opt = document.createElement('option');
                    opt.value = z.union_id;
                    opt.textContent = z.union_nombre || `Unión ${z.union_id}`;
                    selUnion.appendChild(opt);
                }
            });
        }
    } catch {}
}

// Al cambiar unión: filtra zonas y muestra el select de zona
document.getElementById('select-union-filtro')?.addEventListener('change', function () {
    const unionId = this.value;
    if (!unionId) return;
    const filtradas = _zonasCache.filter(z => String(z.union_id) === String(unionId));
    _poblarSelectZona(filtradas);
    const selZ = document.getElementById('select-zona-filtro');
    if (selZ) { selZ.style.display = 'inline-block'; selZ.value = ''; }
});

// Al cambiar zona: carga el directorio filtrado por zona
document.getElementById('select-zona-filtro')?.addEventListener('change', function () {
    if (this.value) cargarCompaneros('zona', this.value);
});

async function verDetalle(id) {
    try {
        const res = await fetch(`${API_BASE}/users/detalle/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const u = await res.json();

        document.getElementById("modalNombre").innerText      = u.nombre_completo || "--";
        document.getElementById("modalCarrera").innerText     = u.carrera || "Estudiante";
        document.getElementById("modalLugar").innerText       = u.lugar_colportar || "No especificado";
        document.getElementById("modalTelefono").innerText    = u.telefono || "Privado";
        document.getElementById("modalPensamiento").innerText = u.pensamiento_bio || "Sin pensamiento.";

        const imgEl = document.getElementById("modalFoto");
        imgEl.src = u.foto_perfil_url
            ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, '/')}`
            : '../image/usuario-icon.webp';
        imgEl.onerror = function () { this.src = '../image/usuario-icon.webp'; };

        document.getElementById("modalCompanero").style.display = "flex";
    } catch (e) {
        console.error("Error verDetalle:", e);
    }
}

function cerrarModal() {
    document.getElementById("modalCompanero").style.display = "none";
}
