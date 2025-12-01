// src/routes/routes.js
// =======================================================
// SISTEMA FRUTERÍA AHUACATL — AHUACATL
// =======================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// Utils
const multer = require("multer");
const passport = require("passport");
const mongoose = require("mongoose");
const { localConnection } = require("../databases/mongoPrincipal");

// Middlewares
const {
  isAuthenticated,
  isAdmin,
  isVendedor,
  isBodeguero
} = require("../middlewares/authRoles");

const ProductMongoLocalFix =
  localConnection.models.ProductMongoLocalFix ||
  localConnection.model(
    "ProductMongoLocalFix",
    new mongoose.Schema({}, { strict: false, collection: "products" })
  );

// 🔌 Estado de internet para saber si estamos ONLINE/OFFLINE
const { getEstadoInternet } = require("../databases/mongoPrincipal");

// Modelos dinámicos
const { getUserModel } = require("../models/users");
const { getProductModel, ProductMongoLocal, ProductSQLite } = require("../models/product");

const {
  getVentaModel,
  VentaMongo,
  VentaSQLite,
  VentaDetalleSQLite
} = require("../models/venta");

const reportes = require("../models/reportesController");

// =======================================================
// 🔧 MULTER PARA SUBIDA DE IMÁGENES
// =======================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "..", "Uploads")),
  filename: (req, file, cb) =>
    cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname)
});
const upload = multer({ storage }).single("image");



// BLOQUEA CACHÉ EN TODAS LAS VISTAS
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});


// =======================================================
// 🔹 MOSTRAR FORMULARIO DE REGISTRO
// =======================================================
router.get("/signup", (req, res) => {
  res.render("signup", { user: req.user || null });
});


// =======================================================
// 🏠 RUTA PRINCIPAL
// =======================================================
router.get("/", isAuthenticated, (req, res) => {
  res.render("index", {
    title: "Dashboard Principal",
    user: req.user,
    message: req.session.message
  });
  req.session.message = null;
});

// =======================================================
// 👤 PERFIL
// =======================================================
router.get("/profile", isAuthenticated, (req, res) => {
  res.render("profile", {
    title: "Mi Perfil",
    user: req.user
  });
});

// =======================================================
// 👥 CRUD USUARIOS
// =======================================================
router.get("/users_list", isAdmin, async (req, res) => {
  try {
    const User = getUserModel();
    const users = await User.find();

    res.render("users", {
      title: "Lista de Usuarios",
      users,
      user: req.user,
      message: req.session.message
    });

    req.session.message = null;
  } catch (err) {
    console.log(err);
    res.render("users", {
      title: "Lista de Usuarios",
      users: [],
      user: req.user,
      message: { type: "danger", message: "Error al cargar usuarios" }
    });
  }
});

router.get("/add", isAdmin, (req, res) => {
  res.render("add_users", {
    title: "Agregar Usuario",
    user: req.user
  });
});

router.post("/add", isAdmin, upload, async (req, res) => {
  try {
    const User = getUserModel();
    const hashedPassword = await User.encryptPassword(req.body.password);

    const imageUrl = req.file ? req.file.filename : "default.png";

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      image: imageUrl,
      role: req.body.role
    });

    await user.save();

    req.session.message = {
      type: "success",
      message: "Usuario creado correctamente."
    };

    res.redirect("/users_list");
  } catch (err) {
    console.log(err);
    res.json({ message: err.message });
  }
});

router.get("/edit/:id", isAdmin, async (req, res) => {
  try {
    const User = getUserModel();
    const user = await User.findById(req.params.id);
    res.render("edit_users", { title: "Editar Usuario", user });
  } catch {
    res.redirect("/users_list");
  }
});

