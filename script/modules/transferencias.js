// =====================================================
// TRANSFERENCIAS — Solicitud y aprobación de transfers
// =====================================================

let _zonasTransfer = [];

// ─── Helpers de stock ────────────────────────────────────────────────────────

function _applyStockBoxStyle(box, bg, border, color) {
    box.style.backgroundColor = bg;
    box.style.borderColor = border;
    box.style.color = color;
}

function limpiarStockTransfer(lado) {
    const box = document.getElementById(`info-stock-${lado}`);
    if (!box) return;
    box.style.display = 'none';
    box.innerHTML = '';
    _applyStockBoxStyle(box, '#f0fdf4', '#bbf7d0', '#166534');
}

async function mostrarStockZona(lado, zonaId) {
    const box = document.getElementById(`info-stock-${lado}`);
    if (!box || !zonaId) { limpiarStockTransfer(lado); return; }

    box.style.display = 'block';
    _applyStockBoxStyle(box, '#f0fdf4', '#bbf7d0', '#166534');
    box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando…';

    try {
        const res = await fetch(`${API_BASE}/libros/zona/${zonaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const libros = await res.json();

        if (libros.length === 0) {
            box.innerHTML = '<i class="fas fa-box-open"></i> Sin libros asignados a esta zona.';
        } else {
            const total = libros.reduce((s, l) => s + (l.cantidad || 0), 0);
            const disponible = libros.reduce((s, l) => s + (l.cantidad_disponible || 0), 0);
            box.innerHTML = `<i class="fas fa-book"></i> <strong>${total}</strong> libros totales · <strong style="color:#15803d;">${disponible}</strong> disponibles`;
        }
    } catch {
        _applyStockBoxStyle(box, '#fef2f2', '#fecaca', '#991b1b');
        box.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error al consultar.';
    }
}

async function mostrarStockColportor(lado, colportorId) {
    const box = document.getElementById(`info-stock-${lado}`);
    if (!box || !colportorId) { limpiarStockTransfer(lado); return; }

    box.style.display = 'block';
    _applyStockBoxStyle(box, '#eff6ff', '#bfdbfe', '#1e40af');
    box.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consultando…';

    try {
        const res = await fetch(`${API_BASE}/libros/colportor/${colportorId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const libros = await res.json();

        if (libros.length === 0) {
            box.innerHTML = '<i class="fas fa-box-open"></i> Sin libros asignados a este colportor.';
        } else {
            const total = libros.reduce((s, l) => s + (l.cantidad || 0), 0);
            box.innerHTML = `<i class="fas fa-user"></i> <strong>${total}</strong> libros asignados a este colportor`;
        }
    } catch {
        _applyStockBoxStyle(box, '#fef2f2', '#fecaca', '#991b1b');
        box.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error al consultar.';
    }
}

// Handlers de cambio en selects de zona / colportor
function onZonaChange(lado) {
    const tipo = document.getElementById(`trans_${lado}_tipo`)?.value;
    if (tipo === 'colportor') {
        limpiarStockTransfer(lado);
        filtrarColportorTransfer(lado);
    } else {
        const zonaId = document.getElementById(`trans_${lado}_zona`)?.value;
        if (zonaId) mostrarStockZona(lado, zonaId);
        else limpiarStockTransfer(lado);
    }
}

function onColportorChange(lado) {
    const colportorId = document.getElementById(`trans_${lado}_colportor`)?.value;
    if (colportorId) mostrarStockColportor(lado, colportorId);
    else limpiarStockTransfer(lado);
}

// Nombre legible de origen/destino para las tablas
function _nombreTransfer(t, lado) {
    if (t[`${lado}_tipo`] === 'zona') {
        return t[`${lado}_zona_nombre`] || `Zona ${t[`${lado}_zona_id`]}`;
    }
    return t[`${lado}_colportor_nombre`] || `Colportor #${t[`${lado}_usuario_id`]}`;
}

// ─── Inicialización según rol ────────────────────────────────────────────────

async function cargarZonasTransfer() {
    // Director: carga zonas de campaña una vez y puebla los selects de unión
    if (_zonasTransfer.length === 0) {
        try {
            const res = await fetch(`${API_BASE}/zonas/campana`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) _zonasTransfer = await res.json();
        } catch {}
    }

    ['origen', 'destino'].forEach(lado => {
        const selUnion = document.getElementById(`trans_${lado}_union`);
        if (!selUnion) return;
        selUnion.innerHTML = '<option value="">1. Selecciona Unión…</option>';
        selUnion.style.display = 'block';
        const vistas = new Set();
        _zonasTransfer.forEach(z => {
            if (z.union_id && !vistas.has(z.union_id)) {
                vistas.add(z.union_id);
                const opt = document.createElement('option');
                opt.value = z.union_id;
                opt.textContent = z.union_nombre || `Unión ${z.union_id}`;
                selUnion.appendChild(opt);
            }
        });
        // El select de zona empieza deshabilitado; el de colportor oculto
        const selZona = document.getElementById(`trans_${lado}_zona`);
        if (selZona) { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
        const selColp = document.getElementById(`trans_${lado}_colportor`);
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; }
    });
}

async function inicializarTransferCoach() {
    const zona_id = usuarioActual.zona_id;

    ['origen', 'destino'].forEach(lado => {
        const selUnion = document.getElementById(`trans_${lado}_union`);
        if (selUnion) selUnion.style.display = 'none';

        const selZona = document.getElementById(`trans_${lado}_zona`);
        if (selZona && zona_id) {
            selZona.innerHTML = `<option value="${zona_id}">Tu Zona</option>`;
            selZona.disabled = true;
        }

        const selColp = document.getElementById(`trans_${lado}_colportor`);
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; }
    });

    // Mostrar stock de la zona del coach automáticamente (ambos lados)
    if (zona_id) {
        mostrarStockZona('origen', zona_id);
        mostrarStockZona('destino', zona_id);
    }
}

// ─── Cambio de tipo (zona / colportor) ──────────────────────────────────────

function cambiarTipoTransfer(lado) {
    const tipo    = document.getElementById(`trans_${lado}_tipo`)?.value;
    const selUnion = document.getElementById(`trans_${lado}_union`);
    const selZona  = document.getElementById(`trans_${lado}_zona`);
    const selColp  = document.getElementById(`trans_${lado}_colportor`);

    if (tipo === 'zona') {
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; selColp.innerHTML = '<option value="">Selecciona Colportor…</option>'; }

        if (usuarioActual.rol === 1) {
            if (selUnion) { selUnion.value = ''; }
            if (selZona)  { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
            limpiarStockTransfer(lado);
        } else {
            // Coach: zona ya fija, mostrar stock de su zona
            const zonaId = selZona?.value;
            if (zonaId) mostrarStockZona(lado, zonaId);
            else limpiarStockTransfer(lado);
        }

    } else {
        if (selColp) { selColp.style.display = 'block'; }
        limpiarStockTransfer(lado);

        if (usuarioActual.rol === 1) {
            if (selUnion) { selUnion.value = ''; }
            if (selZona)  { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
            if (selColp)  { selColp.innerHTML = '<option value="">3. Selecciona Colportor…</option>'; selColp.disabled = true; }
        } else {
            if (selColp) {
                selColp.innerHTML = '<option value="">Selecciona Colportor…</option>';
                (colportoresData || []).forEach(u => {
                    selColp.innerHTML += `<option value="${u.id}">${u.nombre_completo}</option>`;
                });
                selColp.disabled = false;
            }
        }
    }
}

// ─── Cascadas del director ───────────────────────────────────────────────────

function filtrarZonaTransfer(lado) {
    const unionId = document.getElementById(`trans_${lado}_union`)?.value;
    const selZona = document.getElementById(`trans_${lado}_zona`);
    const selColp = document.getElementById(`trans_${lado}_colportor`);

    if (!selZona) return;
    selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>';
    if (selColp) { selColp.innerHTML = '<option value="">3. Selecciona Colportor…</option>'; selColp.disabled = true; }

    if (!unionId) { selZona.disabled = true; return; }

    const filtradas = _zonasTransfer.filter(z => String(z.union_id) === String(unionId));
    filtradas.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z.id;
        opt.textContent = z.descripcion ? `${z.nombre} — ${z.descripcion}` : z.nombre;
        selZona.appendChild(opt);
    });
    selZona.disabled = filtradas.length === 0;
}

