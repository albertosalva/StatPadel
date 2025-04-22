# main.py

# Importacion de librerias
import os
import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

from detection import video_analyzer
from homography import transform_json_homography
from homography import transform_json_homography_to_influx
from homography import plot_transformed_trajectories
from exporter import export_to_json

# Creacion de la aplicacion
app = FastAPI()

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
async def upload_video(file: UploadFile = File(...)):
    # Verificar y crear la carpeta temp si no existe
    os.makedirs("temp", exist_ok=True)

    # Guardar el archivo subido en una ubicación temporal
    temp_file_path = os.path.join("temp", file.filename)
    with open(temp_file_path, "wb") as file_object:
        file_object.write(await file.read())

    # Definir las rutas de salida para el video procesado y el JSON de resultados
    output_video_path = "videos_results/result_videopadel.mp4"
    json_filename = "detecciones.json"
    bucket="Partidos"

    # Ejecutar el analisis del video
    results = video_analyzer(temp_file_path, output_video_path)
    if results is None:
        # Si falla el procesamiento, se retorna un error
        return JSONResponse(status_code=400, content={"error": "El análisis del video falló."})
    
    # Exportar los resultados a un archivo JSON
    # export_to_json(results, json_filename)

    #transform_json_homography_to_influx(results, bucket)

    transform_json_homography(results, json_filename)

    #plot_transformed_trajectories(json_filename)


    # Eliminar el archivo temporal
    os.remove(temp_file_path)

    # Retornar los resultados en formato JSON
    return results


if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8000)


