// src/utils/waitForAtlas.js

const { atlasConnection } = require('../databases/mongoPrincipal');

/*
  Espera a que Atlas esté REALMENTE conectado antes de permitir que se ejecute
  cualquier sincronización importante. Evita errores como:
  - buffering timed out
  - find() no responde
  - sincronizaciones incompletas
  - stocks duplicados porque se sincroniza sin conexión real
*/

async function waitForAtlas() {
  let intentos = 0;

  // 0 = desconectado
  // 1 = conectado
  // 2 = conectando
  // 3 = desconectando

  while (atlasConnection.readyState !== 1 && intentos < 30) {
    console.log(`⏳ Esperando conexión REAL con Atlas... intento ${intentos + 1}/30`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    intentos++;
  }

  if (atlasConnection.readyState === 1) {
    console.log("🟢 Conexión Atlas REAL LISTA");
    return true;
  }

  console.log("❌ Atlas no conectó después de esperar 30 segundos. Se cancela sync.");
  return false;
}

module.exports = waitForAtlas;
