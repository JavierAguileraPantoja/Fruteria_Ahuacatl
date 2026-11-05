// src/utils/syncAtlasToLocal.js

const { ProductMongo, ProductMongoLocal } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncAtlasToLocal() {
  try {

    if (!getEstadoInternet()) {
      console.log("⛔ No se ejecuta Atlas → Local (sin internet)");
      return;
    }

    console.log("🌐 Sync Atlas → Local (solo catálogo)...");

    const productosAtlas = await ProductMongo.find();

    let actualizados = 0;

    for (const p of productosAtlas) {

      if (!p.id_global) continue;

      await ProductMongoLocal.updateOne(
        { id_global: p.id_global },
        {
          $set: {

            id_global: p.id_global,

            nombre: p.nombre,
            categoria: p.categoria,
            unidad: p.unidad,

            imagen: p.imagen,
            imagenes: p.imagenes || [p.imagen],

            precio_compra: p.precio_compra,
            precio_venta: p.precio_venta,
            precio_compra_pendiente: p.precio_compra_pendiente,

            creadoPor: p.creadoPor,
            creadoEn: p.creadoEn

          }
        },
        {
          upsert: true,
          timestamps: false
        }
      );

      actualizados++;
    }

    console.log(
      `🟢 Sync Atlas → Local (catálogo) COMPLETADO: ${actualizados}`
    );

  } catch (err) {

    console.error(
      "❌ Error en syncAtlasToLocal:",
      err.message
    );

  }
}

module.exports = syncAtlasToLocal;