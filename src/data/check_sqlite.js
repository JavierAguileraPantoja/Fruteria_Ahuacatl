// check_sqlite.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta directa a la base de datos en la misma carpeta
const dbPath = path.join(__dirname, 'bodega.sqlite');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Error al abrir la base de datos:', err.message);
  } else {
    console.log('✅ Conectado correctamente a la base de datos.');
    db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
      if (err) {
        console.error('❌ Error al leer las tablas:', err.message);
      } else {
        console.log('📋 Tablas en la base de datos:');
        console.table(rows);
      }
      db.close();
    });
  }
});
