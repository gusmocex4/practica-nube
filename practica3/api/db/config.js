// practica3/api/db/config.js (Versión Final)

const { Sequelize } = require('sequelize');

// Variables de entorno inyectadas por Docker Compose
const DB_HOST = process.env.DB_HOST || 'database'; 
const DB_NAME = process.env.DB_NAME || 'config_db'; 
const DB_USER = process.env.DB_USER || 'config_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'secure_password';
const DB_PORT = process.env.DB_PORT || 5432;

// 1. Inicializar la instancia de Sequelize
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false
});

// 2. Función para probar la conexión y sincronización
// **NOTA:** La sincronización de modelos debe ocurrir DESPUÉS de cargar los modelos en server.js.
async function connectDB() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL establecida con éxito.');
        
        // 🚨 PASO CRÍTICO: Sincronizar modelos. Esto necesita que los modelos ya estén definidos.
        await sequelize.sync({ alter: true }); 
        console.log('✅ Tablas de modelos sincronizadas con éxito.');

    } catch (error) {
        console.error('❌ Error crítico al conectar o sincronizar la BD. Verifique Docker y credenciales:', error.message);
        process.exit(1);
    }
}

// 🚨 CORRECCIÓN: Exportamos la instancia de Sequelize y la función de conexión.
module.exports = { sequelize, connectDB };