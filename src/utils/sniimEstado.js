// src/utils/sniimEstado.js
// =====================================================
// ESTADO DEL PIPELINE SNIIM
// Lee y guarda el estado de las actualizaciones.
// =====================================================

const fs = require("fs");
const path = require("path");

const RUTA_ESTADO = path.join(__dirname, "sniim_estado.json");

/**
 * Estado por defecto si no existe el archivo.
 */
const ESTADO_DEFAULT = {
  ultimaFechaSNIIM: null,
  ultimaActualizacion: null,
  totalRegistros: 0,
  estado: "sin-inicializar",
  ultimaEjecucionCompleta: null,
  registrosNuevosUltimaEjecucion: 0,
  versionPipeline: "2.0"
};

/**
 * Lee el estado actual.
 */
function obtenerEstado() {
  try {
    if (!fs.existsSync(RUTA_ESTADO)) {
      return { ...ESTADO_DEFAULT };
    }

    const contenido = fs.readFileSync(RUTA_ESTADO, "utf8");
    const estado = JSON.parse(contenido);

    return {
      ...ESTADO_DEFAULT,
      ...estado
    };
  } catch (error) {
    console.error(
      "❌ Error leyendo sniim_estado.json:",
      error.message
    );

    return { ...ESTADO_DEFAULT };
  }
}

/**
 * Guarda el estado completo.
 */
function guardarEstado(nuevoEstado) {
  try {
    const estadoFinal = {
      ...ESTADO_DEFAULT,
      ...nuevoEstado
    };

    fs.writeFileSync(
      RUTA_ESTADO,
      JSON.stringify(estadoFinal, null, 2),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Error guardando sniim_estado.json:",
      error.message
    );

    return false;
  }
}

/**
 * Devuelve únicamente la última fecha SNIIM.
 */
function obtenerUltimaFecha() {
  const estado = obtenerEstado();
  return estado.ultimaFechaSNIIM;
}

/**
 * Actualiza campos específicos conservando el resto.
 */
function actualizarEstado(cambios) {
  const actual = obtenerEstado();

  const actualizado = {
    ...actual,
    ...cambios
  };

  return guardarEstado(actualizado);
}

/**
 * Marca el pipeline como ejecutándose.
 */
function marcarEjecutando() {
  return actualizarEstado({
    estado: "ejecutando"
  });
}

/**
 * Marca el pipeline como exitoso.
 */
function marcarExito({
  ultimaFechaSNIIM,
  totalRegistros,
  registrosNuevosUltimaEjecucion
}) {
  return actualizarEstado({
    estado: "ok",
    ultimaFechaSNIIM,
    totalRegistros,
    registrosNuevosUltimaEjecucion,
    ultimaActualizacion: new Date().toISOString(),
    ultimaEjecucionCompleta: new Date().toISOString()
  });
}

/**
 * Marca el pipeline con error.
 */
function marcarError(mensaje) {
  return actualizarEstado({
    estado: "error",
    ultimoError: mensaje,
    fechaError: new Date().toISOString()
  });
}

module.exports = {
  obtenerEstado,
  guardarEstado,
  obtenerUltimaFecha,
  actualizarEstado,
  marcarEjecutando,
  marcarExito,
  marcarError
};
