/* Gilburn Park Feedlot Trial - public dashboard.
   Reads data/latest.json. No credentials here, nothing to keep running.
   Streams flip from their measurement plan to live figures when the JSON says live. */

const STREAMS = [
  { id:"water", title:"Water consumption", src:"Farmbot, via the Doovit controller",
    cadence:"Every 15 minutes, hourly summaries published",
    custodian:"Farmbot and Doover", start:"Commissioned before Day 0",
    params:[["Water consumption total","L","Metered flow at trough inlet"],
            ["Consumption per head","L/head/day","Total litres divided by 200 head"],
            ["Trough water temperature","°C","Probe at mid trough depth"],
            ["Peak consumption period","time of day","Hour of highest flow rate"],
            ["Trough refill frequency","events/day","Float valve activations"],
            ["Cumulative trial consumption","L","Running total across 70 days"]],
    drill:"Click any figure to see the full daily series for that trough alongside the same day's ambient temperature and THI, so the temperature relationship is visible rather than asserted.",
    alerts:["Daily consumption more than 20% below the 7 day rolling average",
            "Trough water above 28 °C for more than 2 consecutive hours",
            "Zero flow for more than 60 minutes during daylight",
            "Consumption differential between troughs above 30% on any day"] },

  { id:"weight", title:"Cattle weights", src:"Optiweigh, rotating weekly between paddocks",
    cadence:"Daily reads while the unit is in a paddock, weekly export",
    custodian:"Optiweigh and Trial Manager", start:"Induction weighing on Day 0",
    params:[["Individual entry weight","kg","Certified scale at induction, every animal"],
            ["Individual exit weight","kg","Certified scale on Day 70, every animal"],
            ["Paddock average live weight","kg","Optiweigh in-paddock"],
            ["Average daily gain","kg/head/day","Primary endpoint"],
            ["Total weight gain","kg","Entry adjusted"],
            ["Feed conversion ratio","kg DM per kg gain","Primary endpoint"]],
    drill:"Click any ear tag to open that animal's full weight record: its induction weight, every subsequent Optiweigh reading with the date, the gain between reads, and its running average daily gain against the paddock mean.",
    alerts:[] },

  { id:"quality", title:"Water quality", src:"Algae Control Australia, accredited laboratory",
    cadence:"Weekly, sampled every Tuesday from Day 7. Baseline taken Day 0",
    custodian:"Algae Control Australia", start:"Baseline sample on Day 0",
    params:[["Escherichia coli","CFU/100 mL","AS/NZS 4276.7"],
            ["Total coliforms","CFU/100 mL","AS/NZS 4276.7"],
            ["Total plate count","CFU/mL","AS/NZS 4276.3"],
            ["Enterococci","CFU/100 mL","AS/NZS 4276"],
            ["pH","pH units","Calibrated field probe"],
            ["Dissolved oxygen","mg/L","Field probe, key TPS50 aeration indicator"],
            ["Turbidity","NTU","Field turbidity meter"],
            ["Electrical conductivity","µS/cm","Field probe"],
            ["Oxidation reduction potential","mV","Field probe"],
            ["Total dissolved solids","mg/L","Laboratory"],
            ["Nitrate, nitrite, ammonia","mg/L","Laboratory"],
            ["Phosphorus, hardness, chloride, sulfate","mg/L","Laboratory"],
            ["Iron, manganese","mg/L","Laboratory"],
            ["Algae presence and type","scale and species","Visual, microscopy if heavy"],
            ["Biofilm, odour, clarity, sediment","scale","Visual assessment at trough"],
            ["Cyanobacteria","scale","Any detection triggers a cyanotoxin panel"]],
    drill:"Click any parameter to see every weekly sampling round for both troughs from the Day 0 baseline onward, with the laboratory method and the reason that parameter is measured.",
    alerts:["Cyanobacteria detected at any level triggers immediate partner notification and a cyanotoxin panel on the following sample"] },

  { id:"feed", title:"Feed delivery", src:"Feed contractor docket, entered in the trial app",
    cadence:"Logged per delivery. Residual scored daily from the bunk camera",
    custodian:"Trial Manager", start:"First delivery before Day 0",
    params:[["Weight delivered per paddock","kg","Certified docket or on-farm weigh"],
            ["Ration description and batch","text","Identical formulation and batch, both paddocks"],
            ["Dry matter percentage","%","Recorded per delivery"],
            ["Feed residual score","0 to 3","Daily bunk camera image, weekly average published"],
            ["Dry matter consumed","kg","Delivered less estimated residual"]],
    drill:"Click a delivery to see every delivery to date for both paddocks: date, ration, batch number, weight per paddock and the residual score that followed.",
    alerts:["Persistent high residual scores are flagged to the trial manager and veterinarian"] },

  { id:"clean", title:"Trough cleaning", src:"Entered in the trial app",
    cadence:"Logged per event. Troughs are cleaned only when a trigger condition is met, never on a fixed schedule",
    custodian:"Trial Manager", start:"From Day 0",
    params:[["Date of clean","date","Per event"],
            ["Trigger condition","reason","Turbidity, algae, biofilm, odour or drinking reluctance"],
            ["Labour time","minutes","Recorded per clean"],
            ["Method","text","Manual scrub, pressure wash or other"],
            ["Days since last clean","days","Calculated"],
            ["Before and after condition","photo","Photographed each clean"]],
    drill:"Click the last clean date to see the complete cleaning history for that trough: every date, the trigger that prompted it, labour minutes and days since the previous clean.",
    alerts:["Cleaning is triggered by turbidity above 50 NTU, moderate or heavy algae, heavy biofilm, putrid or sulphurous odour, or observed reluctance to drink"] },

  { id:"log", title:"Health, deaths and deviations", src:"Stockperson, veterinarian and Trial Manager",
    cadence:"Daily observation. Any event logged as it occurs",
    custodian:"Stockperson, Veterinarian, Trial Manager", start:"From Day 0",
    params:[["Daily health observation","record","Both paddocks, seven days a week"],
            ["Treatments administered","record","Animal, date, treatment, paddock"],
            ["Deaths","count and cause","Recorded and reported"],
            ["Deviations","record","Anything causing the paddocks to be treated differently"],
            ["Equipment faults","record with downtime","Farmbot, Optiweigh, TPS50, cameras"]],
    drill:"Click any entry to see the full log in date order. Deviations are published in summary form and are never removed from the record.",
    alerts:["A deviation is any event causing the two paddocks to be treated differently. All are logged and acknowledged publicly"] },

  { id:"tps50", title:"TPS50 operation", src:"CROC Trough Pump Systems",
    cadence:"Power status checked weekly, operating hours recorded from commissioning",
    custodian:"CROC Trough Pump Systems", start:"Commissioned before Day 0",
    params:[["Power status","operating or fault","Checked weekly"],
            ["Operating hours","hours","From commissioning"],
            ["Maintenance events","record with downtime","Logged as deviations"]],
    drill:"Click to see the operational record: commissioning date, cumulative hours and any downtime with its duration.",
    alerts:["Downtime beyond 24 hours is flagged on this dashboard and notified to the trial manager"] }
];

