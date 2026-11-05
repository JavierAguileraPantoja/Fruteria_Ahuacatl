// src/utils/syncSQLiteToMongo.js
// =======================================================
// SQLITE → MONGO LOCAL (SOLO USUARIOS, CON LAST-WRITE-WINS)
// No sincroniza productos (prohibido)
// Whitelist de campos permitidos
// Protege los datos contra sobrescrituras de registros antiguos
// =======================================================

const { UserLocal } = require("../databases/mongoSecundario");
const UserSQLite = require("../models/UserSQLite");

async function syncSQLiteToMongo() {
  console.log("🔁 [SQLite → Mongo Local] Evaluando usuarios por fecha…");

  try {
    const users = await UserSQLite.findAll();

    for (const u of users) {
      const json = typeof u.toJSON === "function" ? u.toJSON() : u;

      // =======================================================
      // 🛡️ WHITELIST: Solo campos permitidos
      // =======================================================
      const safeUser = {
        name: json.name,
        email: json.email,
        phone: json.phone || "",
        image: json.image || "default.png",
        role: json.role || "vendedor",
        password: json.password, // Ya viene hasheado
        created: json.created || new Date(),
        updatedAt: json.updatedAt || json.fecha_actualizacion || new Date(),
      };

      // Limpieza de campos nulos o indefinidos
      Object.keys(safeUser).forEach((k) => {
        if (safeUser[k] === null || safeUser[k] === undefined) {
          delete safeUser[k];
        }
      });

      if (!safeUser.email) continue;

      // =======================================================
      // 🔍 VERIFICACIÓN Y EVALUACIÓN DE FECHAS (LAST-WRITE-WINS)
      // =======================================================
      const mongoUser = await UserLocal.findOne({ email: safeUser.email });

      if (mongoUser) {
        const timeSqlite = new Date(safeUser.updatedAt).getTime();
        const timeMongo = new Date(mongoUser.updatedAt || 0).getTime();

        // Solo actualizamos Mongo si SQLite tiene la información más reciente
        if (timeSqlite > timeMongo) {
          await UserLocal.updateOne(
            { email: safeUser.email },
            { $set: safeUser }
          );
          console.log(`🔵 Usuario (${safeUser.email}) actualizado en Mongo Local (SQLite tenía datos más recientes).`);
        }
      } else {
        // Si el usuario no existe en Mongo Local, se inserta directamente
        await UserLocal.updateOne(
          { email: safeUser.email },
          { $set: safeUser },
          { upsert: true }
        );
        console.log(`➕ Usuario (${safeUser.email}) creado en Mongo Local.`);
      }
    }

    console.log("🟢 SQLite → Mongo Local COMPLETO (solo usuarios, con protección de fechas).");

  } catch (err) {
    console.error("❌ Error en syncSQLiteToMongo:", err.message);
  }
}

module.exports = syncSQLiteToMongo;