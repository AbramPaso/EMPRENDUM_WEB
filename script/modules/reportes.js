// =====================================================
// REPORTES — Semanal, mensual, historial y descargas
// =====================================================

// --- Reporte Semanal ---
const formReporte = document.getElementById("formReporteSemanal");

if (formReporte) {
    const inputsNumericos = ['sem_numero','sem_colecciones','sem_monto','sem_horas','sem_estudios'];
    inputsNumericos.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keydown', e => {
                if (['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Enter'].includes(e.key)) return;
                if (['e','E','-','+'].includes(e.key)) e.preventDefault();
            });
        }
    });

    formReporte.addEventListener("submit", async (e) => {
        e.preventDefault();

        const semNumero   = parseInt(document.getElementById("sem_numero").value);
        const colecciones = parseInt(document.getElementById("sem_colecciones").value) || 0;
        const monto       = parseFloat(document.getElementById("sem_monto").value) || 0;
        const horas       = parseFloat(document.getElementById("sem_horas").value) || 0;
        const estudios    = parseInt(document.getElementById("sem_estudios").value) || 0;

        if (!semNumero || semNumero <= 0 || semNumero > 52) {
            return mostrarAlerta("Semana inválida", "El número de semana debe estar entre 1 y 52.", "warning");
        }
        if (colecciones < 0 || monto < 0 || horas < 0 || estudios < 0) {
            return mostrarAlerta("Valores inválidos", "No se permiten números negativos.", "warning");
        }

        const datos = {
            semana_numero: semNumero,
            anio: new Date().getFullYear(),
            colecciones, monto, horas, estudios
        };

        const btn = formReporte.querySelector('button[type="submit"]');
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/reports/create-weekly`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                mostrarAlerta("¡Reporte enviado!", "Tus datos se guardaron exitosamente.", "success");
                formReporte.reset();
                await cargarEstadisticas();
                await cargarHistorialReportes();
                mostrarSeccion("inicio");
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo enviar el reporte.", "error");
            }
        } catch (error) {
            console.error(error);
            mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
        } finally {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    });
}

// --- Informe Mensual (PDF) ---
document.getElementById("formInformeMensual").addEventListener("submit", async (e) => {
    e.preventDefault();
    const archivo = document.getElementById("archivo_informe").files[0];
    if (!archivo) return mostrarAlerta("Sin archivo", "Debes seleccionar un archivo.", "warning");

    const formData = new FormData();
    formData.append("mes", document.getElementById("mes_reporte").value);
    formData.append("anio", new Date().getFullYear());
    formData.append("informe", archivo);

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/reports/upload-monthly`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            mostrarAlerta("¡Informe subido!", "El archivo se guardó correctamente.", "success");
            e.target.reset();
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo subir el archivo.", "error");
        }
    } catch (error) {
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});

// --- Historial de Reportes ---
async function cargarHistorialReportes() {
    try {
        const res = await fetch(`${API_BASE}/reports/my-reports`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const reportes = await res.json();

        const tbody = document.getElementById('tabla-historial-reportes');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (reportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No hay reportes registrados aún.</td></tr>';
            return;
        }

        reportes.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge-week">Semana ${r.semana_numero}</span></td>
                <td style="color:var(--text-muted);font-size:0.85rem;">
                    <i class="far fa-calendar-alt" style="margin-right:5px;"></i>${r.fecha_formato}
                </td>
                <td style="text-align:center;font-weight:500;">${r.colecciones_vendidas}</td>
                <td style="text-align:right;"><span class="value-money">$${parseFloat(r.monto_dolares).toFixed(2)}</span></td>
                <td style="text-align:center;"><span class="value-hours">${r.horas_trabajadas} h</span></td>
                <td style="text-align:center;color:var(--text-muted);">${r.estudios_biblicos}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("Error historial:", e); }
}

// --- Descargas ---
function abrirModalDescarga(id, nombre) {
    document.getElementById('descarga_user_id').value    = id;
    document.getElementById('descarga_user_name').value  = nombre;
    document.getElementById('span-nombre-descarga').innerText = nombre.split(' ')[0];
    const fecha = new Date();
    document.getElementById('descarga_mes').value  = fecha.getMonth() + 1;
    document.getElementById('descarga_anio').value = fecha.getFullYear();
    document.getElementById('modalDescarga').style.display = 'flex';
}

async function descargarIndividual() {
    const userId = document.getElementById('descarga_user_id').value;
    const mes    = document.getElementById('descarga_mes').value;
    const anio   = document.getElementById('descarga_anio').value;

    try {
        const res = await fetch(`${API_BASE}/reports/get-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ userId, mes, anio })
        });

        const data = await res.json();
        if (data.found) {
            window.open(`http://localhost:3000/${data.url}`, '_blank');
        } else {
            mostrarAlerta("Sin informe", data.message, "warning");
        }
    } catch (e) {
        mostrarAlerta("Error", "No se pudo buscar el archivo.", "error");
    }
}

async function descargarMasivo() {
    const mes  = document.getElementById('descarga_mes').value;
    const anio = document.getElementById('descarga_anio').value;

    if (!confirm(`¿Generar archivo ZIP con los informes del ${mes}/${anio}?`)) return;

    const btn = document.querySelector('#modalDescarga button[onclick="descargarMasivo()"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comprimiendo...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/reports/download-zip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ mes, anio })
        });

        if (res.ok) {
            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `Informes_Mes_${mes}_${anio}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            mostrarAlerta("¡Descargado!", "Archivo ZIP listo.", "success");
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo descargar.", "error");
        }
    } catch (e) {
        mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}
