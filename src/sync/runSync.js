// src/sync/runSync.js
// =======================================================
// 🔄 AHUACATL — FULL SYNC ORQUESTADOR OFICIAL (VERSIÓN FINAL)
// ONLINE : Atlas → Local → SQLite + Local → Atlas
// OFFLINE: Local ↔ SQLite (solo lectura / espejo)
// RECONEXIÓN: cuando pasa de OFFLINE → ONLINE se lanza fullSync()
// =======================================================

const { getEstadoInternet } = require("../databases/mongoPrincipal");

// --- Syncs generales ---
const syncUsersToSQLite = require("../utils/syncUsersToSQLite");
const syncProductsToSQLite = require("../utils/syncProductsToSQLite");
const syncSQLiteToMongo = require("../utils/syncSQLiteToMongo");

// --- Syncs Local → Atlas ---
const syncProductsLocalToAtlas = require("../utils/syncProductsLocalToAtlas");
const syncVentasLocalToAtlas = require("../utils/syncVentasLocalToAtlas");

// --- Sync Atlas → Local (usuarios + ventas) ---
const syncAtlasToLocal = require("../utils/syncAtlasToLocal");

// --- Sync Atlas → Local (solo productos, sin stock/lotes/mermas) ---
const syncAtlasProductsToLocal = require("../utils/syncAtlasProductsToLocal");

let syncInProgress = false;
let watcherRunning = false;
let lastInternetState = null;

// =======================================================
// 🔁 FULL SYNC PRINCIPAL (ORDEN CORRECTO)
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
    // ===========================================================
    // 1) ONLINE → BAJAR *TODO* DESDE ATLAS (primero datos puros)
    // ===========================================================
    if (snapshotOnline) {
      console.log("🌐 Sync Atlas → Local…");
      await syncAtlasToLocal();          // usuarios + ventas
      await syncAtlasProductsToLocal();  // catálogo limpio SIN stock
    }

    // ===========================================================
    // 2) Usuarios y productos → SQLite (solo espejo)
    // ===========================================================
    await syncUsersToSQLite();
    await syncProductsToSQLite(snapshotOnline); // Solo si ONLINE

    // ===========================================================
    // 3) SQLite → Mongo Local (solo usuarios)
    // ===========================================================
    await syncSQLiteToMongo();

    // ===========================================================
    // 4) SOLO SI ONLINE → subir cambios locales REALES
    // ===========================================================
    if (snapshotOnline) {

      // Subir SOLO stock y mermas (versión protegida)
      await syncProductsLocalToAtlas();

      // Subir ventas locales (idempotente)
      await syncVentasLocalToAtlas();
    }

    console.log("🟢 FULL SYNC COMPLETADO");
  } catch (err) {
    console.error("❌ Error en fullSync:", err);
  } finally {
    syncInProgress = false;
  }
}

// =======================================================
// 👁️ WATCHER — SOLO reacciona OFFLINE → ONLINE
// =======================================================
function startSyncWatcher() {
  if (watcherRunning) return;

  watcherRunning = true;
  lastInternetState = getEstadoInternet();

  console.log("🛰 Watcher de sincronización iniciado…");

  setInterval(async () => {
    const now = getEstadoInternet();

    // SOLO dispara cuando pasa de offline → online
    if (now && !lastInternetState) {
      console.log("🌐 Internet restaurado → Lanzando FULL SYNC");
      await fullSync("internet_restaurado");
    }

    lastInternetState = now;
  }, 2000);
}

module.exports = { fullSync, startSyncWatcher };
