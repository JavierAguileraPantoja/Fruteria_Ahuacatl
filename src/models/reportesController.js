// ======================================================================
// 📊 REPORTES CONTROLLER — AHUACATL
//      (MERMAS + CORTE POR USUARIO + TICKETS + CSV + PDF + EXCEL)
// ======================================================================

const moment = require("moment");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const { Op } = require("sequelize");

const { getEstadoInternet } = require("../databases/mongoPrincipal");
const {
  VentaMongo,
  VentaSQLite,
  VentaDetalleSQLite
} = require("./venta");
const { getProductModel } = require("./product");

// -----------------------------------------------------
// 🛠 Normalizar fecha YYYY-MM-DD
// -----------------------------------------------------
function fechaISO(date) {
  return moment(date).format("YYYY-MM-DD");
}

// -----------------------------------------------------
// 🛠 Rango según periodo (query.periodo / query.desde / query.hasta)
// -----------------------------------------------------
function obtenerRango(req, periodoForzado = null) {
  const periodo = periodoForzado || req.query.periodo || "hoy";
  const desde = req.query.desde;
  const hasta = req.query.hasta;

  let inicio;
  let fin;

  switch (periodo) {
    case "hoy":
      inicio = moment().startOf("day");
      fin = moment().endOf("day");
      break;

    case "semana":
      inicio = moment().startOf("week");
      fin = moment().endOf("week");
      break;

    case "mes":
      inicio = moment().startOf("month");
      fin = moment().endOf("month");
      break;

    case "anio":
      inicio = moment().startOf("year");
      fin = moment().endOf("year");
      break;

    case "rango":
      inicio = desde ? moment(desde).startOf("day") : moment().startOf("day");
      fin = hasta ? moment(hasta).endOf("day") : moment().endOf("day");
      break;

    default:
      inicio = moment().startOf("day");
      fin = moment().endOf("day");
      break;
  }

  return { inicio, fin, periodo };
}

// -----------------------------------------------------
// 🛠 Cargar ventas rango (Atlas → SQLite) con opción por usuario
// -----------------------------------------------------
async function cargarVentasRango(inicioDate, finDate, soloUsuarioEmail = null) {
  const online = getEstadoInternet();
  let ventasRAW = [];

  // ================== INTENTO ONLINE (ATLAS) ==================
  if (online) {
    try {
      const filtro = {
        creadoEn: { $gte: inicioDate, $lte: finDate }
      };
      if (soloUsuarioEmail) {
        filtro.creadoPor = soloUsuarioEmail;
      }

      ventasRAW = await VentaMongo.find(filtro).sort({ creadoEn: -1 });
    } catch (e) {
      console.log("⚠ Atlas no respondió, usando SQLite:", e.message);
    }
  }

  // ================== OFFLINE / FALLBACK SQLITE ==================
  if (!ventasRAW.length) {
    const where = {
      creadoEn: { [Op.between]: [inicioDate, finDate] }
    };
    if (soloUsuarioEmail) {
      where.creadoPor = soloUsuarioEmail;
    }

    const ventasSQL = await VentaSQLite.findAll({
      where,
      include: [VentaDetalleSQLite],
      order: [["creadoEn", "DESC"]]
    });

    ventasRAW = ventasSQL.map((v) => ({
      _id: v.id,
      creadoEn: v.creadoEn,
      tipoCliente: v.tipoCliente,
      clienteNombre: v.clienteNombre,
      clienteTelefono: v.clienteTelefono,
      creadoPor: v.creadoPor,
      total: v.total,
      items: v.venta_detalles.map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        unidad: i.unidad,
        precioUnitario: i.precioUnitario,
        subtotal: i.subtotal
      }))
    }));
  }

  // ================== NORMALIZAR SHAPE ==================
  const ventasNormalizadas = ventasRAW.map((v) => ({
    _id: v._id,
    creadoEn: v.creadoEn,
    tipoCliente: v.tipoCliente || "general",
    clienteNombre: v.clienteNombre || "Mostrador",
    clienteTelefono: v.clienteTelefono || "",
    creadoPor: v.creadoPor || "",
    total: v.total || 0,
    items: (v.items || []).map((i) => ({
      nombre: i.nombre,
      cantidad: Number(i.cantidad || 0),
      unidad: i.unidad || "kg",
      precioUnitario: Number(i.precioUnitario || 0),
      subtotal: Number(i.subtotal || (i.cantidad || 0) * (i.precioUnitario || 0))
    }))
  }));

  return ventasNormalizadas;
}

