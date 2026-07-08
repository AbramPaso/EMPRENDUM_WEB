// =====================================================
// LIBROS — Inventario, stock y asignación por niveles
// =====================================================

let catalogoLibros  = [];
let stockGlobalData = [];
let zonasData       = [];
let colportoresData = [];

// Inventario — director: catálogo+stock | coach: zona+personal | colportor: personal
async function cargarSeccionLibros() {
    const rol      = usuarioActual.rol;
    const vistaDir   = document.getElementById('vista-libros-director');
    const vistaCoach = document.getElementById('vista-inventario-coach');
    const vistaColp  = document.getElementById('vista-inventario-colportor');

    [vistaDir, vistaCoach, vistaColp].forEach(v => { if (v) v.style.display = 'none'; });

    // Coach y Colportor sin campaña activa aprobada: mostrar aviso y salir
    if (rol !== 1 && !usuarioActual.zona_nombre) {
        const contenedor = vistaCoach || vistaColp;
        if (contenedor) {
            contenedor.style.display = 'block';
            contenedor.innerHTML = `
                <div class="form-container" style="text-align:center;padding:40px;">
                    <i class="fas fa-lock" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:16px;display:block;"></i>
                    <h3 style="color:var(--text-muted);font-weight:600;margin-bottom:8px;">Sin acceso al inventario</h3>
                    <p style="color:var(--text-muted);font-size:0.9rem;">No estás inscrito y aprobado en la campaña activa.<br>Consulta la sección <strong>Campañas</strong> para inscribirte.</p>
                </div>`;
        }
        return;
    }

    if (rol === 1) {
        if (vistaDir) vistaDir.style.display = 'block';
        await cargarCatalogoLibros();
        await Promise.all([cargarStockGlobal(), cargarReporteZonas()]);
    } else if (rol === 2) {
        if (vistaCoach) vistaCoach.style.display = 'block';
        await cargarInventarioCoach();
    } else {
        if (vistaColp) vistaColp.style.display = 'block';
        await cargarInventarioColportor();
    }
}

async function cargarInventarioCoach() {
    const zonaId    = usuarioActual.zona_id;
    const zonaNombre = usuarioActual.zona_nombre || (zonaId ? `Zona ${zonaId}` : 'Sin zona asignada');
    const spanNombre = document.getElementById('inv-coach-zona-nombre');
    if (spanNombre) spanNombre.textContent = zonaNombre;

    // ── Inventario de zona ──
    const tbodyZona = document.getElementById('tabla-inv-zona-coach');
    if (tbodyZona) {
        tbodyZona.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        if (!zonaId) {
            tbodyZona.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">Sin zona asignada en la campaña activa.</td></tr>';
        } else {
            try {
                const res = await fetch(`${API_BASE}/libros/zona/${zonaId}`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const libros = await res.json();
                    if (!libros.length) {
                        tbodyZona.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No hay libros asignados a esta zona.</td></tr>';
                    } else {
                        tbodyZona.innerHTML = libros.map(l => {
                            const disponible = l.cantidad - l.cantidad_asignada_colportores;
                            return `<tr>
                                <td style="font-weight:500;">${l.titulo}</td>
                                <td style="text-align:center;font-weight:700;color:var(--primary-dark);">${l.cantidad}</td>
                                <td style="text-align:center;color:var(--accent-yellow);font-weight:600;">${l.cantidad_asignada_colportores}</td>
                                <td style="text-align:center;color:var(--primary-blue);font-weight:600;">${disponible}</td>
                            </tr>`;
                        }).join('');
                    }
                }
            } catch (e) { tbodyZona.innerHTML = '<tr><td colspan="4" style="color:#ef4444;padding:12px;">Error al cargar.</td></tr>'; }
        }
    }

    // ── Libros personales del coach ──
    const tbodyPersonal = document.getElementById('tabla-inv-personal-coach');
    if (tbodyPersonal) {
        tbodyPersonal.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;"><i class="fas fa-spinner fa-spin"></i></td></tr>';
        try {
            const res = await fetch(`${API_BASE}/libros/mis-libros`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const libros = await res.json();
                if (!libros.length) {
                    tbodyPersonal.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No tienes libros asignados.</td></tr>';
                } else {
                    tbodyPersonal.innerHTML = libros.map(l => `
                        <tr>
                            <td style="font-weight:500;">${l.titulo}</td>
                            <td style="color:var(--text-muted);">${l.autor || '—'}</td>
                            <td style="text-align:right;color:var(--success);font-weight:600;">$${parseFloat(l.precio).toFixed(2)}</td>
                            <td style="text-align:center;font-weight:700;color:var(--primary-dark);">${l.cantidad}</td>
                        </tr>
                    `).join('');
                }
            }
        } catch (e) { tbodyPersonal.innerHTML = '<tr><td colspan="4" style="color:#ef4444;padding:12px;">Error al cargar.</td></tr>'; }
    }
}

