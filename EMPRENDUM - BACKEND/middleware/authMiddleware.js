// middleware/authMiddleware.js

/**
 * Middleware de ejemplo para verificar el token y adjuntar req.user.id.
 * * En una aplicación real, este middleware decodificaría un JWT
 * y buscaría el ID del usuario.
 */
function verifyToken(req, res, next) {
    // 1. Obtener el token del header (ej: 'Bearer TOKEN_AQUI')
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).send('Acceso denegado. Token no proporcionado.');
    }

    // Lógica simulada de verificación de token:
    try {
        // En una app real, aquí usarías JWT.verify(token, secreto)
        
        // Simulamos que el token es válido y adjuntamos el ID 1 al usuario
        // Tienes que asegurar que req.user.id esté disponible.
        req.user = { id: 101 }; // ID de usuario de ejemplo
        
        next(); // Continuar a la siguiente función (upload.single)
    } catch (err) {
        return res.status(403).send('Token inválido.');
    }
}

module.exports = { verifyToken };