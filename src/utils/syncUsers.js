// src/utils/syncUsers.js
const User = require('../models/users');        // Mongo Local
const UserSQLite = require('../models/UserSQLite');  // SQLite

async function syncUsersToSQLite() {
  try {
    console.log('🔁 Iniciando sincronización Mongo Local → SQLite...');

    // Obtenemos los usuarios desde Mongo Local
    const users = await User.find();

    // Limpiar tabla SQLite antes de insertar
    await UserSQLite.destroy({ where: {} });
    console.log('🧹 Tabla UserSQLite limpiada antes de sincronizar.');

    // Insertar usuarios actualizados
    for (const u of users) {
      await UserSQLite.upsert({
        name: u.name || 'Sin nombre',
        email: u.email || 'sin-correo@ejemplo.com',
        phone: u.phone || 'No especificado',
        image: u.image || 'default.png',
        password: u.password || '',
        role: u.role || 'vendedor'
      });
    }

    console.log('✨ Sincronización Mongo Local → SQLite completada correctamente.');
  } catch (error) {
    console.error('❌ Error al sincronizar Mongo Local → SQLite:', error.message);
  }
}

module.exports = syncUsersToSQLite;
