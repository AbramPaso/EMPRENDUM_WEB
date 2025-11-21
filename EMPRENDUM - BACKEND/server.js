const express = require('express');
const cors = require('cors');
const path = require('path');

// Conexión a BD (solo para asegurar que inicia al arrancar)
const db = require('./db/connection');

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/autenticacion');  // Login y Registro
const reportRoutes = require('./routes/informes');     // Dashboard y Reportes
const perfilRoutes = require('./routes/perfil');       // Perfil de Usuario
const usuariosRoutes = require('./routes/usuarios');   // Lista de Compañeros

const app = express();

// --- MIDDLEWARES ---
app.use(cors());           // Permite peticiones desde el frontend
app.use(express.json());   // Permite leer JSON en el body

// Servir carpeta de uploads públicamente para ver las fotos
// (Acceso: http://localhost:3000/uploads/nombre-archivo.jpg)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- USO DE RUTAS (ENDPOINTS) ---
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/profile', perfilRoutes);
app.use('/api/users', usuariosRoutes); // Ruta para la sección de Compañeros

// --- INICIO DEL SERVIDOR ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Acceso a archivos públicos en: http://localhost:${PORT}/uploads/`);
});