// -----------------------------------------------------
// 🛠 Agrupar ventas por producto
// -----------------------------------------------------
function agruparPorProducto(ventasNormalizadas) {
  const mapa = {};

  ventasNormalizadas.forEach((v) => {
    (v.items || []).forEach((i) => {
      if (!mapa[i.nombre]) {
        mapa[i.nombre] = {
          producto: i.nombre,
          unidades: 0,
          totalVenta: 0
        };
      }
      mapa[i.nombre].unidades += i.cantidad;
      mapa[i.nombre].totalVenta += i.subtotal;
    });
  });

  return Object.values(mapa).sort((a, b) => b.unidades - a.unidades);
}

// ======================================================================
// 🔹 NUEVO: FUNCIONES AVANZADAS DE ANÁLISIS
// ======================================================================

// Productos más vendidos / menos vendidos
function productosMasMenosVendidos(ventasNormalizadas) {
  const mapa = {};

  ventasNormalizadas.forEach(v => {
    (v.items || []).forEach(i => {
      if (!mapa[i.nombre]) mapa[i.nombre] = 0;
      mapa[i.nombre] += i.cantidad;
    });
  });

  const arr = Object.entries(mapa).map(([producto, cantidad]) => ({
    producto,
    cantidad
  }));

  const masVendidos = [...arr].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  const menosVendidos = [...arr].sort((a, b) => a.cantidad - b.cantidad).slice(0, 10);

  return { masVendidos, menosVendidos };
}

// Utilidad por producto
function utilidadPorProducto(ventasNormalizadas, productos) {
  const mapa = {};

  ventasNormalizadas.forEach(v => {
    (v.items || []).forEach(i => {
      const prodInfo = productos.find(p => p.nombre === i.nombre);
      const compra = prodInfo ? (prodInfo.precio_compra || 0) : 0;

      if (!mapa[i.nombre]) {
        mapa[i.nombre] = { producto: i.nombre, vendidos: 0, venta: 0, compra: 0 };
      }

      mapa[i.nombre].vendidos += i.cantidad;
      mapa[i.nombre].venta += i.subtotal;
      mapa[i.nombre].compra += i.cantidad * compra;
    });
  });

  return Object.values(mapa).map(m => ({
    ...m,
    ganancia: m.venta - m.compra
  }));
}

// Utilidad por categoría
function utilidadPorCategoria(ventasNormalizadas, productos) {
  const mapa = {};

  ventasNormalizadas.forEach(v => {
    (v.items || []).forEach(i => {
      const prodInfo = productos.find(p => p.nombre === i.nombre);
      if (!prodInfo) return;

      const categoria = prodInfo.categoria || "Sin categoría";
      const compra = prodInfo.precio_compra || 0;

      if (!mapa[categoria]) {
        mapa[categoria] = { categoria, vendidos: 0, venta: 0, compra: 0 };
      }

      mapa[categoria].vendidos += i.cantidad;
      mapa[categoria].venta += i.subtotal;
      mapa[categoria].compra += i.cantidad * compra;
    });
  });

  return Object.values(mapa).map(c => ({
    ...c,
    ganancia: c.venta - c.compra
  }));
}

// Mermas + pérdidas económicas
function calcularPerdidasPorMermas(productos) {
  const mermasDetalle = [];
  let totalPerdidas = 0;

  productos.forEach(p => {
    if (Array.isArray(p.mermas) && p.mermas.length > 0) {
      p.mermas.forEach(m => {
        const perdida = (p.precio_compra || 0) * (m.cantidad || 0);
        totalPerdidas += perdida;

        mermasDetalle.push({
          producto: p.nombre,
          cantidad: m.cantidad,
          motivo: m.motivo,
          fecha: m.fecha,
          usuario: m.registradoPor,
          perdida
        });
      });
    }
  });

  return { totalPerdidas, mermasDetalle };
}

