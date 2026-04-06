// src/utils/syncProductsLocalToAtlas.js
const { localConnection, atlasConnection } = require("../databases/mongoPrincipal");
const { ProductMongo, ProductMongoLocal } = require("../models/product");

async function syncProductsLocalToAtlas() {
  try {
    console.log("🍏 Sincronizando Stock Local → Atlas (Modo Lotes)...");

    const locales = await ProductMongoLocal.find();
    let cambios = 0;

    for (const pLocal of locales) {
      if (!pLocal.id_global) continue;

      // Actualizamos Atlas para que tenga exactamente lo mismo que el local
      // Usamos el modelo ProductMongo que ya está configurado
      await ProductMongo.updateOne(
        { id_global: pLocal.id_global },
        { 
          $set: { 
            stock: pLocal.stock,
            stock_precio_viejo: pLocal.stock_precio_viejo,
            stock_precio_nuevo: pLocal.stock_precio_nuevo,
            precio_actual: pLocal.precio_actual,
            mermas: pLocal.mermas || [],
            updatedAt: new Date()
          } 
        }
      );
      cambios++;
    }

    console.log(`🟢 Sync Local → Atlas COMPLETO (${cambios} productos)`);
  } catch (err) {
    console.error("❌ Error en Sync Local-Atlas:", err.message);
  }
}

module.exports = syncProductsLocalToAtlas;