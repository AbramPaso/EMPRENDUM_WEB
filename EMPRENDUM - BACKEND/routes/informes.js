const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../db/connection');

const router = express.Router();

// --- Configuración de Multer ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${req.user.id}-${Date.now()}-${safeName}`);
    }
});
const upload = multer({ storage: storage });


// --- 1. GET: ESTADÍSTICAS INTELIGENTES (DASHBOARD) ---
router.get('/dashboard-stats', verifyToken, async (req, res) => {
    try {
        // Extraemos datos del token (autenticacion.js debe incluir estos datos al loguear)
        const { id, role, zona } = req.user; 
        
        let sql = "";
        let params = [];

        console.log(`Solicitud de Stats - Usuario: ${id}, Rol: ${role}, Zona: ${zona}`);

        // --- LÓGICA DE JERARQUÍA ---
        if (role === 1) { 
            // DIRECTOR: Ve la suma de TODOS los reportes de la base de datos
            sql = `
                SELECT 
                    SUM(colecciones_vendidas) as total_colecciones, 
                    SUM(monto_dolares) as total_monto, 
                    SUM(horas_trabajadas) as total_horas, 
                    SUM(estudios_biblicos) as total_estudios 
                FROM reportes_semanales
            `;
            params = []; // Sin filtros

        } else if (role === 2) {
            // COACH: Ve la suma de su ZONA asignada
            // Hacemos JOIN con usuarios para filtrar por la zona del dueño del reporte
            sql = `
                SELECT 
                    SUM(r.colecciones_vendidas) as total_colecciones, 
                    SUM(r.monto_dolares) as total_monto, 
                    SUM(r.horas_trabajadas) as total_horas, 
                    SUM(r.estudios_biblicos) as total_estudios 
                FROM reportes_semanales r
                JOIN usuarios u ON r.usuario_id = u.id
                WHERE u.zona_id = ?
            `;
            params = [zona]; // Filtramos por la zona del Coach

        } else {
            // COLPORTOR (Rol 3 o null): Ve solo SUS datos
            sql = `
                SELECT 
                    SUM(colecciones_vendidas) as total_colecciones, 
                    SUM(monto_dolares) as total_monto, 
                    SUM(horas_trabajadas) as total_horas, 
                    SUM(estudios_biblicos) as total_estudios 
                FROM reportes_semanales 
                WHERE usuario_id = ?
            `;
            params = [id]; // Filtramos por su ID personal
        }
        
        const [rows] = await db.query(sql, params);
        
        // Agregamos el rol a la respuesta para que el Frontend sepa qué mostrar
        const data = rows[0] || {};
        data.user_role = role; 

        res.json(data);

    } catch (error) {
        console.error("Error obteniendo stats:", error);
        res.status(500).json({ message: "Error del servidor" });
    }
});


// --- 2. POST: CREAR REPORTE SEMANAL ---
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


// --- 3. POST: SUBIR INFORME MENSUAL ---
router.post('/upload-monthly', verifyToken, upload.single('informe'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se envió ningún archivo.');
    }

    const fileUrl = req.file.path; 
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