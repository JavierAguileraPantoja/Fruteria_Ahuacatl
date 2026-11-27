const {getSolicitudModel}=require("../models/solicitud");

// ==========================================
// CREAR SOLICITUD
// ==========================================

async function crearSolicitud(
  usuario,
  {
    categoria,
    concepto,
    montoEstimado,
    justificacion = ""
  }
) {

  const Solicitud =
    getSolicitudModel();

  const solicitud =
    await Solicitud.create({

      solicitanteId:
        usuario._id,

      solicitanteNombre:
        usuario.name,

      solicitanteRol:
        usuario.role,

      categoria,

      concepto,

      montoEstimado:
        Number(montoEstimado),

      justificacion,

      estado:
        "pendiente"

    });

  return solicitud;

}
// ==========================================
// BUSCAR POR ID
// ==========================================

async function obtenerSolicitud(
  solicitudId
) {

  const Solicitud =
    getSolicitudModel();

  return await Solicitud.findById(
    solicitudId
  );

}

// ==========================================
// LISTAR TODAS
// ==========================================

async function obtenerSolicitudes() {

  const Solicitud =
    getSolicitudModel();

  return await Solicitud
    .find()
    .sort({
      createdAt: -1
    });

}

// ==========================================
// LISTAR PENDIENTES
// ==========================================

async function obtenerPendientes() {

  const Solicitud =
    getSolicitudModel();

  return await Solicitud
    .find({
      estado: "pendiente"
    })
    .sort({
      createdAt: -1
    });

}

// ==========================================
// MIS SOLICITUDES
// ==========================================

async function obtenerMisSolicitudes(
  usuarioId
) {

  const Solicitud = getSolicitudModel();

  return await Solicitud
    .find({
      solicitanteId:
        usuarioId
    })
    .sort({
      createdAt: -1
    });

}

// ==========================================
// APROBAR
// ==========================================

async function aprobarSolicitud(
  solicitudId,
  usuarioAprobador
) {

  const Solicitud = getSolicitudModel();
  const solicitud =
    await Solicitud.findById(
      solicitudId
    );

  if (!solicitud) {
    throw new Error(
      "Solicitud no encontrada"
    );
  }

  // REGLA ANTI-ROBO

  if (
    solicitud.solicitanteId.toString() ===
    usuarioAprobador._id.toString()
  ) {

    throw new Error(
      "No puedes autorizar tus propias solicitudes."
    );

  }

  solicitud.estado =
    "aprobada";

  solicitud.aprobadoPorId =
    usuarioAprobador._id;

  solicitud.aprobadoPorNombre =
    usuarioAprobador.name;

  solicitud.fechaAprobacion =
    new Date();

  await solicitud.save();

  return solicitud;

}

// ==========================================
// RECHAZAR
// ==========================================

async function rechazarSolicitud(
  solicitudId,
  usuarioAprobador,
  motivo = ""
) {
  const Solicitud = getSolicitudModel();

  const solicitud =
    await Solicitud.findById(
      solicitudId
    );

  if (!solicitud) {
    throw new Error(
      "Solicitud no encontrada"
    );
  }

  if (
    solicitud.solicitanteId.toString() ===
    usuarioAprobador._id.toString()
  ) {

    throw new Error(
      "No puedes rechazar tus propias solicitudes."
    );

  }

  solicitud.estado =
    "rechazada";

  solicitud.aprobadoPorId =
    usuarioAprobador._id;

  solicitud.aprobadoPorNombre =
    usuarioAprobador.name;

  solicitud.fechaAprobacion =
    new Date();

  solicitud.motivoRechazo =
    motivo;

  await solicitud.save();

  return solicitud;

}

// ==========================================
// MARCAR COMO COMPRADA
// ==========================================

async function marcarComprada(
  solicitudId,
  montoReal
) {
  const Solicitud = getSolicitudModel();

  const solicitud =
    await Solicitud.findById(
      solicitudId
    );

  if (!solicitud) {
    throw new Error(
      "Solicitud no encontrada"
    );
  }

  solicitud.estado =
    "comprada";

  solicitud.montoReal =
    Number(montoReal || 0);

  solicitud.fechaCompra =
    new Date();

  await solicitud.save();

  return solicitud;

}

// ==========================================
// MARCAR COMO COMPROBADA
// ==========================================

async function marcarComprobada(
  solicitudId,
  evidencia
) {

  const Solicitud = getSolicitudModel();
  const solicitud =
    await Solicitud.findById(
      solicitudId
    );

  if (!solicitud) {
    throw new Error(
      "Solicitud no encontrada"
    );
  }

  solicitud.estado =
    "comprobada";

  solicitud.evidencia =
    evidencia;

  solicitud.fechaComprobacion =
    new Date();

  await solicitud.save();

  return solicitud;

}

// ==========================================
// CONTAR PENDIENTES
// ==========================================

async function contarPendientes() {

  const Solicitud = getSolicitudModel();

  return await Solicitud.countDocuments({
    estado: "pendiente"
  });

}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  crearSolicitud,

  obtenerSolicitud,

  obtenerSolicitudes,

  obtenerPendientes,

  obtenerMisSolicitudes,

  aprobarSolicitud,

  rechazarSolicitud,

  marcarComprada,

  marcarComprobada,

  contarPendientes

};