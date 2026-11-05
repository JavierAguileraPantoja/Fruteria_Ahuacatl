# 📘 Manual Técnico y Documentación del Pipeline de Datos SNIIM
> **Proyecto:** Sistema de Extracción, Reparación y Limpieza de Datos Agrícolas  
> **Materia:** Cómputo en la Nube — Universidad de Guanajuato  
> **Lenguaje y Entorno:** JavaScript / Node.js (v18+)  

---

## 📖 Índice
1. [¿Qué hace este proyecto? (Visión General)](#1-qué-hace-este-proyecto-visión-general)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Explicación de las Herramientas Principales](#3-explicación-de-las-herramientas-principales)
4. [Módulo 1: El Extractor Masivo (scraping_sniim.js)](#4-módulo-1-el-extractor-masivo-scraping_sniimjs)
5. [Módulo 2: El Script de Reparación (reparar_sniim.js)](#5-módulo-2-el-script-de-reparación-reparar_sniimjs)
6. [Módulo 3: El Limpiador de Datos (validar_datos.js)](#6-módulo-3-el-limpiador-de-datos-validar_datosjs)
7. [Manual de Uso en Terminal](#7-manual-de-uso-en-terminal)

---

## 1. ¿Qué hace este proyecto? (Visión General)

Imagina que quieres guardar en tu libreta todos los precios históricos de frutas y verduras de México. Si vas a la página de la Secretaría de Economía (SNIIM) a mano, tendrías que seleccionar mes por mes, presionar buscar, copiar tabla por tabla y pegarla en un Excel. Te tomaría semanas de trabajo manual.

Este proyecto es un **Robot Asistente Automático** dividido en 3 etapas principales:

2. ## Estructura del Proyecto

La estructura de carpetas en tu computadora está organizada de la siguiente manera:  `

``text

 Proyecto_Fase_1/ 

├── node_modules/               <-- Librerías instaladas (Puppeteer, etc.) 

├── package.json                <-- Configuración del proyecto Node.js 

├── DOCUMENTACION_PROYECTO.md   <-- Este archivo de documentación 

└── src/ 

 	└── utils/

​         	├── scraping_sniim.js   <-- Script principal de extracción por lotes

​          	├── reparar_sniim.js    <-- Script secundario para reintentar lotes fallidos        

​		  ├── validar_datos.js    <-- Script de transformación y limpieza (ETL)

​		  ├── precios_sniim.json  <-- Archivo de datos crudos acumulados        

​		  └── precios_sniim_limpio.json <-- Archivo final listo para Base de Datos





## 3. Explicación de las Herramientas Principales

### ¿Qué es Node.js?

Es el entorno que nos permite ejecutar código JavaScript directamente en la terminal de la computadora, sin necesidad de abrir un navegador web manualmente.

### ¿Qué es Puppeteer?

Es una librería de Node.js que controla un navegador Chrome de forma invisible (modo *headless*). Puppeteer puede:

- Dar clics a botones automáticamente.
- Escribir fechas en cajas de texto.
- Esperar a que la página cargue.
- Leer la información de las tablas HTML.

## 4. Módulo 1: El Extractor Masivo (`scraping_sniim.js`)

### ¿Por qué se dividió en 21 lotes?

Si intentamos pedirle al servidor del SNIIM la información de 2 años de golpe, el servidor se sobrecarga y corta la conexión. Por eso, dividimos la consulta en **lotes mensuales** (Enero 2025, Febrero 2025, etc.).

### Conceptos clave del código:

1. **Apertura del Navegador:**

```
const browser = await puppeteer.launch({ headless: true });
```

1. Abre una ventana de Chrome "invisible" para que trabaje muy rápido en segundo plano.

2. **Acceso al iFrame:** El sitio del SNIIM guarda su formulario dentro de una ventana interna llamada `iframe`. No podemos darle clic directamente a la página principal; primero debemos conectarnos al marco interno:

   JavaScript

   ```
   const iframeElement = await page.waitForSelector('iframe');
   const frame = await iframeElement.contentFrame();
   ```

3. **Inyección de Fechas mediante JavaScript Nativo:** Para evitar que los calendarios flotantes tapen la pantalla, inyectamos los valores directamente en las cajas de texto de HTML usando `#txtFechaInicio` y `#txtFechaFinal`:

   JavaScript

   ```
   await frame.evaluate((fIni, fFin) => {
     document.querySelector('#txtFechaInicio').value = fIni;
     document.querySelector('#txtFechaFinal').value = fFin;
   }, fechaInicio, fechaFin);
   ```

4. **Paginación Avanzada:** Cuando una consulta devuelve más de 500 registros, el servidor los divide en "Página 1 de 3", "Página 2 de 3", etc. El script detecta el botón `#ibtnSiguiente2` para avanzar página por página recolectando la información.

## 5. Módulo 2: El Script de Reparación (`reparar_sniim.js`)

### El problema de la red: `ERR_BLOCKED_BY_CLIENT`

A veces la conexión de internet cae un segundo o el servidor del gobierno se satura. Cuando eso pasa, un lote puede fallar. En lugar de volver a correr todo el proceso de 21 meses desde cero (que tomaría 20 minutos), usamos `reparar_sniim.js`.

### Soluciones aplicadas en la reparación:

1. **División Quincenal:** Al darnos cuenta de que **Agosto de 2025** fallaba al pedir 31 días completos, modificamos el script para pedirlo en 2 partes pequeñas:
   - **Quincena 1:** Del 01/08/2025 al 15/08/2025.
   - **Quincena 2:** Del 16/08/2025 al 31/08/2025.
2. **Estructura de Reintentos Automáticos (\*Retry Pattern\*):**

```
let intentos = 0;
while (intentos < maxIntentos && !exito) {
  try {
    // Intenta hacer la consulta...
    exito = true;
  } catch (error) {
    intentos++;
    // Espera 7 segundos antes de volver a intentar
    await new Promise(r => setTimeout(r, 7000));
  }
}
```

3. **Prevención de Duplicados usando `Set`:** Para asegurarnos de que no existan filas repetidas en nuestro archivo `.json`, creamos una "llave única" combinando campos:

```
const clave = `${reg.fecha}|${reg.producto}|${reg.origen}|${reg.presentacion}`;
```

Si la clave ya existe en la memoria, el script ignora el registro repetido.

## 6. Módulo 3: El Limpiador de Datos (`validar_datos.js`)

Una vez que tenemos la información bruta descargada en `precios_sniim.json`, el código debe transformar el texto en datos limpios de nivel profesional. Este proceso se conoce como **ETL (Extract, Transform, Load)**.

### Transformaciones aplicadas:

1. **Estandarización de Fechas (Texto a ISO):**
   - **Antes (Texto sucio):** `"15/08/2025"`
   - **Después (Formato Estándar ISO):** `"2025-08-15"` Esto permite realizar ordenamientos cronológicos correctos en bases de datos.
2. **Conversión a Números Reales (`Float`):**
   - **Antes:** `"18.50"` (cadena de texto con la que no se pueden hacer sumas ni promedios).
   - **Después:** `18.50` (número decimal).
3. **Limpieza de Cadenas en Mayúsculas (`TRIM` y `TOUPPERCASE`):** Elimina espacios al principio y al final de los nombres de frutas o verduras, y estandariza todo a mayúsculas para evitar tener por separado "Aguacate" y "AGUACATE".

## 7. Manual de Uso en Terminal

Para ejecutar cualquiera de las etapas del proyecto desde la terminal de PowerShell en Visual Studio Code:

1. **Ubicarse en la raíz del proyecto:**

```
cd C:\Users\javie\Documents\Buzo\UG\clases\Computo en la Nube\Practicas\Proyecto_Fase_1
```

2. **Para correr el Extractor Masivo:**

Bash

```
node src/utils/scraping_sniim.js
```

3. **Para correr el Script de Reparación (si falló algún lote):**

Bash

```
node src/utils/reparar_sniim.js
```

4. **Para generar el archivo final limpio y validado:**

Bash

```
node src/utils/validar_datos.js
```

¡Felicidades! Ahora cuentas con una base de datos limpia de **22,982 registros** lista para ser cargada en MongoDB o consumida mediante una API REST.

```
---

### Instrucciones de implementación:

1. Abre Visual Studio Code en tu proyecto.
2. Crea un archivo nuevo en la carpeta principal llamado `DOCUMENTACION_PROYECTO.md`.
3. Pega todo el contenido del bloque anterior y guarda el archivo (`Ctrl + S`).
4. Para visualizar la documentación renderizada con formato profesional directamente en tu editor, presiona la combinación de teclas: **`Ctrl + K`** y luego **`V`**.
```