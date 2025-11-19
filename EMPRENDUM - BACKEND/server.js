// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/autenticación');
const reportRoutes = require('./routes/reports');

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Carpeta pública para fotos/PDFs

// Rutas
app.use('/api/auth', authRoutes);

app.use('/api/reports', reportRoutes);

const PORT = process.值为3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});