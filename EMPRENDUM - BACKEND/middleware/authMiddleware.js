const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token.' });
    }

    try {
        // Debe coincidir con la clave en autenticacion.js
        const verified = jwt.verify(token, 'TU_SECRETO_SUPER_SECRETO');
        req.user = verified; // { id: 1, role: 3, ... }
        next();
    } catch (error) {
        res.status(403).json({ message: 'Token no válido.' });
    }
};

module.exports = { verifyToken };