// src/utils/syncAtlasToLocal.js
// ======================================================
// AHUACATL — SINCRONIZACIÓN ATLAS → MONGO LOCAL
//    Atlas manda solo el CATÁLOGO
//    NO baja stock
//    NO baja mermas
//    NO baja lotes
//    No destruye ventas offline
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

      // Campos permitidos desde Atlas (SOLO CATÁLOGO)
      const plain = {
        id_global: p.id_global,
        nombre: p.nombre,
        categoria: p.categoria,
        unidad: p.unidad,
        imagen: p.imagen,

        // Precios base, NO afectan stock
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,

        updatedAt: new Date()
      };



      await ProductMongoLocal.updateOne(
        { id_global: p.id_global },
        { $set: plain },
        { upsert: true }
      );

      count++;
    }

    console.log(`🟢 Sync Atlas → Local COMPLETO (catálogo actualizado: ${count})`);
  } catch (err) {
    console.log("❌ Error en syncAtlasToLocal:", err.message);
  }
}

module.exports = syncAtlasToLocal;
