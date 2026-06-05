// src/routes/products.js
// =======================================================
// 📦 RUTAS DE PRODUCTOS — AHUACATL (CLOUDINARY STORAGE — FIXED)
// =======================================================
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const { isAdmin, isBodeguero, isAuthenticated, isAdminOrBodeguero } = require("../middlewares/authRoles");
const { getProductModel } = require("../models/product");

// 🔥 SINCRONIZACIÓN POR EVENTOS
const pushProductChange = require("../utils/pushProductChange");

// ----------------------------------------------------
// ⚙️ CONFIGURACIÓN DE CLOUDINARY
// ----------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer ahora procesa el archivo temporalmente en memoria para mandarlo a la nube
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Función para subir la imagen a Cloudinary y obtener su link de internet
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("/Uploads/default.png");
    
    const stream = cloudinary.uploader.upload_stream(
      { folder: "fruteria_ahuacatl" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // Nos regresa el link permanente https://...
      }
    );
    stream.end(file.buffer);
  });
};

function toNumber(value, fallback = 0) {
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
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
      message: { type: "danger", message: "Error al cargar productos" }
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
      const { nombre, categoria, precio_compra, precio_venta, stock, unidad } = req.body;

      // Se sube a Cloudinary y obtenemos la URL permanente
      let imagenUrl = "/Uploads/default.png";
      if (req.file) {
        imagenUrl = await uploadToCloudinary(req.file);
      }

      let existente = null;
      if (req.body.id_global) {
        existente = await Product.findOne({ id_global: req.body.id_global });
      }

      if (!existente) {
        existente = await Product.findOne({ nombre: nombre.trim() });
      }

      if (existente && !existente.id_global) {
        existente.id_global = uuidv4();
        await existente.save();
      }

      // 🟢 SI EXISTE → LÓGICA FIFO
      if (existente) {
        const cantidadNueva = toNumber(stock, 0);
        const precioCompraNuevo = toNumber(precio_compra, existente.precio_compra || 0);
        const precioVentaNuevo = toNumber(precio_venta, existente.precio_venta || 0);

        existente.precio_actual = existente.precio_actual || existente.precio_venta || 0;
        existente.precio_viejo = existente.precio_viejo || existente.precio_actual || precioVentaNuevo;
        existente.precio_nuevo = existente.precio_nuevo || 0;

        if (existente.stock_precio_viejo == null) {
          existente.stock_precio_viejo = existente.stock || 0;
        }
        existente.stock_precio_nuevo = existente.stock_precio_nuevo || 0;
        existente.stock = (existente.stock || 0) + cantidadNueva;

        if (precioVentaNuevo > existente.precio_actual) {
          existente.precio_actual = precioVentaNuevo;
          existente.precio_viejo = precioVentaNuevo;
          existente.precio_nuevo = precioVentaNuevo;
          existente.stock_precio_viejo = existente.stock;
          existente.stock_precio_nuevo = 0;
          existente.precio_compra = precioCompraNuevo;
          existente.precio_compra_pendiente = 0;
          existente.precio_venta = precioVentaNuevo;
        } else if (precioVentaNuevo < existente.precio_actual) {
          existente.precio_nuevo = precioVentaNuevo;
          existente.stock_precio_nuevo += cantidadNueva;
          existente.precio_compra_pendiente = precioCompraNuevo;
          existente.precio_venta = existente.precio_actual;
        } else {
          if (existente.stock_precio_nuevo > 0 && existente.precio_nuevo === precioVentaNuevo && existente.precio_nuevo > 0) {
            existente.stock_precio_nuevo += cantidadNueva;
          } else {
            existente.stock_precio_viejo = (existente.stock_precio_viejo || 0) + cantidadNueva;
          }
          existente.precio_compra = precioCompraNuevo;
          existente.precio_venta = precioVentaNuevo;
          existente.precio_actual = precioVentaNuevo;
        }

        if (req.file) {
          existente.imagen = imagenUrl;
          existente.imagenes = [imagenUrl];
        }

        await existente.save();
        await pushProductChange(existente);

        req.session.message = {
          type: "success",
          message: `Stock actualizado: ${existente.stock} ${existente.unidad}`
        };
        return res.redirect("/productos");
      }

      // 🆕 NUEVO PRODUCTO
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
        imagen: imagenUrl,
        imagenes: [imagenUrl],
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

      req.session.message = { type: "success", message: "Producto agregado correctamente." };
      return res.redirect("/productos");
    } catch (err) {
      console.error("❌ Error agregando producto:", err);
      req.session.message = { type: "danger", message: "Error al agregar producto." };
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
    res.render("edit_product", { title: "Editar Producto", producto, user: req.user });
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

      if (req.file) {
        const imagenUrl = await uploadToCloudinary(req.file);
        producto.imagen = imagenUrl;
        producto.imagenes = [imagenUrl];
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

      req.session.message = { type: "success", message: "Producto actualizado correctamente." };
      res.redirect("/productos");
    } catch (err) {
      console.error(err);
      req.session.message = { type: "danger", message: "Error al actualizar producto." };
      res.redirect("/productos");
    }
  }
);

// ====================================================
// 📄 FORMULARIO DE MERMA y REPORTE (Se mantienen intactos)
// ====================================================
router.get("/productos/add-merma/:id", isAdminOrBodeguero, async (req, res) => {
  try {
    const Product = getProductModel();
    const producto = await Product.findById(req.params.id);
    if (!producto) return res.redirect("/productos");
    res.render("add_merma", { title: "Registrar Merma", producto, user: req.user });
  } catch (err) {
    res.redirect("/productos");
  }
});

router.post("/productos/add-merma/:id", isAdminOrBodeguero, async (req, res) => {
  try {
    const Product = getProductModel();
    const producto = await Product.findById(req.params.id);
    if (!producto) return res.redirect("/productos");

    const cantidad = parseFloat(req.body.cantidad || 0);
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
      producto.stock_precio_nuevo = Math.max(producto.stock_precio_nuevo - restante, 0);
    }
    const stockDespues = producto.stock;

    producto.mermas.push({
      cantidad,
      motivo: req.body.motivo,
      fecha: new Date(),
      registradoPor: req.user.name
    });

    await producto.save();
    await pushProductChange(producto);

    return res.render("report_mermas", { producto, cantidad, motivo: req.body.motivo, stockAntes, stockDespues, user: req.user });
  } catch (err) {
    res.redirect("/productos");
  }
});

router.get("/reportes/mermas", isAdmin, async (req, res) => {
  try {
    const Product = getProductModel();
    const productos = await Product.find();
    let mermas = [];
    productos.forEach(p => {
      if (p.mermas && p.mermas.length > 0) {
        p.mermas.forEach(m => {
          mermas.push({ producto: p.nombre, cantidad: m.cantidad, motivo: m.motivo, fecha: m.fecha, usuario: m.registradoPor });
        });
      }
    });
    mermas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    res.render("report_mermas", { title: "Reporte de Mermas", mermas, user: req.user });
  } catch (err) {
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
    req.session.message = { type: "success", message: "Producto eliminado." };
    res.redirect("/productos");
  } catch (err) {
    res.redirect("/productos");
  }
});

module.exports = router;
