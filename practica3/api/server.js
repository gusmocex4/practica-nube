// server.js

// Import required packages
const express = require('express');
const bodyParser = require('body-parser');

// 💡 NOTE: You will need to import and configure your chosen database ORM/client here (e.g., 'pg' for PostgreSQL, 'mongoose' for MongoDB).
// const db = require('./path/to/db/config'); 

// Create the Express application
const app = express();
const port = 3000; // Can be configured via environment variable, as per good practice [cite: 7]

// Middleware
// Parse incoming JSON requests
app.use(bodyParser.json());

// 💡 NOTE: Implement an authentication middleware (e.g., BasicAuth, Bearer Token) as required.
// app.use(require('./middleware/authMiddleware')); 

// === III.B. Resources (Endpoints) Required ===

// Health Check Endpoint
// URL: GET /status/ [cite: 13]
app.get('/status/', (req, res) => {
    // Should respond simply 'pong' [cite: 13]
    res.status(200).send('pong'); 
});

// --- Environments Resource (/enviroments) ---
// Note: Using plural nouns for resources, as required [cite: 8, 27]

// List all environments (must include pagination) [cite: 14]
// URL: GET /enviroments/
app.get('/enviroments/', (req, res) => {
    // 💡 Implementation: Fetch data from DB, apply pagination logic based on req.query (e.g., page, limit)
    // Response must be in the paginated format [cite: 25]
    res.status(200).json({ message: 'List of environments (with pagination)', query: req.query }); 
});

// Create a new environment [cite: 14]
// URL: POST /enviroments/
app.post('/enviroments/', (req, res) => {
    // 💡 Implementation: Validate payload (name, description), save to DB. Use 201 Created [cite: 28]
    res.status(201).json({ message: 'Environment created', data: req.body }); 
});

// Get details of an environment [cite: 14]
// URL: GET /enviroments/:env_name/
app.get('/enviroments/:env_name', (req, res) => {
    // 💡 Implementation: Fetch environment by name from DB. Use 404 Not Found if non-existent [cite: 29]
    res.status(200).json({ message: `Details for environment: ${req.params.env_name}` }); 
});

// Update an existing environment (Full update) [cite: 15]
// URL: PUT /enviroments/:env_name/
app.put('/enviroments/:env_name', (req, res) => {
    // 💡 Implementation: Replace the resource entirely. Use 200 OK or 204 No Content [cite: 28]
    res.status(200).json({ message: `Environment ${req.params.env_name} fully updated`, data: req.body }); 
});

// Partially update an environment [cite: 15]
// URL: PATCH /enviroments/:env_name/
app.patch('/enviroments/:env_name', (req, res) => {
    // 💡 Implementation: Apply partial updates. Use 200 OK or 204 No Content [cite: 28]
    res.status(200).json({ message: `Environment ${req.params.env_name} partially updated`, data: req.body }); 
});

// Delete an environment [cite: 15]
// URL: DELETE /enviroments/:env_name/
app.delete('/enviroments/:env_name', (req, res) => {
    // 💡 Implementation: Delete the environment and all associated variables. Use 204 No Content [cite: 28]
    res.status(204).send(); 
});


// --- Massive Consumption Endpoint ---
// Consumo Masivo: Devuelve todo el JSON de configuración para un entorno específico [cite: 19]
// URL: GET /enviroments/:env_name.json
app.get('/enviroments/:env_name.json', (req, res) => {
    // 💡 Implementation: Fetch all variables for the environment and format into a flat JSON object [cite: 19, 27]
    const exampleFlatConfig = {
       "DB_URL": "postgres://prod_user:prod_pass@prod-db.com/main",
       "FEATURE_NEW_UI": "False",
       "API_TIMEOUT_MS": "5000"
    };
    res.status(200).json(exampleFlatConfig); 
});

// --- Variables Resource (/enviroments/:env_name/variables) ---

// List all variables of an environment (must include pagination) [cite: 16]
// URL: GET /enviroments/:env_name/variables
app.get('/enviroments/:env_name/variables', (req, res) => {
    // 💡 Implementation: Fetch variables for the specified environment from DB, apply pagination. [cite: 16, 25]
    res.status(200).json({ message: `List of variables for ${req.params.env_name} (with pagination)` }); 
});

// Create a new variable for an environment [cite: 16]
// URL: POST /enviroments/:env_name/variables
app.post('/enviroments/:env_name/variables', (req, res) => {
    // 💡 Implementation: Validate payload (name, value, description, is_sensitive), save to DB. Use 201 Created [cite: 28]
    res.status(201).json({ message: `Variable created in ${req.params.env_name}`, data: req.body }); 
});

// Get details of a variable [cite: 17]
// URL: GET /enviroments/:env_name/variables/:var_name
app.get('/enviroments/:env_name/variables/:var_name', (req, res) => {
    // 💡 Implementation: Fetch variable by name within the environment. Use 404 Not Found if non-existent [cite: 29]
    res.status(200).json({ message: `Details for variable: ${req.params.var_name} in ${req.params.env_name}` }); 
});

// Update an existing variable (Full update) [cite: 17]
// URL: PUT /enviroments/:env_name/variables/:var_name
app.put('/enviroments/:env_name/variables/:var_name', (req, res) => {
    // 💡 Implementation: Replace the resource entirely. Use 200 OK or 204 No Content [cite: 28]
    res.status(200).json({ message: `Variable ${req.params.var_name} in ${req.params.env_name} fully updated`, data: req.body }); 
});

// Partially update an existing variable [cite: 18]
// URL: PATCH /enviroments/:env_name/variables/:var_name
app.patch('/enviroments/:env_name/variables/:var_name', (req, res) => {
    // 💡 Implementation: Apply partial updates. Use 200 OK or 204 No Content [cite: 28]
    res.status(200).json({ message: `Variable ${req.params.var_name} in ${req.params.env_name} partially updated`, data: req.body }); 
});

// Delete an existing variable [cite: 18]
// URL: DELETE /enviroments/:env_name/variables/:var_name
app.delete('/enviroments/:env_name/variables/:var_name', (req, res) => {
    // 💡 Implementation: Delete the variable. Use 204 No Content [cite: 28]
    res.status(204).send(); 
});

// --- Schema Publication Endpoint ---
// Endpoint to publish the web service schema (OpenAPI, Swagger, etc.) [cite: 33]
// URL: GET /api-docs (or similar)
app.get('/api-docs', (req, res) => {
    // 💡 Implementation: Serve the OpenAPI/Swagger JSON or YAML file
    res.status(200).json({ message: 'OpenAPI/Swagger schema documentation' });
});


// Global Error Handler Middleware
// Must use appropriate 4xx (Client Error) and 5xx (Server Error) status codes [cite: 29, 30]
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Basic 500 Internal Server Error handling [cite: 30]
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred on the server side.' 
    });
});

// Catch-all for 404 Not Found
app.use((req, res, next) => {
    // Use 404 Not Found for non-existent resource [cite: 29]
    res.status(404).json({ error: 'Not Found', message: `Cannot ${req.method} ${req.originalUrl}` });
});


// Start the server
app.listen(port, () => {
    console.log(`Config Service API running at http://localhost:${port}`);
    console.log('Remember to use Docker Compose for orchestration! ');
});