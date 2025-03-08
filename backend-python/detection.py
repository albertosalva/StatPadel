# detection.py

# Importar librerias
import cv2
import numpy as np
import torch
import sys
import os
from math import sqrt
from ultralytics import YOLO

# Agregar la carpeta de TrackNet al path para poder importar los modulos
tracnet_dir = os.path.join("external", "TrackNet")
if tracnet_dir not in sys.path:
    sys.path.append(tracnet_dir)

from model import BallTrackerNet
from general import postprocess
from infer_on_video import read_video, infer_model, remove_outliers, split_track, interpolation, write_track


def select_corners(frame):
    """
    Muestra el frame y permite al usuario seleccionar 4 puntos que definen la pista.
    Retorna un array NumPy con los puntos.
    """
    corners = []
    temp_frame = frame.copy()

    def mouse_callback(event, x, y, flags, param):
        nonlocal corners, temp_frame
        if event == cv2.EVENT_LBUTTONDOWN:
            corners.append((x, y))
            cv2.circle(temp_frame, (x, y), 5, (0, 255, 0), -1)
            if len(corners) > 1:
                cv2.line(temp_frame, corners[-2], corners[-1], (0, 255, 0), 2)
            if len(corners) == 4:
                cv2.line(temp_frame, corners[-1], corners[0], (0, 255, 0), 2)
            cv2.imshow("Seleccionar esquinas", temp_frame)
            print(f"Punto seleccionado: {x}, {y}")


    cv2.namedWindow("Seleccionar esquinas", cv2.WINDOW_AUTOSIZE)
    cv2.imshow("Seleccionar esquinas", temp_frame)
    cv2.setMouseCallback("Seleccionar esquinas", mouse_callback)
    print("Seleccione 4 puntos que definan la pista.")
    while True:
        cv2.imshow("Seleccionar esquinas", temp_frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord('r'):
            temp_frame = frame.copy()
            corners = []
            cv2.imshow("Seleccionar esquinas", temp_frame)
            print("Selecion reiniciada.")
        if len(corners) == 4:
            break

    cv2.destroyWindow("Seleccionar esquinas")
    roi = np.array(corners, dtype=np.float32)
    return roi


def video_analyzer(video_path, output_path):
    """
    Analiza un video en la ruta especificada y guarda un video
    con las detecciones en la ruta de salida.
    """

    # Cargar el modelo YOLOv11
    yolo_model_path = os.path.join("external", "models", "yolo11x.pt")
    yolo_model = YOLO(yolo_model_path)

    # Cargar el modelo TrackNet
    ball_model = BallTrackerNet()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ball_model_path = os.path.join("external", "models", "model_best.pt")
    ball_model.load_state_dict(torch.load(ball_model_path, map_location=device, weights_only=True))
    ball_model = ball_model.to(device)
    ball_model.eval()

    # Leer todos los frames y obtener FPS usando read_video
    frames, fps = read_video(video_path)
    if len(frames) == 0:
        print("Error: No se pudo leer el video.")
        return None

    # Seleccionar las esquinas de la pista en el primer frame
    first_frame = frames[0]
    court_polygon = select_corners(first_frame)
    court_corners = court_polygon.tolist()

    # Obtener dimensiones del video
    frame_height, frame_width = first_frame.shape[:2]
    # Calcular factores de escala (TrackNet opera a 640x360)
    scale_x = frame_width / 640
    scale_y = frame_height / 360

    # Obtener la trayectoria de la bola usando infer_model
    # Se pasa el dispositivo como parámetro para que infer_model lo use
    ball_track, dists = infer_model(frames, ball_model, device)
    ball_track = remove_outliers(ball_track, dists)

    """
    subtracks = split_track(ball_track)
    for r in subtracks:
        ball_subtrack = ball_track[r[0]:r[1]]
        ball_subtrack = interpolation(ball_subtrack)
        ball_track[r[0]:r[1]] = ball_subtrack
    """
    

    # Definir VideoWriter para el video de salida
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))

    # Inicializar variables de tracking de jugadores
    tracked_players = {1: None, 2: None, 3: None, 4: None}
    tracking_threshold = 50

    # Construir el JSON de resultados; la primera entrada contiene las esquinas de la pista
    results_json = {"court_corners": court_corners, "frames": []}

    # Procesar cada frame: detección de jugadores (YOLO) y superponer la posición de la bola (obtenida de inferencia)
    for i, frame in enumerate(frames):
        annotated_frame = frame.copy()

        # --- Detección de jugadores con YOLO ---
        results = yolo_model(frame)
        detections = []
        if results and hasattr(results[0], 'boxes'):
            for box in results[0].boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                confidence = float(box.conf)
                class_id = int(box.cls)
                class_name = yolo_model.names[class_id]
                if class_name == "person":
                    foot_point = (int((x1 + x2) / 2), y2)
                    # Filtrar detecciones fuera de la pista
                    if cv2.pointPolygonTest(court_polygon, foot_point, False) < 0:
                        continue
                    color = (0, 255, 0)
                    detections.append(foot_point)
                else:
                    continue
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                label = f"{class_name} {confidence:.2f}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                cv2.circle(annotated_frame, foot_point, 3, (0, 255, 0), -1)

        # --- Tracking de jugadores ---
        new_tracked = {}
        assigned = set()
        for pid, last_pos in tracked_players.items():
            best_dist = float("inf")
            best_idx = None
            if last_pos is not None:
                for j, det in enumerate(detections):
                    if j in assigned:
                        continue
                    d = sqrt((det[0] - last_pos[0])**2 + (det[1] - last_pos[1])**2)
                    if d < best_dist:
                        best_dist = d
                        best_idx = j
                if best_idx is not None and best_dist < tracking_threshold:
                    new_tracked[pid] = detections[best_idx]
                    assigned.add(best_idx)
                else:
                    new_tracked[pid] = last_pos
            else:
                new_tracked[pid] = None
        for j, det in enumerate(detections):
            if j in assigned:
                continue
            for pid in tracked_players:
                if new_tracked[pid] is None:
                    new_tracked[pid] = det
                    assigned.add(j)
                    break
        tracked_players = new_tracked

        # --- Marcar la posición de la bola ---
        ball_pos = ball_track[i] if i < len(ball_track) else (None, None)
        if ball_pos[0] is not None:
            scaled_ball = (int(ball_pos[0] * scale_x), int(ball_pos[1] * scale_y))
            cv2.circle(annotated_frame, scaled_ball, 5, (0, 0, 255), -1)
        else:
            scaled_ball = None

        # --- Guardar datos en JSON ---
        frame_data = {"frame": i+1, "players": {}, "ball": {}}
        for pid in sorted(tracked_players.keys()):
            pos = tracked_players[pid]
            if pos is None:
                frame_data["players"][str(pid)] = {"x": -1, "y": -1}
            else:
                frame_data["players"][str(pid)] = {"x": pos[0], "y": pos[1]}
        if scaled_ball is None:
            frame_data["ball"] = {"x": -1, "y": -1}
        else:
            frame_data["ball"] = {"x": scaled_ball[0], "y": scaled_ball[1]}
        results_json["frames"].append(frame_data)

        out.write(annotated_frame)
        cv2.imshow("Detección de jugadores y bola", annotated_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    out.release()
    cv2.destroyAllWindows()
    return results_json