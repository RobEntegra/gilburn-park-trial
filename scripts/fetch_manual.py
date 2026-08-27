#!/usr/bin/env python3
"""Pull the manual trial logs from the Apps Script summary endpoint and merge them into
data/latest.json, alongside whatever fetch_weather.py already wrote.

The endpoint URL comes from the environment, never from the repo:
  SHEET_SUMMARY_URL   the Apps Script /exec URL, without the query string

Anyone holding that URL can read the trial logs, so it lives in GitHub Secrets.

A stream is only marked "live" once it actually holds a record. Showing "live" next to a
row of zeros would tell a visitor the trial is running when it is not.
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

AEST = timezone(timedelta(hours=10))
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "latest.json")


def fetch(url):
    sep = "&" if "?" in url else "?"
    req = urllib.request.Request(url + sep + "action=summary",
                                headers={"User-Agent": "gilburn-park-trial/1.0"})
    # Apps Script answers with a 302 to script.googleusercontent.com; urlopen follows it.
    with urllib.request.urlopen(req, timeout=45) as resp:
        body = resp.read().decode("utf-8", "replace")
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        head = body.strip()[:200].replace("\n", " ")
        # Never fail the job over this. A weather-only update beats no update.
        print("Endpoint did not return JSON. Check the deployment is set to "
              '"Who has access: Anyone". First 200 characters: ' + head)
        return None


def main():
    url = os.environ.get("SHEET_SUMMARY_URL", "").strip()
    if not url:
        print("SHEET_SUMMARY_URL not set, leaving manual data untouched.")
        return

    try:
        payload = fetch(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        # A weather-only update is better than no update. Do not fail the whole job.
        print(f"Could not reach the sheet ({e}). Leaving previous manual data in place.")
        return

    if payload is None:
        return

    if not payload.get("ok"):
        print("Sheet reported an error: " + str(payload.get("error")))
        return

    with open(OUT) as f:
        data = json.load(f)

    counts = payload.get("entry_count") or {}
    daily  = int(counts.get("daily") or 0)
    cleans = int(counts.get("cleans") or 0)
    devs   = int(counts.get("deviations") or 0)
    mob    = int(counts.get("mob") or 0)

    streams = data.setdefault("streams", {})
    streams["feed"]    = "live" if daily else "awaiting"
    streams["clean"]   = "live" if cleans else "awaiting"
    streams["log"]     = "live" if (devs or daily) else "awaiting"
    streams["quality"] = "live" if _has_tds(payload) else streams.get("quality", "awaiting")

    payload.pop("ok", None)
    data["manual"] = payload
    data["manual"]["synced_utc"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    data["manual"]["synced_local"] = datetime.now(AEST).strftime("%d %b %Y, %H:%M AEST")

    with open(OUT, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")

    print(f"manual data merged: {daily} daily, {cleans} cleans, {devs} deviations, {mob} mob")


def _has_tds(payload):
    fw = payload.get("field_water") or {}
    last = fw.get("last") or {}
    return last.get("a_tds_ppm") is not None or last.get("b_tds_ppm") is not None


if __name__ == "__main__":
    main()
