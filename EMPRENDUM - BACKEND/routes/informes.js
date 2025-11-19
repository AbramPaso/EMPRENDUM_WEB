// routes/informes.js
const express = require('express');
const multer = require('multer');
const { verifyToken } = require('../middleware/authMiddleware'); // ¡AHORA IMPORTADO!
const db = require('../db/connection'); // Asumimos que tienes una conexión DB

const router = express.Router(); // Inicializamos el Router aquí

// --- Configuración de Multer ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // La carpeta 'uploads' debe existir en la raíz del proyecto
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        // Nombre único: idUsuario-fecha-nombreOriginal
        // req.user.id debe estar seteado por verifyToken
        const safeName = file.originalname.replace(/ /g, '_'); // Reemplazar espacios
        cb(null, `${req.user.id}-${Date.now()}-${safeName}`);
    }
});

const upload = multer({ storage: storage });
// ------------------------------

// Ruta para subir informe (Acceso: /api/reports/upload-monthly)
router.post('/upload-monthly', verifyToken, upload.single('informe'), async (req, res) => {
    // NOTA: Si Multer falla, la ejecución se detiene aquí y Multer envía el error.

    if (!req.file) {
        return res.status(400).send('No se proporcionó ningún archivo en el campo "informe".');
    }
    
    // req.file contiene la información del archivo subido
    const fileUrl = req.file.path; 
    
    // El usuario fue adjuntado por verifyToken
    const usuarioId = req.user.id; 
    
    try {
        // db.query DEBE usar el sintaxis correcto para tu librería (PostgreSQL)
        // Usaremos el placeholder $1, $2, etc., común en la librería 'pg'
        await db.query(
            `INSERT INTO informes_mensuales (usuario_id, mes, anio, archivo_url) VALUES ($1, $2, $3, $4)`,
            [usuarioId, req.body.mes, req.body.anio, fileUrl]
        );
        
        res.status(201).json({ 
            message: 'Archivo subido correctamente y registro guardado.', 
            fileUrl: fileUrl 
        });

    } catch (error) {
        console.error("Error al insertar en la base de datos:", error);
        // Devolver un error 500 si falla la inserción
        res.status(500).send('Error al guardar el registro del informe.');
    }
});

module.exports = router;