// =====================================================
// LIBROS — Inventario, stock y asignación por niveles
// =====================================================

let catalogoLibros  = [];
let stockGlobalData = [];
let zonasData       = [];
let colportoresData = [];

async function cargarSeccionLibros() {
    const rol = usuarioActual.rol;

    const vistaDir    = document.getElementById('vista-libros-director');
    const vistaCoach  = document.getElementById('vista-libros-coach');
    const vistaColp   = document.getElementById('vista-mis-libros');
    const vistaTransf = document.getElementById('vista-transferencias');

    if (vistaDir)    vistaDir.style.display    = 'none';
    if (vistaCoach)  vistaCoach.style.display  = 'none';
    if (vistaColp)   vistaColp.style.display   = 'none';
    if (vistaTransf) vistaTransf.style.display = 'none';

    await cargarCatalogoLibros();

    if (rol === 1) {
        if (vistaDir)    vistaDir.style.display    = 'block';
        if (vistaTransf) vistaTransf.style.display = 'block';
        await Promise.all([cargarStockGlobal(), cargarZonasParaLibros(), cargarTransferenciasPendientes(), cargarZonasTransfer()]);
    } else if (rol === 2) {
        if (vistaCoach)  vistaCoach.style.display  = 'block';
        if (vistaTransf) vistaTransf.style.display = 'block';
        await Promise.all([cargarStockCoach(), cargarColportoresCoach(), cargarTransferenciasPendientes()]);
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

        const selTrans = document.getElementById('trans_libro');
        if (selTrans) {
            selTrans.innerHTML = '<option value="">Seleccione Libro...</option>';
            catalogoLibros.forEach(l => {
                selTrans.innerHTML += `<option value="${l.id}">${l.titulo}</option>`;
            });
        }
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
            await cargarStockGlobal();
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
