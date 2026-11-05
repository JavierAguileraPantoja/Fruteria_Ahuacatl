// ====================================================
// MODELO DE CLIENTES (MONGODB Y SQLITE)
// ====================================================

const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const sqliteDB = require('../databases/sqliteLocal');

// --- ESQUEMA MONGOOSE (MongoDB) ---
const clienteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  telefono: { type: String, required: true, unique: true },
  direccion: { type: String, default: 'Venta en mostrador' },
  tipoCliente: { 
    type: String, 
    enum: ['general', 'pre-mayoreo', 'mayoreo', 'rancheria'], 
    default: 'general' 
  },
  creadoEn: { type: Date, default: Date.now }
});

const ClienteMongo = mongoose.model('Cliente', clienteSchema);

// --- MODELO SEQUELIZE (SQLite) ---
const ClienteSQLite = sqliteDB.define('Cliente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: { type: DataTypes.STRING, allowNull: false },
  telefono: { type: DataTypes.STRING, allowNull: false, unique: true },
  direccion: { type: DataTypes.STRING, defaultValue: 'Venta en mostrador' },
  tipoCliente: { type: DataTypes.STRING, defaultValue: 'general' }
}, {
  tableName: 'clientes',
  timestamps: true
});

module.exports = {
  ClienteMongo,
  ClienteSQLite
};