const express = require('express');
const router = express.Router();
const db = require('../db/connection'); // Asegúrate de que esta ruta apunte a tu archivo db.js o connection.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
    // 1. Imprimir lo que llega para ver si hay errores
    console.log("Datos llegando del formulario:", req.body);

    // 2. Extraemos TODOS los datos, arreglando el problema del nombre
    const { 
        cedula, 
        password, 
        nombre, // En tu HTML se llama "nombre", aquí lo recibimos así
        sexo, 
        estado_civil, 
        fecha_nacimiento, // Faltaba esto
        religion,         // Faltaba esto
        telefono,         // Faltaba esto
        carrera,          // Faltaba esto
        lugar_procedencia,// Faltaba esto
        union_id, 
        campo_id, 
        rol_id 
    } = req.body;

    // Ajuste: Si el HTML manda "nombre", lo asignamos a "nombre_completo"
    const nombre_completo_final = nombre; 

    try {
        // Validar que los datos obligatorios existan
        if (!cedula || !password || !nombre_completo_final) {
            return res.status(400).json({ message: 'Faltan datos obligatorios (Cédula, Contraseña o Nombre)' });
        }

        // 3. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        // 4. Insertar en BD con TODOS los campos
        const [result] = await db.query(
            `INSERT INTO usuarios (
                cedula, 
                password_hash, 
                nombre_completo, 
                sexo, 
                estado_civil, 
                fecha_nacimiento,
                religion,
                telefono,
                carrera,
                lugar_procedencia,
                union_procedencia_id, 
                campo_procedencia_id, 
                rol_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                cedula, 
                hashPassword, 
                nombre_completo_final, 
                sexo, 
                estado_civil, 
                fecha_nacimiento,
                religion,
                telefono,
                carrera,
                lugar_procedencia,
                union_id || null, 
                campo_id || null, 
                rol_id || 3
            ]
        );

        res.status(201).json({ message: 'Usuario registrado exitosamente' });

    } catch (error) {
        console.error("Error en SQL:", error); // Esto te mostrará el error real en la pantalla negra
        res.status(500).json({ error: 'Error al guardar: ' + error.message });
    }
});

// INICIO DE SESIÓN (LOGIN) - Este lo tenías bien, lo dejo igual
router.post('/login', async (req, res) => {
    const { cedula, password } = req.body;

    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE cedula = ?', [cedula]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = users[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ message: 'Contraseña incorrecta' });

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