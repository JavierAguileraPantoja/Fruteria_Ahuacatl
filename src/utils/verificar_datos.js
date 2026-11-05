const puppeteer = require('puppeteer');
const fs = require('fs/promises');
const path = require('path');

/**
 * Script de scraping automatizado para el SNIIM con control estricto de fin de paginación
 */
async function ejecutarScrapingSNIIM() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  try {
    const url = 'http://www.economia-sniim.gob.mx/nuevo/Home.aspx?opcion=Consultas/MercadosNacionales/PreciosDeMercado/Agricolas/ConsultaFrutasYHortalizas.aspx&SubOpcion=4|0';
    
    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    const iframeElement = await page.waitForSelector('iframe', { timeout: 15000 });
    const frame = await iframeElement.contentFrame();

    if (!frame) throw new Error('No se pudo acceder al marco interno (iframe).');

    // 1. Limpieza e ingreso de rango de fechas
    console.log('Configurando filtros de fechas...');
    await frame.evaluate(() => {
      document.querySelector('#txtFechaInicio').value = '';
      document.querySelector('#txtFechaFinal').value = '';
    });

    await frame.type('#txtFechaInicio', '01/01/2025');
    await frame.type('#txtFechaFinal', '25/08/2026');

    // 2. Selección de mercado de destino obligatoria por reglas del SNIIM
    console.log('Seleccionando Mercado de Destino...');
    await frame.evaluate(() => {
      const selectDestino = document.querySelector('select[name*="ddlDestino"], select[id*="ddlDestino"]');
      if (selectDestino && selectDestino.options.length > 1) {
        selectDestino.selectedIndex = 1; 
        selectDestino.dispatchEvent(new Event('change'));
      }
    });

    // 3. Enviar consulta de búsqueda
    console.log('Enviando formulario de consulta...');
    await frame.waitForSelector('#btnBuscar', { timeout: 15000 });
    
    await Promise.all([
      frame.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
      frame.click('#btnBuscar')
    ]);

    let filasTotales = [];
    let ultimaPaginaProcesada = 0;
    const MAX_PAGINAS = 100; // Límite de seguridad anti-bucle

    // 4. Bucle principal de paginación
    for (let i = 0; i < MAX_PAGINAS; i++) {
      // Leer número de página actual y total desde el DOM
      const paginacion = await frame.evaluate(() => {
        const match = document.body.innerText.match(/Página\s+(\d+)\s+de\s+(\d+)/i);
        return match ? { actual: parseInt(match[1], 10), total: parseInt(match[2], 10) } : null;
      });

      if (!paginacion) {
        console.log('⚠️ No se detectó información de paginación. Finalizando ciclo.');
        break;
      }

      console.log(`Procesando Página ${paginacion.actual} de ${paginacion.total}...`);

      // Validación anti-repetición: Si la página no cambió respecto al paso anterior
      if (paginacion.actual === ultimaPaginaProcesada) {
        console.log('🛑 La página no avanzó tras hacer clic. Se rompe el bucle para evitar ciclos.');
        break;
      }

      // Extraer filas de precios de la página activa
      const filasPagina = await frame.evaluate(() => {
        const tablas = Array.from(document.querySelectorAll('table'));
        const tablaPrecios = tablas.find(t => t.querySelectorAll('tr').length > 5);

        if (!tablaPrecios) return [];

        return Array.from(tablaPrecios.querySelectorAll('tr'))
          .map(fila => Array.from(fila.querySelectorAll('td, th')).map(celda => celda.innerText.trim()))
          .filter(fila => fila.length >= 8 && fila[0] !== 'Fecha');
      });

      filasTotales.push(...filasPagina);
      ultimaPaginaProcesada = paginacion.actual;

      // REGLA DE PARO CLAVE: Si ya procesamos la última página, salir ANTES de dar clic en siguiente
      if (paginacion.actual >= paginacion.total) {
        console.log('✅ ¡Se alcanzó la última página del reporte de forma limpia!');
        break;
      }

      // Intentar avanzar a la siguiente página
      const botonSiguiente = await frame.$('#ibtnSiguiente2');
      if (botonSiguiente) {
        await Promise.all([
          frame.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
          botonSiguiente.click()
        ]);
        await new Promise(r => setTimeout(r, 1200));
      } else {
        console.log('No se encontró el botón siguiente.');
        break;
      }
    }

    await browser.close();

    // 5. Mapeo a objetos JSON estructurados
    const datosEstructurados = filasTotales.map(col => ({
      fecha: col[0],
      producto: col[1],
      presentacion: col[2],
      unidadMedida: col[3],
      origen: col[4],
      precioMinimo: parseFloat(col[5]) || 0,
      precioMaximo: parseFloat(col[6]) || 0,
      precioFrecuente: parseFloat(col[7]) || 0
    }));

    // 6. Persistencia en sistema de archivos local
    const rutaArchivo = path.join(__dirname, 'precios_sniim.json');
    await fs.writeFile(rutaArchivo, JSON.stringify(datosEstructurados, null, 2), 'utf-8');

    console.log(`\n==========================================`);
    console.log(` Proceso finalizado exitosamente`);
    console.log(` Total registros guardados: ${datosEstructurados.length}`);
    console.log(` Archivo generado: ${rutaArchivo}`);
    console.log(`==========================================\n`);

    return datosEstructurados;

  } catch (error) {
    console.error('Error durante la automatización:', error);
    if (browser) await browser.close();
  }
}

ejecutarScrapingSNIIM();