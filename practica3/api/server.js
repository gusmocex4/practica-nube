// api/server.js

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize'); // Usado para consultas de BD

// 💡 1. IMPORTAR LA INSTANCIA DE SEQUELIZE Y LA FUNCIÓN DE CONEXIÓN
const { sequelize, connectDB } = require('./db/config'); 

// 💡 2. IMPORTAR DEFINICIONES DE MODELOS (como funciones)
// Las funciones aceptan la instancia 'sequelize'
const defineEnvironment = require('./models/Environment'); 
const defineVariable = require('./models/Variable');

// 💡 3. INYECTAR INSTANCIA DE SEQUELIZE EN LOS MODELOS
const Environment = defineEnvironment(sequelize);
const Variable = defineVariable(sequelize);

// 💡 4. DEFINIR RELACIONES ENTRE LOS MODELOS
// Asumiendo que un Entorno tiene muchas Variables.
Environment.hasMany(Variable, { 
    foreignKey: 'environment_id', // Nombre de la columna en la tabla Variables
    as: 'variables',
    onDelete: 'CASCADE' // Si se elimina un entorno, se eliminan sus variables
});
Variable.belongsTo(Environment, { 
    foreignKey: 'environment_id',
    as: 'environment'
});


// Create the Express application
const app = express();
const port = process.env.PORT || 3000; 

// Middleware
app.use(bodyParser.json());

// Helper para obtener el nombre del entorno y verificar existencia
const getEnvironment = async (envName) => {
    // Usamos Op.iLike para hacer una búsqueda insensible a mayúsculas/minúsculas
    return Environment.findOne({ where: { name: { [Op.iLike]: envName } } });
};

// === III.B. Resources (Endpoints) Required ===

// Health Check Endpoint
app.get('/status/', (req, res) => {
    res.status(200).send('pong'); 
});

// --- Environments Resource (/environments) ---

// List all environments (Paginación implementada)
app.get('/environments/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const { count, rows: environments } = await Environment.findAndCountAll({
            limit: limit,
            offset: offset,
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            total: count,
            pages: Math.ceil(count / limit),
            current_page: page,
            environments: environments
        });
    } catch (error) {
        console.error("Error al listar entornos:", error);
        res.status(500).json({ error: 'Database query failed' });
    }
});

// Create a new environment
app.post('/environments/', async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }
    try {
        const newEnv = await Environment.create({ name, description });
        res.status(201).json({ 
            message: 'Environment created', 
            data: newEnv 
        }); 
    } catch (error) {
        // Maneja error si el nombre ya existe (unique constraint)
        if (error.name === 'SequelizeUniqueConstraintError') {
             return res.status(409).json({ error: 'Environment name already exists' });
        }
        console.error("Error creating environment:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get details of an environment
app.get('/environments/:env_name', async (req, res) => {
    const environment = await getEnvironment(req.params.env_name);
    if (!environment) {
        return res.status(404).json({ error: 'Environment not found' });
    }
    // Incluir variables al obtener el detalle
    const environmentWithVars = await Environment.findByPk(environment.id, {
        include: [{ model: Variable, as: 'variables' }]
    });

    res.status(200).json(environmentWithVars); 
});

// --- Otras rutas (PUT, DELETE, Variables, etc.) deberían implementarse de forma similar ---
// Se han mantenido las implementaciones placeholder para enfocarnos en el arranque.

// Catch-all for 404 Not Found
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.originalUrl}` });
});


// 🚨 5. INICIAR LA CONEXIÓN A LA DB Y LUEGO EL SERVIDOR
connectDB().then(() => {
    // Si la conexión y sincronización de tablas son exitosas, iniciamos el servidor Express.
    app.listen(port, () => {
        console.log(`🚀 Config Service API running at http://localhost:${port}`);
        console.log('Recuerda que el puerto es el 3000 de tu host!');
    });
}).catch(error => {
    // Si connectDB falla, muestra el error y sal del proceso.
    console.error("❌ Fallo crítico al iniciar la aplicación. No se pudo conectar/sincronizar la BD:", error);
    process.exit(1);
});