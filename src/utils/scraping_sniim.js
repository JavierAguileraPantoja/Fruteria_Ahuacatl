// src/utils/scraping_sniim.js
// ============================================================================
// Módulo de Extracción Automática de Precios SNIIM con Puppeteer
// Arquitectura: Extracción por Lotes Mensuales + Patrón de Reintentos (Retry)
// ============================================================================

const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');
const {obtenerUltimaFecha, marcarExito, marcarError} = require('./sniimEstado');

// Ruta del archivo JSON de salida
const RUTA_ARCHIVO = path.join(__dirname, 'precios_sniim.json');

/**
 * Genera rangos de fechas mensuales divididos entre dos fechas
 * @param {string} fechaInicioStr - Fecha inicio (DD/MM/YYYY)
 * @param {string} fechaFinStr - Fecha fin (DD/MM/YYYY)
 * @returns {Array<{inicio: string, fin: string}>} Lista de lotes
 */
/**
 * Convierte YYYY-MM-DD a DD/MM/YYYY
 */
function convertirFechaSNIIM(fechaISO) {
  const [anio, mes, dia] = fechaISO.split('-');

  return `${dia}/${mes}/${anio}`;
}

/**
 * Devuelve el día siguiente
 */
function obtenerDiaSiguiente(fechaISO) {

  const [anio, mes, dia] = fechaISO.split('-').map(Number);

  const fecha = new Date(anio,mes - 1,dia);

  fecha.setDate(fecha.getDate() + 1);

  const nuevoAnio = fecha.getFullYear();

  const nuevoMes = String(fecha.getMonth() + 1).padStart(2, '0');

  const nuevoDia = String(fecha.getDate()).padStart(2, '0');

  return `${nuevoAnio}-${nuevoMes}-${nuevoDia}`;
}

function generarRangosMensuales(fechaInicioStr, fechaFinStr) {
  const [d1, m1, y1] = fechaInicioStr.split('/').map(Number);
  const [d2, m2, y2] = fechaFinStr.split('/').map(Number);

  let inicio = new Date(y1, m1 - 1, d1);
  const finGlobal = new Date(y2, m2 - 1, d2);
  const rangos = [];

  while (inicio <= finGlobal) {
    let finMes = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0);
    if (finMes > finGlobal) finMes = finGlobal;

    const formato = (d) => {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      return `${dia}/${mes}/${d.getFullYear()}`;
    };

    rangos.push({
      inicio: formato(inicio),
      fin: formato(finMes)
    });

    inicio = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
  }

  return rangos;
}

/**
 * Carga los registros guardados previamente en el JSON
 */
async function cargarDatosExistentes() {
  try {
    const contenido = await fs.readFile(RUTA_ARCHIVO, 'utf-8');
    return JSON.parse(contenido);
  } catch (error) {
    return [];
  }
}

/**
 * Guarda el arreglo actualizado de registros en el archivo JSON
 */
async function guardarDatos(datos) {
  await fs.writeFile(RUTA_ARCHIVO, JSON.stringify(datos, null, 2), 'utf-8');
}

function obtenerFechaMasReciente(registros) {

  if (!registros.length)
    return null;

  let fechaMax = null;

  for (const reg of registros) {

    const [dia, mes, anio] =
      reg.fecha.split('/').map(Number);

    const fechaActual =
      new Date(anio, mes - 1, dia);

    if (
      !fechaMax ||
      fechaActual > fechaMax
    ) {
      fechaMax = fechaActual;
    }
  }

  return [
    fechaMax.getFullYear(),
    String(fechaMax.getMonth() + 1).padStart(2, '0'),
    String(fechaMax.getDate()).padStart(2, '0')
  ].join('-');
}


/**
 * Procesa un lote mensual específico con reintentos en caso de timeout
 */
