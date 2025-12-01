// src/sync/connections.js
const mongoose = require("mongoose");
const monitor = require("./internet");

let activeDB = "local"; // valor inicial seguro

const atlas = mongoose.createConnection(process.env.MONGO_ATLAS_URI, {
  serverSelectionTimeoutMS: 5000
});
const local = mongoose.createConnection(process.env.MONGO_LOCAL_URI, {
  serverSelectionTimeoutMS: 3000
});

// Eventos
atlas.on("connected", () => console.log("🟢 Conectado a Atlas"));
atlas.on("error", err => console.log("❌ Atlas error:", err.message));

local.on("connected", () => console.log("🏠 Conectado a Mongo Local"));
local.on("error", err => console.log("❌ Local error:", err.message));

// Cambios de conexión segun internet
monitor.on("online", () => {
  console.log("🌐 Restaurado Internet → modo ONLINE");
  activeDB = "atlas";
});

monitor.on("offline", () => {
  console.log("⚠ Sin Internet → modo OFFLINE");
  activeDB = "local";
});

// Función para saber cuál DB usar
function getDB() {
  return activeDB === "atlas" ? atlas : local;
}

module.exports = { atlas, local, getDB };
