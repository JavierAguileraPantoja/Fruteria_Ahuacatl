// src/utils/restoreSQLiteFromAtlas.js
// =======================================================
// 🛠 RESTAURAR TABLA productos EN SQLITE DESDE ATLAS
// =======================================================

require("dotenv").config();
const { Sequelize } = require("sequelize");
const mongoose = require("mongoose");

console.log("🟢 Iniciando restauración de SQLite desde Atlas…");

// =======================================================
// 1️⃣ Conexión a Atlas
// =======================================================
const ATLAS_URI = process.env.MONGO_ATLAS_URI;

if (!ATLAS_URI) {
  console.log("❌ ERROR: MONGO_ATLAS_URI no está definido en .env");
  process.exit(1);
}

mongoose
  .connect(ATLAS_URI, { dbName: "fruteria_ahuacatl" })
  .then(() => console.log("🟢 Conectado a Atlas"))
  .catch((err) => {
    console.log("❌ Error conectando a Atlas:", err.message);
    process.exit(1);
  });

// Modelo dinámico de productos en Atlas
const ProductAtlas =
  mongoose.models.ProductAtlas ||
  mongoose.model(
    "ProductAtlas",
    new mongoose.Schema({}, { strict: false, collection: "products" })
  );

// =======================================================
// 2️⃣ Conexión a SQLite
// =======================================================
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./src/data/bodega.sqlite",
  logging: false,
});

const ProductSQLite = sequelize.define(
  "productos",
  {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    id_global: { type: Sequelize.STRING },
    nombre: { type: Sequelize.STRING },
    categoria: { type: Sequelize.STRING },
    precio_compra: { type: Sequelize.FLOAT },
    precio_venta: { type: Sequelize.FLOAT },
    precio_compra_pendiente: { type: Sequelize.FLOAT },
    stock: { type: Sequelize.INTEGER },
    unidad: { type: Sequelize.STRING },
    imagen: { type: Sequelize.STRING },
    creadoPor: { type: Sequelize.STRING },
    creadoEn: { type: Sequelize.DATE },
    precio_actual: { type: Sequelize.FLOAT },
    precio_viejo: { type: Sequelize.FLOAT },
    precio_nuevo: { type: Sequelize.FLOAT },
  },
  { timestamps: false }
);

// =======================================================
// 3️⃣ Restaurar catálogo
// =======================================================
async function restoreSQLite() {
  try {
    console.log("📦 Leyendo catálogo desde Atlas…");

    const productosAtlas = await ProductAtlas.find();
    console.log("📦 Productos encontrados:", productosAtlas.length);

    console.log("🗑 Borrando tabla productos en SQLite…");
    await ProductSQLite.destroy({ where: {} });

    for (const p of productosAtlas) {
      await ProductSQLite.create({
        id_global: p.id_global,
        nombre: p.nombre,
        categoria: p.categoria,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        precio_compra_pendiente: p.precio_compra_pendiente || 0,
        stock: p.stock,
        unidad: p.unidad,
        imagen: p.imagen,
        creadoPor: p.creadoPor,
        creadoEn: p.creadoEn,
        precio_actual: p.precio_actual,
        precio_viejo: p.precio_viejo,
        precio_nuevo: p.precio_nuevo,
      });
    }

    console.log("🎉 RESTAURACIÓN COMPLETADA — SQLite ahora está 100% idéntico a Atlas");
    process.exit(0);
  } catch (err) {
    console.log("❌ Error restaurando SQLite:", err.message);
    process.exit(1);
  }
}

restoreSQLite();
