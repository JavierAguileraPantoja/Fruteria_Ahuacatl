# 🧩 Proyecto_Fase_Usuarios

**Sistema integral de gestión de usuarios y roles** sincronizado entre **MongoDB Atlas**, **Mongo Local (Docker)** y **SQLite**.  
Desarrollado en **Node.js** con **Express**, **EJS** y **Passport.js**.

---

## 🚀 Descripción general

Esta fase del proyecto implementa todo el módulo de **usuarios y roles**, permitiendo:

- Registro, edición y eliminación de usuarios.
- Control de acceso según rol (dueño, administrador, vendedor, bodeguero).
- Sincronización automática entre tres bases de datos:
  - **MongoDB Atlas** → fuente principal.
  - **Mongo Local (Docker)** → copia local.
  - **SQLite (bodega.sqlite)** → base auxiliar integrada en el backend.

El sistema utiliza autenticación local con **Passport.js** y middleware personalizados para cada rol.

---

## ⚙️ Tecnologías utilizadas

| Tecnología | Uso principal |
|-------------|----------------|
| **Node.js / Express** | Servidor backend |
| **EJS / Bootstrap 5** | Interfaz de usuario |
| **Passport.js** | Autenticación local |
| **MongoDB Atlas** | Base de datos en la nube |
| **Mongo Local (Docker)** | Base local sincronizada |
| **SQLite / Sequelize** | Base local auxiliar |
| **Multer** | Carga de imágenes |
| **Dotenv** | Configuración de variables de entorno |

---

## 🧱 Estructura del proyecto

```
Proyecto_Fase_Usuarios/
├── src/
│   ├── databases/
│   │   ├── mongoPrincipal.js      # Conexión a MongoDB Atlas
│   │   ├── mongoSecundario.js     # Conexión a Mongo Local (Docker)
│   │   └── sqliteLocal.js         # Conexión a SQLite
│   ├── middlewares/
│   │   └── authRoles.js           # Control de acceso por roles
│   ├── models/
│   │   ├── users.js               # Modelo principal de usuarios (Mongo)
│   │   └── UserSQLite.js          # Modelo auxiliar para SQLite
│   ├── passport/
│   │   └── local-auth.js          # Estrategias de registro e inicio de sesión
│   ├── routes/
│   │   └── routes.js              # Rutas principales
│   ├── utils/
│   │   ├── syncAtlasToLocal.js    # Sincroniza Atlas → Mongo Local
│   │   └── syncUsers.js           # Sincroniza Mongo Local → SQLite
│   ├── views/
│   │   ├── users.ejs              # Vista principal de gestión de usuarios
│   │   ├── layout/
│   │   │   └── add_users.ejs      # Formulario de registro de usuario
│   │   └── layout/header/footer.ejs
│   └── index.js                   # Punto de entrada de la app
├── .env                           # Variables de entorno
├── package.json
└── README.md
```

---

## 🔐 Roles del sistema

| Rol | Permisos principales |
|------|----------------------|
| **Dueño** | Crear o promover administradores |
| **Administrador** | Crear vendedores o bodegueros |
| **Vendedor** | Acceso al panel de ventas |
| **Bodeguero** | Acceso al inventario |

> Solo el **dueño** puede crear o promover administradores.

---

## 🔄 Flujo de sincronización de bases

```
MongoDB Atlas
   ↓
syncAtlasToLocal.js
   ↓
Mongo Local (Docker)
   ↓
syncUsers.js
   ↓
SQLite (bodega.sqlite)
```

Cada 20 segundos el sistema revisa cambios y actualiza las tres bases automáticamente.  
SQLite se limpia y vuelve a sincronizar en cada ejecución para evitar duplicados.

---

## 🧠 Variables de entorno (`.env`)

Ejemplo de configuración mínima:

```
PORT=3000
MONGO_ATLAS_URI=mongodb+srv://usuario:clave@cluster.mongodb.net/fruteria-user
MONGO_LOCAL_URI=mongodb://admin:root@localhost:27017/fruteria_local
SQLITE_PATH=./src/data/bodega.sqlite
SESSION_SECRET=miclave
```

---

## 🧪 Cómo ejecutar el proyecto

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Levantar Mongo Local (Docker)**
   ```bash
   docker-compose up -d
   ```

3. **Iniciar el servidor**
   ```bash
   npm run start
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

---

## 🧾 Estado actual del sistema

✅ Sincronización completa entre las tres bases  
✅ Roles y permisos funcionando correctamente  
✅ Imágenes y datos almacenados correctamente  
✅ Interfaz funcional en EJS  
✅ Base estable lista para integrar módulos de inventario y ventas  

---

## 🚀 Próximos pasos

- Desarrollar módulo de **Inventario (productos y stock)**  
- Implementar **báscula USB** para registro de peso  
- Sincronizar **productos y ventas** entre bases  
- Generar reportes de ventas y existencias  

---

## ✨ Autor
**Javier Aguilera Pantoja**  
*Universidad de Guanajuato*  
Proyecto desarrollado en la materia **Cómputo en la Nube**