// Ventas día / semana / mes (ya usas estos métodos en SQLite)
async function ventasPorPeriodos() {
  const dia = await VentaSQLite.totalVentasDelDia();
  const semana = await VentaSQLite.totalVentasSemana();
  const mes = await VentaSQLite.totalVentasMes();
  return { dia, semana, mes };
}

// Comparación de periodo vs periodo anterior
async function compararPeriodos(inicio, fin) {
  const inicioDate = inicio.toDate();
  const finDate = fin.toDate();

  const ventasPeriodo = await VentaSQLite.findAll({
    where: { creadoEn: { [Op.between]: [inicioDate, finDate] } }
  });

  const dias = fin.diff(inicio, "days") + 1;
  const inicioPrev = inicio.clone().subtract(dias, "days");
  const finPrev = fin.clone().subtract(dias, "days");

  const ventasPeriodoPrev = await VentaSQLite.findAll({
    where: {
      creadoEn: {
        [Op.between]: [inicioPrev.toDate(), finPrev.toDate()]
      }
    }
  });

  const totalActual = ventasPeriodo.reduce((a, v) => a + (v.total || 0), 0);
  const totalPrev = ventasPeriodoPrev.reduce((a, v) => a + (v.total || 0), 0);

  return {
    totalActual,
    totalPrev,
    diferencia: totalActual - totalPrev
  };
}

// Rotación de inventarios (FIFO básico: vendidos vs stock)
function rotacionInventarios(productos, ventasNormalizadas) {
  const mapaVendidos = {};

  ventasNormalizadas.forEach(v => {
    (v.items || []).forEach(i => {
      mapaVendidos[i.nombre] = (mapaVendidos[i.nombre] || 0) + i.cantidad;
    });
  });

  return productos.map(p => {
    const vendidos = mapaVendidos[p.nombre] || 0;
    const totalStock =
      (p.stock_precio_viejo || 0) + (p.stock_precio_nuevo || 0) || p.stock || 0;

    return {
      producto: p.nombre,
      vendidos,
      stockActual: totalStock,
      rotacion: (vendidos + totalStock) === 0 ? 0 : vendidos / (vendidos + totalStock)
    };
  });
}

// Stock bajo / crítico
function stockCritico(productos) {
  return productos.filter(p => p.stock <= (p.minimo || 0));
}

// Proyección de compras (simple)
function proyeccionCompras(ventasNormalizadas, productos) {
  const mapa = {};

  ventasNormalizadas.forEach(v => {
    (v.items || []).forEach(i => {
      if (!mapa[i.nombre]) mapa[i.nombre] = 0;
      mapa[i.nombre] += i.cantidad;
    });
  });

  const diasBase = 7; // se asume semana como referencia

  return productos.map(p => {
    const vendidos = mapa[p.nombre] || 0;
    const promedioDia = vendidos / diasBase;
    return {
      producto: p.nombre,
      vendidoUltSemana: vendidos,
      promedioDia,
      recomendadoComprar:
        Math.max(0, (p.minimo || 0) - (p.stock || 0)) + promedioDia * 3
    };
  });
}

