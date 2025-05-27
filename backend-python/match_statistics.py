import numpy as np
import pandas as pd
from influxdb_client import InfluxDBClient

def compute_match_statistics(
    match_id: str,
    influx_url: str,
    influx_token: str,
    influx_org: str,
    influx_bucket: str,
    time_range: str = "-1h",
    max_player_speed: float = 12.0,
    max_ball_speed: float = 60.0
):
    client = InfluxDBClient(url=influx_url, token=influx_token, org=influx_org)
    query_api = client.query_api()

    flux_query = f'''
    from(bucket: "{influx_bucket}")
      |> range(start: {time_range})
      |> filter(fn: (r) =>
           r._measurement == "partidos" and
           r.partido_id == "{match_id}" and
           (r.entity == "player" or r.entity == "ball") and
           (r._field == "x" or r._field == "y")
      )
      |> pivot(
          rowKey: ["_time", "entity"],
          columnKey: ["_field"],
          valueColumn: "_value"
      )
      |> keep(columns: ["_time", "entity", "player_id", "x", "y"])
      |> sort(columns: ["_time"])
    '''

    dfs = query_api.query_data_frame(flux_query)
    client.close()

    if isinstance(dfs, list):
        df = pd.concat(dfs, ignore_index=True)
    else:
        df = dfs

    if df.empty:
        raise ValueError("No se encontraron datos para match_id=" + match_id)

    df = df.rename(columns={"_time": "time"})
    if "player_id" not in df.columns:
        df["player_id"] = None
    df = df.dropna(subset=["x", "y"]).sort_values("time")

    t0 = df["time"].min()
    t1 = df["time"].max()
    duration_s = (t1 - t0) / np.timedelta64(1, "s")

    stats = {
        "match_id": match_id,
        "start_time": str(t0),
        "end_time": str(t1),
        "duration_s": float(duration_s),
        "players": {},
        "ball": {}
    }

    def trajectory_stats(times, xs, ys, max_speed=None):
        dx = np.diff(xs)
        dy = np.diff(ys)
        dt = np.diff(times) / np.timedelta64(1, "s")

        dist = np.hypot(dx, dy)
        speeds = dist / dt

        # Filtrar picos de velocidad
        mask = (dt > 0) & (speeds < max_speed) if max_speed is not None else (dt > 0)
        dist = dist[mask]
        dt = dt[mask]
        speeds = speeds[mask]

        total_dist = dist.sum()
        avg_speed = total_dist / dt.sum() if dt.sum() > 0 else 0.0
        max_speed_val = speeds.max() if speeds.size > 0 else 0.0

        return {
            "total_distance": float(total_dist),
            "average_speed": float(avg_speed),
            "max_speed": float(max_speed_val),
            "n_points": len(xs)
        }

    players_df = df[df["entity"] == "player"]
    for pid, group in players_df.groupby("player_id"):
        g = group.sort_values("time")
        times = g["time"].dt.tz_localize(None).to_numpy()
        xs = g["x"].to_numpy()
        ys = g["y"].to_numpy()
        stats["players"][str(pid)] = trajectory_stats(times, xs, ys, max_speed=max_player_speed)

    ball_df = df[df["entity"] == "ball"]
    ball_df = ball_df[(ball_df["x"] != -1) & (ball_df["y"] != -1)]
    if not ball_df.empty:
        g = ball_df.sort_values("time")
        times = g["time"].dt.tz_localize(None).to_numpy()
        xs = g["x"].to_numpy()
        ys = g["y"].to_numpy()
        stats["ball"] = trajectory_stats(times, xs, ys, max_speed=max_ball_speed)
    else:
        stats["ball"] = {
            "total_distance": 0.0,
            "average_speed": 0.0,
            "max_speed": 0.0,
            "n_points": 0
        }

    return stats