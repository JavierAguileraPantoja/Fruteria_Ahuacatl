// src/scripts/sniimScheduler.js

const cron = require('node-cron');

const {
  actualizarSNIIMCompleto
} = require('./actualizarSNIIMCompleto');

console.log('✅ Scheduler SNIIM iniciado');
console.log('⏰ Actualización automática programada para las 05:00 AM');

cron.schedule(
  '0 5 * * *',
  async () => {

    console.log('\n========================================');
    console.log('⏰ EJECUCIÓN AUTOMÁTICA SNIIM');
    console.log('========================================\n');

    try {

      await actualizarSNIIMCompleto();

    } catch (error) {

      console.error(
        '❌ Error en scheduler SNIIM:',
        error.message
      );
    }

  },
  {
    timezone: 'America/Mexico_City'
  }
);