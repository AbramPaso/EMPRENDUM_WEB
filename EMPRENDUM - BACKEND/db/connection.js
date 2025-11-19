// db/connection.js (Configuración para MariaDB / MySQL con 'mysql2')
// NECESITAS INSTALAR LA LIBRERÍA 'mysql2' (npm install mysql2)
const mysql = require('mysql2/promise');

// Lee las variables de entorno para la conexión y crea un pool
const pool = mysql.createPool({
    user: process.env.DB_USER || 'root', // Usuario por defecto en XAMPP
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bd_emprendum', // Nombre de BD sugerido
    password: process.env.DB_PASSWORD || '', // Contraseña vacía por defecto en XAMPP
    port: process.env.DB_PORT || 3306, // Puerto estándar de MySQL/MariaDB (3306)
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Mensaje de prueba de conexión al iniciar
pool.getConnection()
    .then(connection => {
        console.log('Conexión exitosa a la base de datos MariaDB/MySQL.');
        connection.release();
    })
    .catch(error => {
        console.error('Error al conectar con la base de datos MariaDB/MySQL:', error.message);
        console.error('Asegúrate de que XAMPP (Apache y MySQL) esté funcionando.');
    });


// Exportar la función de consulta. Usamos execute() para sentencias preparadas con '?'
module.exports = {
    query: (sql, params) => pool.execute(sql, params),
    pool: pool
};