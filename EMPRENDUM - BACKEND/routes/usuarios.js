const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { verifyToken } = require('../middleware/authMiddleware');

// 1. OBTENER LISTA DE COMPAÑEROS (COLPORTORES)
// Solo devuelve datos públicos: Nombre, Carrera, Foto, Lugar, Pensamiento, Teléfono
router.get('/lista', verifyToken, async (req, res) => {
    try {
        // Buscamos usuarios que NO sean el usuario actual (u.id != req.user.id)
        // Hacemos LEFT JOIN con perfil_laboral para traer la foto y el lugar si existen
        const sql = `
            SELECT 
                u.id, 
                u.nombre_completo, 
                u.carrera, 
                u.telefono,
                pl.lugar_colportar, 
                pl.pensamiento_bio, 
                pl.foto_perfil_url
            FROM usuarios u
            LEFT JOIN perfil_laboral pl ON u.id = pl.usuario_id
            WHERE u.id != ? 
        `; 
        
        const [rows] = await db.query(sql, [req.user.id]);
        res.json(rows);

    } catch (error) {
        console.error("Error obteniendo compañeros:", error);
        res.status(500).json({ message: 'Error del servidor al cargar la lista.' });
    }
});

// 2. OBTENER DETALLE PÚBLICO DE UN COMPAÑERO (PARA EL MODAL)
router.get('/detalle/:id', verifyToken, async (req, res) => {
    try {
        const targetId = req.params.id;
        
        const sql = `
            SELECT 
                u.nombre_completo, 
                u.carrera, 
                u.telefono,
                pl.lugar_colportar, 
                pl.pensamiento_bio, 
                pl.foto_perfil_url
            FROM usuarios u
            LEFT JOIN perfil_laboral pl ON u.id = pl.usuario_id
            WHERE u.id = ?
        `;
        
        const [rows] = await db.query(sql, [targetId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Colportor no encontrado' });
        }
        
        res.json(rows[0]);

    } catch (error) {
        console.error("Error obteniendo detalle:", error);
        res.status(500).json({ message: 'Error del servidor al ver detalle.' });
    }
});

module.exports = router;