// src/databases/mongoPrincipal.js
const mongoose = require("mongoose");
const dns = require("dns");

const atlasURI = process.env.MONGO_ATLAS_URI;
const localURI = process.env.MONGO_LOCAL_URI;

let estadoInternet = false;

async function hayInternet() {
  return new Promise((resolve) => {
    dns.lookup("google.com", (err) => resolve(!err));
  });
}

// ==============================
// Conexión Atlas
// ==============================
const atlasConnection = mongoose.createConnection(atlasURI, {
  serverSelectionTimeoutMS: 5000,
});

// ==============================
// Conexión Mongo LOCAL (Docker con AUTH)
// ==============================
const localConnection = mongoose.createConnection(localURI, {
  serverSelectionTimeoutMS: 3000,
});

// ==============================
// Eventos conexión Atlas
// ==============================
atlasConnection.on("connected", () => {
  console.log("🟢 Atlas conectado como BD principal");
});
atlasConnection.on("error", (err) => {
  console.log("🔴 Atlas desconectado:", err.message);
});

// ==============================
// Eventos conexión Local
// ==============================
localConnection.on("connected", () => {
  console.log("🏠 Mongo Local conectado (Docker)");
});
localConnection.on("error", (err) => {
  console.log("❌ Error Mongo Local:", err.message);
});

// ==============================
// Verificación de red
// ==============================
setInterval(async () => {
  const online = await hayInternet();
  if (online && !estadoInternet) {
    console.log("🌐 Internet restaurado → Modo ONLINE");
    estadoInternet = true;
  }
  if (!online && estadoInternet) {
    console.log("⚠ Sin internet → Modo OFFLINE");
    estadoInternet = false;
  }
}, 10000);

// ==============================
// Estado inicial
// ==============================
(async () => {
  const online = await hayInternet();
  estadoInternet = online;
  console.log(online ? "🚀 Inicio en modo ONLINE" : "🚀 Inicio en modo OFFLINE");
})();

// ==============================
// Exportar conexiones y auxiliaries de estado
// ==============================
module.exports = {
  atlasConnection,
  localConnection,
  getEstadoInternet: () => estadoInternet,
  // 🛡️ Funciones para verificar disponibilidad en tiempo real
  esAtlasListo: () => atlasConnection.readyState === 1,
  esLocalListo: () => localConnection.readyState === 1,
};