// ============================================================
// AHUACATL — Sync de Usuarios Local → Atlas (solo cambios reales)
// ============================================================

const { UserLocal, UserAtlas } = require("../models/users");

async function syncUsersLocalToAtlas() {
  try {
    console.log("👤 Sync Usuarios Local → Atlas…");

    const usuariosLocal = await UserLocal.find();

    let count = 0;

    for (const u of usuariosLocal) {
      const existe = await UserAtlas.findOne({ email: u.email });

      // Si no existe en Atlas → CREARLO
      if (!existe) {
        await UserAtlas.create(u.toObject());
        count++;
      }
    }

    console.log(`🟢 Sync Usuarios Local → Atlas COMPLETO (${count} nuevos).`);

  } catch (err) {
    console.error("❌ Error en syncUsersLocalToAtlas:", err.message);
  }
}

module.exports = syncUsersLocalToAtlas;
