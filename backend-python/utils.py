# utils.py
import cv2
import numpy as np

def ui_to_frame_corners(video_path: str, ui_corners: list[tuple[float, float]], display_width: float, display_height: float) -> np.ndarray:
    """
    Toma:
      - video_path: ruta al vídeo
      - ui_corners: lista de 4 pares (x_ui, y_ui) en coordenadas de la imagen mostrada
      - display_width, display_height: dimensiones de esa imagen en píxels
    Devuelve:
      - src_corners: np.array(4x2) con las mismas 4 esquinas escaladas
        a coordenadas del primer frame del vídeo.
    """
    # Leer sólo el primer frame
    cap = cv2.VideoCapture(video_path)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError("No se pudo leer el primer frame del vídeo.")

    # Obtener dimensiones del frame original
    orig_h, orig_w = frame.shape[:2]

    # Calcular factores de escala
    fx = orig_w / float(display_width)
    fy = orig_h / float(display_height)

    # Convertir las coordenadas UI a coordenadas del frame
    src = []
    for x_ui, y_ui in ui_corners:
        src.append([x_ui * fx, y_ui * fy])

    print(f"[ui_to_frame_corners] Esquinas UI: {ui_corners} → Esquinas Frame: {src}")
    return np.array(src, dtype=np.float32)