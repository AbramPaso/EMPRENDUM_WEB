// =====================================================
// TRANSFERENCIAS — Solicitud y aprobación de transfers
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
    const tipo = document.getElementById(`trans_${lado}_tipo`)?.value;
    const sel  = document.getElementById(`trans_${lado}_id`);
    if (!sel) return;

    sel.innerHTML = '<option value="">Cargando...</option>';
    sel.disabled = true;

    try {
        if (tipo === 'zona') {
            const res   = await fetch(`${API_BASE}/zonas`, { headers: { Authorization: `Bearer ${token}` } });
            const zonas = await res.json();
            sel.innerHTML = '<option value="">Seleccione zona...</option>';
            zonas.forEach(z => { sel.innerHTML += `<option value="${z.id}">${z.nombre}</option>`; });
        } else {
            const res     = await fetch(`${API_BASE}/reports/coach-team`, { headers: { Authorization: `Bearer ${token}` } });
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
    const libro_id     = document.getElementById('trans_libro').value;
    const cantidad     = parseInt(document.getElementById('trans_cant').value);
    const origen_tipo  = document.getElementById('trans_origen_tipo').value;
    const origen_id    = document.getElementById('trans_origen_id').value;
    const destino_tipo = document.getElementById('trans_destino_tipo').value;
    const destino_id   = document.getElementById('trans_destino_id').value;

    if (!libro_id || !cantidad || cantidad <= 0) return mostrarAlerta('Datos incompletos', 'Selecciona libro y cantidad.', 'warning');
    if (!origen_id)  return mostrarAlerta('Origen requerido',  'Selecciona el origen.',  'warning');
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
            document.getElementById('trans_cant').value = '';
            document.getElementById('trans_origen_id').innerHTML  = '<option value="">Seleccione origen...</option>';
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
            mostrarAlerta(
                estado === 'aprobado' ? '¡Transferencia aprobada!' : 'Transferencia rechazada',
                data.message,
                estado === 'aprobado' ? 'success' : 'info'
            );
            await cargarTransferenciasPendientes();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}
