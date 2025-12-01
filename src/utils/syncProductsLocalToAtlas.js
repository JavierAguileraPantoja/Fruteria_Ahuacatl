// src/utils/syncProductsLocalToAtlas.js
// =======================================================
//   Local → Atlas (VERSIÓN FINAL ACTUALIZADA 2025)
//   🟢 SOLO sube stock + mermas
//   🟢 NO toca catálogo (Atlas manda)
//   🟢 NO toca precios (Atlas manda)
//   🟢 Anti-loop real
// =======================================================

const mongoose = require("mongoose");
const {
  atlasConnection,
  localConnection
} = require("../databases/mongoPrincipal");

// Esquema flexible (products)
const productSchema = new mongoose.Schema({}, {
  strict: false,
  collection: "products"
});

const ProductAtlas =
  atlasConnection.models.ProductAtlas ||
  atlasConnection.model("ProductAtlas", productSchema);

const ProductLocal =
  localConnection.models.ProductLocal ||
  localConnection.model("ProductLocal", productSchema);

async function syncProductsLocalToAtlas() {
  try {
    console.log("🍏 Sync Local → Atlas (solo stock y mermas)…");

    const locales = await ProductLocal.find();
    let cambios = 0;

    for (const pLocal of locales) {
      const local = pLocal.toObject();
      let atlas = null;

      if (local.id_global) {
        atlas = await ProductAtlas.findOne({ id_global: local.id_global });
      }

      if (!atlas) continue;

      // Anti-loop
      if (local._fromLocalSync) continue;

      // Subir SOLO stock y mermas
      const update = {
        stock: local.stock,
        mermas: Array.isArray(local.mermas) ? local.mermas : [],
        updatedAt: new Date(),
        _fromLocalSync: true
      };

      await ProductAtlas.updateOne(
        { _id: atlas._id },
        { $set: update }
      );

      cambios++;
      console.log("⬆ Atlas actualizado (stock/mermas):", local.nombre);
    }

    console.log(`🟢 Sync Local → Atlas COMPLETO (cambios: ${cambios})`);
  } catch (err) {
    console.error("❌ Error en syncProductsLocalToAtlas:", err.message);
  }
}

module.exports = syncProductsLocalToAtlas;
