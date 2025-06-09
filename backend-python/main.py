# main.py

# Importacion de librerias
import os
import uvicorn
import json
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from detection import video_analyzer
from homography import transform_json_homography
from homography import plot_transformed_trajectories
from exporter import export_to_json
from match_statistics import compute_match_statistics
from utils import ui_to_frame_corners

# Creacion de la aplicacion
app = FastAPI()

# Cargar variables de entorno
load_dotenv()

influx_url = os.getenv("INFLUX_URL")
influx_token = os.getenv("INFLUXDB_TOKEN")
influx_org = os.getenv("INFLUX_ORG")
influx_bucket = os.getenv("INFLUX_BUCKET")

@app.post("/upload_video_temp")
async def upload_video_temp(file: UploadFile = File(...)):
    # Crear la carpeta temp si no existe
    os.makedirs("temp", exist_ok=True)
    
    # Guardar el archivo subido en la carpeta temp
    temp_file_path = os.path.join("temp", file.filename)
    with open(temp_file_path, "wb") as file_object:
        file_object.write(await file.read())
    
    # Aquí puedes incluir más lógica si deseas (por ejemplo, retornar la ruta absoluta)
    return {"message": "Archivo subido a temp correctamente", "temp_file_path": temp_file_path}

@app.post("/upload_video")
async def upload_video(file: UploadFile = File(...), corners: str = Form(...), display_width: float = Form(...), display_height: float = Form(...)):
    # Verificar y crear la carpeta temp si no existe
    os.makedirs("temp", exist_ok=True)

    # Guardar el archivo subido en una ubicación temporal
    temp_file_path = os.path.join("temp", file.filename)
    with open(temp_file_path, "wb") as file_object:
        file_object.write(await file.read())

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
        src_corners = ui_to_frame_corners(
            video_path=temp_file_path,
            ui_corners=src_corners,
            display_width=display_width,
            display_height=display_height
        )
    except RuntimeError as e:
        os.remove(temp_file_path)
        return JSONResponse(
            status_code=400,
            content={"error": "El campo 'corners' conversion"}
        )
    

    # Definir las rutas de salida para el video procesado y el JSON de resultados
    output_video_path = "videos_results/result_videopadel.mp4"
    json_filename = "detecciones.json"
    bucket="Partidos"

    # Ejecutar el analisis del video
    results = video_analyzer(temp_file_path, output_video_path, src_corners)
    if results is None:
        # Si falla el procesamiento, se retorna un error
        return JSONResponse(status_code=400, content={"error": "El análisis del video falló."})
    
    # Exportar los resultados a un archivo JSON
    # export_to_json(results, json_filename)

    #transform_json_homography_to_influx(results, bucket)

    result_homography = transform_json_homography(results, json_filename)

    #plot_transformed_trajectories(json_filename)


    # Eliminar el archivo temporal
    os.remove(temp_file_path)

    print("Resultados exportados a", result_homography)

    # Retornar los resultados en formato JSON
    return result_homography


@app.get("/match_stats/{match_id}")
def get_match_stats(match_id: str):
    stats = compute_match_statistics(
        match_id=match_id,
        influx_url=influx_url,
        influx_token=influx_token,
        influx_org=influx_org,
        influx_bucket=influx_bucket
    )
    print("Estadísticas del partido:", stats)
    return stats


if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000)