const CAMS = [
  ["Camera 1","A","Control","Water trough and surrounding cattle","Water access behaviour, trough condition"],
  ["Camera 2","A","Control","Feed bunk","Feed delivery, residual, eating behaviour"],
  ["Camera 3","B","TPS50","Water trough with the TPS50 unit visible","Water access, TPS50 in operation"],
  ["Camera 4","B","TPS50","Feed bunk","Feed delivery, residual, eating behaviour"]
];

let STREAM_LIVE = {};
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const set = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };
const val = (v, unit) => (v === null || v === undefined)
  ? '<span class="nodata">No reading</span>'
  : esc(v) + (unit ? '<span>' + unit + '</span>' : '');

function renderCams() {
  $("cams").innerHTML = CAMS.map(c => `
    <div class="cam">
      <div class="camview"><span class="lbl">${esc(c[0])} &middot; Paddock ${esc(c[1])}</span>
        <span class="st">Feed not yet live</span></div>
      <div class="caminfo"><div class="t">${esc(c[3])}</div>
        <div class="d">Paddock ${esc(c[1])} &mdash; ${esc(c[2])} &middot; ${esc(c[4])}</div></div>
    </div>`).join("");
}

function streamDetail(s) {
  const rows = s.params.map(p =>
    `<tr><td>${esc(p[0])}</td><td class="u">${esc(p[1])}</td><td class="u">${esc(p[2])}</td></tr>`).join("");
  const alerts = s.alerts.length
    ? `<div class="alerts"><div class="k">Alert thresholds</div><ul>${s.alerts.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>`
    : "";
  return `<p class="drillnote">${esc(s.drill)}</p>
    <table><thead><tr><th>Parameter</th><th>Unit</th><th>Method</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="empty"><b>No readings yet</b>
      This stream is not connected. ${esc(s.start)}. Once it is live the figures appear here and every
      value becomes clickable through to its full history. Nothing is back-filled and nothing is estimated:
      if a reading is missing, this dashboard says so.</div>
    ${alerts}`;
}


