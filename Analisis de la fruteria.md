 

# Sistema web de gestión para frutería

## Introducción



Fruteria Ahuacatl es una aplicación realizada con la finalidad de establecer los precios de tu frutería con beneficio para la empresa. Cuando los precios disminuyen a la compra, los precios se auto establecen para la venta calculado aumentar el margen de ganancia en los productos.

## Entregables



1. Repositorio en gitlab o github con el código e historial de modificaciones.

   https://github.com/JavierAguileraPantoja/Fruteria_Ahuacatl.git

   

## Alcance



La empresa Ahucatl se extenderá para ventas en rutas fuera de conexión telefónica, fuera de internet.  Con una sincronización en la base de datos de las distintas sedes. Como la venta por aplicación personal del cliente. Así cada cliente podrá pedir su despensa desde su hogar.

Mas factores a considerar:

* Registro e usuarios 
* Autentificación
* Gestión de productos
* Control de inventario
* Ventas 
* Mermas
* Sincronización online/offline
* Dashboard

 

## Datos a considerar

###   **Registro de usuarios** 

* Nombre y Apellido
* Nombre de usuario
*  Correo electrónico
*  Contraseña
*  Confirmación de contraseña
* Fotografía

* Puesto de trabajo

### Validaciones

* Validación de formato de correo electrónico.
* Validación de coincidencia de contraseñas
* Restricción de usuario y correo duplicado
* Encriptación de contraseñas.

### Inicio de sesión

* Nombre de usuario o correo electrónico.

* Contraseña.

* Validación de credenciales.

* Manejo de sesión mediante token.

* Cierre de sesión.

### Sección Principal

*  **Navegación**

  * Visualización del nombre de usuario autenticado.
* Visualización del rol del usuario.
  * Opción para cerrar sesión.
* Acceso dinámico a módulos según privilegios.
  * Aplica las funciones que puedes utilizar los usuarios dependiendo de su puesto.


### Área de trabajo (Dashboard)

Cuenta con área de trabajo para cada uno de los usuarios dependiendo de su funcionalidad así como también con consulta de datos dependiendo de su puesto y con distintos privilegios.

* Administrador
  * Gestión de usuarios (Crear, editar, eliminar)
  * Gestión de productos.
  * Gestión de ventas.
  *  Gestión de compras.
  * Acceso completo al sistema.
* Ventas 
  * Punto de venta.
  * Registro de ventas.
  * Consulta de productos.
  * Consulta de historial de venta.


* Almacenista
  * Registro de productos.
  * Actualización de inventario.
  * Eliminación de productos. 
  * Consulta de stock.

* Reglas de negocio

  * Solo el administrador puede gestionar usuarios.
  * Solo el almacenista puede modificar inventario.
  * Las ventas descuentan automáticamente el stock.
  * No se puede vender un producto sin stock disponible.

* Restricciones del sistema.

  * Acceso único a usuarios autenticados.
  * Acceso restringido según rol.
  * Sesiones con tiempo de expiración.

  

## Arquitectura de la solución

![](C:\Users\javie\Downloads\Architecture-of-a-Distributed-Database-System.png)

Fruteria Ahuacatl implementa una "Arquitectura Web Hibrida Distribuida con Sincronización Bidimensional " compuesta por tres capas principales, presentación, aplicación y persistencia..

### Componentes Principales

#### Capa de Presentación (Frontend)

La capa de presentación esta desarrollada utilizando ejs, bootstrap permitiendo una aplicación responsiva y adaptable a distintos dispositivos. Con responsabilidades como mostrar interfaz al usuario, capturar acciones (ventas, registros y consultas), mostrar KPIs y reportes.

#### Capa de Aplicación (Backend)

La capa de aplicación, desarrollada en Node.js con Express, concentra la lógica de negocio, autenticación, control del inventario, manejo de roles y sincronización de datos.

#### Capa de Persistencia (Base de datos)

La capa de persistencia utiliza un modelo híbrido compuesto por SQLite(operación local offline), MongoDB y MongoDB Atlas (nube), permitiendo continuidad operativa ante fallas de conectividad y sincronización bidimensional controlada entre entornos.







## Tecnologías utilizadas

Las tecnologías utilizadas:

* Frontend
  * EJS como motor de plantillas por la renderización del lado del servidor y la integración directa con express.
  * Bootstrap el framework css responsivo, como diseño adaptable, componentes preconstruidos y reducción de tiempo de desarrollo. 
  * JavaScrpt, Manipulación del DOM y lógica de interacción.

* Backend

  * Node.js, entorno de ejecución basado en JavaScript orientado a eventos. Alto rendemiento, ideal para aplicaciones web en tiempo real y amplio ecosistema.
  * Express.js, framework minimalista para node.js. Arquitectura modular, Manejo eficiente de rutas y middleware y escalable.
  * Mongoose, ODM para MongoDB. Es Modelado estructurado de datos, Validaciones integradas y manejo de esquemas.
  * JWT(JSON Web Token). Mecanismo de autentificación basado en tokens. Seguridad sin estado, escalable y fácil integración en APIs REST.
  * BCRYPT, Biblioteca de encriptación de contraseñas. Protección contra ataques de fuerza bruta y hash seguro con salting automático.

