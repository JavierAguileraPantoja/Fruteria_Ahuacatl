// src/models/users.js
// =======================================
// 📘 MODELO DE USUARIO (Atlas + Local)
// Funcionando OFFLINE / ONLINE sin romper sesión
// =======================================

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const {
  atlasConnection,
  localConnection,
  getEstadoInternet
} = require("../databases/mongoPrincipal");

// ---------------------------------------
// 🔹 Esquema único compartido
// ---------------------------------------
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }, // unique lo controla Atlas
  phone: { type: String, required: true },
  image: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["administrador", "dueno", "vendedor", "bodeguero"],
    default: "vendedor"
  },
  created: { type: Date, default: Date.now }
});

// ---------------------------------------
// 🔐 Métodos de usuario
// ---------------------------------------
UserSchema.statics.encryptPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ---------------------------------------
// 🧠 Modelos Atlas y Local
// ---------------------------------------
const UserAtlas =
  atlasConnection.models.User || atlasConnection.model("User", UserSchema);

const UserLocal =
  localConnection.models.User ||
  localConnection.model("User", UserSchema);
// OJO: usamos el mismo nombre del modelo (“User”)
// Si usas “UserLocal” como nombre, mongoose creará OTRA colección
// y puede causar problemas OFFLINE.

// ---------------------------------------
// 🏆 Selector automático según internet
// ---------------------------------------
function getUserModel() {
  const online = getEstadoInternet();

  if (online) {
    console.log("📡 MODELO USUARIO: Atlas (ONLINE)");
    return UserAtlas;
  } else {
    console.log("🏠 MODELO USUARIO: Local (OFFLINE)");
    return UserLocal;
  }
}

// ---------------------------------------
// EXPORTAMOS TODO
// ---------------------------------------
module.exports = {
  UserAtlas,
  UserLocal,
  getUserModel
};
