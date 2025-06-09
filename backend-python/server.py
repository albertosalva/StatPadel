import cv2
import base64
import numpy as np
import os
import time
import sys
from flask import Flask, request, jsonify

app = Flask(__name__)

# Variables globales para almacenar el primer frame y las esquinas seleccionadas
first_frame = None
selected_corners = None

@app.post('/load_video')
def load_video():
    """
    Recibe la ruta de un video (como JSON) y guarda el primer frame en memoria.
    """
    global first_frame, selected_corners
    data = request.get_json()
    video_path = data.get("video_path")
    print("Ruta absoluta:", os.path.abspath(video_path))
    print("Video path recibido en Flask:", video_path)
    if not video_path:
        return jsonify({"error": "Falta el parámetro video_path"}), 400

    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()

    if not ret:
        return jsonify({"error": "No se pudo leer el primer frame del video."}), 500

    first_frame = frame
    print("Dimensiones del frame original:", first_frame.shape)
    selected_corners = None  
    return jsonify({"status": "Primer frame cargado correctamente"})

@app.route('/get_frame', methods=['GET'])
def get_frame():
    """
    Devuelve el primer frame codificado en base64 para que la UI lo muestre.
    """
    global first_frame
    if first_frame is None:
        return jsonify({'error': 'Frame no disponible'}), 404
    ret, buffer = cv2.imencode('.jpg', first_frame)
    if not ret:
        return jsonify({'error': 'Error al codificar la imagen'}), 500
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')
    return jsonify({'frame': jpg_as_text})


if __name__ == '__main__':
    print("Servidor Flask iniciado en el puerto 5000")
    app.run(host="0.0.0.0", port=5000)
