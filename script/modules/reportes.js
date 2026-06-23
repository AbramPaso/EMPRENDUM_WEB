// =====================================================
// REPORTES — Semanal, mensual, historial y descargas
// =====================================================

// --- Carga condicional de la sección ---
async function cargarSeccionReportes() {
    const rol         = usuarioActual.rol;
    const bloqueOk    = document.getElementById('bloque-puede-reportar');
    const bloqueNo    = document.getElementById('bloque-no-puede-reportar');
    const msgNo       = document.getElementById('msg-no-puede-reportar');
    const bloqueManual = document.getElementById('bloque-colecciones-manual');
    const bloqueLibros = document.getElementById('bloque-libros-reporte');

    if (rol === 1) {
        // Director: siempre puede reportar, ingresa colecciones manualmente
        if (bloqueNo)      bloqueNo.style.display      = 'none';
        if (bloqueOk)      bloqueOk.style.display      = 'block';
        if (bloqueManual)  bloqueManual.style.display   = 'block';
        if (bloqueLibros)  bloqueLibros.style.display   = 'none';
        await cargarHistorialReportes({ puedeReportar: true });
    } else {
        // Coach y Colportor: verificar inscripción y libros
        try {
            const res  = await fetch(`${API_BASE}/reports/can-report`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.puede_reportar) {
                if (bloqueNo)     bloqueNo.style.display     = 'none';
                if (bloqueOk)     bloqueOk.style.display     = 'block';
                if (bloqueManual) bloqueManual.style.display  = 'none';
                if (bloqueLibros) bloqueLibros.style.display  = 'block';
                poblarLibrosEnForm(data.libros);
            } else {
                if (bloqueOk) bloqueOk.style.display = 'none';
                if (bloqueNo) bloqueNo.style.display = 'block';
                if (msgNo) msgNo.innerHTML =
                    `<i class="fas fa-lock" style="font-size:2.5rem;color:#cbd5e1;display:block;margin-bottom:12px;"></i>${data.razon || 'No puedes reportar en este momento.'}`;
            }
            await cargarHistorialReportes({ puedeReportar: data.puede_reportar, razon: data.razon });
        } catch (e) {
            console.error('Error cargarSeccionReportes:', e);
            await cargarHistorialReportes({});
        }
    }
}

function poblarLibrosEnForm(libros) {
    const container = document.getElementById('lista-libros-reporte');
    if (!container) return;
    container.innerHTML = '';

    if (!libros || libros.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;padding:10px;">Sin libros asignados.</p>';
        return;
    }

    libros.forEach(l => {
        container.innerHTML += `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px dashed #e2e8f0;">
                <div style="flex:1;">
                    <span style="font-weight:600;">${l.titulo}</span>
                    <span style="font-size:0.8rem;color:#64748b;margin-left:8px;">$${parseFloat(l.precio).toFixed(2)}</span>
                </div>
                <span style="color:#64748b;font-size:0.85rem;white-space:nowrap;">Disponibles: <strong style="color:#0f172a;">${l.cantidad}</strong></span>
                <input type="number" min="0" max="${l.cantidad}" value="0"
                       id="libro_${l.libro_id}"
                       data-libro-id="${l.libro_id}"
                       data-asignacion="${l.asignacion_id}"
                       data-max="${l.cantidad}"
                       style="width:80px;text-align:center;padding:6px;border:1px solid #e2e8f0;border-radius:6px;">
            </div>
        `;
    });
}

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

        const semNumero = parseInt(document.getElementById("sem_numero").value);
        const monto     = parseFloat(document.getElementById("sem_monto").value)   || 0;
        const horas     = parseFloat(document.getElementById("sem_horas").value)   || 0;
        const estudios  = parseInt(document.getElementById("sem_estudios").value)  || 0;

        if (!semNumero || semNumero <= 0 || semNumero > 52) {
            return mostrarAlerta("Semana inválida", "El número de semana debe estar entre 1 y 52.", "warning");
        }

        let colecciones    = 0;
        let libros_vendidos = [];

        if (usuarioActual.rol === 1) {
            // Director: colecciones manuales
            colecciones = parseInt(document.getElementById("sem_colecciones")?.value) || 0;
        } else {
            // Coach / Colportor: leer cantidades de cada libro
            document.querySelectorAll('#lista-libros-reporte input[type="number"]').forEach(input => {
                const cant = parseInt(input.value) || 0;
                if (cant <= 0) return;
                const max = parseInt(input.dataset.max);
                if (cant > max) {
                    mostrarAlerta("Cantidad excedida", `No puedes vender más de ${max} unidades de ese libro.`, "warning");
                    throw new Error("validación");
                }
                libros_vendidos.push({
                    libro_id:       parseInt(input.dataset.libroId),
                    asignacion_id:  parseInt(input.dataset.asignacion),
                    cantidad_vendida: cant
                });
                colecciones += cant;
            });

            if (libros_vendidos.length === 0) {
                return mostrarAlerta("Sin libros", "Debes indicar al menos un libro vendido.", "warning");
            }
        }

        const datos = {
            semana_numero: semNumero,
            anio: new Date().getFullYear(),
            colecciones, monto, horas, estudios,
            libros_vendidos
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
                // Recargar la sección para actualizar stocks disponibles
                await cargarSeccionReportes();
                await cargarEstadisticas();
                mostrarSeccion("inicio");
            } else {
                const err = await res.json();
                mostrarAlerta("Error", err.message || "No se pudo enviar el reporte.", "error");
            }
        } catch (error) {
            if (error.message !== "validación") {
                console.error(error);
                mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error");
            }
        } finally {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    });
}

// --- Historial de Reportes ---
async function cargarHistorialReportes(ctx = {}) {
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
            let msg = 'No hay reportes registrados aún.';
            if (ctx.puedeReportar === false && ctx.razon) {
                msg = ctx.razon;
            }
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">${msg}</td></tr>`;
            return;
        }

        reportes.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="badge-week">Semana ${r.semana_numero}</span></td>
                <td style="color:var(--text-muted);font-size:0.85rem;"><i class="far fa-calendar-alt" style="margin-right:5px;"></i>${r.fecha_formato}</td>
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
    document.getElementById('descarga_user_id').value   = id;
    document.getElementById('descarga_user_name').value = nombre;
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
        if (data.found) window.open(`http://localhost:3000/${data.url}`, '_blank');
        else mostrarAlerta("Sin informe", data.message, "warning");
    } catch (e) { mostrarAlerta("Error", "No se pudo buscar el archivo.", "error"); }
}

async function descargarMasivo() {
    const mes  = document.getElementById('descarga_mes').value;
    const anio = document.getElementById('descarga_anio').value;
    if (!confirm(`¿Generar ZIP con los informes del ${mes}/${anio}?`)) return;

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
            a.href = url; a.download = `Informes_Mes_${mes}_${anio}.zip`;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            mostrarAlerta("¡Descargado!", "Archivo ZIP listo.", "success");
        } else {
            const err = await res.json();
            mostrarAlerta("Error", err.message || "No se pudo descargar.", "error");
        }
    } catch (e) { mostrarAlerta("Error de conexión", "Intenta nuevamente.", "error"); }
    finally { btn.innerHTML = textoOriginal; btn.disabled = false; }
}
