const express = require('express');
const cors = require('cors');
const path = require('path');

// Conexión a Base de Datos
// (Al requerirlo, se ejecuta el código de conexión dentro de db/connection.js)
const db = require('./db/connection');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/autenticacion'); // Rutas de Login/Registro
const reportRoutes = require('./routes/informes');    // Rutas de Dashboard y Reportes
const perfilRoutes = require('./routes/perfil');      // <--- NUEVA RUTA DE PERFIL

const app = express();

// --- MIDDLEWARES ---
app.use(cors());           // Permite peticiones desde el frontend
app.use(express.json());   // Permite leer JSON en el body de las peticiones

// --- ARCHIVOS ESTÁTICOS (FOTOS/DOCUMENTOS) ---
// Esto permite que el navegador vea las fotos subidas entrando a:
// http://localhost:3000/uploads/nombre-foto.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- USO DE RUTAS (ENDPOINTS) ---
app.use('/api/auth', authRoutes);      // Maneja: /api/auth/login, /api/auth/register
app.use('/api/reports', reportRoutes); // Maneja: /api/reports/dashboard-stats, etc.
app.use('/api/profile', perfilRoutes); // Maneja: /api/profile/laboral, /api/profile/personales

// --- INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Acceso a archivos públicos en: http://localhost:${PORT}/uploads/`);
});