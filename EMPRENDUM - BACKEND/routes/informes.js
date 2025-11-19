// routes/informes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

// Middleware para verificar el Token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).send('Token requerido');
    
    try {
        const decoded = jwt.verify(token.split(" ")[1], 'TU_SECRETO_SUPER_SECRETO');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send('Token inválido');
    }
};

// ENVIAR REPORTE SEMANAL
router.post('/weekly', verifyToken, async (req, res) => {
    const { semana, anio, colecciones, monto, horas, estudios } = req.body;
    try {
        await db.query(
            `INSERT INTO reportes_semanales (usuario_id, semana_numero, anio, colecciones_vendidas, monto_dolares, horas_trabajadas, estudios_biblicos)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, semana, anio, colecciones, monto, horas, estudios]
        );
        res.status(201).json({ message: 'Reporte guardado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// OBTENER DATOS PARA EL DASHBOARD (CON JERARQUÍA)
router.get('/dashboard-stats', verifyToken, async (req, res) => {
    let query = "";
    let params = [];

    // LOGICA DE JERARQUÍA
    if (req.user.role === 1) { 
        // DIRECTOR: Suma TOTAL de toda la empresa
        query = `SELECT SUM(colecciones_vendidas) as total_col, SUM(monto_dolares) as total_usd FROM reportes_semanales`;
    } 
    else if (req.user.role === 2) { 
        // COACH: Suma solo de su zona
        query = `SELECT SUM(r.colecciones_vendidas) as total_col, SUM(r.monto_dolares) as total_usd 
                 FROM reportes_semanales r
                 JOIN usuarios u ON r.usuario_id = u.id
                 WHERE u.zona_id = ?`;
        params = [req.user.zona];
    } 
    else { 
        // COLPORTOR: Suma solo sus propios datos
        query = `SELECT SUM(colecciones_vendidas) as total_col, SUM(monto_dolares) as total_usd 
                 FROM reportes_semanales 
                 WHERE usuario_id = ?`;
        params = [req.user.id];
    }

    try {
        const [results] = await db.query(query, params);
        res.json(results[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;