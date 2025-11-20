const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
    console.log("Datos de registro:", req.body);

    const { 
        cedula, password, nombre, // 'nombre' viene del form
        sexo, estado_civil, fecha_nacimiento,
        religion, telefono, carrera, lugar_procedencia,
        union_id, campo_id, rol_id 
    } = req.body;

    const nombre_completo = nombre; 

    try {
        if (!cedula || !password || !nombre_completo) {
            return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }

        // Encriptar password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const sql = `
            INSERT INTO usuarios (
                cedula, password_hash, nombre_completo, sexo, estado_civil, 
                fecha_nacimiento, religion, telefono, carrera, lugar_procedencia,
                union_procedencia_id, campo_procedencia_id, rol_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.query(sql, [
            cedula, hashPassword, nombre_completo, sexo, estado_civil,
            fecha_nacimiento, religion, telefono, carrera, lugar_procedencia,
            union_id || null, campo_id || null, rol_id || 3
        ]);

        res.status(201).json({ message: 'Usuario registrado exitosamente' });

    } catch (error) {
        console.error("Error SQL:", error);
        res.status(500).json({ error: error.message });
    }
});

// INICIO DE SESIÓN
router.post('/login', async (req, res) => {
    const { cedula, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE cedula = ?', [cedula]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });

        // Crear Token (Incluye ID, Rol y Zona)
        const token = jwt.sign(
            { id: user.id, role: user.rol_id, zona: user.zona_id, nombre: user.nombre_completo }, 
            'TU_SECRETO_SUPER_SECRETO', 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { nombre: user.nombre_completo, rol: user.rol_id } 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;