<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/albertosalva/StatPadel">
    <img src="images/logo.png" alt="Logo" width="200" height="200">
  </a>

<h3 align="center">StatPadel</h3>

  <p align="center">
    Plataforma para el análisis de rendimiento en partidos de pádel.
    <br />
    <a href="https://github.com/albertosalva/StatPadel"><strong>Explora la documentación »</strong></a>
    <br />
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Tabla de Contenidos</summary>
  <ol>
    <li>
      <a href="#sobre-el-proyecto">Sobre el Proyecto</a>
      <ul>
        <li><a href="#tecnologías-utilizadas">Tecnologías Utilizadas</a></li>
      </ul>
    </li>
    <li>
      <a href="#primeros-pasos">Primeros Pasos</a>
      <ul>
        <li><a href="#requisitos-previos">Requisitos Previos</a></li>
        <li><a href="#instalación">Instalación</a></li>
      </ul>
    </li>
    <!--<li><a href="#usage">Uso</a></li>-->
  </ol>
</details>


<!-- ABOUT THE PROJECT -->
## Sobre el Proyecto

<!--[![Product Name Screen Shot][product-screenshot]](https://example.com)-->

**StatPadel** es una aplicación web que permite analizar partidos de pádel a partir de vídeos subidos por los usuarios.  
Utiliza técnicas de visión por computador para detectar la posición de la bola, los jugadores y generar estadísticas detalladas, incluyendo mapas de calor y gráficos de rendimiento.

Este proyecto fue desarrollado como Trabajo de Fin de Grado (TFG) en el Grado de Ingeniería Informática de la USAL.


<p align="right">(<a href="#readme-top">volver arriba</a>)</p>


### Tecnologías Utilizadas

 [![Vue.js][Vue.js]][Vue-url] 
 [![Element Plus][ElementPlus]][ElementPlus-url] 
 [![Node.js][Node.js]][Node-url] 
 [![JavaScript][JavaScript]][JavaScript-url] 
 [![Python][Python]][Python-url] 
 [![FastAPI][FastAPI]][FastAPI-url] 
 [![MongoDB][MongoDB]][MongoDB-url] 
 [![InfluxDB][InfluxDB]][InfluxDB-url] 

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>



<!-- GETTING STARTED -->
## Primeros Pasos

Sigue estos pasos para ejecutar StatPadel localmente en tu máquina.

### Requisitos Previos

Asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) y `npm`
- [Python 3.10+](https://www.python.org/)
- [MongoDB](https://www.mongodb.com/)
- [InfluxDB](https://www.influxdata.com/)
- Git

> ⚙️ Se recomienda usar un entorno virtual (`venv`) para el backend de análisis en Python.

### Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/albertosalva/statpadel.git
   cd statpadel
   ```
2. Instala las dependencias del frontend (Vue):
    ```bash
    cd frontend/statpadel
    npm install
    ```
3. Instala las dependencias del backend principal (Node.js):
    ```bash
    cd ../../backend-node
    npm install
    ```
4. Instala las dependencias del backend de análisis (Python):
    ```bash
    cd ../backend-python
    python -m venv venv
    source venv/bin/activate    # En Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```
5. Verifica que MongoDB, InfluxDB y Redis estén en ejecución en tu máquina antes de continuar.
6. Configura variables de entorno copiando los ejemplos y editándolos:
    frontend/statpadel/.env
    ```dotenv
    VUE_APP_API_HOST= # Host de la API
    VUE_APP_API_PORT= # Puerto en el que escucha la API
    ```
    backend-node/.env
    ```dotenv
    PORT=           # Puerto en el que escucha el servidor principal
    JWT_SECRET=     # Clave secreta para firmar y verificar JSON Web Tokens

    VIDEO_API_HOST= # Host del servicio de análisis de vídeo
    VIDEO_API_PORT= # Puerto del servicio de análisis de vídeo

    MONGODB_URI=    # Cadena de conexión a MongoDB

    INFLUX_URL=     # URL de la instancia de InfluxDB para métricas
    INFLUX_TOKEN=   # Token de autenticación para InfluxDB
    INFLUX_ORG=     # Organización en InfluxDB
    INFLUX_BUCKET=  # Bucket (contenedor) en InfluxDB donde se guardan las series temporales
    ```
    backend-python/.env
    ```dotenv
    CELERY_BROKER_URL=      # URL del broker de mensajes (Redis) para encolar tareas de Celery
    CELERY_RESULT_BACKEND=  # URL del backend (Redis) donde Celery almacena los resultados de las tareas  

    NODE_CALLBACK_URL=      # Endpoint al que el servicio de vídeo envía la notificación del resultado  
    ```
7. Inicia los servidores:
    
    Frontend (Vue)
    ```bash
    cd frontend/statpadel
    npm run serve
    ```
    Backend principal (Node.js)
    ```bash
    cd ../../backend-node
    npm run dev
    ```
    Backend de análisis (FastAPI / Uvicorn)
    ```bash
    cd backend-python
    source venv/bin/activate    # En Windows: venv\Scripts\activate
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    ```
    Procesador de Tareas (Celery)
    ```bash
    cd backend-python
    source venv/bin/activate    # En Windows: venv\Scripts\activate
    celery -A main.celery_app worker --loglevel=info --concurrency=1 -P solo
    ```



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[Vue.js]: https://img.shields.io/badge/Vue.js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[ElementPlus]: https://img.shields.io/badge/Element--Plus-409EFF?style=for-the-badge
[ElementPlus-url]: https://element-plus.org/
[Node.js]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[Node-url]: https://nodejs.org/
[JavaScript]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JavaScript-url]: https://developer.mozilla.org/es/docs/Web/JavaScript
[Python]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[FastAPI]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[MongoDB]: https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white
[MongoDB-url]: https://www.mongodb.com/
[InfluxDB]: https://img.shields.io/badge/InfluxDB-22ADF6?style=for-the-badge&logo=influxdb&logoColor=white
[InfluxDB-url]: https://www.influxdata.com/