async function filtrarColportorTransfer(lado) {
    // Solo aplica al director cuando tipo=colportor
    const tipo = document.getElementById(`trans_${lado}_tipo`)?.value;
    if (tipo !== 'colportor') return;

    const zonaId  = document.getElementById(`trans_${lado}_zona`)?.value;
    const selColp = document.getElementById(`trans_${lado}_colportor`);
    if (!selColp || !zonaId) { if (selColp) selColp.disabled = true; return; }

    selColp.innerHTML = '<option value="">Cargando…</option>';
    selColp.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/users/directorio?filtro=zona&zona_id=${zonaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const users = await res.json();
        const colps = users.filter(u => u.rol_id === 3);

        selColp.innerHTML = '<option value="">3. Selecciona Colportor…</option>';
        colps.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = u.nombre_completo;
            selColp.appendChild(opt);
        });
        selColp.disabled = colps.length === 0;
    } catch {
        selColp.innerHTML = '<option value="">Error al cargar</option>';
    }
}

// ─── Leer ID final de origen / destino ──────────────────────────────────────

function _resolverTransferId(lado) {
    const tipo = document.getElementById(`trans_${lado}_tipo`)?.value;
    if (tipo === 'zona') return document.getElementById(`trans_${lado}_zona`)?.value || '';
    return document.getElementById(`trans_${lado}_colportor`)?.value || '';
}