// ======================================================================
// 🟩 DASHBOARD PRINCIPAL DE REPORTES  (/reportes)
// ======================================================================
exports.verReportes = async (req, res) => {
  try {
    const { inicio, fin } = obtenerRango(req);
    const inicioDate = inicio.toDate();
    const finDate = fin.toDate();

    const Product = getProductModel();

    // 1️⃣ Productos
    const productos = await Product.find();

    // 2️⃣ Ventas (todas, no solo usuario, para el dashboard general)
    const ventasNormalizadas = await cargarVentasRango(
      inicioDate,
      finDate,
      null
    );

    // 2.1 Transformación plana para tablas de ventas
    const ventas = ventasNormalizadas.flatMap((v) =>
      (v.items || []).map((i) => ({
        id: v._id,
        producto: i.nombre,
        cantidad: i.cantidad,
        precio_venta: i.precioUnitario,
        fecha: fechaISO(v.creadoEn)
      }))
    );

    // 2.2 KPIs del periodo
    const totalVentasPeriodo = ventasNormalizadas.reduce(
      (acc, v) => acc + (v.total || 0),
      0
    );

    const totalProductosVendidos = ventas.reduce(
      (acc, v) => acc + v.cantidad,
      0
    );

    // 3️⃣ Utilidades por producto (aprox: precio_compra actual)
    const datos = [];

    productos.forEach((p) => {
      const ventasProd = ventas.filter((v) => v.producto === p.nombre);
      if (!ventasProd.length) return;

      const cantidadVendida = ventasProd.reduce(
        (acc, v) => acc + v.cantidad,
        0
      );
      const totalVenta = ventasProd.reduce(
        (acc, v) => acc + v.cantidad * v.precio_venta,
        0
      );
      const precioCompra = Number(p.precio_compra || 0);
      const totalCompra = cantidadVendida * precioCompra;

      datos.push({
        producto: p.nombre,
        compra: totalCompra,
        venta: totalVenta,
        ganancia: totalVenta - totalCompra
      });
    });

    const totalGanancias = datos.reduce(
      (acc, d) => acc + d.ganancia,
      0
    );

    // 4️⃣ Top 10 productos
    const conteo = {};
    ventas.forEach((v) => {
      conteo[v.producto] = (conteo[v.producto] || 0) + v.cantidad;
    });

    const best = Object.entries(conteo)
      .map(([producto, total]) => ({ producto, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 5️⃣ Alertas de stock
    const kpi_alertas = productos.filter(
      (p) => p.stock <= (p.minimo || 0)
    ).length;

    // 6️⃣ MERMAS (product.mermas[] ya se llena en products.js)
    let mermasMongo = [];

    try {
      productos.forEach((p) => {
        if (Array.isArray(p.mermas) && p.mermas.length > 0) {
          p.mermas.forEach((m) => {
            const f = new Date(m.fecha);
            if (f >= inicioDate && f <= finDate) {
              mermasMongo.push({
                producto: p.nombre,
                cantidad: m.cantidad,
                motivo: m.motivo,
                fecha: fechaISO(m.fecha),
                usuario: m.registradoPor || "Desconocido"
              });
            }
          });
        }
      });

      mermasMongo.sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
    } catch (err) {
      console.log("❌ Error obteniendo mermas:", err.message);
    }

    const totalMermas = mermasMongo.reduce(
      (acc, m) => acc + (m.cantidad || 0),
      0
    );

    // 🔹 NUEVO: ANALÍTICOS AVANZADOS
    const { masVendidos, menosVendidos } = productosMasMenosVendidos(ventasNormalizadas);
    const utilidadesDetalladas = utilidadPorProducto(ventasNormalizadas, productos);
    const utilidadesPorCategoria = utilidadPorCategoria(ventasNormalizadas, productos);
    const { totalPerdidas, mermasDetalle } = calcularPerdidasPorMermas(productos);
    const periodos = await ventasPorPeriodos();
    const comparativa = await compararPeriodos(inicio, fin);
    const rotacion = rotacionInventarios(productos, ventasNormalizadas);
    const productosStockCritico = stockCritico(productos);
    const proyeccionesCompra = proyeccionCompras(ventasNormalizadas, productos);

    // 7️⃣ Renderizar dashboard
    res.render("reportes", {
      title: "Reportes del Sistema",
      user: req.user,

      ventas,
      datos,
      productos,
      best,

      // MERMAS
      mermasMongo,
      totalMermas,

      // KPIs básicos
      kpi_dia: totalVentasPeriodo,     // total ventas del periodo
      kpi_semana: 0,                   // si quieres luego lo separamos
      kpi_mes: 0,
      kpi_total_productos: totalProductosVendidos,
      kpi_ganancias: totalGanancias,
      kpi_alertas,

      // 🔹 NUEVOS DATOS AVANZADOS (para dashboard o futuro)
      masVendidos,
      menosVendidos,
      utilidadesDetalladas,
      utilidadesPorCategoria,
      totalPerdidasMermas: totalPerdidas,
      mermasDetalle,
      periodos,
      comparativa,
      rotacion,
      productosStockCritico,
      proyeccionesCompra
    });
  } catch (err) {
    console.log("❌ Error en reportes:", err);
    res.send("Error generando reportes.");
  }
};

// ======================================================================
// 🧾 CORTE / TICKET DIARIO (POR USUARIO ACTUAL)
//    GET /reportes/diario/ticket
// ======================================================================
exports.ticketReporteDiario = async (req, res) => {
  try {
    const { inicio, fin } = obtenerRango(req, "hoy");
    const inicioDate = inicio.toDate();
    const finDate = fin.toDate();

    const emailUsuario = req.user ? req.user.email : null;

    // Ventas SOLO del usuario actual
    const ventasNormalizadas = await cargarVentasRango(
      inicioDate,
      finDate,
      emailUsuario
    );

    // Totales
    const totalVentas = ventasNormalizadas.reduce(
      (acc, v) => acc + (v.total || 0),
      0
    );

    let totalArticulos = 0;
    ventasNormalizadas.forEach((v) => {
      (v.items || []).forEach((i) => {
        totalArticulos += i.cantidad;
      });
    });

    // Ganancia (aprox 30% de margen global)
    const gananciaDia = totalVentas * 0.3;

    // Productos destacados (por kilos)
    const agrupados = agruparPorProducto(ventasNormalizadas);
    const productosDestacados = agrupados.slice(0, 10).map((p) => ({
      nombre: p.producto,
      cantidad: p.unidades
    }));

    res.render("ticket_reporteDiary", {
      user: req.user,
      fechaCorte: new Date(),
      horaCorte: new Date(),

      totalVentas,
      totalArticulos,
      gananciaDia,
      productosDestacados
    });
  } catch (err) {
    console.error("❌ Error en ticketReporteDiario:", err);
    res.send("Error generando ticket de reporte diario.");
  }
};

// ======================================================================
// 📄 CSV REPORTE DIARIO (POR USUARIO)
//    GET /reportes/diario/csv
// ======================================================================
exports.csvReporteDiario = async (req, res) => {
  try {
    const { inicio, fin } = obtenerRango(req, "hoy");
    const inicioDate = inicio.toDate();
    const finDate = fin.toDate();

    const emailUsuario = req.user ? req.user.email : null;

    const ventasNormalizadas = await cargarVentasRango(
      inicioDate,
      finDate,
      emailUsuario
    );

    let filas = [];
    ventasNormalizadas.forEach((v) => {
      (v.items || []).forEach((i) => {
        filas.push({
          fecha: fechaISO(v.creadoEn),
          producto: i.nombre,
          cantidad: i.cantidad,
          unidad: i.unidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.subtotal,
          tipoCliente: v.tipoCliente,
          cliente: v.clienteNombre,
          vendedor: v.creadoPor
        });
      });
    });

    let csv = "Fecha,Producto,Cantidad,Unidad,PrecioUnitario,Subtotal,TipoCliente,Cliente,Vendedor\n";

    filas.forEach((f) => {
      csv += [
        f.fecha,
        f.producto,
        f.cantidad,
        f.unidad,
        f.precioUnitario.toFixed(2),
        f.subtotal.toFixed(2),
        f.tipoCliente,
        f.cliente,
        f.vendedor
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",") + "\n";
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reporte_diario.csv"
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.send(csv);
  } catch (err) {
    console.error("❌ Error en csvReporteDiario:", err);
    res.send("Error generando CSV.");
  }
};
// ======================================================================
// 🧾 TICKET POR PRODUCTO (KILOS VENDIDOS DEL PERIODO)
//    GET /reportes/productos/ticket
// ======================================================================
exports.ticketProductos = async (req, res) => {
  try {
    const { inicio, fin } = obtenerRango(req, "hoy");
    const inicioDate = inicio.toDate();
    const finDate = fin.toDate();

    // Ventas de todos los usuarios en el día
    const ventasNormalizadas = await cargarVentasRango(
      inicioDate,
      finDate,
      null
    );

    const agrupados = agruparPorProducto(ventasNormalizadas);

    res.render("ticket_producto", {
      user: req.user,
      fechaCorte: new Date(),
      productos: agrupados
    });
  } catch (err) {
    console.error("❌ Error en ticketProductos:", err);
    res.send("Error generando ticket por producto.");
  }
};

// ======================================================================
// 📑 PDF REPORTE DIARIO (POR USUARIO)
//    GET /reportes/pdf
// ======================================================================
exports.generarPDF = async (req, res) => {
  try {
    const { inicio, fin } = obtenerRango(req, "hoy");
    const inicioDate = inicio.toDate();
    const finDate = fin.toDate();

    const emailUsuario = req.user ? req.user.email : null;

    const ventasNormalizadas = await cargarVentasRango(
      inicioDate,
      finDate,
      emailUsuario
    );

    const totalVentas = ventasNormalizadas.reduce(
      (acc, v) => acc + (v.total || 0),
      0
    );

    const agrupados = agruparPorProducto(ventasNormalizadas);

    // 🔹 NUEVO: cargar productos para utilidades, mermas, stock, etc.
    const Product = getProductModel();
    const productos = await Product.find();

    const { masVendidos } = productosMasMenosVendidos(ventasNormalizadas);
    const utilCat = utilidadPorCategoria(ventasNormalizadas, productos);
    const { totalPerdidas } = calcularPerdidasPorMermas(productos);
    const periodos = await ventasPorPeriodos();
    const comparativa = await compararPeriodos(inicio, fin);
    const productosStockCritico = stockCritico(productos);

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="reporte_diario.pdf"'
    );

    doc.pipe(res);

    // ENCABEZADO
    doc.fontSize(16).text("FRUTERÍA AHUACATL", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(12).text("REPORTE DIARIO (CORTE POR USUARIO)", {
      align: "center"
    });
    doc.moveDown(1);

    const fechaStr = moment().format("DD/MM/YYYY HH:mm");
    const nombreUser =
      (req.user && (req.user.name || req.user.email)) || "ADMIN";

    doc.fontSize(10).text(`Fecha corte: ${fechaStr}`);
    doc.text(`Usuario: ${nombreUser}`);
    doc.text(`Total ventas (periodo): $ ${totalVentas.toFixed(2)}`);
    doc.moveDown(1);

    // 🔹 RESUMEN VENTAS DÍA / SEMANA / MES
    doc.fontSize(12).text("Resumen de ventas:", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Hoy:          $ ${periodos.dia.toFixed(2)}`);
    doc.text(`Últimos 7 días: $ ${periodos.semana.toFixed(2)}`);
    doc.text(`Este mes:       $ ${periodos.mes.toFixed(2)}`);
    doc.moveDown(1);

    // 🔹 COMPARATIVA DE PERIODOS
    doc.fontSize(12).text("Comparación con periodo anterior:", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Periodo actual:   $ ${comparativa.totalActual.toFixed(2)}`);
    doc.text(`Periodo anterior: $ ${comparativa.totalPrev.toFixed(2)}`);
    doc.text(`Diferencia:       $ ${comparativa.diferencia.toFixed(2)}`);
    doc.moveDown(1);

    // 🔹 UTILIDAD POR CATEGORÍA
    doc.fontSize(12).text("Utilidad por categoría:", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);
    utilCat.forEach((c) => {
      doc.text(
        `${c.categoria}: venta $${c.venta.toFixed(2)}  | compra $${c.compra.toFixed(
          2
        )}  | ganancia $${c.ganancia.toFixed(2)}`
      );
    });
    doc.moveDown(1);

    // 🔹 MERMAS Y PÉRDIDAS
    doc.fontSize(12).text("Mermas y pérdidas:", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(
      `Pérdida total estimada por mermas: $ ${totalPerdidas.toFixed(2)}`
    );
    doc.moveDown(1);

    // 🔹 STOCK CRÍTICO
    doc.fontSize(12).text("Productos con stock crítico:", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);
    productosStockCritico.slice(0, 20).forEach((p) => {
      doc.text(
        `${p.nombre} — stock ${p.stock} (mínimo ${p.minimo || 0})`
      );
    });
    doc.moveDown(1);

    // 🔹 TOP MÁS VENDIDOS (kg)
    doc.fontSize(12).text("Top productos más vendidos (kg):", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10);
    masVendidos.slice(0, 10).forEach((p) => {
      doc.text(`${p.producto}: ${p.cantidad.toFixed(3)} kg`);
    });
    doc.moveDown(1);

    // 🔹 LISTA DE PRODUCTOS VENDIDOS DETALLADOS (LO QUE YA TENÍAS)
    doc.fontSize(12).text("Detalle de productos vendidos:", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    agrupados.forEach((p) => {
      doc.text(
        `${p.producto} — ${p.unidades.toFixed(3)} kg   ($ ${p.totalVenta.toFixed(
          2
        )})`
      );
    });

    doc.end();
  } catch (err) {
    console.error("❌ Error en generarPDF:", err);
    res.send("Error generando PDF.");
  }
};

// ======================================================================
// 📊 EXCEL REPORTE DIARIO (POR USUARIO)
//    GET /reportes/excel
// ======================================================================
exports.generarExcel = async (req, res) => {
  try {
    const { inicio, fin } = obtenerRango(req, "hoy");
    const inicioDate = inicio.toDate();
    const finDate = fin.toDate();

    const emailUsuario = req.user ? req.user.email : null;

    const ventasNormalizadas = await cargarVentasRango(
      inicioDate,
      finDate,
      emailUsuario
    );

    const agrupados = agruparPorProducto(ventasNormalizadas);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reporte Diario");

    sheet.columns = [
      { header: "Producto", key: "producto", width: 32 },
      { header: "Cantidad (kg)", key: "cantidad", width: 15 },
      { header: "Total Venta", key: "total", width: 18 }
    ];

    agrupados.forEach((p) => {
      sheet.addRow({
        producto: p.producto,
        cantidad: p.unidades,
        total: p.totalVenta
      });
    });

    sheet.addRow({});
    const totalVentas = ventasNormalizadas.reduce(
      (acc, v) => acc + (v.total || 0),
      0
    );
    sheet.addRow({
      producto: "TOTAL VENTAS",
      cantidad: "",
      total: totalVentas
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=reporte_diario.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("❌ Error en generarExcel:", err);
    res.send("Error generando Excel.");
  }
};

// ======================================================================
// 🔁 RUTAS AUXILIARES (usan la misma vista 'reportes')
// ======================================================================



// /reportes/diario/usuario
// Muestra el MISMO ticket que ticketReporteDiario pero para el usuario logueado
exports.reporteDiarioUsuario = async (req, res) => {
  // Forzamos periodo "hoy" y reutilizamos la lógica del ticket
  req.query.periodo = "hoy";
  return exports.ticketReporteDiario(req, res);
};


// /reportes/diario
exports.reporteDiario = async (req, res) => {
  req.query.periodo = "hoy";
  return exports.verReportes(req, res);
};

// /reportes/semanal
exports.reporteSemanal = async (req, res) => {
  req.query.periodo = "semana";
  return exports.verReportes(req, res);
};

// /reportes/producto-mas-vendido
exports.productoMasVendido = async (req, res) => {
  // usamos mismo dashboard, ya que ahí se ve el top 10
  return exports.verReportes(req, res);
};

// /reportes/utilidades
exports.utilidades = async (req, res) => {
  return exports.verReportes(req, res);
};

// /reportes/stock
exports.stock = async (req, res) => {
  return exports.verReportes(req, res);
};
