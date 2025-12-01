# Proyecto Frutería Ahuacatlán 

## Introducción

En la actualidad, los negocios de abarrotes, fruterías y tiendas de autoservicio enfrentan la necesidad de modernizar sus procesos para mantener un control preciso de inventarios, ventas, proveedores y sucursales. Sin embargo, muchos pequeños comercios carecen de sistemas confiables que funcionen tanto con conexión a internet como en modo offline, lo cual provoca pérdidas por errores de inventario, duplicidad de información y falta de reportes claros para la toma de decisiones.

## Planteamiento del problema

La gestión operativa de una frutería con múltiples sucursales presenta desafíos complejos que no pueden ser resueltos con métodos tradicionales como libretas, hojas de cálculo o sistemas básicos que dependen completamente de internet. En el contexto de la Frutería Ahuacatl, se identificaron problemas críticos que afectaban directamente la eficiencia del negocio, el control del inventario y la confiabilidad de la información.

En primer lugar, el inventario variaba constantemente debido a la naturaleza perecedera de los productos y a la rotación diaria de ventas, compras y mermas. Sin un sistema adecuado, era común tener diferencias entre lo que realmente había en almacén y lo que se registraba, lo que ocasionaba pérdidas económicas, quiebres de stock o sobrantes injustificados.

## Desarrollo



El desarrollo concluye con un sistema **profesional**, **offline-ready**, **rápido** y **sin pérdida de datos**, capaz de mantener sincronizadas varias sucursales y garantizar operación continua en condiciones reales de negocio.

Se definió una arquitectura multinivel compuesta por tres bases de datos conectadas entre sí. **MongoDB Atlas** actúa como base principal en la nube y fuente de verdad global. **MongoDB Local** funciona como réplica intermedia en la sucursal, permitiendo trabajar incluso con internet limitado, mientras que **SQLite Local** opera como base ligera para funcionamiento offline total y generación rápida de reportes. Esta arquitectura asegura continuidad operativa, evita la pérdida de información y mantiene un flujo de datos sincronizado incluso en condiciones de conectividad inestable.

El sistema de sincronización permite mantener alineados los datos entre MongoDB Atlas, MongoDB Local y SQLite mediante módulos especializados que detectan cambios, comparan registros, evitan duplicados y resuelven conflictos automáticamente. Un watcher monitorea el estado de internet en tiempo real para seleccionar la base adecuada durante la operación. Cada proceso trabaja de forma transparente para el usuario, asegurando que el negocio continúe funcionando aun sin conexión y que los datos se unifiquen correctamente al restablecer la red.


## Conclusión

El **Sistema Integral Frutería Ahuacatl** es una plataforma tecnológica diseñada para gestionar de manera eficiente inventarios, ventas, usuarios, mermas y reportes en una frutería con múltiples sucursales. Está construido con una arquitectura híbrida que permite operar tanto **en línea** como **en modo offline**, garantizando que el negocio continúe funcionando incluso cuando la conexión a internet es inestable o se pierde temporalmente.

El sistema utiliza un modelo de sincronización entre **tres bases de datos**:

- **MongoDB     Atlas**, como base principal en la nube;
- **MongoDB     Local**, como respaldo intermedio en la sucursal;
- **SQLite**,     como base ligera para operación offline y generación rápida de reportes.

Esta estructura permite que los datos se mantengan actualizados automáticamente, evitando duplicados, pérdida de información o diferencias en el inventario.

La plataforma cuenta con un **módulo robusto de productos** que permite agregar, editar y controlar artículos con precios, categorías, imágenes, unidades y stock. Además, incorpora la lógica **FIFO**, asegurando que los productos se descuenten según el lote más antiguo, lo cual es fundamental para negocios con mercancía perecedera.

El **módulo de ventas** integra tres métodos de precio —general, mayorista y cliente frecuente— y actualiza el stock de forma inmediata. Cuando se pierde el internet, las ventas se registran en la base local y se sincronizan automáticamente al restablecer la conexión, manteniendo así la continuidad operativa. Cada venta genera un ticket imprimible con formato térmico.

El sistema incluye una **gestión de usuarios con roles**, donde administradores, bodegueros y vendedores tienen permisos específicos. La autenticación se realiza mediante Passport.js y se adapta al estado de conexión para garantizar accesos seguros en cualquier condición.

Para el control de pérdidas, el sistema incorpora un **módulo de mermas** que permite registrar daños, caducidades o ajustes de inventario, aplicando los descuentos de stock correctamente y sincronizando los registros con las tres bases.

También cuenta con un completo **módulo de reportes**, que ofrece análisis de ventas, cortes por usuario, mermas y estado del inventario. Los reportes se pueden exportar en PDF, Excel o CSV y se generan con datos provenientes de SQLite para ofrecer velocidad y confiabilidad.

La interfaz gráfica, construida con EJS y Bootstrap, presenta un diseño limpio, funcional y responsivo. Los formularios, tablas, botones e indicadores están optimizados para mostrar información clara y facilitar el flujo de trabajo del usuario.

En conjunto, el sistema ofrece una solución moderna, escalable y segura para la administración integral de una frutería, resolviendo problemas reales de sincronización, pérdida de datos, variación de inventario y operación bajo condiciones de conexión inestable.

 

## Tecnologías mínimas del software

### 1. Node.js

El motor principal del backend.
 Permite ejecutar JavaScript en el servidor.

### 2. Express.js

Framework básico para:

·    crear rutas

·    manejar peticiones

·    controlar el flujo del sistema

Sin Express, el backend sería demasiado pesado y lento de construir.

 

### 3. Una base de datos 

Si se quiere lo más básico del sistema:

Opción mínima 1: MongoDB Atlas

·    Base en la nube

·    Fácil de conectar desde Node

Opción mínima 2: MongoDB Local

·    La alternativa si no se usa la nube

Opción mínima 3: SQLite

·    Ultra ligera

·    Corre sin servidor

·    Excelente para proyectos pequeños

Para el proyecto completo, usamos las tres, pero para la versión mínima solo necesitas una.

 

### 4. EJS (Templates de vistas)

Permite construir las pantallas visuales:
 productos, ventas, login, reportes.

Podrías usar HTML puro, pero EJS facilita todo.

 

### 5. CSS / Bootstrap (mínimo uno)

Para darle estilo básico a la interfaz.

·    Bootstrap hace que todo se vea bien sin mucho esfuerzo.

·    CSS puro también funciona.

 

### 6. Passport.js (mínimo para Login)

Para manejar:

·    Sesiones

·    Accesos

·    roles de usuario

Puedes reemplazarlo manualmente, pero Passport es lo mínimo para login seguro.

 

### 7. Librerías esenciales de NPM

Estas son mínimas:

| Librería                   | Para qué sirve              |
| -------------------------- | --------------------------- |
| dotenv                     | cargar variables de entorno |
| bcrypt                     | cifrar contraseñas          |
| multer                     | subir imágenes de productos |
| uuid                       | generar IDs únicos globales |
| mongoose (si usas MongoDB) | conectar a la BD            |
| sqlite3 (si usas SQLite)   | conectar a SQLite           |

 

### 8. Git (mínimo para control de versiones)

No obligatorio, pero sí recomendado.
 Git permite:

·    guardar el historial del proyecto

·    subir a GitHub

·    evitar perder versiones

 

### 9. Navegador web

Para ejecutar el sistema desde el cliente.

 

