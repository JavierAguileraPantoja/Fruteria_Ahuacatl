// src/models/users.js
// =======================================
//  MODELO DE USUARIO (Atlas + Local)
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
//  Esquema único compartido (CORREGIDO)
// ---------------------------------------
const UserSchema = new mongoose.Schema({
  // Cambiamos required a false para que registros viejos o incompletos no bloqueen el SYNC
  name: { type: String, required: false, default: "Usuario sin nombre" }, 
  email: { type: String, required: true }, // unique lo controla Atlas
  phone: { type: String, required: false, default: "0000000000" },
  image: { type: String, required: false, default: "default.png" }, 
  password: { type: String, required: true },
  role: {
    type: String,
    // AGREGAMOS "cleaner" a la lista para que Atlas lo acepte
    enum: ["administrador", "dueno", "vendedor", "bodeguero", "cleaner"], 
    default: "vendedor"
  },
  created: { type: Date, default: Date.now }
});

// ---------------------------------------
// Métodos de usuario
// ---------------------------------------
UserSchema.statics.encryptPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

UserSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ---------------------------------------
//  Modelos Atlas y Local
// ---------------------------------------
const UserAtlas =
  atlasConnection.models.User || atlasConnection.model("User", UserSchema);

const UserLocal =
  localConnection.models.User ||
  localConnection.model("User", UserSchema);

// ---------------------------------------
// Selector automático según internet
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

module.exports = {
  UserAtlas,
  UserLocal,
  getUserModel
};

