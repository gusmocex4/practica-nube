// api/server.js

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize'); 

// 💡 1. IMPORTAR FUNCIÓN DE CONEXIÓN Y LA INSTANCIA DE SEQUELIZE
const { sequelize, connectDB } = require('./db/config'); 

// 💡 2. IMPORTAR LOS MODELOS COMO FUNCIONES Y DEFINIRLOS CON LA INSTANCIA SEQUELIZE
const defineEnvironment = require('./models/Environment');
const defineVariable = require('./models/Variable'); 

const Environment = defineEnvironment(sequelize);
const Variable = defineVariable(sequelize);

// 💡 3. DEFINICIÓN DE RELACIONES (ONE-TO-MANY)
// Un Entorno tiene muchas Variables. Al eliminar el entorno, elimina sus variables (CASCADE).
Environment.hasMany(Variable, {
    foreignKey: 'environment_id',
    as: 'variables',
    onDelete: 'CASCADE', 
});
// Una Variable pertenece a un Entorno.
Variable.belongsTo(Environment, {
    foreignKey: 'environment_id',
    as: 'environment',
});


// Create the Express application
const app = express();
const port = process.env.PORT || 3000; 

// Middleware
app.use(bodyParser.json());

// ===============================================
// MANEJO DE ERRORES CENTRALIZADO Y UTILIDADES
// ===============================================

// Función middleware para buscar Environment
const findEnvironment = async (req, res, next) => {
    try {
        let env_name = req.params.env_name;

        // 💡 CRÍTICA: Eliminar la extensión .json si está presente en el parámetro
        if (env_name.toLowerCase().endsWith('.json')) {
            env_name = env_name.substring(0, env_name.length - 5);
        }
        
        // El nombre del entorno siempre se almacena en MAYÚSCULAS
        env_name = env_name.toUpperCase();

        const environment = await Environment.findOne({
            where: { name: env_name }
        });

        if (!environment) {
            return res.status(404).json({ error: 'Not Found', message: `Environment '${env_name}' not found.` });
        }
        // Adjuntar el objeto Environment a la request para uso posterior
        req.environment = environment;
        next();
    } catch (error) {
        next(error);
    }
};

// ===============================================
// ENDPOINTS
// ===============================================

// Health Check Endpoint
app.get('/status/', (req, res) => {
    res.status(200).send('pong'); 
});

// -----------------------------------------------
// --- Massive Consumption Endpoint (MOVIDA AL PRINCIPIO) ---
// -----------------------------------------------

// [C.1] Consumo Masivo: Devuelve todo el JSON de configuración para un entorno específico
// URL: GET /environments/:env_name.json
app.get('/environments/:env_name.json', findEnvironment, async (req, res, next) => {
    try {
        const environment = await Environment.findByPk(req.environment.id, {
            include: [{ 
                model: Variable, 
                as: 'variables',
                attributes: ['name', 'value'] // Solo necesitamos nombre y valor
            }]
        });

        // Transformar la lista de variables a un objeto JSON plano
        const flatConfig = environment.variables.reduce((acc, variable) => {
            acc[variable.name] = variable.value;
            return acc;
        }, {});

        res.status(200).json(flatConfig); 
    } catch (error) {
        next(error);
    }
});


// -----------------------------------------------
// --- Environments Resource (/environments) ---
// -----------------------------------------------

// [B.1] List all environments (must include pagination)
// URL: GET /environments/
app.get('/environments/', async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: environments } = await Environment.findAndCountAll({
            limit: limit,
            offset: offset,
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            total_items: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            environments: environments
        }); 
    } catch (error) {
        next(error);
    }
});

// [B.2] Create a new environment
// URL: POST /environments/
app.post('/environments/', async (req, res, next) => {
    try {
        // La validación de unicidad se maneja automáticamente por Sequelize (unique: true)
        const { name, description } = req.body;
        
        // La lógica del modelo pone 'name' en mayúsculas
        const newEnvironment = await Environment.create({ name, description });

        res.status(201).json({ 
            message: 'Environment created successfully', 
            data: newEnvironment 
        }); 
    } catch (error) {
        // 400 Bad Request si falla la validación (ej. nombre nulo o duplicado)
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors[0].message });
        }
        next(error);
    }
});

// [B.3] Get details of an environment
// URL: GET /environments/:env_name/
app.get('/environments/:env_name', findEnvironment, async (req, res) => {
    // req.environment fue cargado por el middleware findEnvironment
    res.status(200).json({ 
        message: `Details for environment: ${req.environment.name}`,
        data: req.environment
    }); 
});

// [B.4] Update an existing environment (Full update)
// URL: PUT /environments/:env_name/
app.put('/environments/:env_name', findEnvironment, async (req, res, next) => {
    try {
        const { name, description } = req.body;
        // La actualización se realiza directamente sobre la instancia cargada.
        // NOTA: Se evita cambiar el nombre directamente en PUT/PATCH para mantener la URL.
        // Si el requisito es cambiar el nombre, se necesitaría una lógica más compleja.
        await req.environment.update({ description }); 

        res.status(200).json({ 
            message: `Environment ${req.environment.name} fully updated (description only)`, 
            data: req.environment 
        }); 
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors[0].message });
        }
        next(error);
    }
});

