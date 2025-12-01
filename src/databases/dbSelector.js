const { atlasConnection, localConnection, getEstadoInternet } = require("./mongoPrincipal");

function getDBConnection() {
  const online = getEstadoInternet();
  return online ? atlasConnection : localConnection;
}

module.exports = getDBConnection;
