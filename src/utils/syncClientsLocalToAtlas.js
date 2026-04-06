const { ClientLocal, ClientAtlas } = require("../models/client");

async function syncClientsLocalToAtlas() {
  try {
    console.log("👤 Sincronizando clientes Local → Atlas...");
    
    // 1. Buscamos todos los clientes en el Docker local
    const clientsLocales = await ClientLocal.find();

    for (const client of clientsLocales) {
      // 2. Los subimos a Atlas usando el teléfono como llave única (upsert)
      await ClientAtlas.findOneAndUpdate(
        { phone: client.phone },
        {
          name: client.name,
          email: client.email,
          lastPurchase: client.lastPurchase,
          totalSpent: client.totalSpent
        },
        { upsert: true }
      );
    }

    console.log(`✅ Clientes sincronizados: ${clientsLocales.length}`);
  } catch (err) {
    console.error("❌ Error en syncClientsLocalToAtlas:", err.message);
  }
}

module.exports = syncClientsLocalToAtlas;