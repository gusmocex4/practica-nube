// practica3/api/models/Variable.js

const { DataTypes } = require('sequelize');

// 🚨 CORRECCIÓN CRÍTICA: El modelo ahora exporta una función que recibe la instancia de Sequelize (sequelize).
// Esto elimina la dependencia circular y garantiza que 'sequelize' esté definido.
module.exports = (sequelize) => {
    
    // 🚨 Las relaciones (hasMany, belongsTo) se deben definir en server.js.
    // Aquí solo se define el modelo.
    const Variable = sequelize.define('Variable', {
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        is_sensitive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
    }, {
        tableName: 'variables',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{
            // Clave foránea environment_id se añade automáticamente con belongsTo, 
            // pero el índice compuesto es necesario para la unicidad.
            unique: true,
            fields: ['environment_id', 'name'] 
        }]
    });

    // IMPORTANTE: Definimos la función associate, que el server.js usará para definir las relaciones.
    Variable.associate = (models) => {
        // La clave foránea environment_id es el punto de enlace.
        Variable.belongsTo(models.Environment, { foreignKey: 'environment_id', as: 'environment' });
    };

    return Variable;
};