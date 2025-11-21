const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token.' });
    }

    try {
        const verified = jwt.verify(token, 'TU_SECRETO_SUPER_SECRETO');
        
        // Aquí asignamos TODO el objeto del token a req.user
        // Ahora req.user.role y req.user.zona estarán disponibles
        req.user = verified; 
        
        next();
    } catch (error) {
        res.status(403).json({ message: 'Token no válido.' });
    }
};

module.exports = { verifyToken };