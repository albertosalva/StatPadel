# detection.py

# Importar librerias
import cv2
import numpy as np
import torch
import sys
import os
from math import sqrt
from ultralytics import YOLO
import time
import requests
import time
import gc

#from server import wait_for_corners

# Agregar la carpeta de TrackNet al path para poder importar los modulos
tracnet_dir = os.path.join("external", "TrackNet")
if tracnet_dir not in sys.path:
    sys.path.append(tracnet_dir)

from model import BallTrackerNet
from general import postprocess
from infer_on_video import read_video, infer_model, remove_outliers, split_track, interpolation, detectar_botes_en_track, read_video_streaming, save_serializable_track_line_by_line


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


def video_analyzer(video_path, output_path, court_polygon, batch_size=8):
    """
    Analiza un video en streaming y devuelve un JSON con las posiciones de jugadores y bola.
    Parámetros:
      - video_path: ruta al vídeo de entrada
      - output_path: ruta al vídeo anotado (no usado en esta versión)
      - court_polygon: np.array con las esquinas de la pista
      - batch_size: Nº de frames para procesar en cada batch de YOLO
    """

    # ── 1) Modelos ───────────────────────────────────────────────────────
    yolo_model = YOLO(os.path.join("external", "models", "yolo11x.pt"))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ball_model = BallTrackerNet().to(device)
    bm_path = os.path.join("external", "models", "model_best.pt")
    ball_model.load_state_dict(torch.load(bm_path, map_location=device, weights_only=True))
    ball_model.eval()

    # ── 2) Traza de bola (TrackNet) ─────────────────────────────────────
    """
    frames_all, fps = read_video(video_path)
    if not frames_all:
        raise RuntimeError(f"No se pudo leer el vídeo: {video_path}")
    ball_track, dists = infer_model(frames_all, ball_model, device)
    ball_track = remove_outliers(ball_track, dists)
    del frames_all  # liberamos memoria
    """
    print("[INFO] Iniciando análisis por bloques...")
    ball_track = []
    cap = cv2.VideoCapture(video_path)
    #cap.release()

    generator = read_video_streaming(video_path, 500)
    for block_id, (chunk_frames, start_idx) in enumerate(generator, 1):
        print(f"[DEBUG] Procesando bloque {block_id} con {len(chunk_frames)} frames (desde el frame {start_idx})...")

        ball_track_chunk, dists_chunk = infer_model(chunk_frames, ball_model, device)
        ball_track_chunk = remove_outliers(ball_track_chunk, dists_chunk)

        # Saltamos los 2 primeros que son None
        if block_id == 1:
            final_track = ball_track_chunk
        else:
            final_track = ball_track_chunk[2:]

        ball_track.extend(final_track)

        # Liberar memoria
        del chunk_frames, final_track, ball_track_chunk, dists_chunk
        gc.collect()

    print("[INFO] Aplicando interpolación final...")
    subtracks = split_track(ball_track)
    for r in subtracks:
        st = ball_track[r[0]:r[1]]
        st = interpolation(st)
        ball_track[r[0]:r[1]] = st

    ball_track = detectar_botes_en_track(ball_track)

    # ── 3) Preparar streaming ─────────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale_x = frame_w / 640
    scale_y = frame_h / 360

    tracked_players = {1: None, 2: None, 3: None, 4: None}
    tracking_threshold = 50
    court_corners = court_polygon.tolist()
    results_json = {"fps": fps,"court_corners": court_corners, "frames": []}
    idx_global = 0
    batch_frames = []

    annotated_frames = []

    # ── Helper: procesa un batch de cualquier tamaño ──────────────────────
    def process_batch(frames_batch):
        nonlocal tracked_players, idx_global, results_json
        # Inferencia batch de YOLO
        yolo_results = yolo_model(frames_batch, device=device)
        print(f"[DEBUG] Procesando batch de {len(frames_batch)} frames (indices {idx_global} – {idx_global+len(frames_batch)-1})")
        for i, res in enumerate(yolo_results):
            dets = []
            if hasattr(res, 'boxes'):
                for box in res.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    cls_id = int(box.cls)
                    if yolo_model.names[cls_id] != "person":
                        continue
                    foot = ((x1 + x2)//2, y2)
                    if cv2.pointPolygonTest(court_polygon, foot, False) < 0:
                        continue
                    dets.append(foot)

            # ─ Tracking simple nearest-neighbor ─
            new_tr = {}
            assigned = set()
            for pid, last in tracked_players.items():
                if last is not None:
                    # buscamos la detección más cercana
                    best = min(
                        ((j, sqrt((d[0]-last[0])**2 + (d[1]-last[1])**2)) 
                         for j,d in enumerate(dets) if j not in assigned),
                        key=lambda x: x[1], default=(None, None)
                    )
                    if best[0] is not None and best[1] < tracking_threshold:
                        new_tr[pid] = dets[best[0]]
                        assigned.add(best[0])
                    else:
                        new_tr[pid] = last
                else:
                    new_tr[pid] = None
            # asignar detecciones sobrantes
            for j,d in enumerate(dets):
                if j in assigned:
                    continue
                for pid in tracked_players:
                    if new_tr[pid] is None:
                        new_tr[pid] = d
                        assigned.add(j)
                        break
            tracked_players = new_tr

            # ─ Bola escalada ─
            #bt = ball_track[idx_global] if idx_global < len(ball_track) else (None, None)
            #if bt[0] is not None:
            #    ball_xy = (int(bt[0]*scale_x), int(bt[1]*scale_y))
            #else:
            #    ball_xy = None
            if idx_global < len(ball_track):
                ball = ball_track[idx_global]
                if ball["x"] is not None and ball["y"] is not None:
                    ball_xy = {
                        "x": int(ball["x"] * scale_x),
                        "y": int(ball["y"] * scale_y),
                        "bote": int(ball["bote"])
                    }
                else:
                    ball_xy = {"x": -1, "y": -1, "bote": 0}
            else:
                ball_xy = {"x": -1, "y": -1, "bote": 0}

            # ─ JSON por frame ─
            frame_data = {"frame": idx_global+1, "players": {}, "ball": {}}
            for pid in sorted(tracked_players):
                p = tracked_players[pid]
                frame_data["players"][str(pid)] = {"x": p[0], "y": p[1]} if p else {"x": -1, "y": -1}
            #if ball_xy:
                #frame_data["ball"] = {"x": ball_xy[0], "y": ball_xy[1]}
            #else:
            #    frame_data["ball"] = {"x": -1, "y": -1}
            frame_data["ball"] = ball_xy

            results_json["frames"].append(frame_data)
            #print(f"Datos añadidos al JSON: {frame_data}")
            idx_global += 1

        for j, frame in enumerate(frames_batch):
            # Obtener jugadores del frame correspondiente si quieres usar el historial (opcional)
            for pid in sorted(tracked_players):
                p = tracked_players[pid]
                if p is not None:
                    cv2.circle(frame, p, 5, (0, 255, 0), -1)
                    cv2.putText(frame, f'Player {pid}', (p[0]+10, p[1]), cv2.FONT_HERSHEY_SIMPLEX,
                                0.5, (0, 255, 0), 1, cv2.LINE_AA)
            annotated_frames.append(frame.copy())

        frames_batch.clear()  # vaciamos para el siguiente uso

    # ── 4) Lectura en streaming + batching ─────────────────────────────────
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        batch_frames.append(frame)
        if len(batch_frames) >= batch_size:
            process_batch(batch_frames)

    # ── Procesar los que queden al final ───────────────────────────────────
    if batch_frames:
        process_batch(batch_frames)


    #out = cv2.VideoWriter('output_with_tags.mp4', cv2.VideoWriter_fourcc(*'mp4v'),
    #                  fps, (frame_w, frame_h))  # Ajusta fps, width, height

    #for f in annotated_frames:
    #   out.write(f)
    
    #out.release()

    cap.release()

    #print(f"[DEBUG] Procesamiento finalizado. Total frames procesados: {len(results_json['frames'])} y el resultado del JSON es {results_json}")
    return results_json
    


def video_analyzer2(video_path, output_path, court_polygon):
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
    #court_polygon = select_corners(first_frame)
    #court_polygon = select_corners_remote()
    #print("Esquinas seleccionadas:", court_polygon)
    print("Esquinas de la pista:", court_polygon.tolist())
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
        # annotated_frame = frame.copy()

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
                # cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                # label = f"{class_name} {confidence:.2f}"
                # cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                # cv2.circle(annotated_frame, foot_point, 3, (0, 255, 0), -1)

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
            # cv2.circle(annotated_frame, scaled_ball, 5, (0, 0, 255), -1)
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

        # out.write(annotated_frame)
        # cv2.imshow("Detección de jugadores y bola", annotated_frame)
        # if cv2.waitKey(1) & 0xFF == ord('q'):
            # break

    # out.release()
    # cv2.destroyAllWindows()
    return results_json