router.post("/update/:id", isAdmin, upload, async (req, res) => {
  try {
    const User = getUserModel();
    const id = req.params.id;
    const new_image = req.file ? req.file.filename : req.body.old_image;

    if (req.file && req.body.old_image) {
      try {
        fs.unlinkSync(
          path.join(__dirname, "..", "Uploads", req.body.old_image)
        );
      } catch {}
    }

    await User.findByIdAndUpdate(id, {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      image: new_image,
      role: req.body.role
    });

    req.session.message = {
      type: "success",
      message: "Usuario actualizado correctamente."
    };

    res.redirect("/users_list");
  } catch (err) {
    console.log(err);
    res.redirect("/users_list");
  }
});

router.get("/delete/:id", isAdmin, async (req, res) => {
  try {
    const User = getUserModel();

    const result = await User.findByIdAndDelete(req.params.id);

    if (result && result.image !== "default.png") {
      try {
        fs.unlinkSync(path.join(__dirname, "..", "Uploads", result.image));
      } catch {}
    }

    req.session.message = {
      type: "success",
      message: "Usuario eliminado correctamente."
    };

    res.redirect("/users_list");
  } catch (err) {
    console.log(err);
    res.redirect("/users_list");
  }
});

// =======================================================
// 🔐 AUTENTICACIÓN
// =======================================================
router.get("/signin", (req, res) =>
  res.render("signin", { title: "Iniciar sesión" })
);

router.post("/signin", (req, res, next) => {
  passport.authenticate("local-signin", (err, user) => {
    if (err) return next(err);
    if (!user) return res.redirect("/signin");

    req.logIn(user, (err) => {
      if (err) return next(err);

      if (user.role === "vendedor") return res.redirect("/ventas");
      if (user.role === "bodeguero") return res.redirect("/productos");

      return res.redirect("/");
    });
  })(req, res, next);
});

router.get("/logout", (req, res) => {
  req.logout(() => {});
  res.redirect("/signin");
});

// =======================================================
// 💸 VENTAS (ONLINE + OFFLINE AUTOMÁTICO)
// =======================================================
router.get("/ventas", isVendedor, async (req, res) => {
  try {
    const Product = getProductModel();
    const productos = await Product.find().sort({ nombre: 1 });

    res.render("ventas", {
      title: "Punto de Venta",
      user: req.user,
      productos,
      message: req.session.message
    });

    req.session.message = null;
  } catch (err) {
    console.log(err);
    res.render("ventas", {
      title: "Punto de Venta",
      user: req.user,
      productos: [],
      message: { type: "danger", message: "Error cargando productos." }
    });
  }
});

// ✔ Lógica de precios (por tipo de cliente y kg)
function determinarPrecioBackend(precioBase, cantidad, tipoCliente) {
  const kg = parseFloat(cantidad) || 0;

  if (kg >= 20) return precioBase * 0.85;     // mayoreo por cantidad
  if (kg >= 10) return precioBase * 0.90;     // pre-mayoreo por cantidad
  if (tipoCliente === "mayoreo") return precioBase * 0.85;
  if (tipoCliente === "pre-mayoreo") return precioBase * 0.90;

  return precioBase;
}

// =======================================================
//  💥 ZONA CRÍTICA (AQUÍ ESTABA TU ERROR)
// =======================================================
// 👉 Toda la lógica de ventas completa, con inicialización correcta
// 👉 NO se borró nada tuyo
// 👉 NO se tocó sincronización
// 👉 Solo corregí inicialización de lotes

