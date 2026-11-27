// models/solicitud.js
const mongoose =
  require("mongoose");

const {
  atlasConnection,
  localConnection,
  getEstadoInternet,
  esAtlasListo
} = require(
  "../databases/mongoPrincipal"
);

// =====================================
// ESQUEMA
// =====================================

const SolicitudSchema =
  new mongoose.Schema(
    {

      solicitanteId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      solicitanteNombre: {
        type: String,
        required: true,
        trim: true
      },

      solicitanteRol: {
        type: String,
        default: ""
      },

      categoria: {
        type: String,
        enum: [
          "Combustible",
          "Mantenimiento",
          "Herramientas",
          "Limpieza",
          "Papeleria",
          "Empaque",
          "Mercancia",
          "Servicios",
          "Otros"
        ],
        required: true
      },

      concepto: {
        type: String,
        required: true,
        trim: true
      },

      montoEstimado: {
        type: Number,
        required: true,
        min: 0
      },

      justificacion: {
        type: String,
        default: "",
        trim: true
      },

      estado: {
        type: String,
        enum: [
          "pendiente",
          "aprobada",
          "rechazada",
          "comprada",
          "comprobada"
        ],
        default: "pendiente"
      },

      aprobadoPorId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      aprobadoPorNombre: {
        type: String,
        default: null
      },

      fechaAprobacion: {
        type: Date,
        default: null
      },

      motivoRechazo: {
        type: String,
        default: ""
      },

      montoReal: {
        type: Number,
        default: null
      },

      fechaCompra: {
        type: Date,
        default: null
      },

      evidencia: {
        type: String,
        default: null
      },

      observacionesComprobacion: {
        type: String,
        default: ""
      },

      fechaComprobacion: {
        type: Date,
        default: null
      }

    },
    {
      timestamps: true
    }
  );

// =====================================
// ÍNDICES
// =====================================

SolicitudSchema.index({
  estado: 1
});

SolicitudSchema.index({
  solicitanteId: 1
});

SolicitudSchema.index({
  createdAt: -1
});

SolicitudSchema.index({
  categoria: 1
});

// =====================================
// MODELOS
// =====================================

const SolicitudAtlas =
  atlasConnection.models.Solicitud ||
  atlasConnection.model(
    "Solicitud",
    SolicitudSchema
  );

const SolicitudLocal =
  localConnection.models.Solicitud ||
  localConnection.model(
    "Solicitud",
    SolicitudSchema
  );

// =====================================
// SELECTOR AUTOMÁTICO
// =====================================

function getSolicitudModel() {

  const online =
    getEstadoInternet() &&
    esAtlasListo();

  if (online) {

    console.log(
      "📡 MODELO SOLICITUD: Atlas (ONLINE)"
    );

    return SolicitudAtlas;
  }

  console.log(
    "🏠 MODELO SOLICITUD: Local (OFFLINE)"
  );

  return SolicitudLocal;
}

// =====================================
// EXPORTS
// =====================================

module.exports = {

  SolicitudAtlas,

  SolicitudLocal,

  getSolicitudModel

};