// =====================================================
// GESTIÓN — Modales de edición de colportores
// =====================================================

// Modal Rápido (ojo) — Coach y Director
async function abrirModalBasico(id) {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { mostrarAlerta("Sin acceso", "No tienes permiso para ver este usuario.", "warning"); return; }
        const u = await res.json();

        document.getElementById('gest_colecciones').innerText = u.total_colecciones || 0;
        document.getElementById('gest_monto').innerText       = '$' + parseFloat(u.total_dinero || 0).toFixed(2);
        document.getElementById('gest_horas').innerText       = u.total_horas || 0;
        document.getElementById('gest_estudios').innerText    = u.total_estudios || 0;
        document.getElementById('gest_id_usuario').value      = u.id;
        document.getElementById('gest_nombre').value          = u.nombre_completo || '';
        document.getElementById('gest_telefono').value        = u.telefono || '';
        document.getElementById('gest_carrera').value         = u.carrera || '';
        document.getElementById('gest_password').value        = '';

        document.getElementById('modalGestion').style.display = 'flex';
    } catch (e) {
        console.error("Error abrirModalBasico:", e);
        mostrarAlerta("Error", "No se pudo cargar la información.", "error");
    }
}

function cerrarModalGestion() {
    document.getElementById('modalGestion').style.display = 'none';
}

// Modal Maestro (engranaje) — Solo Director
let pasoActual = 1;

async function abrirModalCompleto(id) {
    try {
        const res = await fetch(`${API_BASE}/users/gestion/detalle/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { mostrarAlerta("Sin acceso", "No tienes permiso para gestionar este usuario.", "warning"); return; }
        const u = await res.json();

        pasoActual = 1;
        mostrarPaso(1);

        document.getElementById('gt_id_usuario').value  = u.id;
        document.getElementById('gt_nombre').value      = u.nombre_completo || '';
        document.getElementById('gt_cedula').value      = u.cedula || '';
        document.getElementById('gt_telefono').value    = u.telefono || '';
        document.getElementById('gt_carrera').value     = u.carrera || '';
        document.getElementById('gt_religion').value    = u.religion || '';
        document.getElementById('gt_civil').value       = u.estado_civil || 'Soltero';
        document.getElementById('gt_procedencia').value = u.lugar_procedencia || '';
        document.getElementById('gt_fecha_nac').value   = u.fecha_nacimiento ? String(u.fecha_nacimiento).substring(0,10) : '';

        document.getElementById('gt_padre').value      = u.padre_nombre || '';
        document.getElementById('gt_tlf_padre').value  = u.padre_telefono || '';
        document.getElementById('gt_madre').value      = u.madre_nombre || '';
        document.getElementById('gt_tlf_madre').value  = u.madre_telefono || '';
        document.getElementById('gt_direccion').value  = u.direccion_origen || '';
        document.getElementById('gt_salud').value      = u.padecimiento_medico || '';

        document.getElementById('gt_rol').value      = u.rol_id || 3;
        document.getElementById('gt_password').value = '';

        const unionId = u.union_trabajo_id || '';
        document.getElementById('gt_union').value = unionId;
        filtrarCamposGestion();

        if (unionId) {
            document.getElementById('gt_campo').value = u.campo_trabajo_id || '';
            document.getElementById('gt_zona').value  = u.zona_id || '';
        }

        document.getElementById('modalGestionTotal').style.display = 'flex';
    } catch (e) {
        console.error("Error abrirModalCompleto:", e);
        mostrarAlerta("Error", "No se pudo cargar los datos del colportor.", "error");
    }
}

function cambiarPaso(nuevoPaso) {
    pasoActual = nuevoPaso;
    mostrarPaso(pasoActual);
}

function mostrarPaso(paso) {
    ['paso-1','paso-2','paso-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const current = document.getElementById(`paso-${paso}`);
    if (current) current.style.display = 'block';
}

function cerrarModalTotal() {
    document.getElementById('modalGestionTotal').style.display = 'none';
}

function filtrarCamposGestion() {
    const unionId     = document.getElementById('gt_union').value;
    const selectCampo = document.getElementById('gt_campo');
    const selectZona  = document.getElementById('gt_zona');

    selectCampo.innerHTML = '<option value="">Seleccione...</option>';
    selectZona.innerHTML  = '<option value="">Seleccione...</option>';

    if (camposPorUnion[unionId]) {
        selectCampo.disabled = false;
        camposPorUnion[unionId].forEach(c => {
            selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
    } else {
        selectCampo.disabled = true;
    }

    if (unionId) {
        cargarZonasEnSelect('gt_zona', unionId);
    } else {
        selectZona.disabled = true;
    }
}

// Guardar Modal Rápido
const formBasico = document.getElementById('formGestionColportor');
if (formBasico) {
    formBasico.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('gest_id_usuario').value;
        const datos = {
            nombre_completo: document.getElementById('gest_nombre').value,
            telefono:        document.getElementById('gest_telefono').value,
            carrera:         document.getElementById('gest_carrera').value,
            nueva_password:  document.getElementById('gest_password').value
        };

        if (!confirm("¿Guardar cambios básicos?")) return;

        try {
            const res = await fetch(`${API_BASE}/users/gestion/update-basic/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Guardado!", "Datos básicos actualizados.", "success");
                document.getElementById('modalGestion').style.display = 'none';
                await actualizarTablas();
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo actualizar.", "error");
            }
        } catch (error) {
            mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
        }
    });
}

// Guardar Modal Maestro
const formTotal = document.getElementById('formGestionTotal');
if (formTotal) {
    formTotal.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!confirm("¿Estás seguro de guardar TODOS los cambios?")) return;

        const id = document.getElementById('gt_id_usuario').value;
        const datos = {
            nombre_completo:  document.getElementById('gt_nombre').value,
            cedula:           document.getElementById('gt_cedula').value,
            telefono:         document.getElementById('gt_telefono').value,
            carrera:          document.getElementById('gt_carrera').value,
            religion:         document.getElementById('gt_religion').value,
            lugar_procedencia: document.getElementById('gt_procedencia').value,
            estado_civil:     document.getElementById('gt_civil').value,
            fecha_nacimiento: document.getElementById('gt_fecha_nac').value,
            padre_nombre:     document.getElementById('gt_padre').value,
            padre_telefono:   document.getElementById('gt_tlf_padre').value,
            madre_nombre:     document.getElementById('gt_madre').value,
            madre_telefono:   document.getElementById('gt_tlf_madre').value,
            direccion_origen: document.getElementById('gt_direccion').value,
            padecimiento:     document.getElementById('gt_salud').value,
            union_id:         document.getElementById('gt_union').value,
            campo_id:         document.getElementById('gt_campo').value,
            zona_id:          document.getElementById('gt_zona').value,
            nueva_password:   document.getElementById('gt_password').value,
            rol_id:           document.getElementById('gt_rol').value
        };

        try {
            const res = await fetch(`${API_BASE}/users/gestion/update/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Guardado!", "Perfil maestro actualizado correctamente.", "success");
                document.getElementById('modalGestionTotal').style.display = 'none';
                await actualizarTablas();
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "Error al guardar.", "error");
            }
        } catch (e) {
            mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
        }
    });
}
