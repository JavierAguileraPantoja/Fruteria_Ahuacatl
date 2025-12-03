// src/models/venta.js
// ======================================
// MODELO DE VENTAS (Atlas + Local + SQLite)
// ======================================

const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const sqliteDB = require('../databases/sqliteLocal');
const { atlasConnection, localConnection } = require('../databases/mongoPrincipal');
const getDBConnection = require('../databases/dbSelector');

// ======================================
// SCHEMA MONGODB (VENTAS)
// ======================================
const itemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nombre: { type: String, required: true },
    cantidad: { type: Number, required: true },
    unidad: { type: String, default: 'kg' },
    precioUnitario: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  },
  { _id: false }
);

const ventaSchema = new mongoose.Schema(
  {
    tipoCliente: {
      type: String,
      enum: ['general', 'pre-mayoreo', 'mayoreo'],
      default: 'general'
    },
    clienteNombre: { type: String },
    clienteTelefono: { type: String },

    items: [itemSchema],
    total: { type: Number, required: true },

    estado: {
      type: String,
      enum: ['pendiente', 'impresa', 'cancelada'],
      default: 'pendiente'
    },

    creadoPor: { type: String },
    creadoEn: { type: Date, default: Date.now }
  },
  {
    collection: 'ventas'
  }
);

// ======================================
// VENTAS EN ATLAS (PRINCIPAL ONLINE)
// ======================================
const VentaAtlas =
  atlasConnection.models.Venta ||
  atlasConnection.model('Venta', ventaSchema);

// ======================================
// VENTAS EN MONGO LOCAL (OFFLINE)
// ======================================
const VentaLocal =
  localConnection.models.Venta ||
  localConnection.model('Venta', ventaSchema);

// ======================================
// SELECTOR INTELIGENTE (Atlas / Local)
// ======================================
function getVentaModel() {
  // Usa el mismo selector que productos:
  // Atlas si hay internet, Local si no.
  const conn = getDBConnection();
  return conn.models.Venta || conn.model('Venta', ventaSchema);
}

// Para compatibilidad con código viejo, mantenemos este nombre:
const VentaMongo = VentaAtlas;

// ======================================
// SQLITE — TABLAS DE RESPALDO
// ======================================
const VentaSQLite = sqliteDB.define(
  'ventas',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipoCliente: DataTypes.STRING,
    clienteNombre: DataTypes.STRING,
    clienteTelefono: DataTypes.STRING,
    total: DataTypes.FLOAT,
    estado: DataTypes.STRING,
    creadoPor: DataTypes.STRING,
    creadoEn: DataTypes.DATE
  },
  { timestamps: false }
  
);

const VentaDetalleSQLite = sqliteDB.define(
  'venta_detalles',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ventaId: DataTypes.INTEGER,
    productId: DataTypes.STRING,
    nombre: DataTypes.STRING,
    cantidad: DataTypes.FLOAT,
    unidad: DataTypes.STRING,
    precioUnitario: DataTypes.FLOAT,
    subtotal: DataTypes.FLOAT
  },
  { timestamps: false }
);

// Relación
VentaSQLite.hasMany(VentaDetalleSQLite, { foreignKey: 'ventaId' });
VentaDetalleSQLite.belongsTo(VentaSQLite, { foreignKey: 'ventaId' });

// ======================================
// FUNCIONES KPI PARA REPORTES
// ======================================
const db = sqliteDB; // atajo

// VENTAS DEL DÍA
VentaSQLite.totalVentasDelDia = () => {
  return new Promise((resolve) => {
    db.query(
      "SELECT SUM(total) AS total FROM ventas WHERE DATE(creadoEn)=DATE('now')",
      { type: sqliteDB.QueryTypes.SELECT }
    )
      .then(rows => resolve(rows[0]?.total || 0))
      .catch(() => resolve(0));
  });
};

// TOTAL PRODUCTOS VENDIDOS HOY
VentaSQLite.totalProductosVendidosHoy = () => {
  return new Promise((resolve) => {
    db.query(
      `SELECT SUM(cantidad) AS total
       FROM venta_detalles
       WHERE ventaId IN (
          SELECT id FROM ventas WHERE DATE(creadoEn)=DATE('now')
       )`,
      { type: sqliteDB.QueryTypes.SELECT }
    )
      .then(rows => resolve(rows[0]?.total || 0))
      .catch(() => resolve(0));
  });
};

// GANANCIA DEL DÍA
VentaSQLite.totalGananciasDia = () => {
  return new Promise((resolve) => {
    db.query(
      `SELECT SUM(subtotal) AS ganancia
       FROM venta_detalles
       WHERE ventaId IN (
          SELECT id FROM ventas WHERE DATE(creadoEn)=DATE('now')
       )`,
      { type: sqliteDB.QueryTypes.SELECT }
    )
      .then(rows => resolve(rows[0]?.ganancia || 0))
      .catch(() => resolve(0));
  });
};

// VENTAS SEMANALES
VentaSQLite.totalVentasSemana = () => {
  return new Promise((resolve) => {
    db.query(
      "SELECT SUM(total) AS total FROM ventas WHERE creadoEn >= DATE('now','-7 days')",
      { type: sqliteDB.QueryTypes.SELECT }
    )
      .then(rows => resolve(rows[0]?.total || 0))
      .catch(() => resolve(0));
  });
};

// VENTAS MENSUALES
VentaSQLite.totalVentasMes = () => {
  return new Promise((resolve) => {
    db.query(
      "SELECT SUM(total) AS total FROM ventas WHERE STRFTIME('%m', creadoEn)=STRFTIME('%m','now')",
      { type: sqliteDB.QueryTypes.SELECT }
    )
      .then(rows => resolve(rows[0]?.total || 0))
      .catch(() => resolve(0));
  });
};

module.exports = {
  VentaMongo,          // Atlas (para reportes y sync)
  VentaSQLite,
  VentaDetalleSQLite,
  getVentaModel,       //  ESTE se usa en las rutas de ventas (ONLINE/OFFLINE)
  VentaAtlas,
  VentaLocal
};
// ===============================================
// FORZAR CREACIÓN DE TABLAS EN SQLITE
// ===============================================
(async () => {
  try {
    await VentaSQLite.sync();
    await VentaDetalleSQLite.sync();
    console.log("🟢 Tablas de ventas SQLite listas.");
  } catch (err) {
    console.log("❌ Error creando tablas de ventas en SQLite:", err.message);
  }
})();
