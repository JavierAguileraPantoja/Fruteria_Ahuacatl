// src/index.js
// =========================================
// 🌐 CONFIGURACIÓN INICIAL
// =========================================
require("dotenv").config();

// ============================
// 🔌 CARGA Y CONEXIÓN DE BASES
// ============================
// 1) Conecta Atlas + Local primero (DB principal)
require("./databases/mongoPrincipal");

// 2) Carga modelos Local (ventas, usuarios, productos)
require("./databases/mongoSecundario");

// 3.5) Cargar modelo de productos para aplicar FIX de id_global / mermas
require("./models/product");

// 3) Carga SQLite (reportes, respaldo)
require("./databases/sqliteLocal");

// 4) Passport
require("./passport/local-auth");

// ============================
//  FULL SYNC + WATCHER OFICIAL
// ============================
const { startSyncWatcher, fullSync } = require("./sync/runSync");

// 👉 Levantar Watcher de estado de internet
startSyncWatcher();

// =========================================
//  EXPRESS CONFIG
// =========================================
const express = require("express");
const engine = require("ejs-mate");
const path = require("path");
const morgan = require("morgan");
const passport = require("passport");
const session = require("express-session");
const flash = require("connect-flash");

const app = express();
app.disable("etag");

app.use(
  "/Uploads",
  express.static(path.join(__dirname, "Uploads"))
);

// =========================================
//  Configuración del servidor
// =========================================
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("port", process.env.PORT || 3000);

// =========================================
//  Middlewares
// =========================================
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sesión
app.use(
  session({
    secret: process.env.SESSION_SECRET || "miclave",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// =========================================
//  FIX: NO PERMITIR QUE CAMBIO ONLINE/OFFLINE CIERRE LA SESIÓN
// =========================================
const { getEstadoInternet } = require("./databases/mongoPrincipal");

let lastNet = getEstadoInternet();
setInterval(() => {
  const now = getEstadoInternet();
  if (now !== lastNet) {
    console.log("🔄 Cambio de internet detectado (pero sesión NO se reinicia)");
  }
  lastNet = now;
}, 2000);

app.use(flash());

// =========================================
// Variables globales
// =========================================
app.use((req, res, next) => {
  res.locals.message = {
    signupMessage: req.flash("signupMessage"),
    signinMessage: req.flash("signinMessage"),
    success: req.flash("success"),
    danger: req.flash("danger"),
  };
  res.locals.user = req.user;
  next();
});

// =========================================
//  Archivos estáticos
// =========================================
app.use("/Uploads", express.static(path.join(__dirname, "Uploads")));

// =========================================
//  Rutas principales
// =========================================
app.use("/", require("./routes/routes.js"));

// =========================================
//  LOGS INFORMATIVOS (watchers desactivados)
// =========================================
setTimeout(() => {
  try {
    console.log("⏳ Iniciando watcher Atlas y Local…");

    console.log("⚠️ Watcher Atlas DESACTIVADO: el cluster no soporta changeStream.");
    console.log("⚠️ Sincronización Atlas → Local funciona vía fullSync y syncAtlasProductsToLocal.");

    console.log("⚠️ Watcher Local DESACTIVADO (Mongo Local no soporta changeStream).");
    console.log("⚠️ La sincronización Local → Atlas se hace via pushProductChange() en tiempo real.");

    console.log("🟢 Watchers informativos cargados.");
  } catch (err) {
    console.log("❌ Error cargando watchers:", err.message);
  }
}, 1500);

// =========================================
//  FULL SYNC INICIAL
// =========================================
setTimeout(() => {
  fullSync("inicio_servidor");
}, 2500);

// =========================================
//  INICIAR SERVIDOR
// =========================================
app.listen(app.get("port"), () => {
  console.log("🚀 SERVIDOR EN PUERTO", app.get("port"));
});