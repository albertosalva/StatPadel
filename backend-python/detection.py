# detection.py

# Importar librerias
import cv2
import numpy as np
import torch
import sys
import os
from math import sqrt
from ultralytics import YOLO
import gc

#from server import wait_for_corners

# Agregar la carpeta de TrackNet al path para poder importar los modulos
tracnet_dir = os.path.join("external", "TrackNet")
if tracnet_dir not in sys.path:
    sys.path.append(tracnet_dir)

from model import BallTrackerNet
from infer_on_video import infer_model, remove_outliers, split_track, interpolation, detectar_botes_en_track


# Funcion para analizar el seguimiento de la bola en varios chunks de frames
def read_video_streaming(path_video, chunk_size=450):
    """
    Lee el video en bloques (chunks) consecutivos, superponiendo los últimos 2 frames
    del chunk anterior para no perder información en inferencias por ventanas temporales.

    Args:
        path_video (str): Ruta al video.
        chunk_size (int): Número de frames por bloque.

    Yields:
        List[np.ndarray]: Lista de frames del bloque.
        int: Índice inicial global del bloque en el video.
    """
    cap = cv2.VideoCapture(path_video)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    buffer = []
    last_two_frames = []
    frame_index = 0
    chunk_number = 1

    print(f"[DEBUG] FPS del video: {fps}")
    print(f"[DEBUG] Total de frames en el video: {total_frames}")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        buffer.append(frame)
        frame_index += 1

        if len(buffer) == chunk_size:
            if last_two_frames:
                yield last_two_frames + buffer, frame_index - chunk_size - 2
            else:
                yield buffer, 0
            print(f"[DEBUG] Enviado chunk {chunk_number} con {len(buffer)} frames + {len(last_two_frames)} de solape.")
            chunk_number += 1
            last_two_frames = buffer[-2:]
            buffer = []

    # Procesar último bloque si queda
    if buffer:
        if last_two_frames:
            yield last_two_frames + buffer, frame_index - len(buffer) - 2
        else:
            yield buffer, frame_index - len(buffer)
        print(f"[DEBUG] Enviado último chunk con {len(buffer)} frames + {len(last_two_frames)} de solape.")

    cap.release()


def video_analyzer(video_path, court_polygon, batch_size=8):
    """
    Analiza un video en streaming y devuelve un JSON con las posiciones de jugadores y bola.
    Parámetros:
      - video_path: ruta al vídeo de entrada
      - court_polygon: np.array con las esquinas de la pista
      - batch_size: Nº de frames para procesar en cada batch de YOLO
    """

    # Carga el modelo YOLO y el modelo de seguimiento de bola
    yolo_model = YOLO(os.path.join("external", "models", "yolo11x.pt"))
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    ball_model = BallTrackerNet().to(device)
    bm_path = os.path.join("external", "models", "model_best.pt")
    ball_model.load_state_dict(torch.load(bm_path, map_location=device, weights_only=True))
    ball_model.eval()

    # Iniamos el analisis de la bola
    print("[INFO] Iniciando análisis por bloques...")
    ball_track = []
    generator = read_video_streaming(video_path, 500)
    for block_id, (chunk_frames, start_idx) in enumerate(generator, 1):
        print(f"[DEBUG] Procesando bloque {block_id} con {len(chunk_frames)} frames (desde el frame {start_idx})...")

        ball_track_chunk, dists_chunk = infer_model(chunk_frames, ball_model, device)
        ball_track_chunk = remove_outliers(ball_track_chunk, dists_chunk)

        # Saltamos los 2 primeros
        if block_id == 1:
            final_track = ball_track_chunk
        else:
            final_track = ball_track_chunk[2:]

        ball_track.extend(final_track)

        # Liberar memoria
        del chunk_frames, final_track, ball_track_chunk, dists_chunk
        gc.collect()

    # Interpolación de la bola y detección de botes
    print("[INFO] Aplicando interpolación final...")
    subtracks = split_track(ball_track)
    for r in subtracks:
        st = ball_track[r[0]:r[1]]
        st = interpolation(st)
        ball_track[r[0]:r[1]] = st

    ball_track = detectar_botes_en_track(ball_track)

    # Preparar deteccion de jugadores
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))

    # Factores de escala para las coordenadas de la bola
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    scale_x = frame_w / 640
    scale_y = frame_h / 360

    #Prepracion de estructuras de datos
    tracked_players = {1: None, 2: None, 3: None, 4: None}
    tracking_threshold = 50
    court_corners = court_polygon.tolist()
    results_json = {"fps": fps,"court_corners": court_corners, "frames": []}
    idx_global = 0
    batch_frames = []

    court_polygon = np.array(court_polygon, dtype=np.float32)
    if court_polygon.ndim == 2:
        court_polygon = court_polygon.reshape((-1, 1, 2))

    # Función para procesar un batch de frames
    def process_batch(frames_batch):
        nonlocal tracked_players, idx_global, results_json
        # Inferencia batch de YOLO
        yolo_results = yolo_model(frames_batch, device=device)
        print(f"[DEBUG] Procesando batch de {len(frames_batch)} frames (indices {idx_global} – {idx_global+len(frames_batch)-1})")
        
        # Detectar si los jugadores están en la pista
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

            # Trackear a los jugadores por cercania con las ultimas detecciones
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

            # Asignar detecciones sobrantes
            for j,d in enumerate(dets):
                if j in assigned:
                    continue
                for pid in tracked_players:
                    if new_tr[pid] is None:
                        new_tr[pid] = d
                        assigned.add(j)
                        break
            tracked_players = new_tr

            # Escalar bola
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

            # Almacenar los datos del frame
            frame_data = {"frame": idx_global+1, "players": {}, "ball": {}}
            for pid in sorted(tracked_players):
                p = tracked_players[pid]
                frame_data["players"][str(pid)] = {"x": p[0], "y": p[1]} if p else {"x": -1, "y": -1}
            frame_data["ball"] = ball_xy

            results_json["frames"].append(frame_data)
            idx_global += 1

        frames_batch.clear()  

    # Prrocesar el video en batches
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        batch_frames.append(frame)
        if len(batch_frames) >= batch_size:
            process_batch(batch_frames)
    # Procesar el último batch si hay frames restantes
    if batch_frames:
        process_batch(batch_frames)

    cap.release()

    #print(f"[DEBUG] Procesamiento finalizado. Total frames procesados: {len(results_json['frames'])} y el resultado del JSON es {results_json}")
    return results_json
    