router.post("/ventas", isVendedor, async (req, res) => {
  try {
    let { tipoCliente, clienteNombre, clienteTelefono, carrito } = req.body;

    let items = [];
    try {
      items = JSON.parse(carrito || "[]");
    } catch {}

    if (!items.length) {
      req.session.message = {
        type: "danger",
        message: "No hay productos en la venta."
      };
      return res.redirect("/ventas");
    }

    const Product = getProductModel();
    const Venta = getVentaModel();
    const online = getEstadoInternet();

    const ids = items.map((i) => i.productId);
    const productosDB = await Product.find({ _id: { $in: ids } });

    const mapaProductos = {};
    productosDB.forEach(
      (p) => (mapaProductos[p._id.toString()] = p)
    );

    let mensajeStock = null;

    // ✔ VALIDACIÓN DE STOCK GLOBAL
    for (const item of items) {
      const prod = mapaProductos[item.productId];
      if (!prod) {
        req.session.message = {
          type: "danger",
          message: "Producto no encontrado."
        };
        return res.redirect("/ventas");
      }

      const cantidad = parseFloat(item.cantidad);

      if (prod.stock < cantidad) {
        req.session.message = {
          type: "danger",
          message: `❌ Stock insuficiente para ${prod.nombre}. Disponible: ${prod.stock} ${prod.unidad}`
        };
        return res.redirect("/ventas");
      }

      if (!mensajeStock && prod.stock - cantidad <= 10) {
        mensajeStock = {
          type: "warning",
          message: `⚠️ Atención: ${prod.nombre} está por agotarse.`
        };
      }
    }

    if (mensajeStock) req.session.message = mensajeStock;

    // ✔ PROCESAR ITEMS
    let total = 0;
    const itemsProcesados = items.map((i) => {
      const p = mapaProductos[i.productId];
      const cantidad = parseFloat(i.cantidad);

      const basePrice =
        p.precio_actual && p.precio_actual > 0
          ? p.precio_actual
          : p.precio_venta;

      const precioUnitario = determinarPrecioBackend(
        basePrice,
        cantidad,
        tipoCliente
      );

      const subtotal = precioUnitario * cantidad;
      total += subtotal;

      return {
        productId: p._id,
        nombre: p.nombre,
        cantidad,
        unidad: p.unidad,
        precioUnitario,
        subtotal
      };
    });
    // ============================================================
    // 🟦 BLOQUE OFICIAL — FIFO + SQLite + Mongo Local
    // ============================================================

    for (let item of itemsProcesados) {
      const p = mapaProductos[item.productId.toString()];
      let cantidad = item.cantidad;

      // ⭐ Inicialización correcta de lotes
      if (
        (p.stock_precio_viejo == null && p.stock_precio_nuevo == null) ||
        (p.stock > 0 && (p.stock_precio_viejo + p.stock_precio_nuevo) === 0)
      ) {
        p.stock_precio_viejo = p.stock;
        p.stock_precio_nuevo = 0;

        if (!p.precio_actual || p.precio_actual <= 0)
          p.precio_actual = p.precio_venta;

        if (!p.precio_viejo || p.precio_viejo <= 0)
          p.precio_viejo = p.precio_actual;

        if (!p.precio_nuevo || p.precio_nuevo <= 0)
          p.precio_nuevo = p.precio_actual;
      }

      // Nunca permitir null
      if (p.stock_precio_viejo == null) p.stock_precio_viejo = 0;
      if (p.stock_precio_nuevo == null) p.stock_precio_nuevo = 0;

      // ⭐ FIFO
      if (p.stock_precio_viejo > 0) {
        const desdeViejo = Math.min(p.stock_precio_viejo, cantidad);
        p.stock_precio_viejo -= desdeViejo;
        cantidad -= desdeViejo;
      }

      if (cantidad > 0 && p.stock_precio_nuevo > 0) {
        const desdeNuevo = Math.min(p.stock_precio_nuevo, cantidad);
        p.stock_precio_nuevo -= desdeNuevo;
        cantidad -= desdeNuevo;
      }

      // Calcular stock final
      p.stock =
        (p.stock_precio_viejo || 0) +
        (p.stock_precio_nuevo || 0);

      // Si se acabó la parte vieja → actualizar precios
      if (p.stock_precio_viejo <= 0 && p.stock_precio_nuevo > 0) {
        p.precio_actual = p.precio_nuevo;
        p.precio_viejo = p.precio_nuevo;

        if (p.precio_compra_pendiente && p.precio_compra_pendiente > 0) {
          p.precio_compra = p.precio_compra_pendiente;
          p.precio_compra_pendiente = 0;
        }
      }

      // ============================================================
      // 🟧 ACTUALIZAR SQLITE SIEMPRE
      // ============================================================
      try {
        const [updated] = await ProductSQLite.update(
          { 
            stock: p.stock,
            precio_actual: p.precio_actual,
            precio_viejo: p.precio_viejo,
            precio_nuevo: p.precio_nuevo,
            precio_compra_pendiente: p.precio_compra_pendiente
          },
          { where: { id_global: p.id_global } } // 🔥 LLAVE REAL — MATCH 100% EXACTO
        );

        // Si NO lo encontró, lo recreo limpio (no falla nunca)
        if (updated === 0) {
          await ProductSQLite.create({
            id_global: p.id_global,
            nombre: p.nombre,
            categoria: p.categoria,
            precio_compra: p.precio_compra,
            precio_venta: p.precio_venta,
            precio_compra_pendiente: p.precio_compra_pendiente,
            stock: p.stock,
            unidad: p.unidad,
            imagen: p.imagen,
            creadoPor: p.creadoPor,
            creadoEn: p.creadoEn,
            precio_actual: p.precio_actual,
            precio_viejo: p.precio_viejo,
            precio_nuevo: p.precio_nuevo
          });
        }

        console.log("📦 SQLite actualizado:", p.nombre, p.stock);

      } catch (err) {
        console.log("❌ Error SQLite:", err.message);
      }
      // ============================================================
      // 💾 GUARDAR PRODUCTO EN LA BD PRINCIPAL (Atlas o Local)
      // ============================================================
      await p.save();

      // ============================================================
      // 🟩 ESPEJO EN MONGO LOCAL (solo ONLINE)
      // ============================================================
      if (online) {
        // FORZAR actualización real en Mongo Local
        try {
          await ProductMongoLocalFix.updateOne(
            { id_global: p.id_global },
            {
              $set: {
                stock: p.stock,
                stock_precio_viejo: p.stock_precio_viejo,
                stock_precio_nuevo: p.stock_precio_nuevo,
                precio_actual: p.precio_actual,
                precio_viejo: p.precio_viejo,
                precio_nuevo: p.precio_nuevo,
                precio_compra: p.precio_compra,
                precio_venta: p.precio_venta,
                precio_compra_pendiente: p.precio_compra_pendiente,
                updatedAt: new Date()
              }
            },
            { upsert: false }
          );

          console.log("✅ LOCAL actualizado FORZADO:", p.nombre, p.stock);
        } catch (err) {
          console.log("❌ Error actualizando LOCAL:", err.message);
        }

      }
    }


    // ============================================================
    // 🧾 GUARDAR VENTA (Atlas / Local)
    // ============================================================
    const venta = new Venta({
      tipoCliente,
      clienteNombre,
      clienteTelefono,
      items: itemsProcesados,
      total,
      estado: "impresa",
      creadoPor: req.user.name||req.user.email,
      creadoEn: new Date()
    });

    await venta.save();

    // ============================================================
    // 🟧 COPIA EN SQLITE
    // ============================================================
    try {
      const vSQLite = await VentaSQLite.create({
        tipoCliente,
        clienteNombre,
        clienteTelefono,
        total,
        estado: "impresa",
        creadoPor: req.user.nombre,
        creadoEn: new Date()
      });

      for (const item of itemsProcesados) {
        await VentaDetalleSQLite.create({
          ventaId: vSQLite.id,
          productId: item.productId.toString(),
          nombre: item.nombre,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal
        });
      }
    } catch (err) {
      console.log("❌ Error SQLite venta:", err.message);
    }

    return res.redirect(`/ventas/ticket/${venta._id}`);
  } catch (err) {
    console.log(err);
    req.session.message = {
      type: "danger",
      message: "Error al registrar venta"
    };
    res.redirect("/ventas");
  }
});

