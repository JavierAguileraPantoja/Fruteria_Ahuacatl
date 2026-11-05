// ======================================================================
// src/utils/syncProductsToSQLite.js
// SINCRONIZACIÓN DE CATÁLOGO Y STOCK DE ATLAS A SQLITE POR FECHA
// ======================================================================

const { ProductMongo, ProductSQLite } = require("../models/product");
const { getEstadoInternet } = require("../databases/mongoPrincipal");

async function syncProductsToSQLite(isOnlineParam = null) {
  try {
    const isOnline = isOnlineParam ?? getEstadoInternet();
    if (!isOnline) return;

    console.log("📦 Evaluando Catálogo Atlas → SQLite (Last-Write-Wins)...");

    const productosAtlas = await ProductMongo.find();
    let actualizados = 0;
    let conservados = 0;

    for (const p of productosAtlas) {
      // 1. Buscar si el producto ya existe en SQLite
      const pSqlite = await ProductSQLite.findOne({
        $or: [{ id_global: p.id_global }, { nombre: p.nombre }]
      });

      // 2. Convertir ambas fechas a milisegundos Unix
      const timeMongo = new Date(p.updatedAt || 0).getTime();
      const timeSqlite = pSqlite ? new Date(pSqlite.fecha_actualizacion || 0).getTime() : 0;

      // 3. Sincronizar stock y datos SOLO si Mongo es más reciente o si el registro no existe localmente
      if (!pSqlite || timeMongo > timeSqlite) {
        await ProductSQLite.upsert({
          id_global: p.id_global || p._id.toString(),
          nombre: p.nombre,
          categoria: p.categoria,
          precio_compra: p.precio_compra,
          precio_venta: p.precio_venta,
          precio_compra_pendiente: p.precio_compra_pendiente,
          unidad: p.unidad,
          imagen: p.imagen,
          stock: p.stock, // 🟢 Se incluye el stock de forma segura
          fecha_actualizacion: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString()
        });
        actualizados++;
      } else {
        // SQLite tiene datos más recientes, se conserva el inventario local
        conservados++;
      }
    }

    console.log(`🟢 Sincronización finalizada: ${actualizados} actualizados en SQLite, ${conservados} protegidos por ser más recientes en local.`);

  } catch (err) {
    console.error("❌ Error en syncProductsToSQLite:", err.message);
  }
}

module.exports = syncProductsToSQLite;