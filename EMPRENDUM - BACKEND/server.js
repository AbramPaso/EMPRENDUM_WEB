const express = require('express');
const cors = require('cors');
const path = require('path');

// Conexión a BD (solo para asegurar que inicia al arrancar)
const db = require('./db/connection');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/autenticacion');
const reportRoutes = require('./routes/informes');
const perfilRoutes = require('./routes/perfil');
const usuariosRoutes = require('./routes/usuarios');
const campanaRoutes = require('./routes/campana'); // <--- NUEVA IMPORTACIÓN

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// Servir carpeta de uploads públicamente para ver las fotos
// (Acceso: http://localhost:3000/uploads/nombre-archivo.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- USO DE RUTAS (ENDPOINTS) ---
app.use('/api/auth', authRoutes);      // Login y Registro
app.use('/api/reports', reportRoutes); // Dashboard y Reportes
app.use('/api/profile', perfilRoutes); // Perfil
app.use('/api/users', usuariosRoutes); // Compañeros
app.use('/api/campana', campanaRoutes); // <--- NUEVO ENDPOINT DE CAMPAÑA

// --- INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Acceso a archivos públicos en: http://localhost:${PORT}/uploads/`);
});