async function procesarLoteConReintentos(page, url, lote, maxReintentos = 3) {
  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      console.log(`🌐 Cargando formulario de consulta (Intento ${intento}/${maxReintentos})...`);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

      const iframeElement = await page.waitForSelector('iframe', { timeout: 30000 });
      const frame = await iframeElement.contentFrame();

      if (!frame) throw new Error('No se pudo obtener el contexto del iframe.');

      // Inyección directa de valores de fecha en el DOM para evitar fallos de lectura
      await frame.waitForSelector('#txtFechaInicio', { timeout: 20000 });
      await frame.evaluate((fIni, fFin) => {
        const inputInicio = document.querySelector('#txtFechaInicio');
        const inputFinal = document.querySelector('#txtFechaFinal');
        if (inputInicio) inputInicio.value = fIni;
        if (inputFinal) inputFinal.value = fFin;
      }, lote.inicio, lote.fin);

      // Selección del mercado de destino
      await frame.waitForSelector('select[name*="ddlDestino"]', { timeout: 20000 });
      await frame.evaluate(() => {
        const select = document.querySelector('select[name*="ddlDestino"]');
        if (select && select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change'));
        }
      });

      console.log('🔍 Realizando búsqueda en servidor...');
      await frame.click('#btnBuscar');
      
      // Espera de estabilización tras el PostBack
      await new Promise(r => setTimeout(r, 6000));

      return frame; // Si todo sale bien, retorna el frame listo para extraer
    } catch (err) {
      console.log(`⚠️ Intento ${intento} fallido: ${err.message}`);
      if (intento === maxReintentos) throw err;
      console.log('⏳ Esperando 6 segundos antes de reintentar...');
      await new Promise(r => setTimeout(r, 6000));
    }
  }
}

/**
 * Función principal del script de scraping
 */
