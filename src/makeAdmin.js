// makeAdmin.js
const mongoose = require('mongoose');
const User = require('./models/users');

//  Cambia esto por tu URI de conexión
const MONGO_URI = "mongodb+srv://fruteria_user:Bc54h0zgEGU8gGqT@cluster0.mxgariv.mongodb.net/fruteria-user?retryWrites=true&w=majority&appName=Cluster0";

//  Cambia este correo por el del usuario que quieres hacer admin
const USER_EMAIL = 'javieraguilerapantoja@hotmail.com';

mongoose.connect(MONGO_URI)
  .then(async () => {
    const result = await User.updateOne(
      { email: USER_EMAIL },
      { $set: { role: 'administrador' } }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Usuario ${USER_EMAIL} ahora es administrador`);
    } else {
      console.log(`⚠️ No se encontró el usuario o ya era administrador`);
    }

    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Error al conectar:', err);
    mongoose.connection.close();
  });
