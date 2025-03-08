# exporter.py

# Importar librerias
import json

def export_to_json(results, filename):
    """
    Recibe la estructura de resultados y la guarda en un archivo JSON con el nombre especificado.
    """
    with open(filename, "w") as file:
        json.dump(results, file, indent=2)
    print(f"Resultados exportados a {filename}")