// src/utils/syncProductsToSQLite.js
const { ProductMongo, ProductSQLite } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncProductsToSQLite(isOnlineParam = null) {
  try {
    const isOnline = isOnlineParam ?? getEstadoInternet();
    if (!isOnline) return;

    console.log("📦 Sincronizando Catálogo Atlas → SQLite (Motor Nativo)…");

    const productosAtlas = await ProductMongo.find();
    let count = 0;

    for (const p of productosAtlas) {
      // Usamos el método .upsert que definiste en models/product.js
      await ProductSQLite.upsert({
        id_global: p.id_global,
        nombre: p.nombre,
        categoria: p.categoria,
        precio_compra: p.precio_compra,
        precio_venta: p.precio_venta,
        precio_compra_pendiente: p.precio_compra_pendiente,
        stock: p.stock,
        unidad: p.unidad,
        imagen: p.imagen
      });
      count++;
    }

    console.log(`🟢 SQLite actualizado: ${count} productos sincronizados.`);
  } catch (err) {
    console.error("❌ Error en syncProductsToSQLite:", err.message);
  }
}

module.exports = syncProductsToSQLite;