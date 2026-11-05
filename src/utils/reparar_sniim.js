// src/utils/reparar_sniim.js
// ============================================================================
// Script de Reparación Optimizado - Recuperación de Agosto 2025
// ============================================================================

const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');

const RUTA_ARCHIVO = path.join(__dirname, 'precios_sniim.json');

// Dividimos el mes de Agosto en 2 quincenas para evitar el bloqueo del servidor
const LOTES_PENDIENTES = [
  { inicio: '01/08/2025', fin: '15/08/2025' },
  { inicio: '16/08/2025', fin: '31/08/2025' }
];

async function cargarDatosExistentes() {
  try {
    const contenido = await fs.readFile(RUTA_ARCHIVO, 'utf-8');
    return JSON.parse(contenido);
  } catch (error) {
    return [];
  }
}

async function guardarDatos(datos) {
  await fs.writeFile(RUTA_ARCHIVO, JSON.stringify(datos, null, 2), 'utf-8');
}

async function ejecutarReparacion() {
  console.log('🛠️ Iniciando reparación de precisión para Agosto 2025...');

  let registrosAcumulados = await cargarDatosExistentes();
  console.log(`📁 Registros actuales en JSON: ${registrosAcumulados.length}`);

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 300000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('dialog', async dialog => {
    await dialog.accept();
  });

  const url = 'http://www.economia-sniim.gob.mx/nuevo/Home.aspx?opcion=Consultas/MercadosNacionales/PreciosDeMercado/Agricolas/ConsultaFrutasYHortalizas.aspx&SubOpcion=4|0';

  for (let i = 0; i < LOTES_PENDIENTES.length; i++) {
    const lote = LOTES_PENDIENTES[i];
    console.log(`\n--------------------------------------------------`);
    console.log(`🔄 Procesando Quincena ${i + 1}/${LOTES_PENDIENTES.length}: ${lote.inicio} al ${lote.fin}`);
    console.log(`--------------------------------------------------`);

    let exito = false;
    let intentos = 0;
    const maxIntentos = 3;

    while (intentos < maxIntentos && !exito) {
      intentos++;
      try {
        console.log(`🌐 Cargando formulario (Intento ${intentos}/${maxIntentos})...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

        const iframeElement = await page.waitForSelector('iframe', { timeout: 30000 });
        const frame = await iframeElement.contentFrame();

        if (!frame) throw new Error('No se pudo acceder al iframe.');

        await frame.waitForSelector('#txtFechaInicio', { timeout: 20000 });
        await frame.evaluate((fIni, fFin) => {
          const inputInicio = document.querySelector('#txtFechaInicio');
          const inputFinal = document.querySelector('#txtFechaFinal');
          if (inputInicio) inputInicio.value = fIni;
          if (inputFinal) inputFinal.value = fFin;
        }, lote.inicio, lote.fin);

        await frame.waitForSelector('select[name*="ddlDestino"]', { timeout: 20000 });
        await frame.evaluate(() => {
          const select = document.querySelector('select[name*="ddlDestino"]');
          if (select && select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change'));
          }
        });

        console.log('🔍 Solicitando consulta al servidor...');
        await frame.click('#btnBuscar');
        await new Promise(r => setTimeout(r, 6000));

        let paginaActual = 1;
        let totalPaginas = 1;

        const paginacionInfo = await frame.evaluate(() => {
          const match = document.body.innerText.match(/Página\s+(\d+)\s+de\s+(\d+)/i);
          return match ? { actual: parseInt(match[1], 10), total: parseInt(match[2], 10) } : null;
        });

        if (paginacionInfo) totalPaginas = paginacionInfo.total;

        console.log(`📊 Páginas encontradas: ${totalPaginas}`);

        while (paginaActual <= totalPaginas) {
          console.log(`  ⚡ Extrayendo página ${paginaActual} de ${totalPaginas}...`);

          const registrosPagina = await frame.evaluate(() => {
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
          });

          console.log(`     ✔️ ${registrosPagina.length} registros recuperados.`);

          const clavesExistentes = new Set(registrosAcumulados.map(r => `${r.fecha}|${r.producto}|${r.origen}|${r.presentacion}`));
          for (const reg of registrosPagina) {
            const clave = `${reg.fecha}|${reg.producto}|${reg.origen}|${reg.presentacion}`;
            if (!clavesExistentes.has(clave)) {
              clavesExistentes.add(clave);
              registrosAcumulados.push(reg);
            }
          }

          await guardarDatos(registrosAcumulados);

          if (paginaActual >= totalPaginas) break;

          const botonSiguiente = await frame.$('#ibtnSiguiente2');
          if (!botonSiguiente) break;

          await botonSiguiente.click();
          await new Promise(r => setTimeout(r, 5000));
          paginaActual++;
        }

        exito = true;
        console.log('😴 Pausa de descanso de 4 segundos...');
        await new Promise(r => setTimeout(r, 4000));

      } catch (err) {
        console.warn(`⚠️ Intento ${intentos} fallido: ${err.message}`);
        if (intentos < maxIntentos) {
          console.log('⏳ Esperando 7 segundos antes de reintentar...');
          await new Promise(r => setTimeout(r, 7000));
        } else {
          console.error(`❌ No se pudo recuperar la quincena ${lote.inicio} al ${lote.fin}.`);
        }
      }
    }
  }

  await browser.close();

  console.log(`\n==========================================`);
  console.log(`🎉 ¡Reparación completada!`);
  console.log(`📦 Registros finales guardados en JSON: ${registrosAcumulados.length}`);
  console.log(`==========================================\n`);
}

ejecutarReparacion();