module.exports = function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('signinMensaje', 'Debes iniciar sesión para acceder.');
    return res.redirect('/signin');
  }

  if (req.user.role !== 'administrador') {
    req.flash('signinMensaje', 'No tienes permisos para acceder a esta sección.');
    return res.redirect('/');
  }

  next();
};
