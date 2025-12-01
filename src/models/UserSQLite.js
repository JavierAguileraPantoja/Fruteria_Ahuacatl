// src/models/UserSQLite.js

const { DataTypes } = require('sequelize');
const sqliteDB = require('../databases/sqliteLocal');

const UserSQLite = sqliteDB.define('UserSQLite', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING, allowNull: false },
  image: { type: DataTypes.STRING },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM('administrador', 'dueno', 'vendedor', 'bodeguero'),
    defaultValue: 'vendedor'
  },
  created: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// ✔️ Crear tabla si no existe (misma lógica que ProductSQLite)
(async () => {
  try {
    await UserSQLite.sync();
    console.log("✅ Tabla usuarios SQLite lista.");
  } catch (err) {
    console.log("❌ Error creando tabla UserSQLite:", err.message);
  }
})();

module.exports = UserSQLite;