// Mostrar ticket
router.get("/ventas/ticket/:id", isVendedor, async (req, res) => {
  try {
    const Venta = getVentaModel();
    const venta = await Venta.findById(req.params.id);

    if (!venta) return res.send("Venta no encontrada");

    res.render("ticket_venta", { venta });
  } catch {
    res.send("Error cargando ticket");
  }
});

// =======================================================
// 📦 PRODUCTOS (importamos el router ya final)
// =======================================================
router.use("/", require("./products"));

// 📊 REPORTES
router.get("/reportes", isAdmin, async (req, res) => {
  try {
    await reportes.verReportes(req, res);
  } catch (err) {
    console.error("❌ Error en /reportes:", err);
    req.session.message = {
      type: "danger",
      message: "Error al cargar reportes."
    };
    res.redirect("/");
  }
});
router.get("/reportes/stock/ticket", isAdmin, async (req, res) => {
  try {
    const Product = getProductModel();
    const productos = await Product.find().sort({ nombre: 1 });

    const bajos = productos.filter(p => p.stock <= (p.minimo || 0));

    res.render("ticket_stock", {
      title: "Ticket de Stock para Surtir",
      user: req.user,
      productos: bajos
    });

  } catch (err) {
    console.log("❌ Error generando ticket de stock:", err.message);
    res.send("Error generando ticket de stock.");
  }
});

