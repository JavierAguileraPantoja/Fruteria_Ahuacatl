// src/routes/products.js
// =======================================================
// 📦 RUTAS DE PRODUCTOS — AHUACATL (BASE64 DB STORAGE — FIXED IMAGES)
// =======================================================
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const { isAdmin, isBodeguero, isAuthenticated, isAdminOrBodeguero } = require("../middlewares/authRoles");
const { getProductModel } = require("../models/product");

// 🔥 SINCRONIZACIÓN POR EVENTOS
const pushProductChange = require("../utils/pushProductChange");

// ----------------------------------------------------
// ⚙️ MULTER CONFIG (¡AHORA EN MEMORIA RECIÉN ENTRADA!)
// ----------------------------------------------------
// Cambiado a memoryStorage para que la foto no se escriba en el disco duro efímero de Render
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Pequeña utilidad para parsear números
function toNumber(value, fallback = 0) {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

// Helper para convertir el buffer de la imagen a string Base64 válido para la etiqueta <img>
function convertToBase64(file) {
  if (!file) return null;
  const base64Image = file.buffer.toString("base64");
  return `data:${file.mimetype};base64,${base64Image}`;
}

// ====================================================
// 📋 LISTAR PRODUCTOS
// ====================================================
router.get("/productos", isAuthenticated, async (req, res) => {
  try {
    const Product = getProductModel();
    const productos = await Product.find().sort({ nombre: 1 });

    res.render("products", {
      title: "Productos",
      productos,
      user: req.user,
      message: req.session.message
    });

    req.session.message = null;

  } catch (err) {
    console.error("❌ Error al cargar productos:", err);

    res.render("products", {
      title: "Productos",
      productos: [],
      user: req.user,
      message: { type: "danger", message: "Error al cargar productos (offline mode)" }
    });
  }
});

// ====================================================
// ➕ FORMULARIO AGREGAR
// ====================================================
router.get("/productos/add", isBodeguero, (req, res) => {
  res.render("add_product", {
    title: "Agregar Producto",
    user: req.user
  });
});

// ====================================================
// ➕ AGREGAR / ACTUALIZAR PRODUCTO (FIFO + SYNC)
// ====================================================
router.post(
  "/productos/add",
  isBodeguero,
  upload.single("imagen"),
  async (req, res) => {
    try {
      const Product = getProductModel();

      const {
        nombre,
        categoria,
        precio_compra,
        precio_venta,
        stock,
        unidad
      } = req.body;

      // Si subió foto se convierte a Base64, si no se le asigna la de por defecto
      const imagenData = req.file ? convertToBase64(req.file) : "default.png";

      // 📌 Buscar producto POR id_global si viene desde edición
      let existente = null;

      if (req.body.id_global) {
        existente = await Product.findOne({ id_global: req.body.id_global });
      }

      if (!existente) {
        existente = await Product.findOne({
          nombre: nombre.trim()
        });
      }

      if (existente && !existente.id_global) {
        existente.id_global = uuidv4();
        await existente.save();
      }

      // =====================================================
      // 🟢 SI EXISTE → LÓGICA FIFO (lotes)
      // =====================================================
      if (existente) {
        const cantidadNueva = toNumber(stock, 0);
        const precioCompraNuevo = toNumber(precio_compra, existente.precio_compra || 0);
        const precioVentaNuevo = toNumber(precio_venta, existente.precio_venta || 0);

        existente.precio_actual = existente.precio_actual || existente.precio_venta || 0;
        existente.precio_viejo =
          existente.precio_viejo || existente.precio_actual || precioVentaNuevo;
        existente.precio_nuevo = existente.precio_nuevo || 0;

        if (existente.stock_precio_viejo == null) {
          existing.stock_precio_viejo = existente.stock || 0;
        }
        existente.stock_precio_nuevo = existente.stock_precio_nuevo || 0;

        existente.stock = (existente.stock || 0) + cantidadNueva;

        // SUBE precio
        if (precioVentaNuevo > existente.precio_actual) {
          existente.precio_actual = precioVentaNuevo;
          existente.precio_viejo = precioVentaNuevo;
          existente.precio_nuevo = precioVentaNuevo;

          existente.stock_precio_viejo = existente.stock;
          existente.stock_precio_nuevo = 0;

          existente.precio_compra = precioCompraNuevo;
          existente.precio_compra_pendiente = 0;
          existente.precio_venta = precioVentaNuevo;
        }

        // BAJA precio
        else if (precioVentaNuevo < existente.precio_actual) {
          existente.precio_nuevo = precioVentaNuevo;
          existente.stock_precio_nuevo += cantidadNueva;
          existente.precio_compra_pendiente = precioCompraNuevo;
          existente.precio_venta = existente.precio_actual;
        }

        // MISMO precio
        else {
          if (
            existente.stock_precio_nuevo > 0 &&
            existente.precio_nuevo === precioVentaNuevo &&
            existente.precio_nuevo > 0
          ) {
            existente.stock_precio_nuevo += cantidadNueva;
          } else {
            existente.stock_precio_viejo =
              (existente.stock_precio_viejo || 0) + cantidadNueva;
          }

          existente.precio_compra = precioCompraNuevo;
          existente.precio_venta = precioVentaNuevo;
          existente.precio_actual = precioVentaNuevo;
        }

        // Imagen en Base64 (Ya no borra archivos locales porque no existen)
        if (req.file) {
          existente.imagen = imagenData;
        }

        await existente.save();
        await pushProductChange(existente);

        req.session.message = {
          type: "success",
          message: `Stock actualizado: ${existente.stock} ${existente.unidad}`
        };
        return res.redirect("/productos");
      }

      // =====================================================
      // 🆕 NUEVO PRODUCTO
      // =====================================================
      const stockInicial = toNumber(stock, 0);
      const precioCompraInicial = toNumber(precio_compra, 0);
      const precioVentaInicial = toNumber(precio_venta, 0);

      const nuevo = new Product({
        id_global: uuidv4(),
        nombre,
        categoria,
        precio_compra: precioCompraInicial,
        precio_venta: precioVentaInicial,
        stock: stockInicial,
        unidad,
        imagen: imagenData, // Se guarda la cadena de texto base64
        creadoPor: req.user.email,
        creadoEn: new Date(),
        precio_actual: precioVentaInicial,
        precio_viejo: precioVentaInicial,
        precio_nuevo: precioVentaInicial,
        stock_precio_viejo: stockInicial,
        stock_precio_nuevo: 0,
        precio_compra_pendiente: 0
      });

      await nuevo.save();
      await pushProductChange(nuevo);

      req.session.message = {
        type: "success",
        message: "Producto agregado correctamente."
      };
      return res.redirect("/productos");
    } catch (err) {
      console.error("❌ Error agregando producto:", err);
      req.session.message = {
        type: "danger",
        message: "Error al agregar producto."
      };
      res.redirect("/productos");
    }
  }
);

// ====================================================
// ✏️ EDITAR PRODUCTO
// ====================================================
router.get("/productos/edit/:id", isBodeguero, async (req, res) => {
  try {
    const Product = getProductModel();
    const producto = await Product.findById(req.params.id);

    res.render("edit_product", {
      title: "Editar Producto",
      producto,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.redirect("/productos");
  }
});

// ====================================================
// ✏️ ACTUALIZAR PRODUCTO
// ====================================================
router.post("/productos/edit/:id",
  isBodeguero,
  upload.single("imagen"),
  async (req, res) => {
    try {
      const Product = getProductModel();
      const producto = await Product.findById(req.params.id);
      if (!producto) throw "Producto no encontrado";

      const precioCompra = toNumber(req.body.precio_compra, producto.precio_compra);
      const precioVenta = toNumber(req.body.precio_venta, producto.precio_venta);
      const nuevoStock = req.body.stock !== undefined ? toNumber(req.body.stock, producto.stock) : null;

      // Imagen en Base64
      if (req.file) {
        producto.imagen = convertToBase64(req.file);
      }

      producto.precio_compra = precioCompra;
      producto.precio_venta = precioVenta;

      if (nuevoStock !== null) {
        producto.stock = nuevoStock;
        producto.stock_precio_viejo = nuevoStock;
        producto.stock_precio_nuevo = 0;
        producto.precio_actual = precioVenta;
        producto.precio_viejo = precioVenta;
        producto.precio_nuevo = precioVenta;
        producto.precio_compra_pendiente = 0;
      }

      await producto.save();
      await pushProductChange(producto);

      req.session.message = {
        type: "success",
        message: "Producto actualizado correctamente."
      };
      res.redirect("/productos");
    } catch (err) {
      console.error(err);
      req.session.message = {
        type: "danger",
        message: "Error al actualizar producto."
      };
      res.redirect("/productos");
    }
  }
);

// ====================================================
// 📄 FORMULARIO DE MERMA
// ====================================================
router.get("/productos/add-merma/:id", isAdminOrBodeguero, async (req, res) => {
  try {
    const Product = getProductModel();
    const producto = await Product.findById(req.params.id);

    if (!producto) return res.redirect("/productos");

    res.render("add_merma", {
      title: "Registrar Merma",
      producto,
      user: req.user
    });

  } catch (err) {
    console.error("Error al cargar formulario de merma:", err);
    res.redirect("/productos");
  }
});

// ====================================================
// 🟧 REGISTRAR MERMA
// ====================================================
router.post("/productos/add-merma/:id", isAdminOrBodeguero, async (req, res) => {
  try {
    const Product = getProductModel();
    const producto = await Product.findById(req.params.id);

    if (!producto) {
      req.session.message = {
        type: "danger",
        message: "Producto no encontrado."
      };
      return res.redirect("/productos");
    }

    const cantidad = parseFloat(req.body.cantidad || 0);

    if (isNaN(cantidad) || cantidad <= 0) {
      req.session.message = {
        type: "danger",
        message: "Cantidad inválida para merma."
      };
      return res.redirect("/productos");
    }

    if (cantidad > producto.stock) {
      req.session.message = {
        type: "danger",
        message: "No hay suficiente stock para descontar esa merma."
      };
      return res.redirect("/productos");
    }

    const stockAntes = producto.stock;
    producto.stock -= cantidad;

    let restante = cantidad;

    if (producto.stock_precio_viejo >= restante) {
      producto.stock_precio_viejo -= restante;
      restante = 0;
    } else {
      restante -= producto.stock_precio_viejo;
      producto.stock_precio_viejo = 0;
    }

    if (restante > 0) {
      producto.stock_precio_nuevo =
        Math.max(producto.stock_precio_nuevo - restante, 0);
    }

    const stockDespues = producto.stock;

    producto.mermas.push({
      amount: cantidad,
      motivo: req.body.motivo,
      fecha: new Date(),
      registradoPor: req.user.name
    });

    await producto.save();
    await pushProductChange(producto);

    return res.render("report_mermas", {
      producto,
      cantidad,
      motivo: req.body.motivo,
      stockAntes,
      stockDespues,
      user: req.user
    });

  } catch (err) {
    console.error("❌ Error registrando merma:", err);
    req.session.message = {
      type: "danger",
      message: "Error al registrar merma."
    };
    res.redirect("/productos");
  }
});

//=====================================================
// 🧾 REPORTE DE MERMAS
//=====================================================
router.get("/reportes/mermas", isAdmin, async (req, res) => {
  try {
    const Product = getProductModel();
    const productos = await Product.find();

    let mermas = [];

    productos.forEach(p => {
      if (p.mermas && p.mermas.length > 0) {
        p.mermas.forEach(m => {
          mermas.push({
            producto: p.nombre,
            cantidad: m.cantidad,
            motivo: m.motivo,
            fecha: m.fecha,
            usuario: m.registradoPor
          });
        });
      }
    });

    mermas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.render("report_mermas", {
      title: "Reporte de Mermas",
      mermas,
      user: req.user
    });

  } catch (err) {
    console.error("Error cargando reporte de mermas:", err);
    res.redirect("/productos");
  }
});

// ====================================================
// 🗑 ELIMINAR PRODUCTO
// ====================================================
router.get("/productos/delete/:id", isAdmin, async (req, res) => {
  try {
    const Product = getProductModel();
    await Product.findByIdAndDelete(req.params.id);

    req.session.message = {
      type: "success",
      message: "Producto eliminado."
    };
    res.redirect("/productos");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: "Error al eliminar producto."
    };
    res.redirect("/productos");
  }
});

module.exports = router;
