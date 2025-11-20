const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    user: 'root',            // Usuario XAMPP
    password: '',            
    host: 'localhost',
    database: 'bd_emprendum', 
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Prueba de conexión simple
pool.getConnection()
    .then(conn => {
        console.log("¡Conexión a MySQL exitosa!");
        conn.release();
    })
    .catch(err => {
        console.error("Error conectando a MySQL:", err.message);
    });

module.exports = {
    query: (sql, params) => pool.execute(sql, params),
    pool: pool
};