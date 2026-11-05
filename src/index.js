// src/index.js
// =========================================
// 🌐 CONFIGURACIÓN INICIAL
// =========================================
require("dotenv").config();

// ============================
// 🔌 CARGA Y CONEXIÓN DE BASES
// ============================
require("./databases/mongoPrincipal");
require("./databases/mongoSecundario");
require("./models/product");
require("./databases/sqliteLocal");
require("./passport/local-auth");

// 📈 IMPORTACIÓN DEL MÓDULO DE PRECIOS SNIIM
const { cargarYProcesarDatos } = require("./utils/analizar_datos");

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

// Archivos estáticos
app.use("/Uploads", express.static(path.join(__dirname, "Uploads")));

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
//  FIX: SESIÓN E INTERNET
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
//  Rutas principales
// =========================================
app.use("/", require("./routes/routes.js"));

// =========================================
// 📊 ENDPOINT API: OBTENER TODOS LOS PRECIOS SNIIM
// =========================================
app.get("/api/precios", (req, res) => {
  try {
    const rawData = cargarYProcesarDatos();

    // Si rawData ya es un objeto procesado
    let listaRaw = [];
    let datosGrafica = {};

    if (rawData && rawData.listaProductos) {
      listaRaw = rawData.listaProductos;
      datosGrafica = rawData.datosGrafica || {};
    } else if (Array.isArray(rawData)) {
      // Si devuelve un arreglo de registros simples
      rawData.forEach(item => {
        const prod = item.producto || item.nombre;
        if (prod) {
          if (!datosGrafica[prod]) datosGrafica[prod] = [];
          datosGrafica[prod].push(item);
        }
      });
      listaRaw = Object.keys(datosGrafica);
    } else {
      datosGrafica = rawData || {};
      listaRaw = Object.keys(datosGrafica);
    }

    // Filtro de limpieza para descartar textos de encabezados o páginas
    const listaLimpia = listaRaw.filter(nombre => {
      if (!nombre || typeof nombre !== 'string') return false;
      const n = nombre.toLowerCase().trim();
      return !(
        n.includes("página") ||
        n.includes("mercados") ||
        n.includes("fecha") ||
        n.includes("encuesta") ||
        n.includes("registros") ||
        n.includes("pesos") ||
        n.length > 40
      );
    }).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    res.json({
      success: true,
      total: listaLimpia.length,
      listaProductos: listaLimpia,
      datosGrafica: datosGrafica
    });

  } catch (error) {
    console.error("❌ Error al procesar datos de precios:", error.message);
    res.status(500).json({ error: "No se pudieron obtener los datos de precios." });
  }
});

// =========================================
//  LOGS Y FULL SYNC
// =========================================
const { startSyncWatcher, fullSync } = require("./sync/runSync");
startSyncWatcher();

setTimeout(() => {
  try {
    console.log("⏳ Iniciando watcher Atlas y Local…");
    console.log("🟢 Watchers informativos cargados.");
  } catch (err) {
    console.log("❌ Error cargando watchers:", err.message);
  }
}, 1500);

setTimeout(() => {
  fullSync("inicio_servidor");
}, 2500);

// =========================================
// SCHEDULER AUTOMÁTICO SNIIM
// =========================================
require("./scripts/sniimScheduler");


// =========================================
//  INICIAR SERVIDOR
// =========================================
app.listen(app.get("port"), () => {
  console.log("🚀 SERVIDOR EN PUERTO", app.get("port"));
});