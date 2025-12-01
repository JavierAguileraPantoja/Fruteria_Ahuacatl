// src/utils/syncVentasLocalToAtlas.js
// =======================================================
// 💸 VENTAS LOCAL → ATLAS (FINAL, SIN SQLITE, SIN DUPLICADOS)
//  - Copia ventas de Mongo Local (Docker) a Atlas
//  - Usa llave (creadoEn + total) para evitar duplicados
//  - No toca productos ni stock (eso ya lo maneja Atlas → Local)
// =======================================================

const { VentaMongo } = require("../models/venta");
const { VentaLocal } = require("../databases/mongoSecundario");

async function syncVentasLocalToAtlas() {
  console.log("🧾 Sync ventas Local → Atlas…");

  try {
    const localVentas = await VentaLocal.find();
    const atlasVentas = await VentaMongo.find();

    const setAtlas = new Set(
      atlasVentas.map(v => `${v.creadoEn?.toISOString?.() || v.creadoEn}|${v.total}`)
    );

    let nuevas = 0;
    let duplicadas = 0;

    for (const v of localVentas) {
      const key = `${v.creadoEn?.toISOString?.() || v.creadoEn}|${v.total}`;

      if (setAtlas.has(key)) {
        duplicadas++;
        continue;
      }

      const data = v.toObject();
      delete data._id;

      await VentaMongo.create(data);
      nuevas++;
    }

    console.log(
      `🟢 Ventas Local → Atlas: ${localVentas.length} totales, ${nuevas} nuevas, ${duplicadas} duplicadas (omitidas).`
    );
  } catch (err) {
    console.error("❌ Error ventas Local → Atlas:", err.message);
  }
}

module.exports = syncVentasLocalToAtlas;
