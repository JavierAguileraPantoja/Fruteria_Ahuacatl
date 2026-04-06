// src/utils/pushProductChange.js
// =======================================================
const { ProductMongo, ProductMongoLocal, ProductSQLite } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function pushProductChange(producto) {
  try {
    const online = getEstadoInternet();
    
    // Convertimos el documento de Mongo a un objeto plano
    const data = producto.toObject();
    const idUnico = data.id_global;

    // 1. Limpiamos datos técnicos de Mongo
    delete data._id;
    delete data.__v;
    data._fromLocalSync = true;

    // --- A. ACTUALIZACIÓN INMEDIATA EN SQLITE (LA BODEGA) ---
    // Usamos el UPSERT nativo que definimos en models/product.js
    // Esto ya no usa .query() de Sequelize, por lo que no fallará.
    try {
      await ProductSQLite.upsert(data);
      console.log("📉 SQLite (Bodega) actualizado:", data.nombre);
    } catch (sqliteErr) {
      console.error("⚠️ Error guardando en SQLite (bodega):", sqliteErr.message);
      // Seguimos adelante para que al menos se guarde en Mongo
    }

    // --- B. ACTUALIZACIÓN EN MONGO (Atlas o Local) ---
    if (online) {
      await ProductMongo.updateOne(
        { id_global: idUnico },
        { $set: data },
        { upsert: true }
      );
      console.log("🔼 Local → Atlas (Evento):", data.nombre);
      return "subido_a_atlas";
    } else {
      await ProductMongoLocal.updateOne(
        { id_global: idUnico },
        { $set: data },
        { upsert: true }
      );
      console.log("💾 Offline → Guardado en Mongo Local:", data.nombre);
      return "guardado_en_local";
    }

  } catch (err) {
    console.error("❌ Error crítico en pushProductChange:", err.message);
    return "error";
  }
}

module.exports = pushProductChange;