// =====================================================
// INICIO — Estadísticas, gráficas y tablas del dashboard
// =====================================================

let _campanaActual = null;  // null = activa; número = campana_id elegida por el director

async function cargarSelectorCampanas() {
    const wrapper = document.getElementById('selector-campana-director');
    if (!wrapper || wrapper.dataset.init) return;
    wrapper.dataset.init = '1';

    try {
        const res = await fetch(`${API_BASE}/campanas`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const campanas = await res.json();

        campanas.sort((a, b) => {
            if (a.estado === 'activa') return -1;
            if (b.estado === 'activa') return 1;
            return new Date(b.fecha_inicio) - new Date(a.fecha_inicio);
        });

        wrapper.innerHTML = '<span style="font-size:0.8rem;color:#64748b;font-weight:600;margin-right:0.5rem;align-self:center;">Campaña:</span>';
        campanas.forEach((c, i) => {
            const badge = c.estado === 'activa'
                ? '<span class="badge-camp-activa">Activa</span>'
                : '<span class="badge-camp-cerrada">Cerrada</span>';
            const btn = document.createElement('button');
            btn.className = 'pill-campana' + (i === 0 ? ' active' : '');
            btn.dataset.campanaId = c.id;
            btn.innerHTML = `${c.nombre} ${badge}`;
            btn.onclick = () => seleccionarCampana(c.id, btn);
            wrapper.appendChild(btn);
        });

        if (campanas.length) _campanaActual = campanas[0].id;
    } catch {}
}

function seleccionarCampana(id, btnEl) {
    _campanaActual = id;
    document.querySelectorAll('.pill-campana').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    cargarGraficasDirector();
    cargarTablaCoaches();
    cargarTablaGlobalDirector();
}

async function cargarEstadisticas() {
    try {
        const res = await fetch(`${API_BASE}/reports/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) cerrarSesion();
            return;
        }

        const data = await res.json();
        const rol = data.rol_detectado;
        usuarioActual.rol     = rol;
        usuarioActual.zona_id = data.zona_detectada || null;

        const badge = document.getElementById("rol-badge");
        if (badge) {
            if (rol === 1)      { badge.innerText = "DIRECTOR"; badge.style.background = "#d9534f"; }
            else if (rol === 2) { badge.innerText = "COACH";    badge.style.background = "#f0ad4e"; }
            else                { badge.innerText = "COLPORTOR"; badge.style.background = "#0275d8"; }
        }

        document.getElementById("vista-colportor").style.display = "none";
        document.getElementById("vista-director").style.display  = "none";
        document.getElementById("vista-coach").style.display     = "none";

        if (rol === 1) {
            document.getElementById("vista-director").style.display = "block";
            await cargarSelectorCampanas();
            cargarGraficasDirector();
            cargarTablaCoaches();
            cargarTablaGlobalDirector();
        } else if (rol === 2) {
            document.getElementById("vista-coach").style.display    = "block";
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
    document.getElementById("stat-monto").innerText       = "$" + (parseFloat(data.total_monto) || 0).toFixed(2);
    document.getElementById("stat-horas").innerText       = data.total_horas || 0;
}

async function cargarGraficasDirector() {
    try {
        const qs = _campanaActual ? `?campana_id=${_campanaActual}` : '';
        const res = await fetch(`${API_BASE}/reports/director-charts${qs}`, {
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

        if (window.chartZonas)   window.chartZonas.destroy();
        if (window.chartUniones) window.chartUniones.destroy();

        window.chartZonas = new Chart(document.getElementById("graficaZonas"), {
            type: "bar",
            data: {
                labels: data.zonas.map(d => d.label),
                datasets: [{ label: "Recaudado ($)", data: data.zonas.map(d => d.total), backgroundColor: "#0f172a" }]
            }
        });

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
        const qs = _campanaActual ? `?campana_id=${_campanaActual}` : '';
        const res = await fetch(`${API_BASE}/users/gestion/todos${qs}`, {
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
                ? `<span style="color:#005a87;font-weight:500;">${u.zona_nombre}</span>${u.union_nombre ? `<br><span style="font-size:0.75rem;color:#94a3b8;">${u.union_nombre}</span>` : ''}`
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
                    <button onclick="abrirModalCompleto(${u.id})" style="cursor:pointer;background:none;border:none;color:#d9534f;font-size:1.1rem;" title="Gestión maestra">
                        <i class="fas fa-cogs"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error tabla global:", e); }
}

async function cargarTablaCoaches() {
    try {
        const qs = _campanaActual ? `?campana_id=${_campanaActual}` : '';
        const res = await fetch(`${API_BASE}/users/lista-coaches${qs}`, {
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
                    <td style="padding:10px;">
                        ${c.zona_nombre || 'Sin Asignar'}
                        ${c.union_nombre ? `<br><span style="font-size:0.75rem;color:#94a3b8;">${c.union_nombre}</span>` : ''}
                    </td>
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
            await Promise.all([cargarGraficasDirector(), cargarTablaCoaches(), cargarTablaGlobalDirector()]);
        } else if (usuarioActual.rol === 2) {
            await cargarTablaCoach();
            const res = await fetch(`${API_BASE}/reports/dashboard-stats`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) llenarTarjetas(await res.json());
        }
    } catch (e) { console.error("Error actualizando tablas:", e); }
}
