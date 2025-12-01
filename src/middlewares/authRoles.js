// src/middlewares/authRoles.js

// Verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.message = {
    type: 'warning',
    message: 'Debes iniciar sesión para acceder a esta página.'
  };
  res.redirect('/signin');
}

// Verificar si el usuario es dueño o administrador
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && (req.user.role === 'administrador' || req.user.role === 'dueno')) {
    return next();
  }
  req.session.message = {
    type: 'danger',
    message: 'No tienes permisos suficientes para acceder a esta sección.'
  };
  res.redirect('/');
}

// Verificar si el usuario es vendedor
function isVendedor(req, res, next) {
  if (req.isAuthenticated() && ['vendedor', 'administrador', 'dueno'].includes(req.user.role)) {
    return next();
  }
  req.session.message = {
    type: 'danger',
    message: 'Acceso restringido a vendedores.'
  };
  res.redirect('/');
}

// Verificar si el usuario es bodeguero
function isBodeguero(req, res, next) {
  if (req.isAuthenticated() && ['bodeguero', 'administrador', 'dueno'].includes(req.user.role)) {
    return next();
  }
  req.session.message = {
    type: 'danger',
    message: 'Acceso restringido a bodegueros.'
  };
  res.redirect('/');
}

module.exports = {
  isAuthenticated,
  isAdmin,
  isVendedor,
  isBodeguero
};
