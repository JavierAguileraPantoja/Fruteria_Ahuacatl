// =====================================================
// 🧹 SCRIPT PARA LIMPIAR Y ESTRUCTURAR EL JSON DEL SNIIM
// =====================================================
const fs = require('fs');
const path = require('path');

function limpiarArchivoJson() {
    try {
        const rutaEntrada = path.join(__dirname, 'precios_sniim.json');
        const rutaSalida = path.join(__dirname, 'precios_sniim_limpio.json');

        if (!fs.existsSync(rutaEntrada)) {
            console.error("❌ No se encontró el archivo precios_sniim.json");
            return;
        }

        console.log("📖 Leyendo archivo original...");
        const contenido = fs.readFileSync(rutaEntrada, 'utf-8');
        const datosDesordenados = JSON.parse(contenido);

        const listaLimpia = [];

        // Función para procesar una línea tabulada
        function procesarRenglon(linea) {
            if (!linea || typeof linea !== 'string') return;

            const columnas = linea.split('\t').map(col => col.trim());

            // Validar que la línea tenga al menos 8 columnas y comience con una fecha DD/MM/YYYY
            const esFecha = /^\d{2}\/\d{2}\/\d{4}$/.test(columnas[0]);

            if (esFecha && columnas.length >= 8) {
                const registroLimpio = {
                    fecha: columnas[0],
                    producto: columnas[1],
                    presentacion: columnas[2] || 'Primera',
                    unidadMedida: columnas[3] || 'Kilogramo',
                    origen: columnas[4] || 'Nacional',
                    precioMinimo: parseFloat(columnas[5]) || 0,
                    precioMaximo: parseFloat(columnas[6]) || 0,
                    precioFrecuente: parseFloat(columnas[7]) || 0
                };

                listaLimpia.push(registroLimpio);
            }
        }

        // Recorrer el arreglo original extrayendo líneas válidas
        datosDesordenados.forEach(item => {
            // Si el objeto ya estaba limpio de origen
            if (item.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(item.fecha) && item.producto) {
                if (!item.producto.includes("encuesta") && !item.producto.includes("Mercados")) {
                    listaLimpia.push({
                        fecha: item.fecha,
                        producto: item.producto,
                        presentacion: item.presentacion || '',
                        unidadMedida: item.unidadMedida || '',
                        origen: item.origen || '',
                        precioMinimo: Number(item.precioMinimo) || 0,
                        precioMaximo: Number(item.precioMaximo) || 0,
                        precioFrecuente: Number(item.precioFrecuente) || 0
                    });
                }
            }

            // Si la fecha contiene un bloque de texto largo con saltos de línea (\n)
            if (item.fecha && item.fecha.includes('\n')) {
                const lineas = item.fecha.split('\n');
                lineas.forEach(linea => procesarRenglon(linea));
            }
        });

        // Obtener lista de productos únicos extraídos
        const productosUnicos = [...new Set(listaLimpia.map(p => p.producto))];

        console.log(`✅ Limpieza completada con éxito.`);
        console.log(`📊 Registros válidos procesados: ${listaLimpia.length}`);
        console.log(`🍎 Productos únicos encontrados (${productosUnicos.length}):`, productosUnicos);

        // Guardar el nuevo JSON limpio
        fs.writeFileSync(rutaSalida, JSON.stringify(listaLimpia, null, 2), 'utf-8');
        console.log(`💾 Archivo guardado en: ${rutaSalida}`);

    } catch (error) {
        console.error("❌ Error al procesar el archivo:", error.message);
    }
}

// Ejecutar la función
limpiarArchivoJson();