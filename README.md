# Gilburn Park Feedlot Trial — public dashboard

Public dashboard for the Phase 1 trial of the TPS50 Croc Trough Pump at Gilburn Park,
Kerang, Victoria. 70 days, 400 head, two adjacent paddocks, one controlled variable.

Live at: `https://<your-github-username>.github.io/gilburn-park-trial/`

## How it works

The page is static. It fetches `data/latest.json` when it loads, so there are no
credentials in the page and nothing to keep running.

A GitHub Actions workflow (`.github/workflows/update-data.yml`) runs about every
15 minutes, calls the Ecowitt API, converts the readings to metric, writes
`data/latest.json` and commits it. GitHub Pages republishes automatically.

```
scripts/fetch_weather.py   pulls Ecowitt, converts to metric, writes data/latest.json
scripts/fetch_manual.py    pulls the trial Sheet, merges the manual logs into the same file
data/latest.json           the only file the page reads
index.html                 the dashboard
```

The Sheet holds what no device measures: feed deliveries, trough cleans, health events and
the deviation log. Those come from the data entry app at
`robentegra.github.io/daily-gilburn-data`, through Apps Script into the Sheet, and out again
through its `?action=summary` endpoint.

A stream only shows as **live** once it actually holds a record. A row of zeros labelled live
would tell a visitor the trial is running when it is not.

## Setup, once

**1. Create the repo and push these files.**

**2. Add four repository secrets.** Settings → Secrets and variables → Actions → New repository secret.

| Secret | Value |
| --- | --- |
| `ECOWITT_APPLICATION_KEY` | your Ecowitt application key |
| `ECOWITT_API_KEY` | your Ecowitt API key |
| `ECOWITT_MAC` | the station MAC, e.g. `34:B7:DA:01:77:50` |
| `SHEET_SUMMARY_URL` | the Apps Script `/exec` URL, no query string on the end |

Both keys are on ecowitt.net under your device, in the API Keys section.
Never put them in any file in this repo. Secrets are only readable by the workflow.

**3. Enable Pages.** Settings → Pages → Source: Deploy from a branch → `main` / root.

**4. Allow Actions to commit.** Settings → Actions → General → Workflow permissions →
Read and write permissions.

**5. Run it once by hand.** Actions tab → Update trial data → Run workflow.
Check that `data/latest.json` updates and the page shows the new time.

## Units

The Ecowitt API returns rainfall in inches, wind in mph and pressure in inHg.
`fetch_weather.py` converts everything to mm, km/h and hPa. Temperatures are requested
in Celsius directly. Every figure on the dashboard is metric.

## Temperature humidity index

THI = (1.8T + 32) − [(0.55 − 0.0055 × RH) × (1.8T − 26)], with T in Celsius and RH as
a percentage. Bands follow Protocol v2.0: below 72 normal, 72 to 79 alert,
80 to 89 danger, 90 and above emergency. Several THI variants exist; this one is
recorded here so results stay comparable across the trial.

## Adding the remaining streams

The page reads a `streams` object from `latest.json`, where each stream is `live` or
`awaiting`. To bring a stream online, extend `fetch_weather.py` (or add a second script
to the same workflow) so it writes that stream's data into `latest.json` and flips its
flag to `live`. The page renders whatever is present and shows the measurement plan for
anything still awaiting.

Streams still to connect: Farmbot water consumption and trough temperature, Optiweigh
live weights, Algae Control Australia water quality, feed delivery, trough cleaning,
health and deviation logs, TPS50 operation, and the four camera feeds. Device streams
(Farmbot, Optiweigh, weather) arrive through the Doovit controller on site; manual
streams come from the data entry app.

## Trial partners

CROC Trough Pump Systems (trial lead) · Doover (data and integration) ·
Optiweigh (live weight) · Algae Control Australia (independent water quality) ·
Farmbot (water monitoring) · Entegra (facilitator)

## Notes

- No figure on this dashboard is modelled, estimated or back-filled. If a reading is
  missing, the page says so.
- The station reports no solar radiation. Protocol v2.0 requires it hourly, so a sensor
  needs fitting or the protocol amending.
- The Ecowitt real-time endpoint returns current values only. Daily maximum and minimum
  temperature will need the history endpoint.
