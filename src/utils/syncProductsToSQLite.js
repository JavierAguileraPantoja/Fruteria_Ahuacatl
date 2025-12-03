// src/utils/syncProductsToSQLite.js
// =======================================================

const { ProductMongo, ProductSQLite } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncProductsToSQLite(isOnlineParam = null) {
  try {
    const isOnline = isOnlineParam ?? getEstadoInternet();
    if (!isOnline) {
      console.log("⛔ NO se sincroniza SQLite (offline).");
      return;
    }

    console.log("📦 Sync Productos → SQLite (catálogo)…");

    const productosAtlas = await ProductMongo.find();
    let count = 0;

    for (const p of productosAtlas) {
      if (!p.id_global) continue;

      await ProductSQLite.upsert({
        id_global: p.id_global,
        nombre: p.nombre,
        categoria: p.categoria,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        precio_compra_pendiente: p.precio_compra_pendiente ?? 0,
        stock: p.stock ?? 0,
        unidad: p.unidad,
        imagen: p.imagen
      });

      count++;
    }

    console.log(`🟢 SQLite actualizado: ${count} productos sincronizados.`);
  } catch (err) {
    console.error("❌ Error en syncProductsToSQLite:", err);
  }
}

module.exports = syncProductsToSQLite;
