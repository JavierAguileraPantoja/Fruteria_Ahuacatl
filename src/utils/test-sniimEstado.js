// src/utils/test-sniimEstado.js

const {
  obtenerEstado,
  guardarEstado,
  obtenerUltimaFecha,
  actualizarEstado
} = require("./sniimEstado");

console.log("\n====================================");
console.log("🧪 INICIO DE PRUEBAS SNIIM ESTADO");
console.log("====================================\n");

// 1. Leer estado actual
console.log("📖 Estado actual:");
console.log(obtenerEstado());

// 2. Obtener última fecha
console.log("\n📅 Última fecha SNIIM:");
console.log(obtenerUltimaFecha());

// 3. Actualizar un campo temporal
console.log("\n✏️ Actualizando campo de prueba...");

actualizarEstado({
  pruebaSistema: true,
  fechaPrueba: new Date().toISOString()
});

console.log("✅ Actualización realizada.");

// 4. Leer nuevamente
console.log("\n📖 Estado después de actualizar:");

const estadoActualizado = obtenerEstado();
console.log(estadoActualizado);

// 5. Verificación simple
if (estadoActualizado.pruebaSistema === true) {
  console.log("\n✅ PRUEBA EXITOSA");
} else {
  console.log("\n❌ PRUEBA FALLIDA");
}

console.log("\n====================================");
console.log("🏁 FIN DE PRUEBAS");
console.log("====================================\n");