// =======================================================
// 🔧 FIX DEFINITIVO SQLITE: agrega columnas faltantes + restaura catálogo
// =======================================================

require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");
const mongoose = require("mongoose");

// =======================================================
// 1) Conectar a Atlas
// =======================================================
async function connectAtlas() {
  try {
    await mongoose.connect(process.env.MONGO_ATLAS_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("🟢 Atlas conectado");
  } catch (err) {
    console.log("❌ Error conectando a Atlas:", err.message);
    process.exit(1);
  }
}

// Modelo Atlas mínimo
const ProductAtlas = mongoose.model(
  "ProductAtlasFix",
  new mongoose.Schema(
    {
      nombre: String,
      categoria: String,
      precio_compra: Number,
      precio_venta: Number,
      precio_compra_pendiente: Number,
      stock: Number,
      unidad: String,
      imagen: String,
      creadoPor: String,
      creadoEn: Date,
      precio_actual: Number,
      precio_viejo: Number,
      precio_nuevo: Number,
      id_global: String,
      stock_precio_viejo: Number,
      stock_precio_nuevo: Number,
    },
    { collection: "products" }
  )
);

// =======================================================
// 2) Conectar a SQLite
// =======================================================
const sqlite = new Sequelize({
  dialect: "sqlite",
  storage: "src/data/bodega.sqlite",
  logging: false,
});

// Modelo SQLite
const ProductSQLite = sqlite.define(
  "productos",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
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

    //  NUEVAS COLUMNAS (si no existen las agregamos)
    precio_actual: DataTypes.FLOAT,
    precio_viejo: DataTypes.FLOAT,
    precio_nuevo: DataTypes.FLOAT,
  },
  { tableName: "productos", timestamps: false }
);

// =======================================================
// 3) Agregar columnas faltantes en SQLite
// =======================================================
async function ensureColumns() {
  const columnsToAdd = [
    ["precio_actual", "FLOAT"],
    ["precio_viejo", "FLOAT"],
    ["precio_nuevo", "FLOAT"],
  ];

  for (const [col, type] of columnsToAdd) {
    try {
      await sqlite.query(`ALTER TABLE productos ADD COLUMN ${col} ${type};`);
      console.log(`🟢 Columna agregada: ${col}`);
    } catch (err) {
      // Si ya existe, ignoramos
      if (!err.message.includes("duplicate column")) {
        console.log(`⚠ Error agregando ${col}:`, err.message);
      }
    }
  }
}

// =======================================================
// 4) Restaurar catálogo Atlas → SQLite
// =======================================================
async function restoreProducts() {
  console.log("📦 Leyendo catálogo de Atlas…");
  const productos = await ProductAtlas.find();

  console.log(`📦 Productos Atlas encontrados: ${productos.length}`);

  // Vaciar tabla
  await ProductSQLite.destroy({ where: {} });

  for (const p of productos) {
    await ProductSQLite.create({
      id_global: p.id_global,
      nombre: p.nombre,
      categoria: p.categoria,
      precio_compra: p.precio_compra,
      precio_venta: p.precio_venta,
      precio_compra_pendiente: p.precio_compra_pendiente,
      stock: p.stock,
      unidad: p.unidad,
      imagen: p.imagen,
      creadoPor: p.creadoPor,
      creadoEn: p.creadoEn,

      // Lotes / precios reales
      precio_actual: p.precio_actual,
      precio_viejo: p.precio_viejo,
      precio_nuevo: p.precio_nuevo,
    });
  }

  console.log("✅ Catálogo restaurado correctamente en SQLite");
}

// =======================================================
// 5) EJECUCIÓN
// =======================================================
(async () => {
  await connectAtlas();
  await sqlite.authenticate();
  console.log("🟢 SQLite conectado");

  await ensureColumns();

  await restoreProducts();

  console.log("🎉 FIX COMPLETO — SQLite ya está limpio, sincronizado y funcional");
  process.exit(0);
})();