// ─── Enviar solicitud ────────────────────────────────────────────────────────

async function solicitarTransferencia() {
    const libro_id     = document.getElementById('trans_libro').value;
    const cantidad     = parseInt(document.getElementById('trans_cant').value);
    const origen_tipo  = document.getElementById('trans_origen_tipo').value;
    const destino_tipo = document.getElementById('trans_destino_tipo').value;
    const origen_id    = _resolverTransferId('origen');
    const destino_id   = _resolverTransferId('destino');

    if (!libro_id || !cantidad || cantidad <= 0) return mostrarAlerta('Datos incompletos', 'Selecciona libro y cantidad.', 'warning');
    if (!origen_id)  return mostrarAlerta('Origen requerido',  'Completa la selección de origen.',  'warning');
    if (!destino_id) return mostrarAlerta('Destino requerido', 'Completa la selección de destino.', 'warning');

    try {
        const res = await fetch(`${API_BASE}/transferencias/solicitar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ libro_id, cantidad, origen_tipo, origen_id, destino_tipo, destino_id })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta('¡Solicitud enviada!', data.message, 'success');
            document.getElementById('trans_cant').value = '';
            _resetTransferSide('origen');
            _resetTransferSide('destino');
            await cargarTransferenciasPendientes();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch { mostrarAlerta('Error de conexión', '', 'error'); }
}

function _resetTransferSide(lado) {
    const tipo = document.getElementById(`trans_${lado}_tipo`);
    if (tipo) tipo.value = 'zona';

    if (usuarioActual.rol === 1) {
        const selUnion = document.getElementById(`trans_${lado}_union`);
        const selZona  = document.getElementById(`trans_${lado}_zona`);
        const selColp  = document.getElementById(`trans_${lado}_colportor`);
        if (selUnion) selUnion.value = '';
        if (selZona)  { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
        if (selColp)  { selColp.style.display = 'none'; selColp.disabled = true; }
        limpiarStockTransfer(lado);
    } else {
        const selColp = document.getElementById(`trans_${lado}_colportor`);
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; }
        // Coach: volver a mostrar stock de su zona fija
        const zonaId = usuarioActual.zona_id;
        if (zonaId) mostrarStockZona(lado, zonaId);
        else limpiarStockTransfer(lado);
    }
}

// ─── Aprobar / rechazar transferencias ──────────────────────────────────────

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
            const origen  = _nombreTransfer(t, 'origen');
            const destino = _nombreTransfer(t, 'destino');
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

async function cargarHistorialTransferencias() {
    try {
        const res = await fetch(`${API_BASE}/transferencias/historial`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const historial = await res.json();

        const tbody = document.getElementById('tabla-historial-trans-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (historial.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">Sin transferencias registradas en esta campaña.</td></tr>';
            return;
        }

        historial.forEach(t => {
            const origen  = _nombreTransfer(t, 'origen');
            const destino = _nombreTransfer(t, 'destino');
            const estadoBadge = t.estado === 'aprobado'
                ? '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;">Aprobado</span>'
                : '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600;">Rechazado</span>';
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;font-weight:bold;">${t.libro_titulo}</td>
                    <td style="padding:10px;text-align:center;">${t.cantidad}</td>
                    <td style="padding:10px;">${origen}</td>
                    <td style="padding:10px;">${destino}</td>
                    <td style="padding:10px;">${estadoBadge}</td>
                    <td style="padding:10px;color:#64748b;">${t.solicitante_nombre}</td>
                    <td style="padding:10px;color:#64748b;">${t.resolucion_formato || '--'}</td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarHistorialTransferencias:", e); }
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
            mostrarAlerta(
                estado === 'aprobado' ? '¡Transferencia aprobada!' : 'Transferencia rechazada',
                data.message,
                estado === 'aprobado' ? 'success' : 'info'
            );
            await Promise.all([cargarTransferenciasPendientes(), cargarHistorialTransferencias()]);
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch { mostrarAlerta('Error de conexión', '', 'error'); }
}
