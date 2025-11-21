const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { verifyToken } = require('../middleware/authMiddleware');

// GET: Obtener la asignación actual del usuario (si ya la guardó antes)
router.get('/', verifyToken, async (req, res) => {
    try {
        const sql = `
            SELECT union_trabajo_id, campo_trabajo_id, lugar_colportar 
            FROM perfil_laboral 
            WHERE usuario_id = ?
        `;
        const [rows] = await db.query(sql, [req.user.id]);
        
        // Si no tiene nada guardado, devolvemos un objeto vacío {}
        res.json(rows[0] || {});
    } catch (error) {
        console.error("Error al cargar campaña:", error);
        res.status(500).json({ message: 'Error al cargar datos de campaña' });
    }
});

// POST: Guardar o Actualizar la Asignación de Invierno
router.post('/asignar', verifyToken, async (req, res) => {
    const { union_id, campo_id, zona, ciudad } = req.body;
    const userId = req.user.id;

    try {
        // Combinamos Ciudad y Zona en un solo campo para guardarlo en 'lugar_colportar'
        // Ejemplo: "Barquisimeto - Zona 1 (Occidente)"
        const lugarCompleto = `${ciudad} - ${zona}`;

        // Verificamos si ya existe un registro laboral para este usuario
        const [exists] = await db.query('SELECT id FROM perfil_laboral WHERE usuario_id = ?', [userId]);

        if (exists.length > 0) {
            // SI EXISTE: Actualizamos (UPDATE)
            await db.query(
                `UPDATE perfil_laboral SET 
                    union_trabajo_id = ?, 
                    campo_trabajo_id = ?, 
                    lugar_colportar = ? 
                WHERE usuario_id = ?`,
                [union_id, campo_id, lugarCompleto, userId]
            );
        } else {
            // NO EXISTE: Creamos nuevo (INSERT)
            await db.query(
                `INSERT INTO perfil_laboral (usuario_id, union_trabajo_id, campo_trabajo_id, lugar_colportar) 
                 VALUES (?, ?, ?, ?)`,
                [userId, union_id, campo_id, lugarCompleto]
            );
        }

        res.json({ message: 'Asignación guardada correctamente' });

    } catch (error) {
        console.error("Error al guardar asignación:", error);
        res.status(500).json({ message: 'Error al guardar en la base de datos' });
    }
});

module.exports = router;