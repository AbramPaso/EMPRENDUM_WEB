const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/connection');
const { verifyToken } = require('../middleware/authMiddleware');

// --- Configuración de subida de fotos ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `perfil-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage: storage });

// 1. GET: Obtener Perfil Completo (Registro + Bio + Datos Extra)
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const sql = `
            SELECT 
                u.nombre_completo, u.cedula, u.estado_civil, u.telefono, u.carrera, u.fecha_nacimiento,
                u.union_procedencia_id, u.campo_procedencia_id, u.lugar_procedencia, u.religion,
                pl.foto_perfil_url, pl.pensamiento_bio,
                dp.padre_nombre, dp.padre_telefono, dp.madre_nombre, dp.madre_telefono,
                dp.direccion_origen, dp.conyuge_nombre, dp.padecimiento_medico
            FROM usuarios u
            LEFT JOIN perfil_laboral pl ON u.id = pl.usuario_id
            LEFT JOIN datos_personales_extra dp ON u.id = dp.usuario_id
            WHERE u.id = ?
        `;
        const [rows] = await db.query(sql, [userId]);
        res.json(rows[0] || {});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error cargando perfil' });
    }
});

// 2. POST: Actualizar solo Foto y Pensamiento (Bio)
router.post('/bio', verifyToken, upload.single('foto_perfil'), async (req, res) => {
    const { pensamiento } = req.body;
    const userId = req.user.id;
    let fotoUrl = req.file ? req.file.path : null;

    try {
        const [exists] = await db.query('SELECT id FROM perfil_laboral WHERE usuario_id = ?', [userId]);
        
        if (exists.length > 0) {
            // UPDATE si existe
            let sql = `UPDATE perfil_laboral SET pensamiento_bio = ?`;
            const params = [pensamiento];
            
            if (fotoUrl) { 
                sql += `, foto_perfil_url = ?`; 
                params.push(fotoUrl); 
            }
            
            sql += ` WHERE usuario_id = ?`; 
            params.push(userId);
            
            await db.query(sql, params);
        } else {
            // INSERT si es nuevo
            await db.query(
                `INSERT INTO perfil_laboral (usuario_id, pensamiento_bio, foto_perfil_url) VALUES (?, ?, ?)`, 
                [userId, pensamiento, fotoUrl]
            );
        }
        res.json({ message: 'Biografía actualizada correctamente' });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: 'Error guardando biografía' }); 
    }
});

// 3. POST: Actualizar Datos Personales Completos (Incluye Registro)
router.post('/personales', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { 
        // Datos de la tabla USUARIOS (Registro Inicial)
        nombre_completo, cedula, telefono, carrera, religion,
        union_procedencia, campo_procedencia, lugar_procedencia, estado_civil,
        // Datos de la tabla EXTRA (Familiares/Salud)
        padre_nombre, padre_telefono, madre_nombre, madre_telefono, 
        direccion_origen, conyuge_nombre, padecimiento 
    } = req.body;

    try {
        // A. Actualizar Tabla USUARIOS
        await db.query(`
            UPDATE usuarios SET 
                nombre_completo=?, cedula=?, telefono=?, carrera=?, religion=?,
                union_procedencia_id=?, campo_procedencia_id=?, lugar_procedencia=?, estado_civil=?
            WHERE id=?
        `, [nombre_completo, cedula, telefono, carrera, religion, union_procedencia, campo_procedencia, lugar_procedencia, estado_civil, userId]);

        // B. Actualizar Tabla DATOS_PERSONALES_EXTRA
        const [exists] = await db.query('SELECT id FROM datos_personales_extra WHERE usuario_id = ?', [userId]);
        
        if (exists.length > 0) {
            await db.query(`
                UPDATE datos_personales_extra SET 
                    padre_nombre=?, padre_telefono=?, madre_nombre=?, madre_telefono=?, 
                    direccion_origen=?, conyuge_nombre=?, padecimiento_medico=?
                WHERE usuario_id=?
            `, [padre_nombre, padre_telefono, madre_nombre, madre_telefono, direccion_origen, conyuge_nombre, padecimiento, userId]);
        } else {
            await db.query(`
                INSERT INTO datos_personales_extra 
                (usuario_id, padre_nombre, padre_telefono, madre_nombre, madre_telefono, direccion_origen, conyuge_nombre, padecimiento_medico)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, padre_nombre, padre_telefono, madre_nombre, madre_telefono, direccion_origen, conyuge_nombre, padecimiento]);
        }

        res.json({ message: 'Datos actualizados correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error guardando datos' });
    }
});

module.exports = router;