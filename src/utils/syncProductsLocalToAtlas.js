// src/utils/syncProductsLocalToAtlas.js
const { localConnection, atlasConnection } = require("../databases/mongoPrincipal");
const { ProductMongo, ProductMongoLocal } = require("../models/product");

async function syncProductsLocalToAtlas() {
  try {
    console.log("🍏 Sincronizando Stock Local → Atlas (Modo Inteligente: Último Gana)...");

    const locales = await ProductMongoLocal.find();
    let cambios = 0;
    let omitidos = 0;

    for (const pLocal of locales) {
      if (!pLocal.id_global) continue;

      // 1. Buscamos el producto correspondiente en Atlas
      const pAtlas = await ProductMongo.findOne({ id_global: pLocal.id_global });

      // 2. Si no existe en Atlas, lo creamos directamente
      if (!pAtlas) {
        await ProductMongo.create(pLocal.toObject());
        cambios++;
        continue;
      }

      // 3. Comparamos las fechas updatedAt para aplicar la regla "el último gana"
      const fechaLocal = new Date(pLocal.updatedAt || 0);
      const fechaAtlas = new Date(pAtlas.updatedAt || 0);

      if (fechaLocal > fechaAtlas) {
        // El registro local es más reciente, actualizamos Atlas
        await ProductMongo.updateOne(
          { id_global: pLocal.id_global },
          { 
            $set: { 
              stock: pLocal.stock,
              stock_precio_viejo: pLocal.stock_precio_viejo,
              stock_precio_nuevo: pLocal.stock_precio_nuevo,
              precio_actual: pLocal.precio_actual,
              mermas: pLocal.mermas || [],
              updatedAt: pLocal.updatedAt || new Date()
            } 
          }
        );
        cambios++;
      } else {
        // El registro en Atlas es más nuevo o igual, protegemos la nube
        omitidos++;
      }
    }

    console.log(`🟢 Sync Local → Atlas COMPLETADO. Actualizados: ${cambios}, Omitidos (Atlas más reciente): ${omitidos}`);
  } catch (err) {
    console.error("❌ Error en Sync Local-Atlas:", err.message);
  }
}

module.exports = syncProductsLocalToAtlas;