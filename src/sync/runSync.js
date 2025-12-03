// src/sync/runSync.js
// =======================================================
// AHUACATL — FULL SYNC ORQUESTADOR OFICIAL (VERSIÓN FINAL)
// =======================================================

const { getEstadoInternet } = require("../databases/mongoPrincipal");

// --- Syncs generales ---
const syncUsersToSQLite = require("../utils/syncUsersToSQLite");
const syncProductsToSQLite = require("../utils/syncProductsToSQLite");
const syncSQLiteToMongo = require("../utils/syncSQLiteToMongo");

// --- Syncs Local → Atlas ---
const syncProductsLocalToAtlas = require("../utils/syncProductsLocalToAtlas");
const syncVentasLocalToAtlas = require("../utils/syncVentasLocalToAtlas");

// --- Sync Atlas → Local ---
const syncAtlasToLocal = require("../utils/syncAtlasToLocal");
const syncAtlasProductsToLocal = require("../utils/syncAtlasProductsToLocal");

let syncInProgress = false;
let watcherRunning = false;
let lastInternetState = null;

// =======================================================
// FULL SYNC CORREGIDO — ORDEN REAL OFFLINE-FIRST
// =======================================================
async function fullSync(reason = "manual") {
  if (syncInProgress) {
    console.log(`⏳ fullSync ignorado (ya corriendo)… (${reason})`);
    return;
  }

  const snapshotOnline = getEstadoInternet();
  syncInProgress = true;

  console.log(
    `🔄 FULL SYNC iniciado (${reason}) [online=${snapshotOnline ? "sí" : "no"}]`
  );

  try {

    // ======================================================
    // 1) SI HAY INTERNET: SUBIR PRIMERO LO LOCAL → ATLAS
    // ======================================================
    if (snapshotOnline) {
      console.log("⬆ Subiendo cambios locales → Atlas…");

      await syncProductsLocalToAtlas();  // stock + mermas
      await syncVentasLocalToAtlas();    // ventas offline

      console.log("🟢 Cambios locales subidos a Atlas.");
    }

    // ======================================================
    // 2) AHORA SÍ BAJAR ATLAS → LOCAL (SIN STOCK)
    // ======================================================
    if (snapshotOnline) {
      console.log("🌐 Sync Atlas → Local…");
      await syncAtlasToLocal();            // usuarios + ventas históricas
      await syncAtlasProductsToLocal();    // solo catálogo SIN stock
    }

    // ======================================================
    // 3) Usuarios + catálogo → SQLite
    // ======================================================
    await syncUsersToSQLite();
    await syncProductsToSQLite(snapshotOnline);

    // ======================================================
    // 4) SQLite → Mongo Local (solo usuarios)
    // ======================================================
    await syncSQLiteToMongo();

    console.log("🟢 FULL SYNC COMPLETADO");

  } catch (err) {
    console.error("❌ Error en fullSync:", err);
  } finally {
    syncInProgress = false;
  }
}

// =======================================================
// WATCHER (solo OFFLINE → ONLINE)
// =======================================================
function startSyncWatcher() {
  if (watcherRunning) return;

  watcherRunning = true;
  lastInternetState = getEstadoInternet();

  console.log("🛰 Watcher de sincronización iniciado…");

  setInterval(async () => {
    const now = getEstadoInternet();

    // Solo dispara cuando pasa de offline → online
    if (now && !lastInternetState) {
      console.log("🌐 Internet restaurado → Lanzando FULL SYNC");
      await fullSync("internet_restaurado");
    }

    lastInternetState = now;
  }, 2000);
}

module.exports = { fullSync, startSyncWatcher };
