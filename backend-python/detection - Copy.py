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
    model = YOLO(yolo_model_path)

    # Cargar el modelo TrackNet
    ball_model = BallTrackerNet()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ball_model_path = os.path.join("external", "models", "model_best.pt")
    ball_model.load_state_dict(torch.load(ball_model_path, map_location=device, weights_only=True))
    ball_model = ball_model.to(device)
    ball_model.eval()

    # Abrir el video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: No se pudo abrir el video.")
        return None
    
    # Leer el primer frame
    ret, first_frame = cap.read()
    if not ret:
        print("Error: No se pudo leer el primer frame del video.")
        return None
    
    # Seleccionar las esquinas de la pista
    court_polygon = select_corners(first_frame)
    court_corners = court_polygon.tolist()

    # Obtenemos las dimensiones del video
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Definir el codec y el objeto VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, 30, (frame_width, frame_height))

    # Definir variables para el seguimiento de la pelota
    scale_x = frame_width / 640
    scale_y = frame_height / 360

    # Definir variables para el seguimiento de la bola
    frame_buffer = []
    ball_trace = []
    ball_pos = None  # Posicion de la bola en el frame actual
    trace_len = 5

    def run_tracknet(buffer):
        width, height = 640, 360
        img_preprev = cv2.resize(buffer[0], (width, height))
        img_prev    = cv2.resize(buffer[1], (width, height))
        img_curr    = cv2.resize(buffer[2], (width, height))
        imgs = np.concatenate((img_curr, img_prev, img_preprev), axis=2)
        imgs = imgs.astype(np.float32) / 255.0
        imgs = np.rollaxis(imgs, 2, 0)
        inp = np.expand_dims(imgs, axis=0)
        inp_tensor = torch.from_numpy(inp).float().to(device)
        out_tensor = ball_model(inp_tensor)
        output = out_tensor.argmax(dim=1).detach().cpu().numpy()
        x_pred, y_pred = postprocess(output)
        return (x_pred, y_pred)

    # Definir las variables de seguimiento de los jugadores
    tracked_players = {1: None, 2: None, 3: None, 4: None}
    tracking_threshold = 50
    results_json = {"court_corners": court_corners, "frames": []}
    frame_count = 0

    # Procesar cada frame del video
    while True:
        ret, frame = cap.read()
        if not ret: 
            break

        # Procesar el frame con YOLO
        frame_count += 1
        frame_buffer.append(frame)

        # Realizar el seguimiento de la bola
        if len(frame_buffer) > 3:
            frame_buffer.pop(0)

        if len(frame_buffer) == 3:
            ball_pos = run_tracknet(frame_buffer)
        else:
            ball_pos = None
        
        if ball_pos is not None and ball_pos[0] is not None:
            scaled_ball = (int(ball_pos[0] * scale_x), int(ball_pos[1] * scale_y))
        else:
            scaled_ball = None

        ball_trace.append(scaled_ball)
        if len(ball_trace) > trace_len:
            ball_trace = ball_trace[-trace_len:]

        annotated_frame = frame.copy()

        # Deteccion de jugadores con YOLO
        results = model(frame)
        detections = []

        if results and hasattr(results[0], 'boxes'):
            for box in results[0].boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                confidence = float(box.conf)
                class_id = int(box.cls)
                class_name = model.names[class_id]
                if class_name == "person":
                    foot_point = (int((x1 + x2) / 2), y2)
                    if cv2.pointPolygonTest(court_polygon, foot_point, False) < 0:
                        continue
                    color = (0, 255, 0)
                    detections.append(foot_point)
                else:
                    continue
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                label = f"{class_name} {confidence:.2f}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                cv2.circle(annotated_frame, foot_point, 3, (0, 255, 0), -1)

        # Tracking de jugadores
        new_tracked = {}
        assigned = set()
        for pid, last_pos in tracked_players.items():
            best_dist = float("inf")
            best_idx = None
            if last_pos is not None:
                for i, det in enumerate(detections):
                    if i in assigned:
                        continue
                    d = sqrt((det[0] - last_pos[0])**2 + (det[1] - last_pos[1])**2)
                    if d < best_dist:
                        best_dist = d
                        best_idx = i
                if best_idx is not None and best_dist < tracking_threshold:
                    new_tracked[pid] = detections[best_idx]
                    assigned.add(best_idx)
                else:
                    new_tracked[pid] = last_pos
            else:
                new_tracked[pid] = None

        for i, det in enumerate(detections):
            if i in assigned:
                continue
            for pid in tracked_players:
                if new_tracked[pid] is None:
                    new_tracked[pid] = det
                    assigned.add(i)
                    break
        tracked_players = new_tracked

        # Dibujo del rastro de la bola
        for t in range(1, len(ball_trace) + 1):
            pt = ball_trace[-t]
            if pt is not None:
                thickness = max(10 - t, 1)
                cv2.circle(annotated_frame, pt, 3, (0, 0, 255), thickness)
        if scaled_ball is not None:
            cv2.circle(annotated_frame, scaled_ball, 5, (0, 0, 255), -1)

        # Guardar datos en la estructura JSON
        frame_data = {"frame": frame_count, "players": {}, "ball": {}}
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

        cv2.imshow("Detección YOLO y TrackNet", annotated_frame)
        out.write(annotated_frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    out.release()
    cv2.destroyAllWindows()

    return results_json
