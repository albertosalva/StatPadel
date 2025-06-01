"""
generate_requirements.py

Este script inspecciona las versiones de los paquetes listados y genera un requirements_locked.txt
con versiones exactas para replicar el entorno.
"""
from importlib.metadata import version, PackageNotFoundError

# Lista de dependencias a fijar
dependencies = [
    "fastapi",
    "uvicorn",
    "python-dotenv",
    "numpy",
    "opencv-python",
    "torch",
    "ultralytics",
    "requests",
    "matplotlib",
    "influxdb-client",
    "pandas",
    "Flask"
]

def main():
    lines = []
    for pkg in dependencies:
        try:
            ver = version(pkg)
            lines.append(f"{pkg}=={ver}")
        except PackageNotFoundError:
            print(f"Paquete no encontrado: {pkg}")
    # Escribe el archivo requirements_locked.txt
    with open("requirements_locked.txt", "w") as f:
        f.write("\n".join(lines))
    print("requirements_locked.txt generado con las versiones actuales:")
    print("\n".join(lines))

if __name__ == "__main__":
    main()