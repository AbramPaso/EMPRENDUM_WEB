// =====================================================
// COMPAÑEROS — Directorio de equipo
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

        document.getElementById("modalNombre").innerText     = u.nombre_completo || "--";
        document.getElementById("modalCarrera").innerText    = u.carrera || "Estudiante";
        document.getElementById("modalLugar").innerText      = u.lugar_colportar || "No especificado";
        document.getElementById("modalTelefono").innerText   = u.telefono || "Privado";
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
