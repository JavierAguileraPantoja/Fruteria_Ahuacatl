// src/utils/pushProductChange.js
// =======================================================
// 🚀 SINCRONIZACIÓN POR EVENTOS (Local → Atlas)
//  - Se ejecuta cuando se modifica 1 SOLO producto
//  - Evita fullSync completo
//  - Usa id_global como llave universal
//  - Tiene bandera anti-loop para el watcher
// =======================================================

const { ProductMongo, ProductMongoLocal } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function pushProductChange(producto) {
  try {
    const online = getEstadoInternet();

    const data = producto.toObject();
    delete data._id;
    delete data.__v;

    // Marca anti-loop
    data._fromLocalSync = true;

    if (online) {
      await ProductMongo.updateOne(
        { id_global: producto.id_global },
        { $set: data },
        { upsert: true }
      );

      console.log("🔼 Local → Atlas (evento) producto:", data.nombre);
      return "subido_a_atlas";
    }

    await ProductMongoLocal.updateOne(
      { id_global: producto.id_global },
      { $set: data },
      { upsert: true }
    );

    console.log("💾 Offline → producto guardado local:", data.nombre);
    return "guardado_en_local";
  } catch (err) {
    console.log("❌ Error pushProductChange:", err.message);
    return "error";
  }
}

module.exports = pushProductChange;
