require("dotenv").config();
const { Pool } = require("pg");

// Configura la conexión con PostgreSQL usando variables de entorno
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Necesario para usar Render
    },
});

module.exports = pool;