* Base de Datos

  * SQLite. Base de datos ligera local. Operación offline, Bajo consumo de recursos y Ideal para persistencia local rápida.

  * MongoDB Local. Base intermedia para sincronización. Modelo flexible y compatible con arquitectura distribuida.

  * MongoDB Atlas. Base de datos en la nube. Alta disponibilidad, acceso remoto y respaldo centralizado multi-sucursal.

    

| Capa                     | Tecnología    | Propósito                   |
| ------------------------ | ------------- | --------------------------- |
| Backend                  | Node.js       | Entorno de ejecución        |
| Backend                  | Express.js    | Framework web               |
| Seguridad                | JWT           | Autenticación               |
| Seguridad                | bcrypt        | Encriptación de contraseñas |
| Base de Datos Local      | SQLite        | Operación offline           |
| Base de Datos Intermedia | MongoDB Local | Sincronización              |
| Base de Datos Nube       | MongoDB Atlas | Persistencia centralizada   |
| Frontend                 | EJS           | Renderizado                 |
| UI                       | Bootstrap     | Diseño responsivo           |

## Seguridad Implementada

El sistema implementa múltiples mecanismos de seguridad orientados a proteger la información, la integridad del inventario y el acceso a funcionalidades críticas.

Las contraseñas de los usuarios se almacenan utilizando hashing seguro mediante bcrypt, avirtando el almacenamiento en texto y reducción el riesgo ante posibles filtraciones de base de datos.

El acceso al sistema se encuentra protegido mediante autentificación validada en backend y middleware de autorización, restringiendo el acceso a rutas críticas únicamente a usuarios autenticados.

Se implementó un sistema de roles (Administrador, usuario y Almacenista) para limpiar privilegios y prevenir la manipulación indebida de datos sensibles como productos y ventas.

Adicionalmente, todas las operaciones críticas, como registro de ventas y sincronización de inventario, incluye validaciones en backend para garantizar disponibilidad de stock y evitar inconsistencias en escenarios de operación híbrida online/offline. 

Estas medidas garantizan confidencialidad, integridad y control de acceso en el sistema. 

## Modulo de sincronización

EL objetivo de la Sincronización garantiza continuidad operativa del sistema en escenarios con perdida de conectividad, interrupciones de red y operacion en sucursales con internet inestable.

Permitiendo:

* Registrar ventas offline.
* Mantener consistencia de inventario.
* Sincronizar automáticamente cuando vuelve la conexión.
* Evitar conflictos y duplicados.

Problemas Técnicos que Resuelve:

* Doble descuento de stock.
* Duplicación de ventas.
* Conflictos entre registros online y offline.
* Desincronización entre sucursales.
* Stock negativo por reconexión.

El sistema implementa un modelo híbrido de sincronización entre bases de datos locales y en la nube, permitiendo operación continua incluso en escenarios de pérdida de conectividad.

Durante el modo offline, las ventas y movimientos de inventario se registran en SQLite y MongoDB Local, marcaron como pendientes de sincronización.

El restablecer la conexión, el sistema ejecuta un proceso de sincronización controlada hacia MongoDB Atlas, verificado previamente la existencia de registros mediante identificadores únicos globales y validando disponibilidad de stock para evitar inconsistencias.

Este modelo garantiza consistencia eventual controlada, evitando duplicados, doble descuento de inventario y conflictos entre registros online y offline.

La arquitectura implementada permite continuidad operativa, escalabilidad multi-sucursal y protección de integridad de inventario.

## Funciones clave 

El sistema integra módulos orientados a la gestión integral del negocio. Entre sus funciones principales se encuentra la autentificación segura de usuarios, control e inventario con validación en tiempo real, registrando automatizado de ventas con lógica dinámica de precios, generación de indicadores estratégicos mediante dashboard administrativo y un módulo de sincronización híbrida que permite operación continua en entornos online y offline.

Estas funcionalidades permiten garantizar integridad de datos, continuidad operativa y control financiero del negocio.

## Despliegue

El sistema está diseñado bajo una arquitectura preparada para despliegue en entornos cloud, utilizando MongoDB Atlas como base de datos centralizada y un servidor Node.js como backend principal.

La configuración se gestiona mediante variables de entorno, evitando la exposición de credenciales sensibles.

El sistema puede ser contenerizado mediante Docker para garantizar portabilidad y facilitar su despliegue en plataformas como Render o Fly.io.

La arquitectura permite escalabilidad horizontal y expansión a múltiples sucursales sin afectar la integridad del sistema.

## Retos técnicos y soluciones

Durante el desarrollo del sistema se enfrentaron diversos diversos desafíos técnicos relacionados principalmente con la sincronización distribuida, consistencia de inventario y estructuración de modelos de datos.

Uno de los principales retos fue evitar el doble descuento de inventario en escenarios híbridos online/offline. Este problema fue resuelto mediante la implementación de identificadores únicos globales, validaciones previas a sincronización y control adicional de stock en backed.

Asimismo, se corrieron conflictos conflictos derivados de modelos duplicados en Mongoose, centralizado la definición de esquemas y optimizado la estructura del backend.

Estas soluciones permitieron garantizar integridad de datos, consistencia eventual controlada y estabilidad del sistema.

