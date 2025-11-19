// routes/autenticacion.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
    const { cedula, password, nombre_completo, sexo, estado_civil, union_id, campo_id, rol_id } = req.body;

    try {
        // 1. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // 2. Insertar en BD
        const [result] = await db.query(
            `INSERT INTO usuarios (cedula, password_hash, nombre_completo, sexo, estado_civil, union_procedencia_id, campo_procedencia_id, rol_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [cedula, hashPassword, nombre_completo, sexo, estado_civil, union_id, campo_id, rol_id || 3]
        );

        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// INICIO DE SESIÓN (LOGIN)
router.post('/login', async (req, res) => {
    const { cedula, password } = req.body;

    try {
        // 1. Buscar usuario
        const [users] = await db.query('SELECT * FROM usuarios WHERE cedula = ?', [cedula]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = users[0];

        // 2. Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });

        // 3. Crear Token (JWT) - Esto es el "pase" digital del usuario
        const token = jwt.sign(
            { id: user.id, role: user.rol_id, zona: user.zona_id }, 
            'TU_SECRETO_SUPER_SECRETO', 
            { expiresIn: '24h' }
        );

        res.json({ token, user: { nombre: user.nombre_completo, rol: user.rol_id } });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;