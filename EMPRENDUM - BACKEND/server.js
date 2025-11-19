// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
// Importar la configuración de la base de datos (para que se inicialice)
const db = require('./db/connection'); 

// Importación de rutas modulares (los archivos que contienen las rutas)
const authRoutes = require('./routes/autenticación'); 
const reportRoutes = require('./routes/informes');

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); 

// Middleware para servir archivos estáticos (archivos subidos)
// Los archivos serán accesibles en http://localhost:3000/uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); 

// Uso de las rutas modulares
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes); // Las rutas de informes están aquí

// Inicio del Servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});