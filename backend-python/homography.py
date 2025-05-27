# homgraphy.py

# Importar librerías
import cv2
import numpy as np
import json
import matplotlib.pyplot as plt
import os
import time
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from dotenv import load_dotenv



def transform_json_homography(input_data, output_json_filename, court_width=10, court_length=20):
    """
    Lee un JSON con 'court_corners' y 'frames' (posiciones de jugadores y bola en píxeles),
    calcula la homografía para transformarlos al sistema real de la pista (en metros),
    y genera un nuevo JSON con las coordenadas transformadas.
    """

    # 1. Si input_data es una cadena, la asumimos como ruta de archivo
    if isinstance(input_data, str):
        with open(input_data, "r") as f:
            data = json.load(f)
    else:
        data = input_data

    # Leer esquinas del campo
    if "court_corners" not in data:
        print("Error: no se encontró 'court_corners' en el JSON.")
        return

    court_corners = np.array(data["court_corners"], dtype="float32")

    # 2. Función auxiliar para reordenar esquinas
    def order_points(pts):
        pts = np.array(pts, dtype="float32")
        s = pts.sum(axis=1)
        top_left = pts[np.argmin(s)]
        bottom_right = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        top_right = pts[np.argmin(diff)]
        bottom_left = pts[np.argmax(diff)]
        return np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")

    # 3. Definir puntos origen (imagen) y destino (sistema real)
    src_points = order_points(court_corners)
    dst_points = np.array([
        [0, 0],
        [court_width, 0],
        [court_width, court_length],
        [0, court_length]
    ], dtype="float32")

    # 4. Calcular la homografía
    H, status = cv2.findHomography(src_points, dst_points)
    print("Matriz de homografía:", H)

    # 5. Función para transformar un punto según la homografía
    def transform_point(pt, H):
        p = np.array([pt[0], pt[1], 1.0], dtype="float32").reshape(3, 1)
        p_trans = H.dot(p)
        # Dividir para convertir de coordenadas homogéneas a cartesianas
        p_trans /= p_trans[2]
        return (p_trans[0, 0], p_trans[1, 0])

    # 6. Construir el nuevo JSON con coordenadas transformadas
    new_data = {
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
        if ball_x == -1 or ball_y == -1:
            new_frame["ball"] = {"x": -1, "y": -1}
        else:
            bx_t, by_t = transform_point((ball_x, ball_y), H)
            new_frame["ball"] = {"x": bx_t, "y": by_t}

        new_data["frames"].append(new_frame)

    # 7. Guardar el nuevo JSON con las coordenadas transformadas
    with open(output_json_filename, "w") as f:
        json.dump(new_data, f, indent=2)
    print(f"Coordenadas transformadas guardadas en: {output_json_filename}")

    return new_data


def plot_transformed_trajectories(transformed_json_filename, court_width=10, court_length=20):
    """
    Lee un JSON que ya tiene las coordenadas transformadas al sistema real
    (0,0)-(court_width,court_length) y dibuja la pista de pádel con las trayectorias.
    """

    # 1. Cargar el JSON ya transformado
    with open(transformed_json_filename, "r") as f:
        data = json.load(f)

    # Verificar si existen las esquinas transformadas
    if "court_corners_trans" not in data:
        print("Error: no se encontró 'court_corners_trans' en el JSON.")
        return

    # 2. Construir estructuras de trayectorias
    trajectories = {"players": {}, "ball": []}

    # Inicializar listas vacías para cada jugador
    for frame in data["frames"]:
        for pid in frame["players"].keys():
            if pid not in trajectories["players"]:
                trajectories["players"][pid] = []

    # Rellenar trayectorias
    for frame in data["frames"]:
        for pid, pos in frame["players"].items():
            x, y = pos["x"], pos["y"]
            if x == -1 or y == -1:
                trajectories["players"][pid].append(None)
            else:
                trajectories["players"][pid].append((x, y))

        bx, by = frame["ball"]["x"], frame["ball"]["y"]
        if bx == -1 or by == -1:
            trajectories["ball"].append(None)
        else:
            trajectories["ball"].append((bx, by))

    # 3. Dibujar la pista
    plt.figure(figsize=(12, 8))
    court_outline_x = [0, court_width, court_width, 0, 0]
    court_outline_y = [0, 0, court_length, court_length, 0]
    plt.plot(court_outline_x, court_outline_y, 'k-', linewidth=2)

    net_y = court_length / 2
    plt.plot([0, court_width], [net_y, net_y],
             color="black", linewidth=0.05*court_length, solid_capstyle='butt')

    service_line_lower = net_y - 6.95
    service_line_upper = net_y + 6.95
    plt.plot([0, court_width], [service_line_lower, service_line_lower],
             color="black", linewidth=0.05*court_length, solid_capstyle='butt')
    plt.plot([0, court_width], [service_line_upper, service_line_upper],
             color="black", linewidth=0.05*court_length, solid_capstyle='butt')

    central_line_lower_start = net_y
    central_line_lower_end = service_line_lower - 0.2
    plt.plot([court_width/2, court_width/2], [central_line_lower_start, central_line_lower_end],
             color="black", linewidth=0.05*court_length, solid_capstyle='butt')
    central_line_upper_start = net_y
    central_line_upper_end = service_line_upper + 0.2
    plt.plot([court_width/2, court_width/2], [central_line_upper_start, central_line_upper_end],
             color="black", linewidth=0.05*court_length, solid_capstyle='butt')

    # 4. Dibujar trayectorias de jugadores y bola
    player_colors = {
        "1": "red",
        "2": "green",
        "3": "blue",
        "4": "orange"
    }
    # Jugadores
    for pid, traj in trajectories["players"].items():
        pts = [pt for pt in traj if pt is not None]
        if len(pts) > 1:
            pts = np.array(pts)
            plt.plot(pts[:,0], pts[:,1], marker='o', linestyle='-',
                     color=player_colors.get(pid, "gray"), label=f"Jugador {pid}")
    # Bola (opcional)
    """
    ball_pts = [pt for pt in trajectories["ball"] if pt is not None]
    if len(ball_pts) > 1:
        ball_pts = np.array(ball_pts)
        plt.plot(ball_pts[:,0], ball_pts[:,1], marker='x', linestyle='--',
                 color="cyan", linewidth=2, label="Bola")
    """

    plt.title("Trayectorias sobre campo de pádel (vista aérea)")
    plt.xlabel("Ancho (m)")
    plt.ylabel("Largo (m)")
    plt.xlim(-0.5, court_width+0.5)
    plt.ylim(-0.5, court_length+0.5)
    plt.legend()
    plt.gca().invert_yaxis()      # Invertir el eje Y
    plt.gca().set_aspect('equal', adjustable='box')
    plt.show()


def plot_trajectories_on_padel_court(json_filename, court_width=10, court_length=20):
    """
    Lee el JSON con "court_corners" y "frames" que contienen las posiciones de jugadores y la bola,
    calcula la homografía para transformar las coordenadas al sistema de un campo de pádel (medidas en metros),
    y dibuja sobre ese campo las trayectorias.
    """
    with open(json_filename, "r") as f:
        data = json.load(f)

    # Leer esquinas del campo
    if "court_corners" not in data:
        print("Error: no se encontró 'court_corners' en el JSON.")
        return
    court_corners = np.array(data["court_corners"], dtype="float32")

    # Calcular homografía
    def order_points(pts):
        pts = np.array(pts, dtype="float32")
        s = pts.sum(axis=1)
        top_left = pts[np.argmin(s)]
        bottom_right = pts[np.argmax(s)]
        diff = np.diff(pts, axis=1)
        top_right = pts[np.argmin(diff)]
        bottom_left = pts[np.argmax(diff)]
        return np.array([top_left, top_right, bottom_right, bottom_left], dtype="float32")

    src_points = order_points(court_corners)
    dst_points = np.array([
        [0, 0],
        [court_width, 0],
        [court_width, court_length],
        [0, court_length]
    ], dtype="float32")

    H, status = cv2.findHomography(src_points, dst_points)
    print("Matriz de homografía:", H)

    def transform_point(pt, H):
        p = np.array([pt[0], pt[1], 1.0], dtype="float32").reshape(3, 1)
        p_trans = H.dot(p)
        p_trans /= p_trans[2]
        return (p_trans[0, 0], p_trans[1, 0])

    trajectories = {"players": {}, "ball": []}
    for frame in data["frames"]:
        for pid in frame["players"].keys():
            if pid not in trajectories["players"]:
                trajectories["players"][pid] = []

    for frame in data["frames"]:
        for pid, pos in frame["players"].items():
            x, y = pos["x"], pos["y"]
            if x == -1 or y == -1:
                trajectories["players"][pid].append(None)
            else:
                trajectories["players"][pid].append(transform_point((x, y), H))
        ball = frame["ball"]
        if ball["x"] == -1 or ball["y"] == -1:
            trajectories["ball"].append(None)
        else:
            pt_trans = transform_point((ball["x"], ball["y"]), H)
            if 0 <= pt_trans[0] <= court_width and 0 <= pt_trans[1] <= court_length:
                trajectories["ball"].append(pt_trans)
            else:
                trajectories["ball"].append(None)

    plt.figure(figsize=(12, 8))
    court_outline_x = [0, court_width, court_width, 0, 0]
    court_outline_y = [0, 0, court_length, court_length, 0]
    plt.plot(court_outline_x, court_outline_y, 'k-', linewidth=2)

    net_y = court_length / 2
    plt.plot([0, court_width], [net_y, net_y], color="black", linewidth=0.05*court_length, solid_capstyle='butt')

    service_line_lower = net_y - 6.95
    service_line_upper = net_y + 6.95
    plt.plot([0, court_width], [service_line_lower, service_line_lower], color="black", linewidth=0.05*court_length, solid_capstyle='butt')
    plt.plot([0, court_width], [service_line_upper, service_line_upper], color="black", linewidth=0.05*court_length, solid_capstyle='butt')

    central_line_lower_start = net_y
    central_line_lower_end = service_line_lower - 0.2
    plt.plot([court_width/2, court_width/2], [central_line_lower_start, central_line_lower_end], color="black", linewidth=0.05*court_length, solid_capstyle='butt')
    central_line_upper_start = net_y
    central_line_upper_end = service_line_upper + 0.2
    plt.plot([court_width/2, court_width/2], [central_line_upper_start, central_line_upper_end], color="black", linewidth=0.05*court_length, solid_capstyle='butt')

    player_colors = {
        "1": "red",
        "2": "green",
        "3": "blue",
        "4": "orange"
    }
    for pid, traj in trajectories["players"].items():
        pts = [pt for pt in traj if pt is not None]
        if len(pts) > 1:
            pts = np.array(pts)
            plt.plot(pts[:,0], pts[:,1], marker='o', linestyle='-', color=player_colors.get(pid, "gray"), label=f"Jugador {pid}")

    plt.title("Trayectorias sobre campo de pádel (vista aérea)")
    plt.xlabel("Ancho (m)")
    plt.ylabel("Largo (m)")
    plt.xlim(-0.5, court_width+0.5)
    plt.ylim(-0.5, court_length+0.5)
    plt.legend()
    plt.gca().invert_yaxis()
    plt.gca().set_aspect('equal', adjustable='box')
    plt.show()
