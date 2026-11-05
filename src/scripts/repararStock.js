// ======================================================================
// 🛠 SCRIPT DE RESTAURACIÓN GARANTIZADA DE STOCK A 20 UNIDADES
// ======================================================================

const path = require("path");

// Cargar las variables de entorno (.env) desde la raíz del proyecto
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const mongoose = require("mongoose");

// Selección de la variable de entorno para la base de datos
const URI =
  process.env.MONGO_ATLAS_URI ||
  process.env.MONGO_URI ||
  process.env.MONGO_LOCAL_URI;

// Valor de stock global solicitado
const NUEVO_STOCK = 20;

async function actualizarStockIndividual() {
  try {
    if (!URI) {
      console.error("❌ No se encontró ninguna URI de MongoDB en tu archivo .env");
      process.exit(1);
    }

    console.log("⏳ Conectando a MongoDB Atlas...");
    await mongoose.connect(URI);
    console.log("✅ Conexión exitosa a la base de datos.\n");

    // Accedemos a la colección 'products'
    const collection = mongoose.connection.db.collection("products");

    // Obtenemos la lista completa de productos
    const productos = await collection.find({}).toArray();
    console.log(`📦 Se encontraron ${productos.length} productos para actualizar.\n`);

    let contadorActualizados = 0;

    // Recorremos cada producto uno por uno para asegurar la persistencia
    for (const producto of productos) {
      const precioCorrecto = producto.precio_actual || producto.precio_viejo || producto.precio_venta || 0;

      await collection.updateOne(
        { _id: producto._id },
        {
          $set: {
            stock: NUEVO_STOCK,
            stock_precio_viejo: NUEVO_STOCK,
            stock_precio_nuevo: 0,
            precio_actual: precioCorrecto
          }
        }
      );

      console.log(`✅ Actualizado: "${producto.nombre}" ➔ Stock: ${NUEVO_STOCK}`);
      contadorActualizados++;
    }

    console.log("\n==================================================");
    console.log("🎉 PROCESO COMPLETADO EXITOSAMENTE");
    console.log(`📦 Total de productos actualizados a ${NUEVO_STOCK} kg: ${contadorActualizados}`);
    console.log("==================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error al ejecutar el script de actualización:", error.message);
    process.exit(1);
  }
}

// Ejecución de la función principal
actualizarStockIndividual();