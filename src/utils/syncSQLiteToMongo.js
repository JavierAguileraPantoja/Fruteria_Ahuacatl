// src/utils/syncSQLiteToMongo.js
// =======================================================
// 🗂 SQLITE → MONGO LOCAL (SOLO USUARIOS, 100% SEGURO)
// - No sincroniza productos (prohibido)
// - Whitelist de campos permitidos
// - Evita que SQLite sobrescriba datos críticos
// =======================================================

const { UserLocal } = require("../databases/mongoSecundario");
const UserSQLite = require("../models/UserSQLite");

async function syncSQLiteToMongo() {
  console.log("🔁 [SQLite → Mongo Local] Sincronizando SOLO usuarios…");

  try {
    const users = await UserSQLite.findAll();

    for (const u of users) {
      const json = u.toJSON();

      // =======================================================
      // 🛡️ WHITELIST: Solo campos permitidos
      // (SQLite JAMÁS debe poder modificar otros)
      // =======================================================
      const safeUser = {
        name: json.name,
        email: json.email,
        phone: json.phone || "",
        image: json.image || "default.png",
        role: json.role || "vendedor",
        password: json.password,  // ya viene hasheado, está bien
        created: json.created || new Date(),
      };

      // Nunca incluimos: _id, __v, tokens, sesiones, updatedAt
      // Nunca dejamos que campos VACÍOS borren los buenos
      Object.keys(safeUser).forEach((k) => {
        if (safeUser[k] === null || safeUser[k] === undefined) {
          delete safeUser[k];
        }
      });

      // =======================================================
      // 🟢 UPSERT SEGURO (solo email es la llave válida)
      // =======================================================
      await UserLocal.updateOne(
        { email: safeUser.email },
        { $set: safeUser },
        { upsert: true }
      );
    }

    console.log("🟢 SQLite → Mongo Local COMPLETO (solo usuarios, sin riesgos).");

  } catch (err) {
    console.log("❌ Error en syncSQLiteToMongo:", err.message);
  }
}

module.exports = syncSQLiteToMongo;