async function cargarInventarioColportor() {
    const tbody = document.getElementById('tabla-inv-colportor');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        const res = await fetch(`${API_BASE}/libros/mis-libros`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error();
        const libros = await res.json();
        if (!libros.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:16px;">No tienes libros asignados aún.</td></tr>';
        } else {
            tbody.innerHTML = libros.map(l => `
                <tr>
                    <td style="font-weight:500;">${l.titulo}</td>
                    <td style="color:var(--text-muted);">${l.autor || '—'}</td>
                    <td style="text-align:right;color:var(--success);font-weight:600;">$${parseFloat(l.precio).toFixed(2)}</td>
                    <td style="text-align:center;font-weight:700;color:var(--primary-dark);">${l.cantidad}</td>
                </tr>
            `).join('');
        }
    } catch (e) { tbody.innerHTML = '<tr><td colspan="4" style="color:#ef4444;padding:12px;">Error al cargar.</td></tr>'; }
}

// Asignación — contenido según rol
async function cargarSeccionAsignacion() {
    const rol         = usuarioActual.rol;
    const vistaDir    = document.getElementById('vista-asignacion-director');
    const vistaCoach  = document.getElementById('vista-libros-coach');
    const vistaColp   = document.getElementById('vista-mis-libros');
    const vistaTransf = document.getElementById('vista-transferencias');

    [vistaDir, vistaCoach, vistaColp, vistaTransf].forEach(v => { if (v) v.style.display = 'none'; });

    if (rol === 1) {
        if (vistaDir)    vistaDir.style.display    = 'block';
        if (vistaTransf) vistaTransf.style.display = 'block';
        await cargarCatalogoLibros();
        await Promise.all([cargarStockGlobal(), cargarZonasParaLibros(), cargarTransferenciasPendientes(), cargarZonasTransfer(), cargarHistorialTransferencias(), cargarHistorialAsignacionesZona()]);
    } else if (rol === 2) {
        if (vistaCoach)  vistaCoach.style.display  = 'block';
        if (vistaTransf) vistaTransf.style.display = 'block';
        await Promise.all([cargarStockCoach(), cargarColportoresCoach(), cargarTransferenciasPendientes(), cargarHistorialTransferencias()]);
        inicializarTransferCoach();
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

        const sel = document.getElementById('select_libro_stock');
        if (sel) {
            sel.innerHTML = '<option value="">Seleccione Libro...</option>';
            catalogoLibros.forEach(l => {
                sel.innerHTML += `<option value="${l.id}">${l.titulo} ($${parseFloat(l.precio).toFixed(2)})</option>`;
            });
        }

        // trans_libro se repobla dinámicamente desde transferencias.js según el origen
    } catch (e) { console.error("Error cargarCatalogoLibros:", e); }
}

