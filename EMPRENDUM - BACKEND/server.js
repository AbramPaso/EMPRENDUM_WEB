const express = require('express');
const cors = require('cors');
const path = require('path');

// Conexión a BD (solo para asegurar que inicia)
const db = require('./db/connection');

// Importar Rutas
const authRoutes = require('./routes/autenticacion');
const reportRoutes = require('./routes/informes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Servir carpeta de uploads públicamente (con cuidado)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});