async function ejecutarScrapingSNIIM() {
  console.log('🚀 Iniciando script de extracción optimizado del SNIIM...');

  let registrosAcumulados = await cargarDatosExistentes();
  console.log(`📁 Registros guardados previamente: ${registrosAcumulados.length}`);

  let huboNuevosRegistros = false;

  const ultimaFecha = obtenerUltimaFecha();

  let fechaInicioHistorica;

  if (ultimaFecha) {



    

    const siguienteDia = obtenerDiaSiguiente(ultimaFecha);

    








    fechaInicioHistorica =
      convertirFechaSNIIM(siguienteDia);

    console.log(
      `📅 Última fecha registrada: ${ultimaFecha}`
    );

    console.log(
      `🚀 Actualización incremental desde: ${fechaInicioHistorica}`
    );
  } else {
    fechaInicioHistorica = '01/01/2025';

    console.log(
      '⚠️ No existe estado previo. Se realizará carga histórica completa.'
    );
  }

  const hoy = new Date();

  const fechaFinHistorica =
  `${String(hoy.getDate()).padStart(2, '0')}/${
  String(hoy.getMonth() + 1).padStart(2, '0')
  }/${hoy.getFullYear()}`;

  const [dIni, mIni, yIni] =
  fechaInicioHistorica.split('/').map(Number);

const [dFin, mFin, yFin] =
  fechaFinHistorica.split('/').map(Number);

const fechaInicioObj =
  new Date(yIni, mIni - 1, dIni);

const fechaFinObj =
  new Date(yFin, mFin - 1, dFin);

if (fechaInicioObj > fechaFinObj) {

  console.log(
    '✅ No existen nuevas fechas por consultar.'
  );

  return;
}

  const lotesMensuales = generarRangosMensuales(fechaInicioHistorica, fechaFinHistorica);
  console.log(`📅 Se dividió el período en ${lotesMensuales.length} lotes mensuales para evitar bloqueos.`);

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 300000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Manejador automático de diálogos emergentes (pop-ups)
  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  const url = 'http://www.economia-sniim.gob.mx/nuevo/Home.aspx?opcion=Consultas/MercadosNacionales/PreciosDeMercado/Agricolas/ConsultaFrutasYHortalizas.aspx&SubOpcion=4|0';

  try {
    for (let i = 0; i < lotesMensuales.length; i++) {
      const lote = lotesMensuales[i];
      console.log(`\n--------------------------------------------------`);
      console.log(`📌 Procesando Lote ${i + 1}/${lotesMensuales.length}: del ${lote.inicio} al ${lote.fin}`);
      console.log(`--------------------------------------------------`);

      let frame;
      try {
        frame = await procesarLoteConReintentos(page, url, lote);
      } catch (e) {
        console.log(`❌ No se pudo procesar el lote ${lote.inicio} - ${lote.fin}. Saltando al siguiente...`);
        continue;
      }

      let paginaActual = 1;
      let totalPaginas = 1;

      // Cálculo de páginas disponibles en este lote
      const paginacionInfo = await frame.evaluate(() => {
        const match = document.body.innerText.match(/Página\s+(\d+)\s+de\s+(\d+)/i);
        return match ? { actual: parseInt(match[1], 10), total: parseInt(match[2], 10) } : null;
      });

      if (paginacionInfo) {
        totalPaginas = paginacionInfo.total;
      }

      console.log(`📊 Páginas a procesar en este mes: ${totalPaginas}`);

      while (paginaActual <= totalPaginas) {
        console.log(`  ⚡ Extrayendo página ${paginaActual} de ${totalPaginas}...`);

        const registrosPagina = await frame.evaluate((fechaDefault) => {
          const expresionFecha = /^\d{2}\/\d{2}\/\d{4}$/;
          const tablas = Array.from(document.querySelectorAll('table'));
          const tablaPrecios = tablas.find(t => {
            const filas = Array.from(t.querySelectorAll('tr'));
            return filas.some(r => {
              const celdas = Array.from(r.querySelectorAll('td, th')).map(c => c.innerText.trim());
              return celdas.length >= 7 && !isNaN(parseFloat(celdas[celdas.length - 2]));
            });
          });

          if (!tablaPrecios) return [];

          const resultados = [];
          const filasDOM = Array.from(tablaPrecios.querySelectorAll('tr'));

          for (const fila of filasDOM) {
            let celdas = Array.from(fila.querySelectorAll('td, th')).map(c => c.innerText.trim());
            if (celdas.length === 1 && celdas[0].includes('\t')) {
              celdas = celdas[0].split('\t').map(item => item.trim());
            }

            if (celdas.length >= 8 && expresionFecha.test(celdas[0])) {
              resultados.push({
                fecha: celdas[0],
                producto: celdas[1],
                calidad: celdas[2] || '',
                presentacion: celdas[3] || '',
                origen: celdas[4] || '',
                precioMinimo: parseFloat(celdas[5]) || 0,
                precioMaximo: parseFloat(celdas[6]) || 0,
                precioFrecuente: parseFloat(celdas[7]) || 0
              });
            }
          }
          return resultados;
        }, lote.inicio);

        console.log(`     ✔️ ${registrosPagina.length} registros extraídos.`);

        // Inserción evitando duplicados
        const clavesExistentes = new Set(registrosAcumulados.map(r => `${r.fecha}|${r.producto}|${r.origen}|${r.presentacion}`));
        for (const reg of registrosPagina) {
          const clave = `${reg.fecha}|${reg.producto}|${reg.origen}|${reg.presentacion}`;
          if (!clavesExistentes.has(clave)) {

            clavesExistentes.add(clave);

            registrosAcumulados.push(reg);

            huboNuevosRegistros = true;
          }

        }

        // Guardado dinámico en disco
        await guardarDatos(registrosAcumulados);

        if (paginaActual >= totalPaginas) break;

        const botonSiguiente = await frame.$('#ibtnSiguiente2');
        if (!botonSiguiente) break;

        console.log(`  ⏳ Solicitando página ${paginaActual + 1}...`);
        await botonSiguiente.click();
        await new Promise(r => setTimeout(r, 5000));

        paginaActual++;
      }

      // Pausa de cortesía entre lotes de 5 segundos
      console.log('😴 Pausa de cortesía de 5 segundos para descansar el servidor...');
      await new Promise(r => setTimeout(r, 5000));
    }

  } catch (error) {

    console.error(
      '❌ Error general durante el proceso:',
      error.message
    );

    marcarError(error.message);

  } finally {

    if (browser)
      await browser.close();

    if (huboNuevosRegistros) {

      const fechaMasReciente =
        obtenerFechaMasReciente(
          registrosAcumulados
        );

      marcarExito({
        ultimaFechaSNIIM:
          fechaMasReciente,

        totalRegistros:
          registrosAcumulados.length,

        registrosNuevosUltimaEjecucion:
          registrosAcumulados.length
      });

      console.log(
        `✅ Estado actualizado hasta ${fechaMasReciente}`
      );

    } else {

      console.log(
        'ℹ️ No hubo registros nuevos.'
      );
    }

    console.log(`\n==========================================`);
    console.log(`🎉 ¡Proceso de extracción finalizado!`);
    console.log(`📦 Registros totales almacenados en JSON: ${registrosAcumulados.length}`);
    console.log(`📁 Guardado en: ${RUTA_ARCHIVO}`);
    console.log(`==========================================\n`);
  }
}

module.exports = { ejecutarScrapingSNIIM };

if (require.main === module) {
  ejecutarScrapingSNIIM();
}