// ========================================================
// 🛠 FIX: Asignar id_global a productos que no lo tengan
// ========================================================

require("dotenv").config();
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

// Modelos
const { ProductMongo } = require("../models/product");

// ========================================================
// 🔌 Conectar a MongoDB Atlas directo
// ========================================================
async function conectarMongo() {
  try {
    await mongoose.connect(process.env.MONGO_ATLAS_URL, {
      dbName: process.env.MONGO_ATLAS_DB || "fruteria_db",
    });

    console.log("🟢 Conectado a Mongo Atlas");
  } catch (err) {
    console.log("❌ Error conectando a Atlas:", err.message);
    process.exit();
  }
}

// ========================================================
// 🛠 Asignar id_global
// ========================================================
async function fixIds() {
  try {
    const productos = await ProductMongo.find();

    let contador = 0;

    for (const p of productos) {
      if (!p.id_global) {
        p.id_global = uuidv4();
        await p.save();
        contador++;
        console.log(`✔ Asignado id_global a: ${p.nombre}`);
      }
    }

    console.log(`\n🟢 Listo. Productos corregidos: ${contador}`);
    process.exit();

  } catch (err) {
    console.log("❌ Error corrigiendo productos:", err.message);
    process.exit();
  }
}

// ========