/* ---------- live renderers -------------------------------------------------
   Each returns { summary: [[label, value], ...], detail: htmlString } or null.
   Called only when latest.json marks that stream live, so these never render zeros
   dressed up as results. */

const fmt  = (v, u) => (v === null || v === undefined || v === "") ? "&ndash;" : esc(v) + (u ? " " + u : "");
const or_  = v => (v === null || v === undefined || v === "") ? "&ndash;" : esc(v);
const dfmt = d => { if (!d) return "&ndash;";
  const p = String(d).split("-"); if (p.length !== 3) return esc(d);
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${+p[2]} ${m[+p[1]-1]} ${p[0]}`; };
const daysSince = d => { if (!d) return null;
  return Math.floor((Date.now() - new Date(d + "T00:00:00+10:00")) / 86400000); };

function tbl(head, rows) {
  if (!rows.length) return '<div class="empty"><b>No records yet</b>Nothing has been logged for this stream.</div>';
  return `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

const LIVE = {
  feed(m) {
    const f = m.feed || {}; const l = f.last;
    if (!l) return null;
    return {
      summary: [
        ["Last delivery", dfmt(l.date)],
        ["Paddock A", fmt(l.a_kg, "kg")],
        ["Paddock B", fmt(l.b_kg, "kg")],
        ["Total to date", `A ${fmt(f.total_a_kg, "kg")} &middot; B ${fmt(f.total_b_kg, "kg")}`]
      ],
      detail: `<p class="drillnote">Every delivery logged to date. The protocol requires an identical
        ration and batch in both paddocks, so these two columns should track each other. A real
        difference is a deviation and appears in that log.</p>` +
        tbl(["Date", "Ration", "A (kg)", "B (kg)", "A bales", "B bales"],
          (f.history || []).slice().reverse().map(r => [
            dfmt(r.date), or_(r.ration), fmt(r.a_kg), fmt(r.b_kg),
            fmt(r.a_bales), fmt(r.b_bales)]))
    };
  },

  clean(m) {
    const c = m.cleans || {}; const A = c.A || {}, B = c.B || {};
    if (!A.count && !B.count) return null;
    const since = x => { const d = daysSince(x.last && x.last.date);
      return d === null ? "never cleaned" : (d === 0 ? "today" : d + " days ago"); };
    return {
      summary: [
        ["Trough A cleans", `${A.count || 0} &middot; last ${since(A)}`],
        ["Trough B cleans", `${B.count || 0} &middot; last ${since(B)}`],
        ["Labour A / B", `${A.total_labour_minutes || 0} / ${B.total_labour_minutes || 0} min`],
        ["Mean days between", `A ${fmt(A.mean_days_between)} &middot; B ${fmt(B.mean_days_between)}`]
      ],
      detail: `<p class="drillnote">Cleaning frequency is one of the outcomes this trial measures, so
        A and B are <b>not</b> expected to match. Troughs are cleaned only when a trigger condition is
        met, never on a schedule, and the trigger is recorded every time.</p>` +
        tbl(["Date", "Trough", "Trigger", "Labour", "Method", "By"],
          [].concat((A.history || []).map(r => [r, "A"]), (B.history || []).map(r => [r, "B"]))
            .sort((x, y) => String(y[0].date).localeCompare(String(x[0].date)))
            .map(([r, p]) => [dfmt(r.date), p, or_(r.trigger),
              fmt(r.labour_minutes, "min"), or_(r.method), or_(r.staff)]))
    };
  },

  log(m) {
    const d = m.deviations || {}, h = m.health || {};
    const rows = (d.entries || []).map(r => [
      dfmt(r.date), or_(r.type), or_(r.paddock),
      r.downtime_hours ? fmt(r.downtime_hours, "h") : "&ndash;",
      r.resolved === "Yes" ? "resolved" : '<span style="color:var(--warn)">ongoing</span>',
      esc(r.description || "")]);
    const hrows = (h.history || []).map(r => [
      dfmt(r.date), `${fmt(r.a_mortalities)} / ${fmt(r.b_mortalities)}`,
      `${fmt(r.a_morbidities)} / ${fmt(r.b_morbidities)}`,
      esc([r.a_notes, r.b_notes].filter(Boolean).join(" | ") || "")]);
    if (!rows.length && !hrows.length && !d.count) return null;
    return {
      summary: [
        ["Deviations logged", d.count || 0],
        ["Unresolved", d.unresolved || 0],
        ["Mortalities A / B", `${h.a_mortalities_total || 0} / ${h.b_mortalities_total || 0}`],
        ["Sick or pulled A / B", `${h.a_morbidities_total || 0} / ${h.b_morbidities_total || 0}`]
      ],
      detail: `<p class="drillnote">A deviation is anything that caused the two paddocks to be treated
        differently, or anything that could affect the integrity of the data. Nothing is ever removed
        from this record.</p>` +
        tbl(["Date", "Type", "Paddock", "Downtime", "Status", "What happened"], rows) +
        `<p class="drillnote" style="margin-top:20px">Health events, figures shown as A / B.</p>` +
        tbl(["Date", "Deaths", "Sick or pulled", "Notes"], hrows)
    };
  },

  quality(m) {
    const fw = m.field_water || {}; const l = fw.last;
    if (!l || (l.a_tds_ppm === null && l.b_tds_ppm === null)) return null;
    return {
      summary: [
        ["Field TDS, A", fmt(l.a_tds_ppm, "ppm")],
        ["Field TDS, B", fmt(l.b_tds_ppm, "ppm")],
        ["Trough condition", `A ${or_(l.a_condition)} &middot; B ${or_(l.b_condition)}`],
        ["Read on", dfmt(l.date)]
      ],
      detail: `<p class="drillnote">These are daily field readings taken between the weekly laboratory
        rounds. The full accredited panel, including <i>E. coli</i>, dissolved oxygen and turbidity,
        arrives from Algae Control Australia and is listed below.</p>` +
        tbl(["Date", "A (ppm)", "B (ppm)"],
          (fw.history || []).slice().reverse().map(r => [dfmt(r.date), fmt(r.a_tds_ppm), fmt(r.b_tds_ppm)]))
    };
  }
};

function renderStreams(flags, manual) {
  const rendered = {};
  $("streams").innerHTML = STREAMS.map(s => {
    let live = null;
    if (flags && flags[s.id] === "live" && manual && LIVE[s.id]) {
      try { live = LIVE[s.id](manual); } catch (e) { live = null; }
    }
    rendered[s.id] = live;
    const body = live
      ? live.summary.map(([k, v]) => `<div class="col"><b>${esc(k)}</b>${v}</div>`).join("")
      : [["Measured", s.params.length + " parameters"], ["Frequency", s.cadence],
         ["Custodian", s.custodian], ["Starts", s.start]]
          .map(([k, v]) => `<div class="col"><b>${esc(k)}</b>${esc(v)}</div>`).join("");
    return `<button class="stream" data-id="${s.id}">
      <div class="shead"><h3>${esc(s.title)}</h3>
        <span class="chip ${live ? "live" : "soon"}">${live ? "Live now" : "Awaiting commissioning"}</span>
        <span class="meta">${esc(s.src)}</span></div>
      <div class="sbody">${body}</div>
      <div class="more">${live ? "See the full history &rarr;" : "See what will be measured and how &rarr;"}</div>
    </button>`;
  }).join("");
  STREAM_LIVE = rendered;

  const dlg = $("dlg");
  document.querySelectorAll(".stream").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = STREAMS.find(x => x.id === btn.dataset.id);
      $("dt").textContent = s.title;
      $("ds").textContent = s.src + " · " + s.cadence;
      const live = STREAM_LIVE[s.id];
      $("db").innerHTML = live ? live.detail : streamDetail(s);
      dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "");
    });
  });
}

