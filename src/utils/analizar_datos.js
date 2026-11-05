// src/utils/analizar_datos.js
// =====================================================
// 📊 LECTOR Y PROCESADOR DE CATALOGO SNIIM (JSON LIMPIO)
// =====================================================
const fs = require('fs');
const path = require('path');

function cargarYProcesarDatos() {
    try {
        // Ruta al archivo JSON purificado
        const rutaJsonLimpio = path.join(__dirname, 'precios_sniim_limpio.json');

        if (!fs.existsSync(rutaJsonLimpio)) {
            console.warn("⚠️ No se encontró precios_sniim_limpio.json en:", rutaJsonLimpio);
            return { success: false, total: 0, listaProductos: [], datosGrafica: {} };
        }

        const contenido = fs.readFileSync(rutaJsonLimpio, 'utf-8');
        const registros = JSON.parse(contenido);

        const datosGrafica = {};

        // Agrupar registros por el nombre de cada producto
        registros.forEach(item => {
            const prodNombre = item.producto ? item.producto.trim() : null;

            if (prodNombre) {
                if (!datosGrafica[prodNombre]) {
                    datosGrafica[prodNombre] = [];
                }

                datosGrafica[prodNombre].push({
                    fecha: item.fecha,
                    minimo: item.precioMinimo || 0,
                    maximo: item.precioMaximo || 0,
                    cierre: item.precioFrecuente || 0,
                    origen: item.origen || '',
                    presentacion: item.presentacion || ''
                });
            }
        });

        // Obtener la lista única de productos y ordenarla alfabéticamente
        const listaProductos = Object.keys(datosGrafica).sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );

        console.log(`✅ Catálogo SNIIM cargado desde JSON limpio: ${listaProductos.length} productos listos.`);

        return {
            success: true,
            total: listaProductos.length,
            listaProductos,
            datosGrafica
        };

    } catch (error) {
        console.error("❌ Error al leer precios_sniim_limpio.json:", error.message);
        return { success: false, total: 0, listaProductos: [], datosGrafica: {} };
    }
}

module.exports = { cargarYProcesarDatos };