// ============================================================
// AHUACATL — Sync de Usuarios Local → Atlas (Crea y Actualiza)
// ============================================================
const { UserLocal, UserAtlas } = require("../models/users");

async function syncUsersLocalToAtlas() {
  try {
    console.log("👤 Sync Usuarios Local → Atlas…");

    const usuariosLocal = await UserLocal.find();
    let nuevos = 0;
    let actualizados = 0;

    for (const u of usuariosLocal) {
      const existe = await UserAtlas.findOne({ email: u.email });

      // Si no existe en Atlas → CREARLO
      if (!existe) {
        await UserAtlas.create(u.toObject());
        nuevos++;
      } else {
        // Si YA existe, lo actualizamos para que Atlas sepa si cambió de nombre, rol, o si fue "eliminado" lógicamente
        await UserAtlas.updateOne(
          { email: u.email },
          { 
            $set: {
              name: u.name,
              phone: u.phone,
              image: u.image,
              password: u.password, // Protegemos tu sistema de contraseñas
              role: u.role,
              activo: u.activo !== false // Enviamos el estado activo (por defecto true)
            }
          }
        );
        actualizados++;
      }
    }

    console.log(`🟢 Sync Usuarios Local → Atlas COMPLETO (${nuevos} nuevos, ${actualizados} actualizados).`);
  } catch (err) {
    console.error("❌ Error en syncUsersLocalToAtlas:", err.message);
  }
}

module.exports = syncUsersLocalToAtlas;