function renderWeather(d) {
  const w = d.weather || {};
  set("t_temp",  val(w.outdoor_temp_c, "°C"));
  set("n_temp",  w.apparent_temp_c != null ? "Apparent " + w.apparent_temp_c + " °C" : "");
  set("t_rh",    val(w.outdoor_humidity_pct, "%"));
  set("n_rh",    w.dew_point_c != null ? "Dew point " + w.dew_point_c + " °C" : "");
  set("t_ws",    val(w.wind_speed_kmh, "km/h"));
  set("n_ws",    w.wind_gust_kmh != null ? "Gusting " + w.wind_gust_kmh + " km/h" : "");
  set("t_wd",    val(w.wind_direction_deg, "°"));
  set("n_wd",    (w.wind_direction_pt ? w.wind_direction_pt + " · " : "") + "both paddocks share exposure");
  set("t_rain",  val(w.rain_today_mm, "mm"));
  set("n_rain",  w.rain_rate_mmhr != null ? "Rate " + w.rain_rate_mmhr + " mm/hr" : "");
  set("t_press", val(w.pressure_hpa, "hPa"));
  set("t_vpd",   val(w.vpd_kpa, "kPa"));

  if (w.solar_wm2 != null) {
    set("t_solar", val(w.solar_wm2, "W/m²"));
    set("n_solar", "Influences trough water temperature");
  } else {
    set("t_solar", '<span class="nodata">Sensor to be fitted</span>');
    set("n_solar", '<span style="color:var(--warn)">Required hourly by the protocol</span>');
  }

  const t = d.thi || {};
  if (t.value != null) {
    set("thiValue", esc(t.value));
    set("thiBand",  esc(t.value));
    $("thiWord").innerHTML  = `<span class="lvl-${esc(t.level)}">${esc(t.label)}</span> &mdash; ` +
      (t.level === "normal" ? "standard monitoring" : "see the protocol response for this band");
    $("thiLabel").innerHTML = `<span class="lvl-${esc(t.level)}">${esc(t.label)}</span>, ` +
      (t.value < 72 ? "below 72" : "above the 72 threshold");
    const pos = Math.min(Math.max((t.value - 50) / 45, 0), 1) * 100;
    $("thiMark").style.left = pos.toFixed(1) + "%";
  }

  set("readingTime", "Weather reading " + esc(d.reading_local || "unknown"));

  const flags = d.streams || {};
  const liveN = Object.values(flags).filter(v => v === "live").length;
  set("liveCount", liveN + '<small>of ' + Object.keys(flags).length + '</small>');
  return flags;
}

