# main.py

# Importacion de librerias
import os
import uvicorn
import json
import base64
import cv2
import numpy as np
import time

from fastapi import FastAPI, File, UploadFile, Form, Body, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from detection import video_analyzer
from homography import transform_json_homography, rename_players_by_position
from utils import ui_to_frame_corners

from celery import Celery

import requests
from fastapi import Request


# Cargar variables de entorno
load_dotenv()

# Configuracion de Celery
celery_app = Celery(
    "tasks",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
)

# Creacion de la aplicacion
app = FastAPI()


@celery_app.task(bind=True)
def analyze_video_task(self, temp_file_path: str, output_video_path: str, src_corners: list, match_id: str):
    start_time = time.time()
    # aquí va tu lógica de video_analyzer + homografía + rename...
    corners_arr = np.array(src_corners, dtype=float)
    print(f"[upload_video] Esquemas de esquina convertidos: {src_corners}")
    print(f"[upload_video] Esquemas de esquina como array: {corners_arr}")
    results = video_analyzer(temp_file_path, output_video_path, corners_arr)
    # transformaciones, export, rename...
    json_filename = "detecciones.json"
    json_filename2 = "detecciones2.json"
    result_homography = transform_json_homography(results, json_filename)
    result_homography = rename_players_by_position(json_filename,  json_filename2)
    end_time = time.time()
    print(f"\n✅ Análisis completo en {end_time - start_time:.2f} segundos")
    os.remove(temp_file_path)

    try:
        node_url = os.getenv("NODE_CALLBACK_URL")
        payload = {
            "matchId": match_id,
            "result": result_homography
        }
        s = json.dumps(payload)
        size_bytes = len(s.encode('utf-8'))
        print(f"[Celery] Payload size: {size_bytes} bytes ({size_bytes/1024:.2f} KB)")
        resp = requests.post(node_url, json=payload, timeout=10)
        resp.raise_for_status()
        print(f"[Celery] Notificado a Node.js: {node_url} (status {resp.status_code})")
    except Exception as e:
        print(f"[Celery] Error notificando a Node.js en {node_url}: {e}")

    #print(f"match_id: {match_id}")

    return result_homography



@app.post("/upload_video")
async def upload_video(file: UploadFile = File(...), file_name: str = Form(...), corners: str = Form(...), display_width: float = Form(...), display_height: float = Form(...), match_id: str = Form(...)):
    # Verificar y crear la carpeta temp si no existe
    os.makedirs("temp", exist_ok=True)
    #start_time = time.time()

    # 1) Guardar el fichero en temp/
    file_name = file.filename
    temp_path = os.path.join("temp", file_name)
    contents = await file.read()
    with open(temp_path, "wb") as f:
        f.write(contents)
    print(f"[extract_frame_file] Guardado temp/{file_name} ({len(contents)} bytes)")

    print(f"[upload_video] Recibido archivo: {file_name}, corners: {corners}, display_width: {display_width}, display_height: {display_height}")

    # Guardar el archivo subido en una ubicación temporal
    #temp_file_path = os.path.join("temp", file_name)
    #if not os.path.exists(temp_file_path):
    #    return JSONResponse(400, {"error": "Vídeo temporal no encontrado"})

    try:
        src_corners = json.loads(corners)
        if len(src_corners) != 4:
            raise ValueError()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "El campo 'corners' debe ser un JSON con 4 pares [x,y]"}
        )
    
    try:
        src_corners = ui_to_frame_corners(video_path=temp_path, ui_corners=src_corners, display_width=display_width, display_height=display_height)
    except RuntimeError as e:
        os.remove(temp_path)
        return JSONResponse(
            status_code=400,
            content={"error": "El campo 'corners' conversion"}
        )
    

    # Definir las rutas de salida para el video procesado y el JSON de resultados
    output_video_path = "videos_results/result_videopadel.mp4"

    print(f"[upload_video] Esquemas de esquina convertidos: {src_corners}")

    #print(f"match_id: {match_id}")
    task = analyze_video_task.apply_async(
        args=[temp_path, output_video_path, src_corners.tolist(), match_id]
    )

    return {"task_id": task.id, "status": "enqueued"}

    # Ejecutar el analisis del video
    #results = video_analyzer(temp_file_path, output_video_path, src_corners)
    #if results is None:
        # Si falla el procesamiento, se retorna un error
    #    return JSONResponse(status_code=400, content={"error": "El análisis del video falló."})
    
    #print("RESULTADO DEL ANALISIS: ", results)
    
    # Exportar los resultados a un archivo JSON
    # export_to_json(results, json_filename)

    #transform_json_homography_to_influx(results, bucket)

    #result_homography = transform_json_homography(results, json_filename)

    #result_homography = rename_players_by_position(json_filename, json_filename2)

    #plot_transformed_trajectories(json_filename)

    #end_time = time.time()
    #print(f"\n✅ Análisis completo en {end_time - start_time:.2f} segundos")

    # Eliminar el archivo temporal
    #os.remove(temp_file_path)

    #print("Resultados exportados a", result_homography)

    # Retornar los resultados en formato JSON
    #return result_homography



if __name__ == '__main__':
    os.makedirs("temp", exist_ok=True)
    #os.makedirs("videos_results", exist_ok=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)


