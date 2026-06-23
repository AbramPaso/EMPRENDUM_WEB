// =====================================================
// COMPAÑEROS — Directorio de equipo
// =====================================================

const ROLES_LABEL = { 1: 'Director', 2: 'Coach' };

async function cargarCompaneros(filtro = 'auto', zonaId = null) {
    const container = document.getElementById("listaCompaneros");
    container.innerHTML = '<div style="text-align:center;padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando...</p></div>';

    let url = `${API_BASE}/users/directorio`;
    const params = new URLSearchParams();
    if (filtro !== 'auto') params.set('filtro', filtro);
    if (zonaId)            params.set('zona_id', zonaId);
    if ([...params].length) url += '?' + params.toString();

    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const users = await res.json();

        // Marcar botón activo en los filtros del director
        document.querySelectorAll('.btn-filtro-dir').forEach(b => b.classList.remove('active'));
        const keyBtn = filtro === 'auto' ? 'todos' : filtro;
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

// Muestra los filtros del director y carga las zonas de campaña activa
async function inicializarFiltrosDirectorio() {
    const filtros = document.getElementById('filtros-directorio');
    if (!filtros || usuarioActual.rol !== 1) return;
    filtros.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/zonas/campana`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const zonas = await res.json();
        const sel = document.getElementById('select-zona-filtro');
        if (!sel) return;
        zonas.forEach(z => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = z.nombre;
            sel.appendChild(opt);
        });
    } catch {}
}

// Handler del select de zona (evita doble llamada desde el botón)
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
