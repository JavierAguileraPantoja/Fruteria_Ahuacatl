// src/databases/sqliteLocal.js
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dbFilePath = path.join(__dirname, '../data/bodega.sqlite');

// 1) Crear carpeta si no existe
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

const sqliteDB = new Sequelize({
  dialect: 'sqlite',
  storage: dbFilePath,
  logging: false,
});

(async () => {
  try {
    await sqliteDB.authenticate();
    // 2) Habilitar llaves foráneas (buena práctica con SQLite)
    await sqliteDB.query('PRAGMA foreign_keys = ON;');
    console.log('✅ SQLite (bodega) conectado en:', dbFilePath);
  } catch (err) {
    console.error('❌ Error en SQLite:', err);
  }
})();

module.exports = sqliteDB;
