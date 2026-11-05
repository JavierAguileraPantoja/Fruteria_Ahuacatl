// src/utils/validar_datos.js
// ============================================================================
// Script de Limpieza, Validación y Transformación de Datos (ETL)
// ============================================================================

const fs = require('fs/promises');
const path = require('path');

// Rutas de archivos de entrada y salida
const RUTA_ENTRADA = path.join(__dirname, 'precios_sniim.json');
const RUTA_SALIDA = path.join(__dirname, 'precios_sniim_limpio.json');

/**
 * Convierte una fecha en texto "DD/MM/YYYY" a formato ISO "YYYY-MM-DD"
 * @param {string} fechaTexto - Fecha en formato DD/MM/YYYY
 * @returns {string|null} - Fecha en formato ISO o null si es inválida
 */
function normalizarFecha(fechaTexto) {
  if (!fechaTexto || typeof fechaTexto !== 'string') return null;
  const partes = fechaTexto.split('/');
  if (partes.length !== 3) return null;

  const dia = partes[0].padStart(2, '0');
  const mes = partes[1].padStart(2, '0');
  const anio = partes[2];

  return `${anio}-${mes}-${dia}`;
}

async function procesarYLimpiarDatos() {
  console.log('🧹 Iniciando proceso de limpieza y validación de datos...');

  try {
    // 1. Leer archivo crudo
    const contenido = await fs.readFile(RUTA_ENTRADA, 'utf-8');
    const registrosCrudos = JSON.parse(contenido);

    console.log(`📊 Registros totales leídos: ${registrosCrudos.length}`);

    const registrosLimpios = [];
    let contadorDescartados = 0;
    let contadorCorregidos = 0;

    // 2. Iterar y validar cada registro
    for (const reg of registrosCrudos) {
      const fechaISO = normalizarFecha(reg.fecha);

      // Validar que los campos esenciales existan
      if (!fechaISO || !reg.producto || reg.producto.trim() === '') {
        contadorDescartados++;
        continue;
      }

      // Convertir y asegurar valores numéricos
      const pMin = parseFloat(reg.precioMinimo) || 0;
      const pMax = parseFloat(reg.precioMaximo) || 0;
      const pFrec = parseFloat(reg.precioFrecuente) || 0;

      // Validación de coherencia en precios
      if (pMin < 0 || pMax < 0 || pFrec < 0) {
        contadorDescartados++;
        continue;
      }

      // Estructura limpia y estandarizada para la base de datos
      const registroEstandar = {
        fecha: fechaISO,
        producto: reg.producto.trim().toUpperCase(),
        calidad: (reg.calidad || 'S/G').trim().toUpperCase(),
        presentacion: (reg.presentacion || 'N/A').trim(),
        origen: (reg.origen || 'N/A').trim(),
        precioMinimo: pMin,
        precioMaximo: pMax,
        precioFrecuente: pFrec,
        fechaProcesamiento: new Date().toISOString()
      };

      registrosLimpios.push(registroEstandar);
      contadorCorregidos++;
    }

    // 3. Ordenar cronológicamente por fecha (de más antigua a más reciente)
    registrosLimpios.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // 4. Guardar resultado final
    await fs.writeFile(RUTA_SALIDA, JSON.stringify(registrosLimpios, null, 2), 'utf-8');

    // 5. Mostrar reporte final
    console.log('\n==========================================');
    console.log('🎉 ¡Proceso de limpieza completado con éxito!');
    console.log(`✔️ Registros válidos y procesados: ${registrosLimpios.length}`);
    console.log(`⚠️ Registros descartados por errores: ${contadorDescartados}`);
    console.log(`📁 Archivo generado: ${RUTA_SALIDA}`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ Error durante el procesamiento de datos:', error.message);
  }
}

module.exports = {
  procesarYLimpiarDatos
};

if (require.main === module) {
  procesarYLimpiarDatos();
}