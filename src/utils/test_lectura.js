// src/utils/test_lectura.js
// ============================================================================
// Script de prueba para validar la lectura del archivo de precios del SNIIM
// ============================================================================

const { cargarYProcesarDatos } = require('./analizar_datos');

console.log('🧪 Probando lectura de datos desde precios_sniim.json...\n');

// Ejecutamos el procesamiento de datos
const resultado = cargarYProcesarDatos();

console.log('📋 Lista de productos detectados:');
console.log(resultado.listaProductos);

console.log('\n📊 Muestra de datos para la gráfica (primer producto):');
if (resultado.listaProductos.length > 0) {
  const primerProducto = resultado.listaProductos[0];
  console.log(`Producto: "${primerProducto}"`);
  console.log('Primeros 3 registros de precios:');
  console.log(resultado.datosGrafica[primerProducto].slice(0, 3));
} else {
  console.log('⚠️ No se encontraron productos. Verifica que precios_sniim.json contenga registros.');
}

console.log('\n✅ Prueba de lectura completada con éxito.');