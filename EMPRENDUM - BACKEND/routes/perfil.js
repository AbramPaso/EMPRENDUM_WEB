const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../db/connection');
const { verifyToken } = require('../middleware/authMiddleware');

// --- Configuración de Multer para la Foto de Perfil ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        // Nombre: perfil-IDUSUARIO-FECHA.jpg
        const ext = path.extname(file.originalname);
        cb(null, `perfil-${req.user.id}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });

// 1. OBTENER PERFIL COMPLETO (GET)
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // CORRECCIÓN: 'estado_civil' viene de 'usuarios' (u), no de 'datos_personales_extra' (dp)
        const sql = `
            SELECT 
                u.nombre_completo, u.cedula, u.estado_civil,
                pl.foto_perfil_url, pl.lugar_colportar, pl.pensamiento_bio, pl.union_trabajo_id, pl.campo_trabajo_id,
                dp.padre_nombre, dp.padre_telefono, dp.madre_nombre, dp.madre_telefono,
                dp.direccion_origen, dp.conyuge_nombre, dp.padecimiento_medico
            FROM usuarios u
            LEFT JOIN perfil_laboral pl ON u.id = pl.usuario_id
            LEFT JOIN datos_personales_extra dp ON u.id = dp.usuario_id
            WHERE u.id = ?
        `;

        const [rows] = await db.query(sql, [userId]);
        
        // Si no hay datos, enviamos objeto vacío
        const data = rows[0] || {};
        
        // Mapeamos para que el frontend lo entienda (el frontend espera 'estado_civil_extra')
        data.estado_civil_extra = data.estado_civil; 

        res.json(data);

    } catch (error) {
        console.error("Error GET perfil:", error);
        res.status(500).json({ message: 'Error al cargar perfil' });
    }
});

// 2. GUARDAR/ACTUALIZAR PERFIL LABORAL (POST)
router.post('/laboral', verifyToken, upload.single('foto_perfil'), async (req, res) => {
    const userId = req.user.id;
    const { lugar_colportar, union_trabajo, campo_trabajo, pensamiento } = req.body;
    
    let fotoUrl = null;
    if (req.file) {
        fotoUrl = req.file.path; 
    }

    try {
        const [exists] = await db.query('SELECT id FROM perfil_laboral WHERE usuario_id = ?', [userId]);

        if (exists.length > 0) {
            // ACTUALIZAR
            let sql = `
                UPDATE perfil_laboral SET 
                    lugar_colportar = ?, 
                    union_trabajo_id = ?, 
                    campo_trabajo_id = ?, 
                    pensamiento_bio = ?
            `;
            const params = [lugar_colportar, union_trabajo, campo_trabajo, pensamiento];

            if (fotoUrl) {
                sql += `, foto_perfil_url = ?`;
                params.push(fotoUrl);
            }

            sql += ` WHERE usuario_id = ?`;
            params.push(userId);

            await db.query(sql, params);

        } else {
            // INSERTAR
            const sql = `
                INSERT INTO perfil_laboral (usuario_id, lugar_colportar, union_trabajo_id, campo_trabajo_id, pensamiento_bio, foto_perfil_url)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.query(sql, [userId, lugar_colportar, union_trabajo || null, campo_trabajo || null, pensamiento, fotoUrl]);
        }

        res.json({ message: 'Perfil laboral actualizado', foto: fotoUrl });

    } catch (error) {
        console.error("Error POST laboral:", error);
        res.status(500).json({ message: 'Error al guardar perfil laboral' });
    }
});

// 3. GUARDAR/ACTUALIZAR DATOS PERSONALES (POST)
router.post('/personales', verifyToken, async (req, res) => {
    const userId = req.user.id;
    const { 
        padre_nombre, padre_telefono, madre_nombre, madre_telefono,
        direccion_origen, estado_civil, conyuge_nombre, padecimiento 
    } = req.body;

    try {
        // CORRECCIÓN: Primero actualizamos el Estado Civil en la tabla USUARIOS
        if (estado_civil) {
            await db.query('UPDATE usuarios SET estado_civil = ? WHERE id = ?', [estado_civil, userId]);
        }

        // Luego actualizamos el resto en DATOS_PERSONALES_EXTRA (sin la columna estado_civil)
        const [exists] = await db.query('SELECT id FROM datos_personales_extra WHERE usuario_id = ?', [userId]);

        if (exists.length > 0) {
            // UPDATE
            const sql = `
                UPDATE datos_personales_extra SET 
                    padre_nombre = ?, padre_telefono = ?, 
                    madre_nombre = ?, madre_telefono = ?,
                    direccion_origen = ?,
                    conyuge_nombre = ?, padecimiento_medico = ?
                WHERE usuario_id = ?
            `;
            await db.query(sql, [padre_nombre, padre_telefono, madre_nombre, madre_telefono, direccion_origen, conyuge_nombre, padecimiento, userId]);
        } else {
            // INSERT
            const sql = `
                INSERT INTO datos_personales_extra (
                    usuario_id, padre_nombre, padre_telefono, madre_nombre, madre_telefono,
                    direccion_origen, conyuge_nombre, padecimiento_medico
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await db.query(sql, [userId, padre_nombre, padre_telefono, madre_nombre, madre_telefono, direccion_origen, conyuge_nombre, padecimiento]);
        }

        res.json({ message: 'Datos personales actualizados' });

    } catch (error) {
        console.error("Error POST personales:", error);
        res.status(500).json({ message: 'Error guardando datos personales' });
    }
});

module.exports = router;