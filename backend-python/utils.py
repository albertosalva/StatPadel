# utils.py

"""
Módulo de utilidades para transformación de coordenadas entre la interfaz de usuario
y el primer fotograma de un vídeo.
"""

import cv2
import numpy as np

def ui_to_frame_corners(video_path: str, ui_corners: list[tuple[float, float]], display_width: float, display_height: float) -> np.ndarray:
    """
    Transforma una lista de esquinas definidas en coordenadas de la vista UI a las coordenadas correspondientes en el primer fotograma del vídeo.

    Args:
        video_path (str): Ruta al fichero de vídeo.
        ui_corners (List[Tuple[float, float]]): Lista de 4 tuplas (x_ui, y_ui) en coordenadas de la imagen mostrada (UI).
        display_width (float): Ancho en píxels de la imagen mostrada en UI.
        display_height (float): Alto en píxels de la imagen mostrada en UI.

    Returns:
        np.ndarray: Array de forma (4, 2) con las mismas 4 esquinas escaladas a coordenadas del primer fotograma del vídeo (dtype float32).

    Raises:
        RuntimeError: Si no se puede leer el primer fotograma del vídeo.
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