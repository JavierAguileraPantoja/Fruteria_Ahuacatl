const mongoose = require('mongoose');
const { Schema } = mongoose;
// Usamos tus mismas conexiones de mongoPrincipal
const { atlasConnection, localConnection, getEstadoInternet } = require("../databases/mongoPrincipal");

const clientSchema = new Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true }, 
    email: { type: String },
    lastPurchase: { type: Date, default: Date.now },
    totalSpent: { type: Number, default: 0 }
});

// Creamos los dos modelos como haces con UserAtlas y UserLocal
const ClientAtlas = atlasConnection.models.Client || atlasConnection.model("Client", clientSchema);
const ClientLocal = localConnection.models.Client || localConnection.model("Client", clientSchema);

// Tu función selector que ya conoces
function getClientModel() {
    return getEstadoInternet() ? ClientAtlas : ClientLocal;
}

module.exports = { getClientModel,getClientModel, ClientAtlas, ClientLocal };