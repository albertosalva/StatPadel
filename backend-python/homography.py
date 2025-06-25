# homgraphy.py
import cv2
import numpy as np
import json


def order_points(pts):
    """
    Ordena los puntos de una lista de coordenadas 2D en el orden:
    [top_left, top_right, bottom_right, bottom_left]
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
    Transforma un punto 2D usando una matriz de homografía.
    pt: Tupla (x, y) del punto a transformar.
    H: Matriz de homografía (3x3).
    Devuelve una tupla (x', y') del punto transformado.
    """
    p = np.array([pt[0], pt[1], 1.0], dtype="float32").reshape(3, 1)
    p_trans = H.dot(p)
    # Dividir para convertir de coordenadas homogéneas a cartesianas
    p_trans /= p_trans[2]
    return (p_trans[0, 0], p_trans[1, 0])


def transform_json_homography(input_data, court_width=10, court_length=20):
    """
    Transforma un JSON de frames con posiciones de jugadores y bola
    a un sistema de coordenadas real de la pista de pádel.
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
    Renombra los jugadores en un JSON de frames según su posición en el primer frame.
    Asigna etiquetas: top_left, top_right, bottom_left, bottom_right.
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


