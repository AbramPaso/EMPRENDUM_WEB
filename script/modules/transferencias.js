// =====================================================
// TRANSFERENCIAS — Solicitud y aprobación de transfers
// =====================================================

let _zonasTransfer = [];

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
    // Coach: su zona queda pre-seleccionada; colportores vienen de su equipo
    const zona_id = usuarioActual.zona_id;

    ['origen', 'destino'].forEach(lado => {
        // Ocultar union select (no aplica para coach)
        const selUnion = document.getElementById(`trans_${lado}_union`);
        if (selUnion) selUnion.style.display = 'none';

        // Pre-poblar zona con la suya (solo lectura)
        const selZona = document.getElementById(`trans_${lado}_zona`);
        if (selZona && zona_id) {
            selZona.innerHTML = `<option value="${zona_id}">Tu Zona</option>`;
            selZona.disabled = true;
        }

        // Ocultar colportor hasta que tipo=colportor
        const selColp = document.getElementById(`trans_${lado}_colportor`);
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; }
    });

    // Pre-poblar colportores del coach (se cargan cuando tipo cambia a 'colportor')
    // La lista ya está en colportoresData desde cargarColportoresCoach()
}

// ─── Cambio de tipo (zona / colportor) ──────────────────────────────────────

function cambiarTipoTransfer(lado) {
    const tipo    = document.getElementById(`trans_${lado}_tipo`)?.value;
    const selUnion = document.getElementById(`trans_${lado}_union`);
    const selZona  = document.getElementById(`trans_${lado}_zona`);
    const selColp  = document.getElementById(`trans_${lado}_colportor`);

    if (tipo === 'zona') {
        // Mostrar zona, ocultar colportor
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; selColp.innerHTML = '<option value="">Selecciona Colportor…</option>'; }

        if (usuarioActual.rol === 1) {
            // Director: resetear cascada
            if (selUnion) { selUnion.value = ''; }
            if (selZona)  { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
        }
        // Coach: zona ya está fija, no hacer nada

    } else {
        // tipo = colportor
        if (selColp) { selColp.style.display = 'block'; }

        if (usuarioActual.rol === 1) {
            // Director: resetear cascada y habilitar flujo
            if (selUnion) { selUnion.value = ''; }
            if (selZona)  { selZona.innerHTML = '<option value="">2. Selecciona Zona…</option>'; selZona.disabled = true; }
            if (selColp)  { selColp.innerHTML = '<option value="">3. Selecciona Colportor…</option>'; selColp.disabled = true; }
        } else {
            // Coach: poblar colportores de su equipo directamente
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
    } else {
        // Coach: solo ocultar colportor select
        const selColp = document.getElementById(`trans_${lado}_colportor`);
        if (selColp) { selColp.style.display = 'none'; selColp.disabled = true; }
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
            const origen  = t.origen_tipo  === 'zona' ? `Zona ${t.origen_zona_id}`   : `Colportor #${t.origen_usuario_id}`;
            const destino = t.destino_tipo === 'zona' ? `Zona ${t.destino_zona_id}`  : `Colportor #${t.destino_usuario_id}`;
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
            await cargarTransferenciasPendientes();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch { mostrarAlerta('Error de conexión', '', 'error'); }
}
