<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/albertosalva/StatPadel">
    <img src="images/logo.png" alt="Logo" width="200" height="200">
  </a>

<h3 align="center">StatPadel</h3>

  <p align="center">
    Plataforma para el análisis de rendimiento en partidos de padel.
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

* [![Vue.js][Vue.js]][Vue-url]
* [![Element Plus][ElementPlus]][ElementPlus-url]
* [![Node.js][Node.js]][Node-url]
* [![Python][Python]][Python-url]
* [![FastAPI][FastAPI]][FastAPI-url]
* [![MongoDB][MongoDB]][MongoDB-url]
* [![InfluxDB][InfluxDB]][InfluxDB-url]

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
    VUE_APP_API_BASE_URL=http://localhost:3000
    ```
    backend-node/.env
    ```dotenv
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/statpadel
    JWT_SECRET=tu_secreto_jwt
    INFLUXDB_URL=http://localhost:8086
    INFLUXDB_TOKEN=tu_token_influx
    INFLUXDB_ORG=tu_organizacion
    INFLUXDB_BUCKET=tu_bucket
    ```
    backend-python/.env
    ```dotenv
    CELERY_BROKER_URL=redis://localhost:6379/0
    REDIS_URL=redis://localhost:6379/1
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
[Python]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[FastAPI]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[MongoDB]: https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white
[MongoDB-url]: https://www.mongodb.com/
[InfluxDB]: https://img.shields.io/badge/InfluxDB-22ADF6?style=for-the-badge&logo=influxdb&logoColor=white
[InfluxDB-url]: https://www.influxdata.com/