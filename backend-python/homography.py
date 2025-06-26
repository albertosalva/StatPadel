# homgraphy.py

"""
Módulo para aplicar homografía a detecciones de vídeo y renombrar jugadores
según su posición espacial en la pista.
"""

import cv2
import numpy as np
import json


def order_points(pts):
    """
    Ordena un conjunto de cuatro puntos 2D en el orden:
    [top_left, top_right, bottom_right, bottom_left].

    Args:
        pts (List[Tuple[float, float]]): Lista de cuatro pares (x, y).

    Returns:
        np.ndarray: Array de forma (4, 2) con los puntos ordenados como
                    [[top_left], [top_right], [bottom_right], [bottom_left]].

    Raises:
        ValueError: Si `pts` no contiene exactamente cuatro puntos.
    """
    pts = np.array(pts, dtype="float32")
    s = pts.sum(axis=1)
    top_left = pts[np.argmin(s)]
    bottom_right = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    top_right = pts[np.argmin(diff)]
    bottom_left = pts[np.argmax(diff)]
    return np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")


def transform_point(pt, H):
    """
    Aplica una matriz de homografía a un punto 2D.

    Args:
        pt (Tuple[float, float]): Punto (x, y) en coordenadas de imagen.
        H (np.ndarray): Matriz de homografía de forma (3, 3).

    Returns:
        Tuple[float, float]: Punto transformado (x', y') en coordenadas destino.

    Raises:
        ValueError: Si `H` no tiene forma (3, 3).
    """
    p = np.array([pt[0], pt[1], 1.0], dtype="float32").reshape(3, 1)
    p_trans = H.dot(p)
    # Dividir para convertir de coordenadas homogéneas a cartesianas
    p_trans /= p_trans[2]
    return (p_trans[0, 0], p_trans[1, 0])


def transform_json_homography(input_data, court_width=10, court_length=20):
    """
    Aplica homografía a un JSON de detecciones, convirtiendo coordenadas de imagen
    a coordenadas reales de la pista de pádel.

    Args:
        input_data (str | dict): Ruta a un fichero JSON o diccionario con:
            - 'court_corners': lista de cuatro pares [x, y] en imagen.
            - 'frames': lista de frames con 'players' y 'ball'.
        court_width (float): Ancho real de la pista.
        court_length (float): Largo real de la pista.

    Returns:
        dict: Nuevo diccionario con:
            - 'fps': fotogramas por segundo (o -1 si no está en el input).
            - 'court_corners_trans': esquinas en coordenadas reales.
            - 'frames': lista de frames con posiciones transformadas.

    Raises:
        FileNotFoundError: Si `input_data` es ruta y no existe el fichero.
        KeyError: Si falta 'court_corners' o 'frames' en los datos.
    """

    # Cargar el JSON de entrada
    if isinstance(input_data, str):
        with open(input_data, "r") as f:
            data = json.load(f)
    else:
        data = input_data

    # Verifcar esquinas de la pista
    if "court_corners" not in data:
        print("Error: no se encontró 'court_corners' en el JSON.")
        return
    # Convertir las esquinas de la pista a un array de numpy
    court_corners = np.array(data["court_corners"], dtype="float32")

    # Definir puntos origen (imagen) y destino (sistema real)
    src_points = order_points(court_corners)
    dst_points = np.array([
        [0, 0],
        [court_width, 0],
        [court_width, court_length],
        [0, court_length]
    ], dtype="float32")

    # Calcular la homografía
    H, status = cv2.findHomography(src_points, dst_points)
    #print("Matriz de homografía:", H)

    # Construir el nuevo JSON con coordenadas transformadas
    new_data = {
        "fps": data.get("fps", -1),
        # Almacena las esquinas en el nuevo sistema (0,0)-(court_width, court_length)
        "court_corners_trans": [
            [0, 0],
            [court_width, 0],
            [court_width, court_length],
            [0, court_length]
        ],
        "frames": []
    }

    # Transformar cada frame
    for frame in data["frames"]:
        new_frame = {
            "players": {},
            "ball": {}
        }
        # Transformar jugadores
        for pid, pos in frame["players"].items():
            x, y = pos["x"], pos["y"]
            if x == -1 or y == -1:
                new_frame["players"][pid] = {"x": -1, "y": -1}
            else:
                x_t, y_t = transform_point((x, y), H)
                new_frame["players"][pid] = {"x": x_t, "y": y_t}

        # Transformar bola
        ball_x, ball_y = frame["ball"]["x"], frame["ball"]["y"]
        bote = frame["ball"].get("bote", 0)
        if ball_x == -1 or ball_y == -1:
            new_frame["ball"] = {"x": -1, "y": -1, "bote": -1}
        else:
            bx_t, by_t = transform_point((ball_x, ball_y), H)
            new_frame["ball"] = {"x": bx_t, "y": by_t, "bote": bote}

        new_data["frames"].append(new_frame)

    print("[transform_json_homography] Transformación completa.")
    return new_data


def rename_players_by_position(input_data):
    """
    Renombra los IDs de jugadores en un JSON según su posición espacial en el primer frame válido.

    Args:
        input_data (str | dict): Ruta a un fichero JSON o diccionario con:
            - 'frames': lista de frames con 'players'.

    Returns:
        dict: Nuevo diccionario con:
            - 'fps', 'court_corners_trans' (copiados del input).
            - 'frames': lista de frames con claves de jugadores renombradas a
                        'top_left', 'top_right', 'bottom_left', 'bottom_right'.

    Raises:
        FileNotFoundError: Si `input_data` es ruta y no existe el fichero.
        KeyError: Si falta 'frames' en los datos.
        ValueError: Si no se encuentra ningún frame con cuatro jugadores válidos.
    """
    # Cargar el JSON de entrada
    if isinstance(input_data, str):
        with open(input_data, "r") as f:
            data = json.load(f)
    else:
        data = input_data

    # Extraer los frames
    frames = data["frames"]

    # Buscar el primer frame con 4 jugadores válidos
    for frame in frames:
        valid_players = {pid: p for pid, p in frame["players"].items() if p["x"] != -1 and p["y"] != -1}
        if len(valid_players) == 4:
            break
    else:
        raise ValueError("No se encontró ningún frame con 4 jugadores válidos.")

    # Ordenar los jugadores por su posición en el primer frame
    sorted_vertical = sorted(valid_players.items(), key=lambda item: item[1]["y"])
    top_players = sorted(sorted_vertical[:2], key=lambda item: item[1]["x"])
    bottom_players = sorted(sorted_vertical[2:], key=lambda item: item[1]["x"])

    # Asignar etiquetas
    player_mapping = {
        top_players[0][0]: "top_left",
        top_players[1][0]: "top_right",
        bottom_players[0][0]: "bottom_left",
        bottom_players[1][0]: "bottom_right",
    }

    # Construir nuevo JSON con los nuevos nombres
    new_data = {
        "fps": data.get("fps", -1),
        "court_corners_trans": data.get("court_corners_trans", []),
        "frames": []
    }

    # Renombrar jugadores en cada frame
    for frame in frames:
        new_frame = {
            "players": {},
            "ball": frame["ball"]
        }
        for pid, pos in frame["players"].items():
            label = player_mapping.get(pid)
            if label:
                new_frame["players"][label] = pos
        new_data["frames"].append(new_frame)

    print("[rename_players_by_position] Jugadores renombrados según su posición.")
    return new_data


