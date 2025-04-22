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

"""
@app.route('/set_corners', methods=['POST'])
def set_corners():
    
    global selected_corners
    data = request.get_json()
    corners = data.get('corners')
    if not corners or len(corners) != 4:
        return jsonify({'error': 'Se requieren 4 puntos'}), 400
    selected_corners = np.array(corners, dtype=np.float32)
    return jsonify({'status': 'ok'})
"""

@app.route('/set_corners', methods=['POST'])
def set_corners():
    """
    Recibe las coordenadas seleccionadas por el usuario, junto con las dimensiones de la imagen mostrada.
    Se espera que el JSON tenga el siguiente formato:
      {
         "corners": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]],
         "display_width": <ancho de la imagen mostrada>,
         "display_height": <alto de la imagen mostrada>
      }
    Se transforman las coordenadas de la imagen mostrada (display) a las del frame original.
    """
    global selected_corners, first_frame
    data = request.get_json()
    corners = data.get('corners')
    display_width = data.get('display_width')
    display_height = data.get('display_height')

    if not corners or len(corners) != 4:
        return jsonify({'error': 'Se requieren 4 puntos'}), 400
    if not display_width or not display_height:
        return jsonify({'error': 'Falta display_width o display_height'}), 400
    if first_frame is None:
        return jsonify({'error': 'Frame original no disponible'}), 500

    # Obtener dimensiones del frame original
    original_height, original_width = first_frame.shape[:2]
    factor_x = original_width / float(display_width)
    factor_y = original_height / float(display_height)

    # Transformar las coordenadas de la UI al sistema original
    transformed = []
    for point in corners:
        x, y = point
        x_orig = x * factor_x
        y_orig = y * factor_y
        transformed.append([x_orig, y_orig])

    selected_corners = np.array(transformed, dtype=np.float32)
    print("Esquinas transformadas al tamaño original:", selected_corners)
    return jsonify({'status': 'ok'})

@app.route('/get_corners', methods=['GET'])
def get_corners_endpoint():
    """
    Devuelve las esquinas si ya fueron seleccionadas y luego las elimina.
    """
    global selected_corners
    if selected_corners is None:
        return jsonify({"status": "pending"}), 204
    corners = selected_corners.tolist()
    # Una vez devueltas, se reinician para que no se reutilicen en otra iteración
    selected_corners = None
    return jsonify({"corners": corners}), 200

if __name__ == '__main__':
    print("Servidor Flask iniciado en el puerto 5000")
    app.run(host="0.0.0.0", port=5000)
