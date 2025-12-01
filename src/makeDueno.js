// makeDueno.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/users');

(async () => {
  try {
    // Conectar a Mongo Atlas (usa tu mismo .env)
    await mongoose.connect(process.env.MONGO_ATLAS_URI);

    // Datos del dueño
    const name = 'Stephany Mariam ';
    const email = 'stephany@fruteria.com';
    const phone = '3312345678';
    const password = '12345678';
    const hashedPassword = await User.encryptPassword(password);

    // Crear o actualizar usuario
    let user = await User.findOne({ email });
    if (user) {
      user.role = 'dueno';
      await user.save();
      console.log(`✅ El usuario ${email} ahora es DUEÑO.`);
    } else {
      await User.create({
        name,
        email,
        phone,
        image: 'default.png',
        password: hashedPassword,
        role: 'dueno'
      });
      console.log(`✅ Usuario DUEÑO creado: ${email}`);
      console.log(`🔑 Contraseña: ${password}`);
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error al crear el usuario dueño:', error);
    mongoose.connection.close();
  }
})();
