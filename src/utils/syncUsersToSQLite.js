// =======================================================
// USUARIOS Atlas → SQLite + Local (Versión Profesional)
// =======================================================
const { UserAtlas } = require("../models/users");
const UserSQLite = require("../models/UserSQLite");
const { UserLocal } = require("../databases/mongoSecundario");

async function syncUsersToSQLite() {
  try {
    console.log("🔁 Sync Usuarios → SQLite + Local…");

    const usuariosAtlas = await UserAtlas.find();

    // =======================================================
    // SQLite ESPEJO DE ATLAS
    // =======================================================
    await UserSQLite.destroy({ where: {} });

    for (const u of usuariosAtlas) {
      await UserSQLite.create({
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        image: u.image || "default.png",
        password: u.password,
        role: u.role,
        created: u.created || new Date(),
        activo: u.activo !== false // Registramos si el usuario está activo o borrado lógicamente
      });
    }

    // =======================================================
    // Mongo Local ESPEJO de ATLAS (solo usuarios)
    // =======================================================
    for (const u of usuariosAtlas) {
      const safeUser = {
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        image: u.image || "default.png",
        password: u.password,
        role: u.role,
        created: u.created || new Date(),
        activo: u.activo !== false
      };

      await UserLocal.updateOne(
        { email: u.email },
        { $set: safeUser },
        { upsert: true }
      );
    }

    console.log("🟢 Usuarios sincronizados correctamente (Atlas → Local → SQLite)");
  } catch (err) {
    console.log("❌ Error sincronizando usuarios:", err.message);
  }
}

module.exports = syncUsersToSQLite;