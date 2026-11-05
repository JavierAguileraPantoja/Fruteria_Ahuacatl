// src/models/product.js
// ======================================================
// 🥑 MODELO DE PRODUCTOS AHUACATL (VERSIÓN INTEGRAL)
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
// 1) ESQUEMA MONGO
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
    imagenes: { type: [String], default: ["/Uploads/default.png"] },
    imagen: { type: String, default: "/Uploads/default.png" },
    creadoPor: String,
    creadoEn: { type: Date, default: Date.now },
    precio_actual: { type: Number, default: 0 },
    precio_viejo: { type: Number, default: 0 },
    precio_nuevo: { type: Number, default: 0 },
    stock_precio_viejo: { type: Number, default: 0 },
    stock_precio_nuevo: { type: Number, default: 0 },
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
// 2) MODELOS MONGO (Atlas / Local)
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
// 3) FUNCIONES DE REPARACIÓN (EXPORTABLES)
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

async function fixMissingFields(Model, nombreOrigen = "Desconocido") {
  if (!Model) return;
  try {
    const productos = await Model.find();

    for (const p of productos) {
      let updateFields = {};
      let modificado = false;

      if (!Array.isArray(p.mermas)) {
        updateFields.mermas = [];
        modificado = true;
      }

      if (!Array.isArray(p.imagenes)) {
        updateFields.imagenes = [p.imagen || "/Uploads/default.png"];
        modificado = true;
      }

      if (modificado) {
        await Model.updateOne({ _id: p._id }, { $set: updateFields });
        console.log(`🟢 FIX integral aplicado [${nombreOrigen}] → ${p.nombre}`);
      }
    }
  } catch (err) {
    console.log(`⚠ Error en reparaciones automáticas (${nombreOrigen}):`, err.message);
  }
}

// ======================================================
// 4) LÓGICA DE LOTES
// ======================================================

async function aplicarVentaEnLotes(producto, cantidadVendida) {
  if (!producto) return;

  let restante = parseFloat(cantidadVendida || 0);
  if (isNaN(restante) || restante <= 0) return;

  producto.precio_actual = producto.precio_actual || producto.precio_venta || 0;
  producto.precio_viejo = producto.precio_viejo > 0 ? producto.precio_viejo : producto.precio_actual;
  producto.precio_nuevo = producto.precio_nuevo > 0 ? producto.precio_nuevo : producto.precio_actual;

  if (producto.stock_precio_viejo == null) producto.stock_precio_viejo = producto.stock || 0;
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

  producto.stock = (producto.stock_precio_viejo || 0) + (producto.stock_precio_nuevo || 0);

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
// 5) SQLITE — CATÁLOGO
// ======================================================

const dbPath = path.join(__dirname, "..", "data", "bodega.sqlite");
const SQLiteDB = new sqlite3.Database(dbPath);

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
      imagen TEXT,
      fecha_actualizacion TEXT
    )
  `);
});

const ProductSQLite = {
  findOne: (query = {}) => {
    return new Promise((resolve, reject) => {
      let sql = "SELECT * FROM productos WHERE 1=0";
      let params = [];

      if (query.$or && Array.isArray(query.$or)) {
        const condiciones = [];
        for (const cond of query.$or) {
          if (cond.id_global) {
            condiciones.push("id_global = ?");
            params.push(cond.id_global);
          } else if (cond.nombre) {
            condiciones.push("nombre = ?");
            params.push(cond.nombre);
          }
        }
        if (condiciones.length > 0) {
          sql = `SELECT * FROM productos WHERE ${condiciones.join(" OR ")} LIMIT 1`;
        }
      } else if (query.id_global) {
        sql = "SELECT * FROM productos WHERE id_global = ? LIMIT 1";
        params.push(query.id_global);
      } else if (query.nombre) {
        sql = "SELECT * FROM productos WHERE nombre = ? LIMIT 1";
        params.push(query.nombre);
      }

      SQLiteDB.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  upsert: (item) => {
    return new Promise((resolve, reject) => {
      const imgPath =
        Array.isArray(item.imagenes) && item.imagenes.length > 0
          ? item.imagenes[0]
          : item.imagen || "/Uploads/default.png";

      const fecha = item.fecha_actualizacion || new Date().toISOString();

      SQLiteDB.run(
        `
        INSERT INTO productos (
          id_global, nombre, categoria,
          precio_compra, precio_venta,
          precio_compra_pendiente, stock,
          unidad, imagen, fecha_actualizacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id_global) DO UPDATE SET
          nombre = excluded.nombre,
          categoria = excluded.categoria,
          precio_compra = excluded.precio_compra,
          precio_venta = excluded.precio_venta,
          precio_compra_pendiente = excluded.precio_compra_pendiente,
          stock = excluded.stock,
          unidad = excluded.unidad,
          imagen = excluded.imagen,
          fecha_actualizacion = excluded.fecha_actualizacion
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
          imgPath,
          fecha,
        ],
        (err) => (err ? reject(err) : resolve(true))
      );
    });
  },
};

// ======================================================
// EXPORTACIÓN COMPLETA
// ======================================================
module.exports = {
  ProductMongo,
  ProductMongoLocal,
  ProductSQLite,
  getProductModel,
  aplicarVentaEnLotes,
  assignMissingGlobalIDs,
  fixMissingFields,
};