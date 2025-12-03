// =====================================================
// src/passport/local-auth.js
// Sistema de Login con soporte ONLINE / OFFLINE (Versión estable)
// =====================================================

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Modelos
const { UserAtlas, UserLocal, getUserModel } = require('../models/users');

// Detectar internet
const { getEstadoInternet } = require('../databases/mongoPrincipal');

// =====================================================
//  SERIALIZACIÓN — guardamos EMAIL, NO ID
// =====================================================
passport.serializeUser((user, done) => {
  done(null, user.email); // <--- FIX DEFINITIVO
});

// =====================================================
//  DESERIALIZACIÓN — carga usuario por email
// =====================================================
passport.deserializeUser(async (email, done) => {
  try {
    const online = getEstadoInternet();
    let user = null;

    // 1) Buscar en la BD dinámica
    try {
      const User = getUserModel();
      user = await User.findOne({ email });
    } catch {}

    // 2) Si no aparece por la BD actual, probar la otra
    if (!user) {
      try {
        user = await UserAtlas.findOne({ email });
      } catch {}
    }

    if (!user) {
      try {
        user = await UserLocal.findOne({ email });
      } catch {}
    }

    return done(null, user || null);

  } catch (err) {
    console.error("❌ Error en deserializeUser:", err);
    return done(err, null);
  }
});

// =====================================================
//  REGISTRO — siempre en Atlas
// =====================================================
passport.use(
  'local-signup',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const exists = await UserAtlas.findOne({ email });
        if (exists)
          return done(null, false, req.flash('signupMessage', 'El correo ya está registrado.'));

        const hashedPassword = await UserAtlas.encryptPassword(password);

        const newUser = new UserAtlas({
          name: req.body.name,
          email,
          phone: req.body.phone,
          image: req.body.image || 'default.png',
          role: req.body.role || 'vendedor',
          password: hashedPassword,
        });

        await newUser.save();
        return done(null, newUser);

      } catch (err) {
        return done(err);
      }
    }
  )
);

// =====================================================
//  LOGIN — Usando BD dinámica (Atlas/Local)
// =====================================================
passport.use(
  'local-signin',
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const User = getUserModel();
        const user = await User.findOne({ email });

        if (!user)
          return done(null, false, req.flash('signinMessage', 'Usuario no encontrado.'));

        const isMatch = await user.comparePassword(password);
        if (!isMatch)
          return done(null, false, req.flash('signinMessage', 'Contraseña incorrecta.'));

        return done(null, user);

      } catch (err) {
        return done(err);
      }
    }
  )
);
