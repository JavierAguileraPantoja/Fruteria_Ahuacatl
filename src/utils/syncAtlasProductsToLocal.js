// src/utils/syncAtlasProductsToLocal.js
// =======================================================
//   Atlas → Local (Productos)
//    Colección: "products"
//    SIN tocar stock, lotes ni mermas
//    SIN duplicados (usa id_global + nombre/categoría/unidad)
// =======================================================

const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { atlasConnection, localConnection } = require("../databases/mongoPrincipal");

// Esquema flexible apuntando a "products"
const productSchema = new mongoose.Schema({}, { strict: false, collection: "products" });

const ProductAtlas =
  atlasConnection.models.ProductAtlas ||
  atlasConnection.model("ProductAtlas", productSchema);

const ProductLocal =
  localConnection.models.ProductLocal ||
  localConnection.model("ProductLocal", productSchema);

async function syncAtlasProductsToLocal() {
  try {
    console.log("🍎 Sync Productos Atlas → Local (solo catálogo, sin stock/lotes)…");

    const atlasProducts = await ProductAtlas.find();

    for (const p of atlasProducts) {
      const plain = p.toObject();

      //  Asegurar id_global en ATLAS
      if (!plain.id_global) {
        plain.id_global = uuidv4();
        p.id_global = plain.id_global;
        await p.save();
        console.log("🔑 Asignado id_global en Atlas a:", plain.nombre);
      }

      const globalId = plain.id_global;

      //  Campos que NO quiero sobrescribir desde Atlas
      delete plain.stock;
      delete plain.stock_precio_viejo;
      delete plain.stock_precio_nuevo;
      delete plain.precio_actual;
      delete plain.mermas;
      delete plain.precio_compra_pendiente;
      delete plain.__v;
      delete plain._id;
      delete plain.createdAt;
      delete plain.updatedAt;
      delete plain._fromLocalSync;

      // Buscar por id_global
      let localDoc = await ProductLocal.findOne({ id_global: globalId });

      // Si no existe por id_global, buscar por llave lógica
      if (!localDoc) {
        localDoc = await ProductLocal.findOne({
          nombre: p.nombre,
          categoria: p.categoria,
          unidad: p.unidad,
        });
      }

      if (localDoc) {
        // Asegurar mismo id_global
        if (String(localDoc.id_global) !== String(globalId)) {
          localDoc.id_global = globalId;
        }

        Object.assign(localDoc, plain);
        await localDoc.save();
        console.log("🔄 Actualizado catálogo Local:", p.nombre);
      } else {
        // Crear catálogo base en Local
        await ProductLocal.updateOne(
          { id_global: globalId },
          { $set: plain },
          { upsert: true }
        );
        console.log("➕ Creado catálogo Local:", p.nombre);
      }
    }

    console.log("🟢 Productos Atlas → Local sincronizados correctamente.");
  } catch (err) {
    console.error("❌ Error en syncAtlasProductsToLocal:", err.message);
  }
}

module.exports = syncAtlasProductsToLocal;
