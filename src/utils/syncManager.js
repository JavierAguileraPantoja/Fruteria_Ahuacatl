// src/utils/syncManager.js
// =======================================================
// 🔄 AHUACATL SYNC MANAGER — FLUJO OFICIAL
// ONLINE : Atlas → Local → SQLite
// OFFLINE: Local ↔ SQLite
// RECONEXIÓN: Local → Atlas → Local → SQLite
// =======================================================

const syncAtlasToLocal = require("./syncAtlasToLocal");
const syncProductsLocalToAtlas = require("./syncProductsLocalToAtlas");
const syncVentasLocalToAtlas = require("./syncVentasLocalToAtlas");

const syncUsersToSQLite = require("./syncUsersToSQLite");
const syncProductsToSQLite = require("./syncProductsToSQLite");
const syncSQLiteToMongo = require("./syncSQLiteToMongo");

const { getEstadoInternet } = require("../databases/mongoPrincipal");

let syncing = false;

// ====================================================
// SINCRONIZACIÓN COMPLETA
// ====================================================
async function fullSync(origen = "manual") {
  if (syncing) {
    console.log(`⏳ [SYNC] Ya hay una sincronización en curso. Motivo: ${origen}`);
    return;
  }

  syncing = true;
  console.log(`🔄 [SYNC] Iniciando FULL SYNC. Motivo: ${origen}`);

  try {
    const online = getEstadoInternet();

    // 1) Si hay internet → Atlas manda
    if (online) {
      console.log("🌎 [SYNC] Internet OK → Atlas → Local → SQLite");
      await syncAtlasToLocal();
    } else {
      console.log("⚠ [SYNC] Sin internet → se omite Atlas → Local");
    }

    // 2) Mongo Local → SQLite (usuarios + productos)
    console.log("👥 [SYNC] Local → SQLite (usuarios)...");
    await syncUsersToSQLite();

    console.log("🍎 [SYNC] Local → SQLite (productos)...");
    await syncProductsToSQLite();

    // 3) SQLite → Mongo Local (por si hubo cambios locales)
    console.log("🗂 [SYNC] SQLite → Mongo Local...");
    await syncSQLiteToMongo();

    // 4) Si hay internet → subir cambios offline a Atlas
    if (online) {
      console.log("⬆ [SYNC] Local → Atlas (productos)...");
      await syncProductsLocalToAtlas();

      console.log("⬆ [SYNC] Local → Atlas (ventas)...");
      await syncVentasLocalToAtlas();
    }

    console.log("✅ [SYNC] FULL SYNC COMPLETADA");
  } catch (err) {
    console.error("❌ [SYNC] Error general:", err.message);
  }

  syncing = false;
}

// ====================================================
//  WATCHER DESACTIVADO (solo runSync.js controla internet)
// ====================================================
function startSyncWatcher() {
  console.log("⚠️ SyncWatcher de syncManager DESACTIVADO — runSync.js controla internet.");
}

module.exports = { fullSync, startSyncWatcher };
