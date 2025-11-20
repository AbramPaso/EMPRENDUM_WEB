const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../db/connection');

const router = express.Router();

// --- Configuración de Multer (Subida de Archivos) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Asegúrate que esta carpeta exista
    },
    filename: (req, file, cb) => {
        // Nombre único: ID-FECHA-ORIGINAL
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${req.user.id}-${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage: storage });


// --- 1. GET: OBTENER ESTADÍSTICAS PARA EL DASHBOARD ---
router.get('/dashboard-stats', verifyToken, async (req, res) => {
    try {
        // Sumar todas las columnas para el usuario actual
        const sql = `
            SELECT 
                SUM(colecciones_vendidas) as total_colecciones, 
                SUM(monto_dolares) as total_monto, 
                SUM(horas_trabajadas) as total_horas, 
                SUM(estudios_biblicos) as total_estudios 
            FROM reportes_semanales 
            WHERE usuario_id = ?
        `;
        
        const [rows] = await db.query(sql, [req.user.id]);
        
        // Devolver objeto vacío si no hay datos
        res.json(rows[0] || {});
    } catch (error) {
        console.error("Error obteniendo stats:", error);
        res.status(500).json({ message: "Error del servidor" });
    }
});


// --- 2. POST: CREAR REPORTE SEMANAL (Formulario pequeño) ---
router.post('/create-weekly', verifyToken, async (req, res) => {
    const { semana_numero, anio, colecciones, monto, horas, estudios } = req.body;

    try {
        const sql = `
            INSERT INTO reportes_semanales 
            (usuario_id, semana_numero, anio, colecciones_vendidas, monto_dolares, horas_trabajadas, estudios_biblicos) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.query(sql, [
            req.user.id, 
            semana_numero, 
            anio, 
            colecciones, 
            monto, 
            horas, 
            estudios
        ]);

        res.status(201).json({ message: "Reporte semanal guardado" });
    } catch (error) {
        console.error("Error guardando reporte semanal:", error);
        res.status(500).json({ message: "Error guardando en BD" });
    }
});


// --- 3. POST: SUBIR INFORME MENSUAL (Archivo PDF/DOC) ---
router.post('/upload-monthly', verifyToken, upload.single('informe'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se envió ningún archivo.');
    }

    const fileUrl = req.file.path; // Ruta donde se guardó
    const { mes, anio } = req.body;

    try {
        const sql = `
            INSERT INTO informes_mensuales (usuario_id, mes, anio, archivo_url) 
            VALUES (?, ?, ?, ?)
        `;
        
        await db.query(sql, [req.user.id, mes, anio, fileUrl]);

        res.status(201).json({ 
            message: 'Archivo subido correctamente', 
            fileUrl: fileUrl 
        });

    } catch (error) {
        console.error("Error guardando informe mensual:", error);
        res.status(500).send('Error al guardar en base de datos.');
    }
});

module.exports = router;