function staleness(d) {
  const box = $("stale");
  if (!d.reading_epoch) return;
  const mins = Math.round((Date.now() / 1000 - d.reading_epoch) / 60);
  if (mins <= 45) return;
  box.className = "stale show " + (mins > 180 ? "err" : "warn");
  const hrs = (mins / 60).toFixed(1);
  box.innerHTML = "<strong>This reading is " + (mins > 180 ? hrs + " hours" : mins + " minutes") +
    " old.</strong> The weather station updates about every 15 minutes, so the site connection or the " +
    "update job may have dropped out. The figures below are the last confirmed reading, not the current conditions.";
}

fetch("data/latest.json", { cache: "no-store" })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => {
    const flags = renderWeather(d);
    renderStreams(flags, d.manual);
    staleness(d);
    const mins = d.reading_epoch ? (Date.now() / 1000 - d.reading_epoch) / 60 : Infinity;
    setDoovitStatus(mins <= 45);
  })
  .catch(() => {
    const box = $("stale");
    box.className = "stale show err";
    box.innerHTML = "<strong>Live data could not be loaded.</strong> The dashboard could not reach " +
      "<code>data/latest.json</code>. Everything below still shows what the trial measures and how, " +
      "but no current readings are available.";
    set("readingTime", "Reading unavailable");
    renderStreams(null, null);
    setDoovitStatus(false);
  });