async function cargarStockGlobal() {
    try {
        const res = await fetch(`${API_BASE}/libros/stock`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        stockGlobalData = await res.json();

        const tbody = document.getElementById('tabla-stock-global');
        if (tbody) {
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
        }

        const selStock = document.getElementById('asig_stock_id');
        if (selStock) {
            selStock.innerHTML = '<option value="">Seleccione Stock de Libro...</option>';
            stockGlobalData.forEach(s => {
                selStock.innerHTML += `<option value="${s.stock_id}">${s.titulo} (Disp: ${s.cantidad_disponible})</option>`;
            });
        }
    } catch (e) { console.error("Error cargarStockGlobal:", e); }
}

let _zonasLibros = [];

async function cargarZonasParaLibros() {
    try {
        const res = await fetch(`${API_BASE}/zonas/campana`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        _zonasLibros = await res.json();

        const selUnion = document.getElementById('asig_union');
        if (selUnion) {
            selUnion.innerHTML = '<option value="">1. Selecciona Unión…</option>';
            const vistas = new Set();
            _zonasLibros.forEach(z => {
                if (z.union_id && !vistas.has(z.union_id)) {
                    vistas.add(z.union_id);
                    const opt = document.createElement('option');
                    opt.value = z.union_id;
                    opt.textContent = z.union_nombre || `Unión ${z.union_id}`;
                    selUnion.appendChild(opt);
                }
            });
        }

        const selZona = document.getElementById('asig_zona');
        if (selZona) { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
    } catch (e) { console.error("Error cargarZonasParaLibros:", e); }
}

function filtrarZonasLibros() {
    const unionId = document.getElementById('asig_union')?.value;
    const selZona = document.getElementById('asig_zona');
    if (!selZona) return;
    selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>';
    if (!unionId) { selZona.disabled = true; return; }
    const filtradas = _zonasLibros.filter(z => String(z.union_id) === String(unionId));
    filtradas.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z.id;
        opt.textContent = z.descripcion ? `${z.nombre} — ${z.descripcion}` : z.nombre;
        selZona.appendChild(opt);
    });
    selZona.disabled = filtradas.length === 0;
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
    const zona_id         = document.getElementById('asig_zona').value;
    const stock_campana_id = document.getElementById('asig_stock_id').value;
    const cantidad        = parseInt(document.getElementById('asig_zona_cant').value);

    if (!zona_id)         return mostrarAlerta('Zona requerida', '', 'warning');
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
            document.getElementById('asig_union').value = '';
            document.getElementById('asig_zona').innerHTML = '<option value="">2. Selecciona Zona…</option>';
            document.getElementById('asig_zona').disabled = true;
            await Promise.all([cargarStockGlobal(), cargarHistorialAsignacionesZona()]);
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
    const colportor_id      = document.getElementById('coach_asig_colportor').value;
    const asignacion_zona_id = document.getElementById('coach_asig_stock_zona').value;
    const cantidad          = parseInt(document.getElementById('coach_asig_cant').value);

    if (!colportor_id)       return mostrarAlerta('Colportor requerido', '', 'warning');
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

async function cargarHistorialAsignacionesZona() {
    try {
        const res = await fetch(`${API_BASE}/libros/zona/historial`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const historial = await res.json();

        const tbody = document.getElementById('tabla-historial-asig-zona-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">Sin asignaciones registradas en esta campaña.</td></tr>';
            return;
        }

        historial.forEach(h => {
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;color:#94a3b8;font-size:0.85rem;">${h.union_siglas || '--'}</td>
                    <td style="padding:10px;font-weight:500;">${h.zona_nombre}</td>
                    <td style="padding:10px;">${h.libro_titulo}</td>
                    <td style="padding:10px;text-align:center;font-weight:bold;color:#0f172a;">${h.cantidad}</td>
                    <td style="padding:10px;color:#64748b;">${h.asignado_por_nombre}</td>
                    <td style="padding:10px;color:#64748b;font-size:0.85rem;">${h.fecha_formato}</td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarHistorialAsignacionesZona:", e); }
}

// =====================================================
// REPORTE DE DISTRIBUCIÓN POR ZONA
// =====================================================

let _reporteZonasData = [];

async function cargarReporteZonas() {
    const container = document.getElementById('reporte-zonas-container');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--text-muted);padding:16px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';

    try {
        const res = await fetch(`${API_BASE}/libros/reporte-zonas`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { container.innerHTML = '<p style="color:#ef4444;padding:12px;">Error al cargar datos.</p>'; return; }
        _reporteZonasData = await res.json();

        if (!_reporteZonasData.length) {
            container.innerHTML = '<p style="color:var(--text-muted);padding:16px;text-align:center;">Sin datos para la campaña activa.</p>';
            return;
        }

        let html = '<table class="table-pro"><thead><tr>'
            + '<th style="text-align:left;">Zona</th>'
            + '<th style="text-align:center;">Vendidos</th>'
            + '<th style="text-align:center;">Asignados</th>'
            + '<th style="text-align:center;">Sin Asignar</th>'
            + '<th style="text-align:center;">Total</th>'
            + '</tr></thead><tbody>';

        _reporteZonasData.forEach(union => {
            html += `<tr style="background:#f8fafc;cursor:default;">
                <td colspan="5" style="padding:8px 16px;font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;">
                    <i class="fas fa-sitemap" style="margin-right:6px;"></i>${union.union_siglas} &mdash; ${union.union_nombre}
                </td>
            </tr>`;

            union.zonas.forEach(zona => {
                html += `<tr style="cursor:pointer;" onclick="_rzOpenModal(${zona.zona_id})" title="Ver detalle de libros">
                    <td style="font-weight:500;">
                        <i class="fas fa-search" style="font-size:0.7rem;margin-right:8px;color:var(--primary-blue);opacity:0.7;"></i>${zona.zona_nombre}
                    </td>
                    <td style="text-align:center;font-weight:600;color:var(--success);">${zona.vendidos}</td>
                    <td style="text-align:center;font-weight:600;color:var(--accent-yellow);">${zona.asignados_colportores}</td>
                    <td style="text-align:center;font-weight:600;color:var(--primary-blue);">${zona.sin_asignar}</td>
                    <td style="text-align:center;font-weight:700;color:var(--primary-dark);">${zona.total_zona}</td>
                </tr>`;
            });
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (e) {
        console.error('Error cargarReporteZonas:', e);
        container.innerHTML = '<p style="color:#ef4444;padding:12px;">Error de conexión.</p>';
    }
}

function _rzOpenModal(zonaId) {
    let zona = null, unionData = null;
    for (const u of _reporteZonasData) {
        const z = u.zonas.find(z => z.zona_id === zonaId);
        if (z) { zona = z; unionData = u; break; }
    }
    if (!zona) return;

    document.getElementById('rz-modal-titulo').textContent = zona.zona_nombre;
    document.getElementById('rz-modal-union').textContent  = `${unionData.union_siglas} — ${unionData.union_nombre}`;

    // Mini stats tiles
    const statsConf = [
        { label: 'Vendidos',     value: zona.vendidos,              color: 'var(--success)',       icon: 'fa-check-circle' },
        { label: 'Asignados',    value: zona.asignados_colportores, color: 'var(--accent-yellow)', icon: 'fa-user-tag' },
        { label: 'Sin Asignar',  value: zona.sin_asignar,           color: 'var(--primary-blue)',  icon: 'fa-box-open' },
        { label: 'Total Zona',   value: zona.total_zona,            color: 'var(--primary-dark)',  icon: 'fa-layer-group' },
    ];
    document.getElementById('rz-modal-stats').innerHTML = statsConf.map(s => `
        <div style="background:var(--bg-body);border:1px solid var(--border-color);border-radius:var(--radius);padding:14px;text-align:center;">
            <i class="fas ${s.icon}" style="color:${s.color};font-size:1.1rem;margin-bottom:6px;display:block;"></i>
            <div style="font-size:1.4rem;font-weight:700;color:${s.color};">${s.value}</div>
            <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">${s.label}</div>
        </div>
    `).join('');

    // Tabla de libros
    const tbody = document.getElementById('rz-modal-tbody');
    if (!zona.libros.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">Sin libros registrados.</td></tr>';
    } else {
        tbody.innerHTML = zona.libros.map(lb => `
            <tr>
                <td>${lb.titulo}</td>
                <td style="text-align:center;font-weight:600;color:var(--success);">${lb.vendidos}</td>
                <td style="text-align:center;font-weight:600;color:var(--accent-yellow);">${lb.asignados_colportores}</td>
                <td style="text-align:center;font-weight:600;color:var(--primary-blue);">${lb.sin_asignar}</td>
                <td style="text-align:center;font-weight:700;color:var(--primary-dark);">${lb.total}</td>
            </tr>
        `).join('');
    }

    document.getElementById('modalZonaDetalle').style.display = 'flex';
}

function cerrarModalZonaDetalle() {
    document.getElementById('modalZonaDetalle').style.display = 'none';
}

// Form agregar libro al catálogo
const formNuevoLibro = document.getElementById('formNuevoLibro');
if (formNuevoLibro) {
    formNuevoLibro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            titulo:  document.getElementById('libro_titulo').value.trim(),
            autor:   document.getElementById('libro_autor').value.trim(),
            precio:  document.getElementById('libro_precio').value
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
