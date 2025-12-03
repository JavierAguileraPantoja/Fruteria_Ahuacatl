// src/utils/syncAtlasToSQLite.js
// =======================================================
// AHUACATL — Sync Atlas → SQLite (Catálogo Seguro)
//   • NO pisa stock si Local y Atlas no coinciden
//   • Solo catálogo (nombres, precios, unidad, imagen)
// =======================================================

const { ProductMongo, ProductMongoLocal, ProductSQLite } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncAtlasToSQLite() {
  try {
    const isOnline = getEstadoInternet();
    if (!isOnline) return console.log("⛔ SQLite no se sincroniza (offline)");

    console.log("🍏 Sync Atlas → SQLite (catálogo seguro)…");

    const atlasProducts = await ProductMongo.find();

    let count = 0;

    for (const p of atlasProducts) {
      if (!p.id_global) continue;

      // -----------------------------------
      //  NO sincronizar si Local y Atlas difieren en stock
      // -----------------------------------
      const local = await ProductMongoLocal.findOne({ id_global: p.id_global });

      if (local && Number(local.stock) !== Number(p.stock)) {
        console.log(
          `⛔ Saltando ${p.nombre}: Stock Local=${local.stock} / Atlas=${p.stock}`
        );
        continue; // NO actualizamos SQLite todavía
      }

      // -----------------------------------
      // 🧽 Catálogo limpio (sin campos peligrosos)
      // -----------------------------------
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

    console.log(`🟢 SQLite actualizado: ${count} productos seguros.`);

  } catch (err) {
    console.error("❌ Error en syncAtlasToSQLite:", err.message);
  }
}

module.exports = syncAtlasToSQLite;
