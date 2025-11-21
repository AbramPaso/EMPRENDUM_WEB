const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO
router.post('/register', async (req, res) => {
    const { 
        cedula, password, nombre, sexo, estado_civil, fecha_nacimiento,
        religion, telefono, carrera, lugar_procedencia,
        union_id, campo_id 
    } = req.body;

    const nombre_completo = nombre; 

    try {
        if (!cedula || !password || !nombre_completo) {
            return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // Por defecto rol_id es 3 (Colportor)
        const sql = `
            INSERT INTO usuarios (
                cedula, password_hash, nombre_completo, sexo, estado_civil, 
                fecha_nacimiento, religion, telefono, carrera, lugar_procedencia,
                union_procedencia_id, campo_procedencia_id, rol_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3)
        `;

        await db.query(sql, [
            cedula, hashPassword, nombre_completo, sexo, estado_civil,
            fecha_nacimiento, religion, telefono, carrera, lugar_procedencia,
            union_id || null, campo_id || null
        ]);

        res.status(201).json({ message: 'Usuario registrado exitosamente' });

    } catch (error) {
        console.error("Error SQL:", error);
        res.status(500).json({ error: error.message });
    }
});

// LOGIN (AQUÍ ESTÁ LA CLAVE)
router.post('/login', async (req, res) => {
    const { cedula, password } = req.body;

    try {
        // IMPORTANTE: Traemos rol_id y zona_id
        const [users] = await db.query('SELECT * FROM usuarios WHERE cedula = ?', [cedula]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });

        // GENERAR TOKEN CON ROL Y ZONA
        const token = jwt.sign(
            { 
                id: user.id, 
                role: user.rol_id, // ESTO ES LO QUE USA INFORMES.JS (1, 2 o 3)
                zona: user.zona_id, 
                nombre: user.nombre_completo 
            }, 
            'TU_SECRETO_SUPER_SECRETO', 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { 
                nombre: user.nombre_completo, 
                rol: user.rol_id // Enviamos el rol al frontend también
            } 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;