// [B.5] Partially update an environment
// URL: PATCH /environments/:env_name/
app.patch('/environments/:env_name', findEnvironment, async (req, res, next) => {
    try {
        // Solo actualizamos la descripción si viene en el cuerpo
        if (req.body.description !== undefined) {
             await req.environment.update({ description: req.body.description });
        }

        res.status(200).json({ 
            message: `Environment ${req.environment.name} partially updated`, 
            data: req.environment 
        }); 
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors[0].message });
        }
        next(error);
    }
});

// [B.6] Delete an environment
// URL: DELETE /environments/:env_name/
app.delete('/environments/:env_name', findEnvironment, async (req, res, next) => {
    try {
        // El onDelete: 'CASCADE' asegura que las variables también se eliminen
        await req.environment.destroy();
        res.status(204).send(); 
    } catch (error) {
        next(error);
    }
});

// -----------------------------------------------
// --- Variables Resource (/environments/:env_name/variables) ---
// -----------------------------------------------

// [B.7] List all variables of an environment (must include pagination)
// URL: GET /environments/:env_name/variables
app.get('/environments/:env_name/variables', findEnvironment, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows: variables } = await Variable.findAndCountAll({
            where: { environment_id: req.environment.id },
            limit: limit,
            offset: offset,
            order: [['name', 'ASC']]
        });

        res.status(200).json({
            environment_name: req.environment.name,
            total_items: count,
            total_pages: Math.ceil(count / limit),
            current_page: page,
            variables: variables
        }); 
    } catch (error) {
        next(error);
    }
});

// [B.8] Create a new variable for an environment
// URL: POST /environments/:env_name/variables
app.post('/environments/:env_name/variables', findEnvironment, async (req, res, next) => {
    try {
        const { name, value, description, is_sensitive } = req.body;

        const newVariable = await Variable.create({
            name,
            value,
            description,
            is_sensitive: is_sensitive !== undefined ? is_sensitive : false,
            environment_id: req.environment.id // Asocia con el entorno cargado
        });

        res.status(201).json({ 
            message: `Variable '${newVariable.name}' created in ${req.environment.name}`, 
            data: newVariable 
        }); 
    } catch (error) {
         if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors[0].message });
        }
        next(error);
    }
});

// Middleware para buscar Variable dentro del Environment
const findVariable = async (req, res, next) => {
    try {
        const var_name = req.params.var_name;
        const variable = await Variable.findOne({
            where: {
                environment_id: req.environment.id, // Debe pertenecer al entorno cargado
                name: var_name
            }
        });

        if (!variable) {
            return res.status(404).json({ error: 'Not Found', message: `Variable '${var_name}' not found in environment '${req.environment.name}'.` });
        }
        req.variable = variable;
        next();
    } catch (error) {
        next(error);
    }
};


// [B.9] Get details of a variable
// URL: GET /environments/:env_name/variables/:var_name
// Usamos findEnvironment primero, luego findVariable
app.get('/environments/:env_name/variables/:var_name', findEnvironment, findVariable, async (req, res) => {
    res.status(200).json({ 
        message: `Details for variable: ${req.variable.name} in ${req.environment.name}`,
        data: req.variable
    }); 
});

// [B.10] Update an existing variable (Full update)
// URL: PUT /environments/:env_name/variables/:var_name
app.put('/environments/:env_name/variables/:var_name', findEnvironment, findVariable, async (req, res, next) => {
    try {
        const { name, value, description, is_sensitive } = req.body;

        // Actualizamos todos los campos proporcionados, incluyendo el nombre si es necesario
        await req.variable.update({ 
            name: name !== undefined ? name : req.variable.name,
            value: value !== undefined ? value : req.variable.value,
            description: description !== undefined ? description : req.variable.description,
            is_sensitive: is_sensitive !== undefined ? is_sensitive : req.variable.is_sensitive,
        }); 

        res.status(200).json({ 
            message: `Variable ${req.variable.name} in ${req.environment.name} fully updated`, 
            data: req.variable 
        }); 
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors[0].message });
        }
        next(error);
    }
});

// [B.11] Partially update an existing variable
// URL: PATCH /environments/:env_name/variables/:var_name
app.patch('/environments/:env_name/variables/:var_name', findEnvironment, findVariable, async (req, res, next) => {
    try {
        // Solo actualizamos los campos presentes en req.body
        const updatedVariable = await req.variable.update(req.body);

        res.status(200).json({ 
            message: `Variable ${req.variable.name} in ${req.environment.name} partially updated`, 
            data: updatedVariable 
        }); 
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeValidationError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors[0].message });
        }
        next(error);
    }
});

// [B.12] Delete an existing variable
// URL: DELETE /environments/:env_name/variables/:var_name
app.delete('/environments/:env_name/variables/:var_name', findEnvironment, findVariable, async (req, res, next) => {
    try {
        await req.variable.destroy();
        res.status(204).send(); 
    } catch (error) {
        next(error);
    }
});


// --- Schema Publication Endpoint ---
app.get('/api-docs', (req, res) => {
    res.status(200).json({ message: 'OpenAPI/Swagger schema documentation placeholder' });
});


// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    // 500 Internal Server Error handling
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred on the server side.',
        details: err.message
    });
});

// Catch-all for 404 Not Found
app.use((req, res, next) => {
    res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.originalUrl}` });
});


// 🚨 INICIAR LA CONEXIÓN A LA DB Y LUEGO EL SERVIDOR
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Config Service API running at http://localhost:${port}`);
    });
}).catch(error => {
    console.error("❌ Fallo crítico al iniciar la aplicación. No se pudo conectar/sincronizar la BD:", error);
    process.exit(1);
});
