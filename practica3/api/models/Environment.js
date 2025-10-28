// practica3/api/models/Environment.js
const { DataTypes } = require('sequelize');

// 🚨 Debe exportar una función que recibe la instancia de sequelize
module.exports = (sequelize) => {
    const Environment = sequelize.define('Environment', {
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true, // Nombre único del entorno 
            set(value) {
                // Asegurar que se guarde en mayúsculas
                this.setDataValue('name', value.toUpperCase());
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: 'environments', 
        timestamps: true,
        createdAt: 'created_at', // Mapeo a created_at 
        updatedAt: 'updated_at'  // Mapeo a updated_at 
    });

    // Añadir una función de asociación (aunque las relaciones se definan en server.js)
    Environment.associate = (models) => {
        Environment.hasMany(models.Variable, { foreignKey: 'environment_id', as: 'variables', onDelete: 'CASCADE' });
    };

    return Environment;
};