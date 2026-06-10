// =====================================================
// CAMPAÑAS — Gestión de campañas e inscripciones
// =====================================================

async function cargarSeccionCampanas() {
    const rol = usuarioActual.rol;

    ['vista-campanas-director','vista-inscripcion-colportor','vista-aprobacion-inscripciones'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (rol === 1) {
        document.getElementById('vista-campanas-director').style.display        = 'block';
        document.getElementById('vista-aprobacion-inscripciones').style.display = 'block';
        await Promise.all([cargarCampanasAdmin(), cargarInscripcionesPendientes(), cargarZonasCampana()]);
    } else if (rol === 2) {
        document.getElementById('vista-inscripcion-colportor').style.display    = 'block';
        document.getElementById('vista-aprobacion-inscripciones').style.display = 'block';
        await Promise.all([cargarInscripcionColportor(), cargarInscripcionesPendientes()]);
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
    const estadoMsg         = document.getElementById('estado-inscripcion-msg');
    if (!bloqueInscribirse || !estadoMsg) return;

    try {
        const res = await fetch(`${API_BASE}/campanas/inscripcion-estado`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        bloqueInscribirse.style.display = 'none';
        estadoMsg.style.display         = 'none';

        if (data.estado === 'sin_campana') {
            estadoMsg.style.cssText = 'display:block;background:#f1f5f9;color:#64748b;padding:12px;border-radius:8px;font-weight:bold;';
            estadoMsg.innerText = 'No hay ninguna campaña activa en este momento.';
        } else if (data.estado === 'no_inscrito') {
            bloqueInscribirse.style.display = 'block';
            await cargarZonasCampanaEnSelect('select_zona_inscripcion');
        } else if (data.estado === 'pendiente') {
            estadoMsg.style.cssText = 'display:block;background:#fffbeb;color:#b45309;padding:12px;border-radius:8px;font-weight:bold;';
            estadoMsg.innerText = '⏳ Tu solicitud está pendiente de aprobación.';
        } else if (data.estado === 'aprobado') {
            estadoMsg.style.cssText = 'display:block;background:#dcfce7;color:#166534;padding:12px;border-radius:8px;font-weight:bold;';
            estadoMsg.innerText = '✅ ¡Estás inscrito y aprobado en la campaña activa!';
        } else if (data.estado === 'rechazado') {
            estadoMsg.style.cssText = 'display:block;background:#fff1f2;color:#e11d48;padding:12px;border-radius:8px;font-weight:bold;';
            estadoMsg.innerText = '❌ Tu inscripción fue rechazada. Puedes volver a solicitar.';
            bloqueInscribirse.style.display = 'block';
            await cargarZonasCampanaEnSelect('select_zona_inscripcion');
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

// =====================================================
// ZONAS DE CAMPAÑA — Gestión (solo Director)
// =====================================================

async function cargarZonasCampanaEnSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Cargando zonas...</option>';
    try {
        const res = await fetch(`${API_BASE}/zonas/campana`, { headers: { Authorization: `Bearer ${token}` } });
        const zonas = await res.json();
        sel.innerHTML = '<option value="">Seleccione Zona...</option>';
        if (zonas.length === 0) {
            sel.innerHTML = '<option value="">Sin zonas definidas aún</option>';
            return;
        }
        zonas.forEach(z => { sel.innerHTML += `<option value="${z.id}">${z.nombre}</option>`; });
    } catch (e) {
        sel.innerHTML = '<option value="">Error al cargar zonas</option>';
    }
}

async function cargarZonasCampana() {
    try {
        const res = await fetch(`${API_BASE}/zonas/campana`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const zonas = await res.json();

        const tbody = document.getElementById('tabla-zonas-campana-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (zonas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#94a3b8;">Sin zonas para esta campaña. Agrega la primera usando el formulario de arriba.</td></tr>';
            return;
        }

        zonas.forEach((z, idx) => {
            tbody.innerHTML += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;color:#94a3b8;">${idx + 1}</td>
                    <td style="padding:10px;font-weight:bold;">${z.nombre}</td>
                    <td style="padding:10px;color:#64748b;">${z.descripcion || '--'}</td>
                    <td style="padding:10px;">
                        <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-size:0.8rem;font-weight:bold;">${z.union_nombre || '--'}</span>
                    </td>
                    <td style="padding:10px;text-align:center;">
                        <button onclick="eliminarZonaCampana(${z.id})" style="background:#e11d48;color:white;border:none;padding:5px 10px;border-radius:5px;cursor:pointer;" title="Eliminar zona">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error("Error cargarZonasCampana:", e); }
}

async function crearZonaCampana() {
    const nombre      = (document.getElementById('nueva_zona_nombre')?.value      || '').trim();
    const descripcion = (document.getElementById('nueva_zona_descripcion')?.value || '').trim();
    const union_id    = document.getElementById('nueva_zona_union')?.value;

    if (!nombre)    return mostrarAlerta('Nombre requerido',  'Escribe el nombre de la zona.', 'warning');
    if (!union_id)  return mostrarAlerta('Unión requerida',   'Selecciona una unión.',          'warning');

    try {
        const res = await fetch(`${API_BASE}/zonas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nombre, descripcion, union_id })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta('¡Zona creada!', data.message, 'success');
            document.getElementById('nueva_zona_nombre').value      = '';
            document.getElementById('nueva_zona_descripcion').value = '';
            document.getElementById('nueva_zona_union').value       = '';
            await cargarZonasCampana();
        } else {
            mostrarAlerta('Error', data.message, 'error');
        }
    } catch (e) { mostrarAlerta('Error de conexión', '', 'error'); }
}

async function eliminarZonaCampana(id) {
    const conf = await Swal.fire({
        title: '¿Eliminar zona?',
        text: 'Se eliminará esta zona de la campaña activa.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, Eliminar'
    });
    if (!conf.isConfirmed) return;

    try {
        const res = await fetch(`${API_BASE}/zonas/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            mostrarAlerta('Zona eliminada', '', 'success');
            await cargarZonasCampana();
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
            nombre:       document.getElementById('nueva_camp_nombre').value.trim(),
            descripcion:  document.getElementById('nueva_camp_descripcion').value.trim(),
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
