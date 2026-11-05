// src/utils/syncAtlasProductsToLocal.js

const { ProductMongo, ProductMongoLocal } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncAtlasProductsToLocal() {

  try {

    if (!getEstadoInternet()) {
      console.log("⛔ Atlas → Local cancelado (offline)");
      return;
    }

    console.log(
      "🌐 Sincronizando Productos Atlas → Local (Last Write Wins)..."
    );

    const productosAtlas = await ProductMongo.find();

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;

    for (const pAtlas of productosAtlas) {

      if (!pAtlas.id_global) continue;

      const pLocal = await ProductMongoLocal.findOne({
        id_global: pAtlas.id_global
      });

      //------------------------------------
      // NO EXISTE LOCALMENTE
      //------------------------------------
      if (!pLocal) {

        const nuevo = pAtlas.toObject();

        delete nuevo._id;

        await ProductMongoLocal.create(nuevo);

        creados++;

        continue;
      }

      //------------------------------------
      // LAST WRITE WINS
      //------------------------------------
      const fechaAtlas =
        new Date(pAtlas.updatedAt || 0).getTime();

      const fechaLocal =
        new Date(pLocal.updatedAt || 0).getTime();

      if (fechaAtlas > fechaLocal) {

        await ProductMongoLocal.updateOne(
          {
            id_global: pAtlas.id_global
          },
          {
            $set: {

              nombre: pAtlas.nombre,
              categoria: pAtlas.categoria,

              precio_compra: pAtlas.precio_compra,
              precio_venta: pAtlas.precio_venta,
              precio_compra_pendiente:
                pAtlas.precio_compra_pendiente,

              stock: pAtlas.stock,

              precio_actual: pAtlas.precio_actual,
              precio_viejo: pAtlas.precio_viejo,
              precio_nuevo: pAtlas.precio_nuevo,

              stock_precio_viejo:
                pAtlas.stock_precio_viejo,

              stock_precio_nuevo:
                pAtlas.stock_precio_nuevo,

              unidad: pAtlas.unidad,

              imagen: pAtlas.imagen,
              imagenes: pAtlas.imagenes || [],

              mermas: pAtlas.mermas || [],

              creadoPor: pAtlas.creadoPor,
              creadoEn: pAtlas.creadoEn,

              updatedAt: pAtlas.updatedAt

            }
          }
        );

        actualizados++;

      } else {

        omitidos++;
      }
    }

    console.log(
      `🟢 Atlas → Local COMPLETADO | Creados: ${creados} | Actualizados: ${actualizados} | Omitidos: ${omitidos}`
    );

  } catch (err) {

    console.error(
      "❌ Error en syncAtlasProductsToLocal:",
      err.message
    );

  }
}

module.exports = syncAtlasProductsToLocal;