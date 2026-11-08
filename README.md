# 🍎 Frutería Ahuacatl - Sistema de Punto de Venta en Producción

Sistema web para gestión integral de frutería con múltiples sucursales. **Actualmente en uso como punto de venta real.**

> ⚠️ Por seguridad de datos del negocio, la demo en vivo es privada. Capturas reales del sistema abajo.

### ¿Qué resuelve?
Control de inventario, ventas, mermas y utilidades en negocios con producto perecedero, con o sin internet.

### Funcionalidades clave
- **📦 Inventario con alertas:** Stock en tiempo real, marca OK / ALERTA cuando un producto llega a 0
- **💰 Utilidades por producto:** Compra vs Venta vs Ganancia. Ej: Plátano +$6,321.40 / Tomate -$97.00
- **📉 Mermas:** Registro con motivo, cantidad y usuario responsable
- **📈 Precios SNIIM:** Scraping de 510 registros de precios reales de Aguacate Hass para decidir compra/venta
- **🏆 Top Ventas:** Jitomate Macro Túnel 83.94 kg, Plátano 66 kg, Aguacate Hass 48.97 kg
- **🧾 Ventas:** 3 tipos de precio (general, mayorista, cliente frecuente) + ticket térmico
- **👥 Roles:** Admin, Bodeguero, Vendedor con Passport.js

### Arquitectura Offline-First (lo más fuerte de tu proyecto)
Para que nunca se pierda una venta sin internet:

- **MongoDB Atlas** - Base principal en la nube
- **MongoDB Local** - Réplica en sucursal
- **SQLite Local** - Operación offline total y reportes rápidos

Sincronización automática, sin duplicados, con resolución de conflictos y watcher de conexión. Ventas offline se guardan local y se sincronizan al volver el internet.

Lógica **FIFO** para descontar siempre el lote más antiguo. Vital en fruta.

### Tecnologías
Node.js | Express.js | EJS | Bootstrap | MongoDB Atlas + Local | SQLite | Passport.js | bcrypt | Multer

### Capturas
Sube aquí las 5 que me mandaste, con estos nombres:
- `dashboard-stock.png`
- `stock-alerta.png`
- `precios-sniim.png`
- `utilidades.png`
- `mermas.png`

### Cómo levantarlo
```bash
npm install
cp .env.example .env
npm run dev
