// =======================================================
// src/sync/runSync.js
// ORQUESTRADOR PRINCIPAL DE SINCRONIZACIÓN (BLINDADO)
// =======================================================

const { 
  atlasConnection, 
  localConnection, 
  getEstadoInternet 
} = require("../databases/mongoPrincipal");

const { 
  ProductMongo, 
  ProductMongoLocal, 
  assignMissingGlobalIDs, 
  fixMissingFields 
} = require("../models/product");

// --- Syncs generales (SQLite <-> Mongo Local) ---
const syncUsersToSQLite = require("../utils/syncUsersToSQLite");
const syncProductsToSQLite = require("../utils/syncProductsToSQLite");
const syncSQLiteToMongo = require("../utils/syncSQLiteToMongo");

// --- Syncs Local -> Atlas ---
const syncProductsLocalToAtlas = require("../utils/syncProductsLocalToAtlas");
const syncVentasLocalToAtlas = require("../utils/syncVentasLocalToAtlas");
const syncUsersLocalToAtlas = require("../utils/syncUsersLocalToAtlas");
const syncClientsLocalToAtlas = require("../utils/syncClientsLocalToAtlas");

// --- Sync Atlas -> Local ---
const syncAtlasToLocal = require("../utils/syncAtlasToLocal");
const syncAtlasProductsToLocal = require("../utils/syncAtlasProductsToLocal");

let syncInProgress = false;
let watcherRunning = false;
let lastInternetState = null;
let temporizadorReconexion = null;

function esLocalListo() {
  return localConnection && localConnection.readyState === 1;
}

function esAtlasListo() {
  return atlasConnection && atlasConnection.readyState === 1;
}

async function fullSync(reason = "manual") {
  if (process.env.NODE_ENV === "production") return;

  if (syncInProgress) {
    console.log(`⏳ Sync en progreso. Solicitud omitida (${reason}).`);
    return;
  }

  const snapshotOnline = getEstadoInternet();
  const mongoLocalActivo = esLocalListo();
  const mongoAtlasActivo = esAtlasListo();

  if (!mongoLocalActivo) {
    console.warn("⚠️ [FULL SYNC OMITE]: MongoDB Local (Docker) aún no está listo.");
    return;
  }

  syncInProgress = true;
  console.log(`\n🚀 [FULL SYNC] Iniciando proceso (Motivo: ${reason} | Online: ${snapshotOnline})`);

  try {
    // 🛡️ REPARACIONES DE ESTRUCTURA CON CHEQUEO DEFENSIVO DE TIPO
    if (typeof fixMissingFields === "function") {
      await fixMissingFields(ProductMongoLocal, "Local");
    }

    if (snapshotOnline && mongoAtlasActivo) {
      if (typeof assignMissingGlobalIDs === "function") {
        await assignMissingGlobalIDs();
      }
      if (typeof fixMissingFields === "function") {
        await fixMissingFields(ProductMongo, "Atlas");
      }
    }

    // 1️⃣ RESOLUCIÓN LOCAL (Mongo Local <-> SQLite)
    await syncUsersToSQLite();
    await syncProductsToSQLite(snapshotOnline);
    await syncSQLiteToMongo();

    // 2️⃣ SINCRONIZACIÓN CON LA NUBE
    if (snapshotOnline && mongoAtlasActivo) {
      console.log("📡 Conexión detectada: Sincronizando con MongoDB Atlas...");
      
      await syncProductsLocalToAtlas(); 
      await syncVentasLocalToAtlas();    
      await syncUsersLocalToAtlas();
      await syncClientsLocalToAtlas();   

      await syncAtlasToLocal();            
      await syncAtlasProductsToLocal();    
    } else {
      console.log("📡 Modo Offline: Se omitió la conexión con Atlas.");
    }

    console.log("🌎 FULL SYNC COMPLETADO CON ÉXITO");

  } catch (err) {
    console.error("❌ Error durante la ejecución de fullSync:", err.message);
  } finally {
    syncInProgress = false;
  }
}

function startSyncWatcher() {
  if (process.env.NODE_ENV === "production" || watcherRunning) return;

  watcherRunning = true;
  lastInternetState = getEstadoInternet();

  setInterval(() => {
    const now = getEstadoInternet();

    if (now && !lastInternetState) {
      console.log("🌐 Red detectada. Esperando 5s a que los sockets se estabilicen...");

      if (temporizadorReconexion) clearTimeout(temporizadorReconexion);

      temporizadorReconexion = setTimeout(async () => {
        console.log("🚀 Disparando sincronización tras período de estabilización.");
        await fullSync("internet_restaurado_seguro");
      }, 5000);
    }

    lastInternetState = now;
  }, 2000);
}

module.exports = { fullSync, startSyncWatcher };