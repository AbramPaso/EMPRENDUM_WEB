// =====================================================
// CAMPAÑA DE TRABAJO — Zona y campo donde colporta
// =====================================================

function filtrarCampos() {
    const unionId     = document.getElementById("camp_union").value;
    const selectCampo = document.getElementById("camp_campo");
    const selectZona  = document.getElementById("camp_zona");

    selectCampo.innerHTML = '<option value="">Seleccione...</option>';
    selectZona.innerHTML  = '<option value="">Seleccione...</option>';

    if (camposPorUnion[unionId]) {
        selectCampo.disabled = false;
        camposPorUnion[unionId].forEach(c => {
            selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
        cargarZonasEnSelect('camp_zona', unionId);
    } else {
        selectCampo.disabled = true;
        selectZona.disabled  = true;
    }
}

async function cargarCampana() {
    try {
        const res = await fetch(`${API_BASE}/campana`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.union_trabajo_id) {
            document.getElementById("camp_union").value = data.union_trabajo_id;
            filtrarCampos();

            setTimeout(() => {
                if (data.campo_trabajo_id) document.getElementById("camp_campo").value = data.campo_trabajo_id;
                if (data.zona_id)          document.getElementById("camp_zona").value  = data.zona_id;
            }, 600);
        }

        if (data.lugar_colportar) {
            document.getElementById("camp_ciudad").value = data.lugar_colportar;
        }
    } catch (e) {
        console.error("Error cargarCampana:", e);
    }
}

document.getElementById("formCampana").addEventListener("submit", async (e) => {
    e.preventDefault();
    const datos = {
        union_id: document.getElementById("camp_union").value,
        campo_id: document.getElementById("camp_campo").value,
        zona:     document.getElementById("camp_zona").value,
        ciudad:   document.getElementById("camp_ciudad").value
    };

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/campana/asignar`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(datos)
        });

        if (res.ok) {
            mostrarAlerta("¡Guardado!", "Asignación guardada correctamente.", "success");
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo guardar la asignación.", "error");
        }
    } catch (error) {
        console.error(error);
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});
