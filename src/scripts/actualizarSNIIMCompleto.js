// src/utils/actualizarSNIIMCompleto.js
// ============================================================
// PIPELINE COMPLETO DE ACTUALIZACIÓN SNIIM
// ============================================================

const { ejecutarScrapingSNIIM } = require('../utils/scraping_sniim');
const { actualizarEstado } = require('../utils/sniimEstado');

async function ejecutarValidacion() {

  const {
    procesarYLimpiarDatos
  } = require('../utils/validar_datos');

  await procesarYLimpiarDatos();
}
async function actualizarSNIIMCompleto() {

  const inicioProceso =
    new Date();

  console.log('\n=================================================');
  console.log('🚀 INICIANDO PIPELINE COMPLETO SNIIM');
  console.log('=================================================\n');

  try {

    await actualizarEstado({
      estado: 'ejecutando'
    });

    console.log(
      '1️⃣ Ejecutando scraping incremental...'
    );

    await ejecutarScrapingSNIIM();

    console.log(
      '\n2️⃣ Ejecutando validación...'
    );

    await ejecutarValidacion();

    await actualizarEstado({
      estado: 'ok'
    });

    const finProceso =
      new Date();

    const duracionSegundos =
      Math.round(
        (finProceso - inicioProceso) / 1000
      );

    console.log('\n=================================================');
    console.log('✅ PIPELINE SNIIM COMPLETADO');
    console.log(`⏱️ Duración: ${duracionSegundos} segundos`);
    console.log('=================================================\n');

    return true;

  } catch (error) {

    console.error(
      '\n❌ Error en pipeline SNIIM:',
      error.message
    );

    await actualizarEstado({
      estado: 'error',
      ultimoError: error.message,
      fechaError: new Date().toISOString()
    });

    return false;
  }
}

module.exports = {
  actualizarSNIIMCompleto
};

if (require.main === module) {
  actualizarSNIIMCompleto();
}