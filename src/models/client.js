const mongoose = require('mongoose');
const { Schema } = mongoose;
const { atlasConnection, localConnection, getEstadoInternet } = require("../databases/mongoPrincipal");

const clientSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true }, 
    email: { type: String, default: "" },
    address: { type: String, default: "" }, // ← NUEVO: Dirección de entrega
    type: { type: String, enum: ["general", "pre-mayoreo", "mayoreo"], default: "general" }, // ← NUEVO: Tipo de precio
    lastPurchase: { type: Date, default: Date.now },
    totalSpent: { type: Number, default: 0 }
});

const ClientAtlas = atlasConnection.models.Client || atlasConnection.model("Client", clientSchema);
const ClientLocal = localConnection.models.Client || localConnection.model("Client", clientSchema);

function getClientModel() {
    return getEstadoInternet() ? ClientAtlas : ClientLocal;
}

module.exports = { getClientModel, ClientAtlas, ClientLocal };