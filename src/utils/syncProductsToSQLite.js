// src/utils/syncProductsToSQLite.js
// =======================================================
// 🚀 AHUACATL — Productos → SQLite (Catálogo Seguro)
//   • SOLO copia catálogo (NO lotes detallados, NO mermas)
//   • id_global obligatorio
//   • SQLite jamás sobreescribe Local/Mongo
//   • Solo actúa en modo ONLINE (Atlas manda)
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
      if (!p.id_global) continue; // seguridad máxima

      const data = {
        id_global: p.id_global,
        nombre: p.nombre,
        categoria: p.categoria,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        stock: p.stock,
        unidad: p.unidad,
        imagen: p.imagen,
        creadoPor: p.creadoPor,
        creadoEn: p.creadoEn
      };

      await ProductSQLite.upsert(data);
      count++;
    }

    console.log(`🟢 SQLite actualizado: ${count} productos sincronizados.`);
  } catch (err) {
    console.error("❌ Error en syncProductsToSQLite:", err.message);
  }
}

module.exports = syncProductsToSQLite;
