// src/databases/mongoSecundario.js
const { localConnection } = require('./mongoPrincipal');
const mongoose = require('mongoose');

// =========================
//  USER SCHEMA (limpio)
// =========================
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, index: true },
    phone: String,
    image: String,
    password: String,
    role: String,
    created: Date
  },
  { collection: "users", timestamps: true }
);

// =========================
//  VENTA SCHEMA (con llave universal)
// =========================
const ventaSchema = new mongoose.Schema(
  {
    id_global_venta: { type: String, index: true },
    tipoCliente: String,
    clienteNombre: String,
    clienteTelefono: String,

    items: [
      {
        id_global: String,
        nombre: String,
        cantidad: Number,
        unidad: String,
        precioUnitario: Number,
        subtotal: Number
      }
    ],

    total: Number,
    estado: String,
    creadoPor: String,
    creadoEn: Date
  },
  { collection: "ventas", timestamps: true }
);

// =========================
//  MODELOS
// =========================
const UserLocal =
  localConnection.models.UserLocal ||
  localConnection.model("UserLocal", userSchema);

const VentaLocal =
  localConnection.models.VentaLocal ||
  localConnection.model("VentaLocal", ventaSchema);

module.exports = { UserLocal, VentaLocal };