// 📦 Ticket por producto (kilos vendidos)
router.get(
  "/reportes/productos/ticket",
  isAuthenticated,
  reportes.ticketProductos   // 👈 usamos el controller
);


// =======================================================
// 📩 REDIRECCIÓN SEGURA A WHATSAPP
// =======================================================
router.get("/whatsapp/enviar", (req, res) => {
    const telefono = "524451581765";  // Tu número
    const mensaje = encodeURIComponent(req.query.mensaje || "Reporte Ahuacatl");

    const link = `https://web.whatsapp.com/send?phone=${telefono}&text=${mensaje}`;

    res.render("whatsapp_redirect", { link });
});





router.get("/reportes/diario/ticket", isAdmin, reportes.ticketReporteDiario);
router.get("/reportes/diario/csv",    isAdmin, reportes.csvReporteDiario);

router.get("/reportes/diario",            isAdmin, reportes.reporteDiario);

router.get("/reportes/diario/usuario", isAuthenticated, reportes.reporteDiarioUsuario);

router.get("/reportes/semanal",           isAdmin, reportes.reporteSemanal);
router.get("/reportes/producto-mas-vendido", isAdmin, reportes.productoMasVendido);
router.get("/reportes/utilidades",        isAdmin, reportes.utilidades);
router.get("/reportes/stock",             isAdmin, reportes.stock);

router.get("/reportes/pdf",   isAdmin, reportes.generarPDF);
router.get("/reportes/excel", isAdmin, reportes.generarExcel);


// =======================================================
// EXPORT
// =======================================================

// =======================================================
// UTILIDAD TEMPORAL: RECREAR PRODUCTO EN LOCAL DESDE ATLAS
// =======================================================
router.get("/fix/missing-product/:id_global", async (req, res) => {
  try {
    const { id_global } = req.params;

    const Product = getProductModel();        // ATLAS
    const localModel = ProductMongoLocal;     // LOCAL (docker)

    const p = await Product.findOne({ id_global });

    if (!p) return res.send("No existe en Atlas.");

    const plain = p.toObject();
    delete plain._id;
    plain.updatedAt = new Date();

    // 🚫 YA NO CREA NADA NUEVO
    // SOLO ACTUALIZA PRODUCTOS QUE YA EXISTEN
    const result = await localModel.updateOne(
      { id_global },
      { $set: plain },
      { upsert: false }
    );

    if (result.matchedCount === 0)
      return res.send("❌ No existía en Local. No se recreó (upsert bloqueado).");

    res.send("Producto restaurado en Local ✔️");
  } catch (err) {
    res.send("Error: " + err.message);
  }
});




module.exports = router;