renderCams();
$("dx").addEventListener("click", () => $("dlg").close());
$("dlg").addEventListener("click", e => { if (e.target === $("dlg")) $("dlg").close(); });

/* ---- Trial partners.
   Each entry names a logo file under assets/partners/. If the file is there it is used;
   if not, the partner shows as a typographic wordmark. Never redraw a partner's logo. */
const PARTNERS = [
  ["CROC Trough Pump Systems","croc.jpg","Trial lead. TPS50 technology, installation and maintenance, final report."],
  ["Doover","doover.jpg","Data and integration. Dashboard, real-time data from all sources, archiving."],
  ["Optiweigh","optiweigh.png","Live weight performance. In-paddock weighing, rotating weekly between paddocks."],
  ["Algae Control Australia","algae-control.png","Independent water quality verification. Weekly sampling and accredited laboratory analysis."],
  ["Farmbot","farmbot.png","Water monitoring. Flow at the trough inlet and trough water temperature."],
  ["Entegra","entegra.svg","Trial facilitator."]
];

function renderPartnerBar() {
  const bar = document.getElementById("pbar");
  if (!bar) return;
  bar.innerHTML = '<span class="cap">Trial partners</span>' +
    PARTNERS.map(([name, file]) =>
      `<span class="chipbg"><img src="assets/partners/${file}" alt="${esc(name)}" title="${esc(name)}"></span>`
    ).join("");
}

function renderPartners() {
  const host = document.getElementById("partners");
  if (!host) return;
  host.innerHTML = PARTNERS.map(([name, file, role], i) => `
    <div class="pt">
      <div class="plogo" data-i="${i}"><span class="word">${esc(name)}</span></div>
      <div class="role">${esc(role)}</div>
    </div>`).join("");

  PARTNERS.forEach(([name, file], i) => {
    const img = new Image();
    img.onload = () => {
      const slot = host.querySelector(`.plogo[data-i="${i}"]`);
      if (slot) slot.innerHTML = `<span class="chipbg"><img src="assets/partners/${file}" alt="${esc(name)}"></span>`;
    };
    img.src = "assets/partners/" + file;
  });
}

renderPartnerBar();
renderPartners();

/* ---- Site map + Doovit connectivity status.
   Fixed physical location (Gilburn Park, Kerang VIC), so the marker is static.
   "Online"/"Offline" mirrors the same 45 minute freshness window used by staleness()
   above, since the Doovit controller is what relays the weather reading. */
const SITE_LAT = -35.7445, SITE_LON = 144.0064;

function initSiteMap() {
  const el = $("siteMapEl");
  if (!el || typeof L === "undefined") return;
  const map = L.map(el, {
    center: [SITE_LAT, SITE_LON],
    zoom: 15,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    attributionControl: true
  });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18,
    attribution: "Esri"
  }).addTo(map);
  L.circleMarker([SITE_LAT, SITE_LON], {
    radius: 7, color: "#D9615C", weight: 2, fillColor: "#D9615C", fillOpacity: 0.85
  }).addTo(map);
}

/* This reflects the freshness of the weather reading (same 45 minute window as
   staleness() above), not the Doovit controller's own connectivity. Those are
   different things: the controller can be online while the Ecowitt station's
   own transmission has stalled, which is exactly what a stale reading here means.
   There is no feed from Doover's own device status into this dashboard, so this
   chip deliberately does not claim to know whether Doovit itself is online. */
function setDoovitStatus(online) {
  const chip = $("sitemapStatus");
  if (!chip) return;
  chip.className = "sitemap-status chip " + (online ? "live" : "off");
  chip.textContent = online ? "Weather feed live" : "Weather feed stale";
}

initSiteMap();
