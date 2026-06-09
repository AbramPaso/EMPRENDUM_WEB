// =====================================================
// PERFIL — Carga, edición y actualización de perfil
// =====================================================

function toggleEditProfile() {
    const modo = document.getElementById("editProfileMode").style.display === "none";
    document.getElementById("viewProfileMode").style.display = modo ? "none" : "block";
    document.getElementById("editProfileMode").style.display = modo ? "block" : "none";
}

function filtrarProcedenciaPerfil() {
    const unionSelect = document.getElementById('reg_union');
    const campoSelect = document.getElementById('reg_campo');
    if (!unionSelect || !campoSelect) return;

    const unionId = unionSelect.value;
    campoSelect.innerHTML = '<option value="">Seleccione...</option>';

    if (datosProcedencia[unionId]) {
        campoSelect.disabled = false;
        datosProcedencia[unionId].forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombre;
            campoSelect.appendChild(opt);
        });
    } else {
        campoSelect.disabled = true;
    }
}

async function cargarPerfil() {
    try {
        const res = await fetch(`${API_BASE}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();

        // Selects de procedencia
        const unionInput = document.getElementById('reg_union');
        const campoInput = document.getElementById('reg_campo');
        if (unionInput && data.union_procedencia_id) {
            unionInput.value = data.union_procedencia_id;
            filtrarProcedenciaPerfil();
            if (data.campo_procedencia_id && campoInput) campoInput.value = data.campo_procedencia_id;
        }

        // Header
        document.getElementById("headerNombre").innerText  = data.nombre_completo || "Usuario";
        document.getElementById("headerCarrera").innerText = data.carrera || "Estudiante";

        // Foto de perfil
        const imgPerfil = document.getElementById('headerFoto');
        if (data.foto_perfil_url) {
            imgPerfil.src = `http://localhost:3000/${data.foto_perfil_url.replace(/\\/g, '/')}`;
        } else {
            imgPerfil.src = '../image/usuario-icon.webp';
        }
        imgPerfil.onerror = function() { this.src = '../image/usuario-icon.webp'; };

        // Vista lectura
        document.getElementById("view_cedula").innerText      = data.cedula || "--";
        document.getElementById("view_telefono").innerText    = data.telefono || "--";
        document.getElementById("view_procedencia").innerText = data.lugar_procedencia || "--";
        document.getElementById("view_religion").innerText    = data.religion || "--";
        document.getElementById("view_civil").innerText       = data.estado_civil || "--";
        document.getElementById("view_pensamiento").innerText = data.pensamiento_bio || "Sin pensamiento definido.";

        // Formulario edición
        document.getElementById("pensamiento_input").value        = data.pensamiento_bio || "";
        document.getElementById("reg_nombre").value               = data.nombre_completo || "";
        document.getElementById("reg_cedula").value               = data.cedula || "";
        document.getElementById("reg_telefono").value             = data.telefono || "";
        document.getElementById("reg_carrera").value              = data.carrera || "";
        document.getElementById("reg_religion").value             = data.religion || "";
        document.getElementById("reg_lugar_procedencia").value    = data.lugar_procedencia || "";
        if (data.estado_civil) document.getElementById("reg_civil").value = data.estado_civil;

        document.getElementById("padre_nombre").value    = data.padre_nombre || "";
        document.getElementById("padre_telefono").value  = data.padre_telefono || "";
        document.getElementById("madre_nombre").value    = data.madre_nombre || "";
        document.getElementById("madre_telefono").value  = data.madre_telefono || "";
        document.getElementById("reg_direccion").value   = data.direccion_origen || "";
        document.getElementById("conyuge_nombre").value  = data.conyuge_nombre || "";

        const conyTel = document.getElementById("conyuge_telefono");
        if (conyTel) conyTel.value = data.conyuge_telefono || "";

        document.getElementById("padecimiento").value = data.padecimiento_medico || "";

    } catch (e) { console.error("Error cargarPerfil:", e); }
}

// Actualizar Bio / Foto
document.getElementById("formBio").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData  = new FormData();
    const fileInput = document.getElementById("foto_perfil_input");
    if (fileInput.files[0]) formData.append("foto_perfil", fileInput.files[0]);
    formData.append("pensamiento", document.getElementById("pensamiento_input").value);

    try {
        const res = await fetch(`${API_BASE}/profile/bio`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        if (res.ok) {
            mostrarAlerta("¡Bio actualizada!", "", "success");
            document.getElementById("view_pensamiento").innerText = document.getElementById("pensamiento_input").value;
            if (fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = ev => { document.getElementById("headerFoto").src = ev.target.result; };
                reader.readAsDataURL(fileInput.files[0]);
            }
            toggleEditProfile();
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo actualizar.", "error");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    }
});

// Actualizar Datos Personales
const formPersonales = document.getElementById("formPersonales");
if (formPersonales) {
    protegerInputsPerfil();

    formPersonales.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre   = document.getElementById("reg_nombre").value.trim();
        const cedula   = document.getElementById("reg_cedula").value.trim();
        const telefono = document.getElementById("reg_telefono").value.trim();

        if (nombre.length < 3)    return mostrarAlerta("Nombre inválido",   "El nombre es muy corto.", "warning");
        if (cedula.length < 7)    return mostrarAlerta("Cédula inválida",   "Debe tener al menos 7 dígitos.", "warning");
        if (telefono.length < 10) return mostrarAlerta("Teléfono inválido", "Debe tener al menos 10 dígitos.", "warning");

        const unionInput = document.getElementById("reg_union");
        const campoInput = document.getElementById("reg_campo");
        const conyTel    = document.getElementById("conyuge_telefono");

        const datos = {
            nombre_completo:   nombre,
            cedula:            cedula,
            telefono:          telefono,
            carrera:           document.getElementById("reg_carrera").value,
            religion:          document.getElementById("reg_religion").value,
            estado_civil:      document.getElementById("reg_civil").value,
            union_procedencia: unionInput ? unionInput.value : null,
            campo_procedencia: campoInput ? campoInput.value : null,
            lugar_procedencia: document.getElementById("reg_lugar_procedencia").value,
            padre_nombre:      document.getElementById("padre_nombre").value,
            padre_telefono:    document.getElementById("padre_telefono").value,
            madre_nombre:      document.getElementById("madre_nombre").value,
            madre_telefono:    document.getElementById("madre_telefono").value,
            direccion_origen:  document.getElementById("reg_direccion").value,
            conyuge_nombre:    document.getElementById("conyuge_nombre").value,
            conyuge_telefono:  conyTel ? conyTel.value : null,
            padecimiento:      document.getElementById("padecimiento").value
        };

        const btnGuardar = formPersonales.querySelector('button[type="submit"]');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/profile/personales`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Perfil actualizado!", "Tus datos se guardaron correctamente.", "success");
                document.getElementById("headerNombre").innerText     = datos.nombre_completo;
                document.getElementById("view_cedula").innerText      = datos.cedula;
                document.getElementById("view_telefono").innerText    = datos.telefono;
                document.getElementById("view_procedencia").innerText = datos.lugar_procedencia;
                document.getElementById("view_religion").innerText    = datos.religion;
                document.getElementById("view_civil").innerText       = datos.estado_civil;
                toggleEditProfile();
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo actualizar el perfil.", "error");
            }
        } catch (error) {
            mostrarAlerta("Error de Conexión", "Intenta nuevamente.", "error");
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    });
}
