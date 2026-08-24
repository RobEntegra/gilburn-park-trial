#!/usr/bin/env python3
"""Pull the current reading from the Ecowitt API, convert to metric, write data/latest.json.

Credentials come from the environment, never from the repo:
  ECOWITT_APPLICATION_KEY, ECOWITT_API_KEY, ECOWITT_MAC
Set these as GitHub Actions secrets. They are never written into the output file.
"""
import json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

API = "https://api.ecowitt.net/api/v3/device/real_time"
AEST = timezone(timedelta(hours=10))          # Australia/Sydney standard time
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "latest.json")

IN_TO_MM   = 25.4
MPH_TO_KMH = 1.609344
INHG_TO_HPA = 33.863887
INHG_TO_KPA = 3.3863887

COMPASS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]


def need(name):
    v = os.environ.get(name)
    if not v:
        sys.exit(f"missing required environment variable {name}")
    return v


def num(block, key):
    """Return the float value at block[key]['value'], or None if absent."""
    try:
        return float(block[key]["value"])
    except (KeyError, TypeError, ValueError):
        return None


def r1(v):
    return None if v is None else round(v, 1)


def thi(temp_c, rh):
    """Temperature humidity index. NRC form, dry bulb in Celsius, RH as a percentage."""
    if temp_c is None or rh is None:
        return None
    return round((1.8 * temp_c + 32) - ((0.55 - 0.0055 * rh) * (1.8 * temp_c - 26)), 1)


def thi_band(v):
    if v is None:
        return {"label": "Unknown", "level": "unknown"}
    if v < 72:
        return {"label": "Normal", "level": "normal"}
    if v < 80:
        return {"label": "Alert", "level": "alert"}
    if v < 90:
        return {"label": "Danger", "level": "danger"}
    return {"label": "Emergency", "level": "emergency"}


def main():
    params = {
        "application_key": need("ECOWITT_APPLICATION_KEY"),
        "api_key": need("ECOWITT_API_KEY"),
        "mac": need("ECOWITT_MAC"),
        "call_back": "all",
        "temp_unitid": "1",           # Celsius
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as resp:
        payload = json.load(resp)

    if payload.get("code") != 0:
        sys.exit(f"Ecowitt API returned code {payload.get('code')}: {payload.get('msg')}")

    d = payload.get("data") or {}
    outdoor  = d.get("outdoor", {})
    indoor   = d.get("indoor", {})
    wind     = d.get("wind", {})
    rain     = d.get("rainfall", {})
    press    = d.get("pressure", {})
    battery  = d.get("battery", {})
    solar    = d.get("solar_and_uvi", {})

    temp = num(outdoor, "temperature")
    rh   = num(outdoor, "humidity")
    ws   = num(wind, "wind_speed")
    wg   = num(wind, "wind_gust")
    wd   = num(wind, "wind_direction")
    vpd  = num(outdoor, "vpd")

    reading_ts = None
    try:
        reading_ts = int(outdoor["temperature"]["time"])
    except (KeyError, TypeError, ValueError):
        reading_ts = int(payload.get("time") or 0) or None

    reading = datetime.fromtimestamp(reading_ts, AEST) if reading_ts else datetime.now(AEST)
    t = thi(temp, rh)

    out = {
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "reading_local": reading.strftime("%d %b %Y, %H:%M AEST"),
        "reading_epoch": reading_ts,
        "units": "metric",
        "source": "Ecowitt WN1980C-WIFI7750 via Ecowitt API v3",
        "weather": {
            "outdoor_temp_c":      r1(temp),
            "apparent_temp_c":     r1(num(outdoor, "app_temp")),
            "feels_like_c":        r1(num(outdoor, "feels_like")),
            "dew_point_c":         r1(num(outdoor, "dew_point")),
            "outdoor_humidity_pct": r1(rh),
            "indoor_temp_c":       r1(num(indoor, "temperature")),
            "indoor_humidity_pct": r1(num(indoor, "humidity")),
            "wind_speed_kmh":      r1(None if ws is None else ws * MPH_TO_KMH),
            "wind_gust_kmh":       r1(None if wg is None else wg * MPH_TO_KMH),
            "wind_direction_deg":  None if wd is None else int(wd),
            "wind_direction_pt":   None if wd is None else COMPASS[int((wd % 360) / 22.5 + 0.5) % 16],
            "pressure_hpa":        r1(None if num(press, "relative") is None else num(press, "relative") * INHG_TO_HPA),
            "vpd_kpa":             None if vpd is None else round(vpd * INHG_TO_KPA, 2),
            "rain_rate_mmhr":      r1(None if num(rain, "rain_rate") is None else num(rain, "rain_rate") * IN_TO_MM),
            "rain_today_mm":       r1(None if num(rain, "daily") is None else num(rain, "daily") * IN_TO_MM),
            "rain_week_mm":        r1(None if num(rain, "weekly") is None else num(rain, "weekly") * IN_TO_MM),
            "solar_wm2":           r1(num(solar, "solar")),
            "console_battery_v":   num(battery, "console"),
        },
        "thi": {"value": t, **thi_band(t)},
        "streams": {
            "weather":   "live",
            "water":     "awaiting",
            "weight":    "awaiting",
            "quality":   "awaiting",
            "feed":      "awaiting",
            "clean":     "awaiting",
            "log":       "awaiting",
            "tps50":     "awaiting",
            "cameras":   "awaiting",
        },
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, indent=2, sort_keys=True)
        f.write("\n")
    print(f"wrote {OUT}: {out['weather']['outdoor_temp_c']} C, "
          f"{out['weather']['outdoor_humidity_pct']}% RH, THI {t}, at {out['reading_local']}")


if __name__ == "__main__":
    main()
