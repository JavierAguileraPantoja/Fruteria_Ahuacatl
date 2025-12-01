// src/models/product.js
// ======================================
// 🥑 MODELO DE PRODUCTOS AHUACATL
// Mongo Atlas + Mongo Local + SQLite + Lotes + Sync por eventos
// ======================================

const mongoose = require("mongoose");
const { DataTypes } = require("sequelize");
const { v4: uuidv4 } = require("uuid");

const sqliteDB = require("../databases/sqliteLocal");
const {
  atlasConnection,
  localConnection,
  getEstadoInternet,
} = require("../databases/mongoPrincipal");

// ================================
// ESQUEMA MONGO (COMPLETO)
// ================================

const productSchema = new mongoose.Schema(
  {
    id_global: {
      type: String,
      required: true,
      index: true,
      unique: true, // ⚠️ clave universal del producto
    },

    nombre: { type: String, required: true },
    categoria: { type: String, required: true },

    precio_compra: { type: Number, default: 0 },
    precio_venta: { type: Number, default: 0 },
    precio_compra_pendiente: { type: Number, default: 0 },

    stock: { type: Number, default: 0 },
    unidad: { type: String, default: "kg" },
    imagen: { type: String, default: "default.png" },

    creadoPor: String,
    creadoEn: { type: Date, default: Date.now },

    // 🔥 Campos control de precio-lote
    precio_actual: { type: Number, default: 0 },
    precio_viejo: { type: Number, default: 0 },
    precio_nuevo: { type: Number, default: 0 },

    stock_precio_viejo: { type: Number, default: 0 },
    stock_precio_nuevo: { type: Number, default: 0 },

    // ===================================================
    // 🟧 HISTORIAL DE MERMAS
    // ===================================================
    mermas: [
      {
        cantidad: { type: Number, required: true },
        motivo: { type: String, required: true },
        fecha: { type: Date, default: Date.now },
        registradoPor: { type: String }
      }
    ]
  },
  {
    collection: "products",
    timestamps: true,
  }
);

// ================================
// MODELOS MONGO (ONLINE/OFFLINE)
// ================================

const ProductMongo =
  atlasConnection.models.Product ||
  atlasConnection.model("Product", productSchema);

const ProductMongoLocal =
  localConnection.models.Product ||
  localConnection.model("Product", productSchema);

// Selector dinámico por estado de internet
function getProductModel() {
  return getEstadoInternet() ? ProductMongo : ProductMongoLocal;
}

// =======================================================
// 🛠️ FIX PROFESIONAL: asignar id_global SOLO en ATLAS
//    (Local se corrige vía syncAtlasProductsToLocal)
// =======================================================
async function assignMissingGlobalIDs() {
  try {
    const viejos = await ProductMongo.find({
      $or: [{ id_global: { $exists: false } }, { id_global: "" }],
    });

    for (const p of viejos) {
      p.id_global = uuidv4();
      await p.save();
      console.log(`🟢 FIX aplicado → id_global asignado en Atlas a: ${p.nombre}`);
    }
  } catch (err) {
    console.log("⚠ Error aplicando FIX id_global:", err.message);
  }
}
assignMissingGlobalIDs();

// ================================
// LOGICA DE LOTES PARA VENTAS
// ================================
async function aplicarVentaEnLotes(producto, cantidadVendida) {
  if (!producto) return;

  let restante = parseFloat(cantidadVendida || 0);
  if (isNaN(restante) || restante <= 0) return;

  producto.precio_actual =
    producto.precio_actual || producto.precio_venta || 0;

  producto.precio_viejo =
    producto.precio_viejo > 0 ? producto.precio_viejo : producto.precio_actual;

  producto.precio_nuevo =
    producto.precio_nuevo > 0 ? producto.precio_nuevo : producto.precio_actual;

  if (producto.stock_precio_viejo == null)
    producto.stock_precio_viejo = producto.stock || 0;

  producto.stock_precio_nuevo = producto.stock_precio_nuevo || 0;

  if (producto.stock_precio_viejo > 0 && restante > 0) {
    const usadoViejo = Math.min(producto.stock_precio_viejo, restante);
    producto.stock_precio_viejo -= usadoViejo;
    restante -= usadoViejo;
  }

  if (producto.stock_precio_nuevo > 0 && restante > 0) {
    const usadoNuevo = Math.min(producto.stock_precio_nuevo, restante);
    producto.stock_precio_nuevo -= usadoNuevo;
    restante -= usadoNuevo;
  }

  producto.stock =
    (producto.stock_precio_viejo || 0) +
    (producto.stock_precio_nuevo || 0);

  if (producto.stock_precio_viejo <= 0 && producto.stock_precio_nuevo > 0) {
    producto.precio_actual = producto.precio_nuevo;
    producto.precio_viejo = producto.precio_nuevo;

    producto.stock_precio_viejo = producto.stock_precio_nuevo;
    producto.stock_precio_nuevo = 0;

    if (producto.precio_compra_pendiente > 0) {
      producto.precio_compra = producto.precio_compra_pendiente;
      producto.precio_compra_pendiente = 0;
    }
  }

  await producto.save();
}

// ================================
// SQLITE — COPIA (solo datos planos)
// ================================
const ProductSQLite = sqliteDB.define(
  "ProductSQLite",
  {
    id_global: DataTypes.STRING,
    nombre: DataTypes.STRING,
    categoria: DataTypes.STRING,
    precio_compra: DataTypes.FLOAT,
    precio_venta: DataTypes.FLOAT,
    precio_compra_pendiente: DataTypes.FLOAT,
    stock: DataTypes.INTEGER,
    unidad: DataTypes.STRING,
    imagen: DataTypes.STRING,
    creadoPor: DataTypes.STRING,
    creadoEn: DataTypes.DATE,
  },
  {
    tableName: "productos",
    timestamps: false,
  }
);

(async () => {
  await ProductSQLite.sync();
})();

// =======================================================
// 🛠️ FIX: asegurar campo mermas como arreglo
// =======================================================
async function fixMissingMermasField() {
  try {
    const modelos = [ProductMongo, ProductMongoLocal];

    for (const Model of modelos) {
      const productos = await Model.find();

      for (const p of productos) {
        if (!Array.isArray(p.mermas)) {
          p.mermas = [];
          await p.save();
          console.log(`🟢 FIX: campo mermas agregado → ${p.nombre}`);
        }
      }
    }
  } catch (err) {
    console.log("⚠ Error FIX mermas:", err.message);
  }
}
fixMissingMermasField();

module.exports = {
  ProductMongo,
  ProductMongoLocal,
  ProductSQLite,
  getProductModel,
  aplicarVentaEnLotes,
};
