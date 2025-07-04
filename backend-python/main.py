# main.py

"""Módulo principal de la API de análisis de vídeo con FastAPI y Celery.

Este módulo expone un endpoint para subir vídeos, los encola en Celery
para su procesamiento (detección y homografía) y notifica el resultado
a un servicio Node.js.
"""

# Importacion de librerias
import os
import uvicorn
import json
import numpy as np
import time
import requests

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from celery import Celery
from dotenv import load_dotenv

from detection import video_analyzer
from homography import transform_json_homography, rename_players_by_position
from utils import ui_to_frame_corners


# Cargar variables de entorno
load_dotenv()

# Configuracion de Celery
try:
    broker_url  = os.environ["CELERY_BROKER_URL"]
    backend_url = os.environ["CELERY_RESULT_BACKEND"]
except KeyError as missing:
    raise RuntimeError(f"Falta las variables de entorno obligatorias")

celery_app = Celery("tasks", broker=broker_url, backend=backend_url)


# Creacion de la aplicacion FastAPI
app = FastAPI()


@celery_app.task(bind=True)
def analyze_video_task(self, temp_file_path: str, src_corners: list, match_id: str):
    """
    Procesa un vídeo aplicando análisis de detección y transformación por homografía.

    Args:
        self: Referencia al contexto de la tarea Celery.
        temp_file_path (str): Ruta al fichero de vídeo temporal.
        src_corners (List[List[float]]): Lista de 4 esquinas en coordenadas del frame.
        match_id (str): Identificador único del partido.

    Returns:
        dict: Resultado JSON tras aplicar homografía y renombrar jugadores.

    Raises:
        RuntimeError: Si ocurre un error en el análisis del vídeo.
        requests.RequestException: Si la notificación al servicio Node.js falla.
    """
    try:
        start_time = time.time()

        # Covertir las esquinas
        corners_arr = np.array(src_corners, dtype=float)

        # Analizar el video
        results = video_analyzer(temp_file_path, corners_arr)

        # Aplicar homografía y renombrar jugadores
        result_homography = transform_json_homography(results)
        result_homography = rename_players_by_position(result_homography)

        end_time = time.time()
        print(f"[Celery] Análisis completo en {end_time - start_time:.2f} segundos")

        # Eliminar el archivo temporal
        #os.remove(temp_file_path)

        # Notificar a Node.js con el resultado
        node_url = os.getenv("NODE_CALLBACK_URL")
        payload = {
            "matchId": match_id,
            "result": result_homography
        }
        resp = requests.post(node_url, json=payload, timeout=10)
        resp.raise_for_status()
        print(f"[Celery] Notificado a Node.js: {node_url})")

        return result_homography
    
    except Exception as e:
        print(f"[Celery] Error en la tarea de analisis o en el envio de la respuesta: {e}")
        raise

    finally:
        # Borrar el archivo temporal
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                print(f"[Celery] Archivo temporal borrado: {temp_file_path}")
            except OSError as e:
                print(f"[Celery] No se pudo borrar {temp_file_path}: {e}")

    


@app.post("/upload_video")
async def upload_video(file: UploadFile = File(...), file_name: str = Form(...), corners: str = Form(...), display_width: float = Form(...), display_height: float = Form(...), match_id: str = Form(...)):
    """
    Recibe un vídeo, valida esquinas de UI, convierte coordenadas y lo encola en Celery.

    Args:
        file (UploadFile): Archivo de vídeo subido por el cliente.
        file_name (str): Nombre descriptivo del fichero.
        corners (str): JSON con lista de 4 pares [x, y] en coordenadas de UI.
        display_width (float): Ancho en píxels de la vista previa.
        display_height (float): Alto en píxels de la vista previa.
        match_id (str): Identificador único del partido.

    Returns:
        dict: Contiene `task_id` y `status` indicando que la tarea está encolada.

    Raises:
        JSONResponse: Devuelve errores 400 si el JSON de esquinas es inválido o la conversión de coordenadas falla.
    """

    # Verificar y crear la carpeta temp si no existe
    os.makedirs("temp", exist_ok=True)

    # Guardar el archivo subido en una ubicación temporal
    file_name = file.filename
    temp_path = os.path.join("temp", file_name)
    contents = await file.read()
    with open(temp_path, "wb") as f:
        f.write(contents)

    # Verificar las esquinas del video
    try:
        src_corners = json.loads(corners)
        if len(src_corners) != 4:
            raise ValueError()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "El campo 'corners' debe ser un JSON con 4 pares [x,y]"}
        )
    
    # Convertir las esquinas de la interfaz de usuario a las esquinas del frame
    try:
        src_corners = ui_to_frame_corners(temp_path, src_corners, display_width, display_height)
    except RuntimeError as e:
        os.remove(temp_path)
        return JSONResponse(
            status_code=400,
            content={"error": "El campo 'corners' conversion"}
        )

    # Mandar la tarea de análisis al worker de Celery
    task = analyze_video_task.apply_async(
        args=[temp_path, src_corners.tolist(), match_id]
    )

    # Retornar el ID de la tarea y el estado
    return {"task_id": task.id, "status": "enqueued"}


if __name__ == '__main__':
    os.makedirs("temp", exist_ok=True)
    #os.makedirs("videos_results", exist_ok=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)


