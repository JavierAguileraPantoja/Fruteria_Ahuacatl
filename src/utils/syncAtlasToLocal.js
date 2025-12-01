// src/utils/syncAtlasToLocal.js
// ======================================================
// 🔄 AHUACATL — SINCRONIZACIÓN ATLAS → MONGO LOCAL
//   • Atlas es el maestro absoluto
//   • Mongo Local solo replica
//   • Respeta id_global
//   • No borra datos locales, solo los actualiza
// ======================================================

const { ProductMongo, ProductMongoLocal } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncAtlasToLocal() {
  try {
    if (!getEstadoInternet()) {
      console.log("⛔ No se sincroniza Atlas → Local (offline)");
      return;
    }

    console.log("🌐 Sync Atlas → Local…");

    const productosAtlas = await ProductMongo.find();
    let count = 0;

    for (const p of productosAtlas) {
      if (!p.id_global) continue;

      const plain = p.toObject();
      delete plain._id;
      delete plain.__v;

      await ProductMongoLocal.updateOne(
        { id_global: p.id_global },
        { $set: plain },
        { upsert: true }
      );

      count++;
    }

    console.log(`🟢 Sync Atlas → Local COMPLETO (${count})`);
  } catch (err) {
    console.log("❌ Error en syncAtlasToLocal:", err.message);
  }
}

module.exports = syncAtlasToLocal;
