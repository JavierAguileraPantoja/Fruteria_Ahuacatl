// src/models/product.js
// ======================================================
// 🥑 MODELO DE PRODUCTOS AHUACATL (VERSIÓN FINAL)
//   Mongo Atlas + Mongo Local + SQLite (catálogo) + Lotes
// ======================================================

const mongoose = require("mongoose");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");

const {
  atlasConnection,
  localConnection,
  getEstadoInternet,
} = require("../databases/mongoPrincipal");

// ======================================================
// 1)  ESQUEMA MONGO (COMPLETO)
// ======================================================

const productSchema = new mongoose.Schema(
  {
    id_global: {
      type: String,
      required: true,
      index: true,
      unique: true,
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

    // Lotes y control de precios
    precio_actual: { type: Number, default: 0 },
    precio_viejo: { type: Number, default: 0 },
    precio_nuevo: { type: Number, default: 0 },

    stock_precio_viejo: { type: Number, default: 0 },
    stock_precio_nuevo: { type: Number, default: 0 },

    // MERMAS
    mermas: [
      {
        cantidad: Number,
        motivo: String,
        fecha: { type: Date, default: Date.now },
        registradoPor: String,
      },
    ],
  },
  {
    collection: "products",
    timestamps: true,
  }
);

// ======================================================
// 2)  MODELOS MONGO (Atlas / Local)
// ======================================================

const ProductMongo =
  atlasConnection.models.Product ||
  atlasConnection.model("Product", productSchema);

const ProductMongoLocal =
  localConnection.models.Product ||
  localConnection.model("Product", productSchema);

function getProductModel() {
  return getEstadoInternet() ? ProductMongo : ProductMongoLocal;
}

// ======================================================
// 3)  FIX: Asignar id_global faltante en Atlas
// ======================================================

async function assignMissingGlobalIDs() {
  try {
    const viejos = await ProductMongo.find({
      $or: [{ id_global: { $exists: false } }, { id_global: "" }],
    });

    for (const p of viejos) {
      p.id_global = uuidv4();
      await p.save();
      console.log(`🟢 FIX id_global aplicado → ${p.nombre}`);
    }
  } catch (err) {
    console.log("⚠ Error aplicando FIX id_global:", err.message);
  }
}
assignMissingGlobalIDs();

// ======================================================
// 4)  Lógica de LOTES (VENTAS)
// ======================================================

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

// ======================================================
// 5)  SQLITE — CATÁLOGO (NUEVO MOTOR SIN SEQUELIZE)
// ======================================================

const dbPath = path.join(__dirname, "..", "data", "bodega.sqlite");
const SQLiteDB = new sqlite3.Database(dbPath);

// Crear tabla si no existe
SQLiteDB.serialize(() => {
  SQLiteDB.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_global TEXT UNIQUE,
      nombre TEXT,
      categoria TEXT,
      precio_compra REAL,
      precio_venta REAL,
      precio_compra_pendiente REAL,
      stock REAL,
      unidad TEXT,
      imagen TEXT
    )
  `);
});

// UPSERT SQLite
const ProductSQLite = {
  upsert: (item) => {
    return new Promise((resolve, reject) => {
      SQLiteDB.run(
        `
        INSERT INTO productos (
          id_global, nombre, categoria,
          precio_compra, precio_venta,
          precio_compra_pendiente, stock,
          unidad, imagen
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_global) DO UPDATE SET
          nombre = excluded.nombre,
          categoria = excluded.categoria,
          precio_compra = excluded.precio_compra,
          precio_venta = excluded.precio_venta,
          precio_compra_pendiente = excluded.precio_compra_pendiente,
          stock = excluded.stock,
          unidad = excluded.unidad,
          imagen = excluded.imagen
        `,
        [
          item.id_global,
          item.nombre,
          item.categoria,
          item.precio_compra,
          item.precio_venta,
          item.precio_compra_pendiente,
          item.stock,
          item.unidad,
          item.imagen
        ],
        (err) => (err ? reject(err) : resolve(true))
      );
    });
  },
};

// ======================================================
// 6) FIX: asegurar que mermas sea arreglo
// ======================================================

async function fixMissingMermasField() {
  try {
    const modelos = [ProductMongo, ProductMongoLocal];

    for (const Model of modelos) {
      const productos = await Model.find();

      for (const p of productos) {
        if (!Array.isArray(p.mermas)) {
          p.mermas = [];
          await p.save();
          console.log(`🟢 FIX mermas aplicado → ${p.nombre}`);
        }
      }
    }
  } catch (err) {
    console.log("⚠ Error FIX mermas:", err.message);
  }
}
fixMissingMermasField();

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  ProductMongo,
  ProductMongoLocal,
  ProductSQLite,
  getProductModel,
  aplicarVentaEnLotes,
};
