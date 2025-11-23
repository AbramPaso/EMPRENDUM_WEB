        const API_BASE = 'http://localhost:3000/api';
        const token = localStorage.getItem('token');

        document.addEventListener('DOMContentLoaded', () => {
            if (!token) { window.location.href = 'login.html'; return; }
            cargarEstadisticas(); 
            cargarPerfil();       
        });

        function mostrarSeccion(idSeccion) {
            document.querySelectorAll('.section-view').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.nav-links a').forEach(link => link.classList.remove('active'));
            document.getElementById(idSeccion).classList.add('active');
            document.getElementById('nav-' + idSeccion).classList.add('active');
            
            if(idSeccion === 'companeros') cargarCompaneros();
            if(idSeccion === 'perfil') cargarPerfil(); 
            if(idSeccion === 'colportaje') cargarCampana(); 
        }

        // 1. CARGAR STATS
        async function cargarEstadisticas() {
            try {
                const res = await fetch(`${API_BASE}/reports/dashboard-stats`, { headers: { 'Authorization': `Bearer ${token}` } });
                if(res.ok) {
                    const data = await res.json();
                    document.getElementById('stat-colecciones').innerText = data.total_colecciones || 0;
                    document.getElementById('stat-monto').innerText = '$' + (parseFloat(data.total_monto) || 0).toFixed(2);
                    document.getElementById('stat-horas').innerText = data.total_horas || 0;
                    document.getElementById('stat-estudios').innerText = data.total_estudios || 0;
                }
            } catch(e) {}
        }

        // 2. ENVIAR REPORTE SEMANAL (DINÁMICO)
        document.getElementById('formReporteSemanal').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentYear = new Date().getFullYear();
            const inputColecciones = document.getElementById('sem_colecciones').value;
            const inputMonto = document.getElementById('sem_monto').value;
            const inputHoras = document.getElementById('sem_horas').value;
            const inputEstudios = document.getElementById('sem_estudios').value;

            const datos = {
                semana_numero: document.getElementById('sem_numero').value,
                anio: currentYear,
                colecciones: inputColecciones,
                monto: inputMonto,
                horas: inputHoras,
                estudios: inputEstudios
            };

            try {
                const res = await fetch(`${API_BASE}/reports/create-weekly`, {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}, 
                    body: JSON.stringify(datos)
                });

                if(res.ok) { 
                    alert("Reporte Enviado Exitosamente"); 
                    e.target.reset(); 
                    await cargarEstadisticas(); 
                    mostrarSeccion('inicio');
                } else {
                    alert("Error al enviar el reporte.");
                }
            } catch (error) {
                console.error(error);
                alert("Error de conexión.");
            }
        });

        // 3. CAMPAÑA INVIERNO
        const datosCampana = {
            1: { campos: [{id: 1, nombre: 'MVY'}, {id: 2, nombre: 'AVCN'}], zonas: ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4'] },
            2: { campos: [{id: 3, nombre: 'AVNOR'}, {id: 4, nombre: 'AVSO'}], zonas: ['Zona 1', 'Zona 2'] }
        };

        function filtrarCampos() {
            const unionId = document.getElementById('camp_union').value;
            const selectCampo = document.getElementById('camp_campo');
            const selectZona = document.getElementById('camp_zona');
            
            selectCampo.innerHTML = '<option value="">Seleccione...</option>';
            selectZona.innerHTML = '<option value="">Seleccione...</option>';
            
            if (datosCampana[unionId]) {
                selectCampo.disabled = false;
                selectZona.disabled = false;
                datosCampana[unionId].campos.forEach(c => selectCampo.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
                datosCampana[unionId].zonas.forEach(z => selectZona.innerHTML += `<option value="${z}">${z}</option>`);
            } else {
                selectCampo.disabled = true;
                selectZona.disabled = true;
            }
        }

        async function cargarCampana() {
            try {
                const res = await fetch(`${API_BASE}/campana`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.union_trabajo_id) {
                    document.getElementById('camp_union').value = data.union_trabajo_id;
                    filtrarCampos();
                    document.getElementById('camp_campo').value = data.campo_trabajo_id;
                    
                    if (data.lugar_colportar) {
                        const partes = data.lugar_colportar.split(' - ');
                        document.getElementById('camp_ciudad').value = partes[0] || '';
                        if (partes[1]) document.getElementById('camp_zona').value = partes[1];
                    }
                }
            } catch(e) {}
        }

        document.getElementById('formCampana').addEventListener('submit', async (e) => {
            e.preventDefault();
            const datos = {
                union_id: document.getElementById('camp_union').value,
                campo_id: document.getElementById('camp_campo').value,
                zona: document.getElementById('camp_zona').value,
                ciudad: document.getElementById('camp_ciudad').value
            };
            const res = await fetch(`${API_BASE}/campana/asignar`, {
                method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify(datos)
            });
            if (res.ok) alert("Asignación guardada correctamente");
        });

        // 4. PERFIL
        function toggleEditProfile() {
            const mode = document.getElementById('editProfileMode').style.display === 'none';
            document.getElementById('viewProfileMode').style.display = mode ? 'none' : 'block';
            document.getElementById('editProfileMode').style.display = mode ? 'block' : 'none';
        }

        async function cargarPerfil() {
            try {
                const res = await fetch(`${API_BASE}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                
                document.getElementById('headerNombre').innerText = data.nombre_completo || 'Usuario';
                document.getElementById('nombreUsuarioDash').innerText = (data.nombre_completo || 'Usuario').split(' ')[0];
                document.getElementById('headerCarrera').innerText = data.carrera || 'Estudiante';
                if(data.foto_perfil_url) document.getElementById('headerFoto').src = `http://localhost:3000/${data.foto_perfil_url.replace(/\\/g, '/')}`;

                document.getElementById('view_cedula').innerText = data.cedula || '';
                document.getElementById('view_telefono').innerText = data.telefono || '';
                document.getElementById('view_procedencia').innerText = data.lugar_procedencia || '';
                document.getElementById('view_religion').innerText = data.religion || '';
                document.getElementById('view_civil').innerText = data.estado_civil || 'Soltero';
                document.getElementById('view_pensamiento').innerText = data.pensamiento_bio || 'Sin pensamiento definido.';

                document.getElementById('pensamiento_input').value = data.pensamiento_bio || '';
                document.getElementById('reg_nombre').value = data.nombre_completo || '';
                document.getElementById('reg_cedula').value = data.cedula || '';
                document.getElementById('reg_telefono').value = data.telefono || '';
                document.getElementById('reg_carrera').value = data.carrera || '';
                document.getElementById('reg_religion').value = data.religion || '';
                document.getElementById('reg_lugar_procedencia').value = data.lugar_procedencia || '';
                if(data.estado_civil) document.getElementById('reg_civil').value = data.estado_civil;
                
                document.getElementById('padre_nombre').value = data.padre_nombre || '';
                document.getElementById('padre_telefono').value = data.padre_telefono || '';
                document.getElementById('madre_nombre').value = data.madre_nombre || '';
                document.getElementById('madre_telefono').value = data.madre_telefono || '';
                document.getElementById('reg_direccion').value = data.direccion_origen || '';
                document.getElementById('conyuge_nombre').value = data.conyuge_nombre || '';
                document.getElementById('padecimiento').value = data.padecimiento_medico || '';

            } catch(e) {}
        }

        document.getElementById('formBio').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            const fileInput = document.getElementById('foto_perfil_input');
            if (fileInput.files[0]) formData.append('foto_perfil', fileInput.files[0]);
            const nuevoPensamiento = document.getElementById('pensamiento_input').value;
            formData.append('pensamiento', nuevoPensamiento);

            const res = await fetch(`${API_BASE}/profile/bio`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (res.ok) { 
                alert("Biografía actualizada");
                document.getElementById('view_pensamiento').innerText = nuevoPensamiento;
                if(fileInput.files[0]){
                    const reader = new FileReader();
                    reader.onload = function(e) { document.getElementById('headerFoto').src = e.target.result; }
                    reader.readAsDataURL(fileInput.files[0]);
                }
                toggleEditProfile(); 
            }
        });

        document.getElementById('formPersonales').addEventListener('submit', async (e) => {
            e.preventDefault();
            const datos = {
                nombre_completo: document.getElementById('reg_nombre').value,
                cedula: document.getElementById('reg_cedula').value,
                telefono: document.getElementById('reg_telefono').value,
                carrera: document.getElementById('reg_carrera').value,
                religion: document.getElementById('reg_religion').value,
                estado_civil: document.getElementById('reg_civil').value,
                union_procedencia: document.getElementById('reg_union').value,
                campo_procedencia: document.getElementById('reg_campo').value,
                lugar_procedencia: document.getElementById('reg_lugar_procedencia').value,
                padre_nombre: document.getElementById('padre_nombre').value,
                padre_telefono: document.getElementById('padre_telefono').value,
                madre_nombre: document.getElementById('madre_nombre').value,
                madre_telefono: document.getElementById('madre_telefono').value,
                direccion_origen: document.getElementById('reg_direccion').value,
                conyuge_nombre: document.getElementById('conyuge_nombre').value,
                padecimiento: document.getElementById('padecimiento').value
            };

            const res = await fetch(`${API_BASE}/profile/personales`, { 
                method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify(datos)
            });

            if(res.ok) {
                alert("Datos actualizados correctamente");
                document.getElementById('headerNombre').innerText = datos.nombre_completo;
                document.getElementById('headerCarrera').innerText = datos.carrera;
                document.getElementById('view_cedula').innerText = datos.cedula;
                document.getElementById('view_telefono').innerText = datos.telefono;
                document.getElementById('view_procedencia').innerText = datos.lugar_procedencia;
                document.getElementById('view_religion').innerText = datos.religion;
                document.getElementById('view_civil').innerText = datos.estado_civil;
                toggleEditProfile();
            }
        });

        // 5. COMPAÑEROS
        async function cargarCompaneros() {
            const container = document.getElementById('listaCompaneros');
            container.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Cargando...</p></div>';
            try {
                const res = await fetch(`${API_BASE}/users/lista`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error("Error al cargar lista.");
                const users = await res.json();
                if (users.length === 0) { container.innerHTML = '<p>No hay compañeros registrados aún.</p>'; return; }
                container.innerHTML = '';
                users.forEach(u => {
                    let foto = u.foto_perfil_url ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, '/')}` : 'https://via.placeholder.com/150';
                    container.innerHTML += `<div class="colleague-card" onclick="verDetalle(${u.id})"><img src="${foto}" class="colleague-pic" onerror="this.src='https://via.placeholder.com/150'"><h4 class="colleague-name">${u.nombre_completo}</h4><span class="colleague-role">${u.carrera || 'Estudiante'}</span></div>`;
                });
            } catch(e) { container.innerHTML = '<p>Error cargando lista. Asegúrate de que el servidor esté corriendo.</p>'; }
        }

        async function verDetalle(id) {
            const res = await fetch(`${API_BASE}/users/detalle/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const u = await res.json();
            document.getElementById('modalNombre').innerText = u.nombre_completo;
            document.getElementById('modalCarrera').innerText = u.carrera || 'Estudiante';
            document.getElementById('modalLugar').innerText = u.lugar_colportar || 'No especificado';
            document.getElementById('modalTelefono').innerText = u.telefono || 'Privado';
            document.getElementById('modalPensamiento').innerText = u.pensamiento_bio || 'Sin pensamiento.';
            let foto = u.foto_perfil_url ? `http://localhost:3000/${u.foto_perfil_url.replace(/\\/g, '/')}` : 'https://via.placeholder.com/150';
            document.getElementById('modalFoto').src = foto;
            document.getElementById('modalCompanero').style.display = 'flex';
        }

        function cerrarModal() { document.getElementById('modalCompanero').style.display = 'none'; }
        function cerrarSesion() { localStorage.removeItem('token'); window.location.href = 'login.html'; }
        document.getElementById('formInformeMensual').addEventListener('submit', async (e) => { 
            e.preventDefault(); 
            const currentYear = new Date().getFullYear();
            const formData = new FormData();
            formData.append('mes', document.getElementById('mes_reporte').value);
            formData.append('anio', currentYear);
            formData.append('informe', document.getElementById('archivo_informe').files[0]);
            const res = await fetch(`${API_BASE}/reports/upload-monthly`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (res.ok) { alert("Informe Subido Correctamente"); e.target.reset(); }
        });
 