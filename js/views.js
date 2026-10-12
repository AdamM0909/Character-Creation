"use strict";
/* Full-page views: home dashboard, browse, timeline, scenes, relationship web, family tree, maps, compare, merge. */

const VIEWS = {};
const entityChip = c => `<span class="ent-chip" style="--tc:${typeOf(c).color}">${ico(typeOf(c).icon, 12)}${esc(entName(c))}</span>`;
const pageHead = (title, sub = "", right = "") => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p class="muted">${sub}</p>` : ""}</div><div class="page-actions">${right}</div></div>`;
const emptyState = (icon, title, text, btn = "") => `<div class="empty-state">${ico(icon, 44)}<h3>${esc(title)}</h3><p class="muted">${text}</p>${btn}</div>`;

/* ---------- Home ---------- */
function renderHome(el) {
  const all = state.characters;
  if (!all.length) {
    el.innerHTML = `<div class="welcome">
      <div class="welcome-art">${ico("book", 64)}</div>
      <h1>Welcome to your Character Vault</h1>
      <p class="lead">A private codex for your characters, places, factions and items. Profiles, notes, photos, timelines and more, all saved in your browser.</p>
      <div class="welcome-actions">${Object.entries(TYPES).map(([k, t]) => `<button class="btn ${k === "character" ? "primary" : ""} big" data-vact="new" data-type="${k}" style="--tc:${t.color}">${ico(t.icon, 18)} New ${t.label.toLowerCase()}</button>`).join("")}</div>
      <p class="muted small">Already have a backup? <button class="link" data-vact="import">Import it</button>.</p>
    </div>`;
    return;
  }
  const n = t => all.filter(c => c.type === t).length;
  const notes = all.reduce((s, c) => s + c.notes.length, 0), words = totalWords();
  const goal = Math.max(1, state.settings.dailyGoal), todayW = state.writing.days[dayKey()] || 0, pct = Math.min(100, Math.round(todayW / goal * 100));
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return { k: dayKey(d), w: state.writing.days[dayKey(d)] || 0, d }; });
  const maxW = Math.max(goal, ...days.map(x => x.w));
  const streak = writingStreak();
  const recents = [...all].sort((a, b) => b.updated - a.updated).slice(0, 6);
  const favs = all.filter(c => c.fav).slice(0, 8);
  const needs = all.map(c => ({ c, p: completeness(c).pct })).filter(x => x.p < 100).sort((a, b) => a.p - b.p).slice(0, 4);
  const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const bar = `<svg viewBox="0 0 ${days.length * 22} 70" class="spark" role="img" aria-label="Words written per day, last 14 days">${days.map((x, i) => { const h = Math.max(2, x.w / maxW * 60); return `<rect x="${i * 22 + 3}" y="${66 - h}" width="16" height="${h}" rx="4" class="${x.w >= goal ? "hit" : ""}"><title>${x.d.toLocaleDateString()}: ${x.w} words</title></rect>`; }).join("")}<line x1="0" x2="${days.length * 22}" y1="${66 - goal / maxW * 60}" y2="${66 - goal / maxW * 60}" class="spark-goal"/></svg>`;
  const r = 34, C = 2 * Math.PI * r;
  const mini = c => `<button class="mini-card" data-open="${c.id}" style="--tc:${typeOf(c).color}">${avatarHtml(c)}<div><b>${esc(entName(c))}</b><span class="muted small">${esc(entitySummary(c) || typeOf(c).label)}</span></div></button>`;
  const stale = !state.lastBackup || Date.now() - state.lastBackup > 7 * 864e5;
  el.innerHTML = `
    ${pageHead(`${greet}.`, "Here's what's happening in your vault.", `<button class="btn primary" data-vact="new" data-type="character">${ico("plus", 16)} New character</button>`)}
    <div class="stat-row">
      ${[["character", n("character")], ["location", n("location")], ["faction", n("faction")], ["item", n("item")]].map(([k, v]) => `<button class="stat" data-vact="filtertype" data-type="${k}" style="--tc:${TYPES[k].color}">${ico(TYPES[k].icon, 22)}<b>${v}</b><span>${TYPES[k].plural}</span></button>`).join("")}
      <div class="stat" style="--tc:var(--accent)">${ico("note", 22)}<b>${notes}</b><span>Notes</span></div>
      <div class="stat" style="--tc:var(--accent)">${ico("pencil", 22)}<b>${words.toLocaleString()}</b><span>Words</span></div>
    </div>
    <div class="dash-grid">
      <section class="panel goal">
        <h3>${ico("target", 18)} Today's writing</h3>
        <div class="goal-body"><div class="goal-ring"><svg viewBox="0 0 80 80" width="96" height="96"><circle cx="40" cy="40" r="${r}" class="ring-bg"/><circle cx="40" cy="40" r="${r}" class="ring-fg" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg><b>${pct}%</b></div>
          <div><p class="big-num">${todayW.toLocaleString()} <span class="muted small">/ ${goal} words</span></p>
          <p class="muted small">${streak ? `${ico("flame", 14)} ${streak}-day streak` : "Hit your goal to start a streak"}</p>
          <button class="link" data-vact="goal">Change daily goal</button></div></div>
        ${bar}<p class="muted tiny">Last 14 days. Dashed line is your goal.</p>
      </section>
      <section class="panel prompt">
        <h3>${ico("sparkle", 18)} Prompt of the day</h3>
        <blockquote id="dayPrompt">${esc(dailyPrompt())}</blockquote>
        <div class="toolbar"><button class="btn small" data-vact="prompts">${ico("dice", 15)} More prompts</button></div>
      </section>
      <section class="panel">
        <h3>${ico("clock", 18)} Story clock</h3>
        <label class="fld"><span>Current story year <em>(updates ages everywhere)</em></span><input type="number" id="homeYear" value="${esc(state.settings.storyYear)}" placeholder="e.g. 1204"></label>
        <p class="muted small">Give characters a birth year and their age follows the story year automatically.</p>
      </section>
      <section class="panel backup ${stale ? "warn" : ""}">
        <h3>${ico("download", 18)} Backup</h3>
        <p class="${stale ? "" : "muted"}">${stale ? `${ico("info", 14)} ` : ""}Last backup: <b>${state.lastBackup ? ago(state.lastBackup) : "never"}</b>. Your data lives only in this browser.</p>
        <div class="toolbar wrap"><button class="btn small primary" data-vact="export">Export backup</button><button class="btn small" data-vact="import">Import</button><button class="btn small" data-vact="history">${ico("history", 14)} History</button></div>
      </section>
    </div>
    ${recents.length ? `<h2 class="sec">Recently edited</h2><div class="mini-grid">${recents.map(mini).join("")}</div>` : ""}
    ${favs.length ? `<h2 class="sec">Favorites</h2><div class="mini-grid">${favs.map(mini).join("")}</div>` : ""}
    ${needs.length ? `<h2 class="sec">Needs attention</h2><div class="mini-grid">${needs.map(x => `<button class="mini-card" data-open="${x.c.id}" style="--tc:${typeOf(x.c).color}">${avatarHtml(x.c)}<div><b>${esc(entName(x.c))}</b><span class="muted small">${x.p}% complete</span><div class="li-bar"><i style="width:${x.p}%"></i></div></div></button>`).join("")}</div>` : ""}`;
}

/* ---------- Browse ---------- */
const BROWSE_COLS = [
  { k: "name", l: "Name", v: c => entName(c) },
  { k: "type", l: "Type", v: c => typeOf(c).label },
  { k: "kind", l: "Kind", v: c => subtype(c) || "" },
  { k: "detail", l: "Details", v: c => c.type === "character" ? c.race : c.type === "location" ? c.region : c.type === "faction" ? c.leader : c.owner },
  { k: "age", l: "Age", v: c => ageText(c), n: c => parseFloat(ageText(c)) || 0 },
  { k: "stories", l: "Stories", v: c => c.stories.map(id => state.stories.find(s => s.id === id)?.name).filter(Boolean).join(", ") },
  { k: "notes", l: "Notes", v: c => c.notes.length, n: c => c.notes.length },
  { k: "words", l: "Words", v: c => entityWords(c), n: c => entityWords(c) },
  { k: "done", l: "Complete", v: c => completeness(c).pct, n: c => completeness(c).pct },
  { k: "updated", l: "Edited", v: c => ago(c.updated), n: c => c.updated },
];
function renderBrowse(el) {
  const list = state.characters.filter(passesFilters);
  const mode = state.settings.browse;
  const seg = `<div class="seg"><button class="${mode === "cards" ? "on" : ""}" data-vact="browsemode" data-mode="cards" title="Cards">${ico("grid", 16)}</button><button class="${mode === "table" ? "on" : ""}" data-vact="browsemode" data-mode="table" title="Table">${ico("list", 16)}</button></div>`;
  let body = "";
  if (!list.length) body = emptyState("search", "Nothing to show", "No entries match the current filters in the sidebar.");
  else if (mode === "cards") {
    body = `<div class="card-grid">${[...list].sort((a, b) => (b.fav - a.fav) || a.name.localeCompare(b.name)).map(c => {
      const im = portraitOf(c), t = typeOf(c), cp = completeness(c).pct;
      return `<article class="ecard" data-open="${c.id}" style="--tc:${t.color}">
        <div class="ecard-img" style="${im ? `background-image:url('${im.data}')` : ""}">${im ? "" : ico(t.icon, 40)}${c.fav ? `<span class="ecard-fav">${ico("star", 14)}</span>` : ""}<span class="ecard-type">${t.label}</span></div>
        <div class="ecard-body"><h3>${esc(entName(c))}</h3><p class="muted small">${esc(entitySummary(c) || "No details yet")}</p>
        <div class="chips">${c.tags.slice(0, 3).map(x => `<span class="chip">${esc(x)}</span>`).join("")}</div>
        <div class="li-bar" title="${cp}% complete"><i style="width:${cp}%"></i></div></div></article>`;
    }).join("")}</div>`;
  } else {
    const { k, dir } = ui.browseSort, col = BROWSE_COLS.find(x => x.k === k) || BROWSE_COLS[0];
    const val = c => col.n ? col.n(c) : String(col.v(c) ?? "").toLowerCase();
    const rows = [...list].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
    body = `<div class="table-wrap"><table class="tbl"><thead><tr>${BROWSE_COLS.map(cc => `<th data-vact="browsesort" data-k="${cc.k}" class="${cc.k === k ? "sorted" : ""}">${cc.l}${cc.k === k ? (dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(c => `<tr data-open="${c.id}">${BROWSE_COLS.map(cc => cc.k === "name" ? `<td><span class="tbl-name">${avatarHtml(c, "xs")}<b>${esc(entName(c))}</b>${c.fav ? ico("star", 12, "fav-ico") : ""}</span></td>` : cc.k === "done" ? `<td><div class="li-bar"><i style="width:${cc.v(c)}%"></i></div></td>` : `<td>${esc(cc.v(c) ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  el.innerHTML = pageHead("Browse", `${list.length} of ${state.characters.length} entries. Use the sidebar to filter.`, seg) + body;
}

/* ---------- Master timeline ---------- */
function renderGlobalTimeline(el) {
  const filter = ui.tlFilter || "";
  const all = state.characters.filter(passesFilters).flatMap(c => c.timeline.map(e => ({ ...e, c }))).filter(e => !filter || e.c.id === filter);
  const sorted = sortEvents(all);
  const opts = state.characters.filter(c => c.timeline.length).map(c => `<option value="${c.id}" ${c.id === filter ? "selected" : ""}>${esc(entName(c))}</option>`).join("");
  let last = null;
  const items = sorted.map(e => {
    const k = numKey(e.date), head = k !== last && isFinite(k) ? `<div class="tl-year">${esc(e.date)}</div>` : ""; last = k;
    const age = ageAtEvent(e.c, e);
    return `${head}<div class="tl-item" data-open="${e.c.id}" data-tab="timeline"><div class="tl-dot" style="--tc:${typeOf(e.c).color}"></div><div class="card clickable">
      <div class="card-top"><b>${esc(e.title || "Untitled event")}</b><span class="spacer"></span>${age ? `<span class="badge soft">${age}</span>` : ""}${entityChip(e.c)}</div>
      ${e.desc ? `<div class="muted">${esc(e.desc)}</div>` : ""}${isFinite(k) ? "" : `<div class="muted small">${esc(e.date || "No date")}</div>`}</div></div>`;
  }).join("");
  el.innerHTML = pageHead("Master timeline", `${sorted.length} events across your vault. Click one to edit it.`, `<select id="tlFilter" class="auto"><option value="">Everyone</option>${opts}</select>`) +
    (sorted.length ? `<div class="timeline wide">${items}</div>` : emptyState("clock", "No events yet", "Open an entry's Timeline tab to add births, battles and turning points."));
}

/* ---------- Scenes ---------- */
function renderScenes(el) {
  const f = ui.sceneFilter || "";
  const list = sortScenes(state.scenes.filter(s => !f || s.characterIds.includes(f)));
  const opts = state.characters.map(c => `<option value="${c.id}" ${c.id === f ? "selected" : ""}>${esc(entName(c))}</option>`).join("");
  el.innerHTML = pageHead("Scenes & chapters", "Track where everyone appears.", `<select id="sceneFilter" class="auto"><option value="">All entries</option>${opts}</select><button class="btn primary" data-vact="scenenew">${ico("plus", 16)} New scene</button>`) +
    (list.length ? `<div class="stack">${list.map(sceneCard).join("")}</div>` : emptyState("list", "No scenes yet", "Create a scene, then add the characters, places and items that appear in it.", `<button class="btn primary" data-vact="scenenew">${ico("plus", 16)} New scene</button>`));
}
function sceneCard(s) {
  const members = s.characterIds.map(id => byId(id)).filter(Boolean);
  const avail = state.characters.filter(c => !s.characterIds.includes(c.id));
  return `<div class="card scene" data-scene="${s.id}">
    <div class="card-top"><input data-sk="chapter" class="tl-date" value="${esc(s.chapter)}" placeholder="Chapter"><input data-sk="title" value="${esc(s.title)}" placeholder="Scene title">
      <button class="icon-btn sm" data-vact="scenedel" title="Delete scene">${ico("trash", 15)}</button></div>
    <textarea data-sk="summary" rows="2" placeholder="What happens in this scene?">${esc(s.summary)}</textarea>
    <div class="chips">${members.map(c => `<span class="ent-chip" style="--tc:${typeOf(c).color}" data-open="${c.id}">${ico(typeOf(c).icon, 12)}${esc(entName(c))}<button class="x" data-vact="sceneremove" data-id="${c.id}" title="Remove">${ico("x", 11)}</button></span>`).join("")}
      ${avail.length ? `<select data-vact="sceneadd" class="chip-select"><option value="">+ Add</option>${avail.map(c => `<option value="${c.id}">${esc(entName(c))}</option>`).join("")}</select>` : ""}</div>
  </div>`;
}

/* ---------- Relationship web ---------- */
function buildGraph() {
  const chars = state.characters.filter(passesFilters), idx = new Map(), nodes = [], edges = new Map();
  const nameMap = new Map(state.characters.map(c => [(c.name || "").trim().toLowerCase(), c.id]));
  chars.forEach(c => { idx.set(c.id, nodes.length); nodes.push({ id: c.id, c, label: entName(c), real: true, deg: 0 }); });
  state.characters.forEach(c => c.relations.forEach(r => {
    const nm = (r.name || "").trim(); if (!nm || !idx.has(c.id)) return;
    let tid = nameMap.get(nm.toLowerCase());
    if (tid === c.id) return;
    if (tid && !idx.has(tid)) return; // filtered out
    if (!tid) { tid = "x:" + nm.toLowerCase(); if (!idx.has(tid)) { idx.set(tid, nodes.length); nodes.push({ id: tid, label: nm, real: false, deg: 0 }); } }
    const key = [c.id, tid].sort().join("|"), e = edges.get(key) || { a: idx.get(c.id), b: idx.get(tid), kinds: new Set() };
    e.kinds.add(r.kind); edges.set(key, e);
  }));
  const list = [...edges.values()];
  list.forEach(e => { nodes[e.a].deg++; nodes[e.b].deg++; });
  return { nodes, edges: list };
}
function forceLayout(nodes, edges, W, H) {
  const n = nodes.length; if (!n) return;
  nodes.forEach((p, i) => { const a = i / n * Math.PI * 2; p.x = W / 2 + Math.cos(a) * W * .32; p.y = H / 2 + Math.sin(a) * H * .32; });
  const k = Math.sqrt(W * H / n) * .75; let t = W / 9;
  for (let it = 0; it < 280; it++) {
    nodes.forEach(p => { p.dx = 0; p.dy = 0; });
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || .01;
      const f = k * k / d; dx /= d; dy /= d; a.dx += dx * f; a.dy += dy * f; b.dx -= dx * f; b.dy -= dy * f;
    }
    edges.forEach(e => {
      const a = nodes[e.a], b = nodes[e.b]; let dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || .01;
      const f = d * d / k * .9; dx /= d; dy /= d; a.dx -= dx * f; a.dy -= dy * f; b.dx += dx * f; b.dy += dy * f;
    });
    nodes.forEach(p => {
      p.dx += (W / 2 - p.x) * .02; p.dy += (H / 2 - p.y) * .02;
      const d = Math.hypot(p.dx, p.dy) || .01, m = Math.min(d, t);
      p.x = clamp(p.x + p.dx / d * m, 70, W - 70); p.y = clamp(p.y + p.dy / d * m, 40, H - 40);
    });
    t *= .975;
  }
}
let webData = null;
function renderWeb(el) {
  const g = buildGraph();
  if (!g.nodes.length) { el.innerHTML = pageHead("Relationship web") + emptyState("web", "Nothing to connect yet", "Add entries and fill in their Connections tab. Names that match another entry link automatically."); return; }
  const W = 1000, H = 680;
  forceLayout(g.nodes, g.edges, W, H);
  webData = { ...g, W, H };
  const legend = [...new Set(g.edges.flatMap(e => [...e.kinds]))].map(k => `<span class="chip"><span class="dot" style="background:${REL_COLORS[k] || "#999"}"></span>${k}</span>`).join("");
  el.innerHTML = pageHead("Relationship web", `${g.nodes.length} nodes, ${g.edges.length} connections. Drag nodes to rearrange; click one to open it.`, `<label class="check inline"><input type="checkbox" id="webLabels" ${ui.webLabels === false ? "" : "checked"}><span>Edge labels</span></label><button class="btn small" data-vact="webreset">${ico("swap", 15)} Re-arrange</button>`) +
    `<div class="legend">${legend}</div><div class="web-wrap"><svg id="webSvg" class="web" viewBox="0 0 ${W} ${H}"></svg></div>`;
  drawWeb();
}
function drawWeb() {
  const svg = $("#webSvg"); if (!svg || !webData) return;
  const { nodes, edges } = webData, labels = $("#webLabels")?.checked !== false;
  svg.innerHTML = edges.map((e, i) => { const a = nodes[e.a], b = nodes[e.b], kinds = [...e.kinds];
    return `<g class="web-edge" data-e="${i}"><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${REL_COLORS[kinds[0]] || "#999"}"/>${labels ? `<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 4}" text-anchor="middle">${esc(kinds.join(" / "))}</text>` : ""}</g>`; }).join("") +
    nodes.map((p, i) => { const r = p.real ? 16 + Math.min(p.deg, 6) * 2 : 10, col = p.real ? typeOf(p.c).color : "var(--muted)", im = p.real ? portraitOf(p.c) : null;
      return `<g class="web-node ${p.real ? "real" : ""}" data-n="${i}" transform="translate(${p.x},${p.y})">
        ${im ? `<clipPath id="wc${i}"><circle r="${r}"/></clipPath><circle r="${r + 3}" fill="${col}"/><image href="${im.data}" x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" clip-path="url(#wc${i})" preserveAspectRatio="xMidYMid slice"/>` : `<circle r="${r}" fill="${col}"/>${p.real ? `<text class="ini" y="5" text-anchor="middle">${esc((p.label[0] || "?").toUpperCase())}</text>` : ""}`}
        <text class="web-label" y="${r + 16}" text-anchor="middle">${esc(p.label)}</text></g>`; }).join("");
}
function bindWebDrag(view) {
  let drag = null;
  view.addEventListener("pointerdown", e => {
    if (ui.view !== "web") return;
    const g = e.target.closest(".web-node"); if (!g) return;
    const svg = $("#webSvg"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse()), n = webData.nodes[+g.dataset.n];
    drag = { n, g, dx: p.x - n.x, dy: p.y - n.y, sx: e.clientX, sy: e.clientY, moved: false };
    g.setPointerCapture(e.pointerId);
  });
  view.addEventListener("pointermove", e => {
    if (!drag) return;
    const svg = $("#webSvg"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    drag.n.x = clamp(p.x - drag.dx, 20, webData.W - 20); drag.n.y = clamp(p.y - drag.dy, 20, webData.H - 20);
    drag.g.setAttribute("transform", `translate(${drag.n.x},${drag.n.y})`);
    webData.edges.forEach((ed, i) => { if (webData.nodes[ed.a] === drag.n || webData.nodes[ed.b] === drag.n) {
      const a = webData.nodes[ed.a], b = webData.nodes[ed.b], grp = svg.querySelector(`[data-e="${i}"]`), ln = grp.querySelector("line"), tx = grp.querySelector("text");
      ln.setAttribute("x1", a.x); ln.setAttribute("y1", a.y); ln.setAttribute("x2", b.x); ln.setAttribute("y2", b.y);
      tx?.setAttribute("x", (a.x + b.x) / 2); tx?.setAttribute("y", (a.y + b.y) / 2 - 4); } });
  });
  view.addEventListener("pointerup", () => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.moved && d.n.real) selectEntity(d.n.id, "relations");
  });
}

/* ---------- Family tree ---------- */
function renderFamily(el) {
  const chars = state.characters.filter(c => c.type === "character"), nameMap = new Map(chars.map(c => [(c.name || "").trim().toLowerCase(), c.id]));
  const parents = new Map(), spouses = new Map(), sibs = new Map(), involved = new Set();
  const add = (m, a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  chars.forEach(c => c.relations.forEach(r => {
    const tid = nameMap.get((r.name || "").trim().toLowerCase()); if (!tid || tid === c.id) return;
    if (r.kind === "Parent") { add(parents, c.id, tid); involved.add(c.id); involved.add(tid); }
    else if (r.kind === "Child") { add(parents, tid, c.id); involved.add(c.id); involved.add(tid); }
    else if (r.kind === "Spouse") { add(spouses, c.id, tid); add(spouses, tid, c.id); involved.add(c.id); involved.add(tid); }
    else if (r.kind === "Sibling") { add(sibs, c.id, tid); add(sibs, tid, c.id); involved.add(c.id); involved.add(tid); }
  }));
  if (!involved.size) { el.innerHTML = pageHead("Family tree") + emptyState("tree", "No family links yet", "On a character's Connections tab, add relationships of type Parent, Child, Sibling or Spouse that point to other characters by name."); return; }
  const ids = [...involved], level = new Map(ids.map(id => [id, 0]));
  for (let it = 0; it < 60; it++) {
    let ch = false;
    parents.forEach((ps, child) => ps.forEach(p => { if (level.get(child) < level.get(p) + 1) { level.set(child, level.get(p) + 1); ch = true; } }));
    [spouses, sibs].forEach(m => m.forEach((set, a) => set.forEach(b => { const mx = Math.max(level.get(a), level.get(b)); if (level.get(a) !== mx) { level.set(a, mx); ch = true; } if (level.get(b) !== mx) { level.set(b, mx); ch = true; } })));
    if (!ch) break;
  }
  const maxL = Math.max(...level.values()), rows = Array.from({ length: maxL + 1 }, () => []);
  ids.sort((a, b) => entName(byId(a)).localeCompare(entName(byId(b)))).forEach(id => rows[level.get(id)].push(id));
  const posIdx = new Map();
  rows[0].forEach((id, i) => posIdx.set(id, i));
  for (let l = 1; l <= maxL; l++) {
    rows[l].sort((a, b) => { const avg = id => { const ps = [...(parents.get(id) || [])].filter(p => posIdx.has(p)); return ps.length ? ps.reduce((s, p) => s + posIdx.get(p), 0) / ps.length : 1e9; }; return avg(a) - avg(b); });
    // keep spouses adjacent
    const out = []; rows[l].forEach(id => { if (out.includes(id)) return; out.push(id); (spouses.get(id) || []).forEach(s => { if (rows[l].includes(s) && !out.includes(s)) out.push(s); }); });
    rows[l] = out; rows[l].forEach((id, i) => posIdx.set(id, i));
  }
  const NW = 170, NH = 70, GX = 36, GY = 70, W = Math.max(...rows.map(r => r.length)) * (NW + GX) + GX, H = rows.length * (NH + GY) + GY - 20;
  const pos = new Map();
  rows.forEach((r, l) => { const w = r.length * (NW + GX) - GX, x0 = (W - w) / 2; r.forEach((id, i) => pos.set(id, { x: x0 + i * (NW + GX), y: 20 + l * (NH + GY) })); });
  let lines = "";
  parents.forEach((ps, ch) => ps.forEach(p => { const a = pos.get(p), b = pos.get(ch); if (!a || !b) return; const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y, my = (y1 + y2) / 2; lines += `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" class="fam-line"/>`; }));
  const seen = new Set();
  spouses.forEach((set, a) => set.forEach(b => { const k = [a, b].sort().join(); if (seen.has(k)) return; seen.add(k); const p = pos.get(a), q = pos.get(b); if (!p || !q) return; lines += `<path d="M${p.x + NW / 2},${p.y + NH / 2} L${q.x + NW / 2},${q.y + NH / 2}" class="fam-spouse"/>`; }));
  const sk = new Set();
  sibs.forEach((set, a) => set.forEach(b => { const k = [a, b].sort().join(); if (sk.has(k)) return; sk.add(k); const p = pos.get(a), q = pos.get(b); if (!p || !q) return; lines += `<path d="M${p.x + NW / 2},${p.y} q${(q.x - p.x) / 2},-26 ${q.x - p.x},0" class="fam-sib"/>`; }));
  const nodes = ids.map(id => { const c = byId(id), p = pos.get(id), im = portraitOf(c), at = ageText(c), clip = `fc${id}`;
    return `<g class="fam-node" data-open="${id}" data-tab="relations" transform="translate(${p.x},${p.y})"><rect width="${NW}" height="${NH}" rx="14" class="fam-card" style="--tc:${typeOf(c).color}"/>
      <clipPath id="${clip}"><circle cx="34" cy="${NH / 2}" r="22"/></clipPath>${im ? `<image href="${im.data}" x="12" y="${NH / 2 - 22}" width="44" height="44" clip-path="url(#${clip})" preserveAspectRatio="xMidYMid slice"/>` : `<circle cx="34" cy="${NH / 2}" r="22" fill="${typeOf(c).color}" opacity=".9"/><text x="34" y="${NH / 2 + 6}" text-anchor="middle" class="ini">${esc((c.name || "?")[0].toUpperCase())}</text>`}
      <text x="64" y="${NH / 2 - 3}" class="fam-name">${esc(entName(c).slice(0, 15))}</text><text x="64" y="${NH / 2 + 15}" class="fam-sub">${esc((at ? "age " + at : c.role || c.race || "").slice(0, 18))}</text></g>`; }).join("");
  el.innerHTML = pageHead("Family tree", `${ids.length} characters linked by Parent, Child, Sibling and Spouse connections.`) +
    `<div class="legend"><span class="chip"><span class="dot" style="background:var(--accent)"></span>Parent to child</span><span class="chip"><span class="dot" style="background:#e64980"></span>Spouse</span><span class="chip"><span class="dot dashed"></span>Sibling</span></div>
     <div class="web-wrap tree-wrap"><svg class="tree" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 1400)}px">${lines}${nodes}</svg></div>`;
}

/* ---------- Maps ---------- */
function renderMaps(el) {
  if (!state.maps.some(m => m.id === ui.mapId)) ui.mapId = state.maps[0]?.id;
  const m = state.maps.find(x => x.id === ui.mapId);
  const tabs = state.maps.map(x => `<button class="mtab ${x.id === ui.mapId ? "on" : ""}" data-vact="mapsel" data-id="${x.id}">${esc(x.name)}</button>`).join("");
  el.innerHTML = pageHead("Maps", "Upload a map and pin your places, characters and factions to it.",
    `<button class="btn primary" data-vact="mapadd">${ico("upload", 16)} Upload map</button><input type="file" id="mapFile" accept="image/*" hidden>`) +
    (m ? `<div class="mtabs">${tabs}</div>
      <div class="toolbar wrap"><button class="btn small ${ui.pinMode ? "primary" : ""}" data-vact="pinmode">${ico("pin", 15)} ${ui.pinMode ? "Click the map to drop a pin…" : "Add pin"}</button>
        <button class="btn small" data-vact="maprename">${ico("pencil", 15)} Rename</button><button class="btn small danger" data-vact="mapdel">${ico("trash", 15)} Delete map</button>
        <span class="muted small">${m.pins.length} pin${m.pins.length === 1 ? "" : "s"}. Drag pins to move them; click one for options.</span></div>
      <div class="map-wrap"><div class="map-stage ${ui.pinMode ? "placing" : ""}" id="mapStage"><img src="${m.data}" alt="${esc(m.name)}" draggable="false">${m.pins.map(pinHtml).join("")}</div></div>`
      : emptyState("map", "No maps yet", "Upload an image of your world, a city plan or a floor plan, then drop pins on it.", `<button class="btn primary" data-vact="mapadd">${ico("upload", 16)} Upload a map</button>`));
}
function pinHtml(p) {
  const c = p.eid ? byId(p.eid) : null, col = c ? typeOf(c).color : "var(--accent)";
  return `<button class="pin" data-pin="${p.id}" style="left:${p.x * 100}%;top:${p.y * 100}%;--tc:${col}" title="${esc(p.label || entName(c))}"><span class="pin-dot">${c ? ico(typeOf(c).icon, 13) : ico("pin", 13)}</span><span class="pin-label">${esc(p.label || (c ? entName(c) : "Pin"))}</span></button>`;
}
async function addMapFile(file) {
  try {
    const url = URL.createObjectURL(file); let data;
    try { data = await resizeImage(url, 2200, 0.86); } finally { URL.revokeObjectURL(url); }
    const m = { id: uid(), name: file.name.replace(/\.[^.]+$/, "") || "Map", data, pins: [] };
    state.maps.push(m); ui.mapId = m.id; save(); renderMaps($("#view")); toast("Map added");
  } catch (e) { toast("Could not read that image"); }
}
function bindMaps(view) {
  let drag = null;
  view.addEventListener("pointerdown", e => {
    if (ui.view !== "maps") return;
    const pin = e.target.closest(".pin"); if (!pin) return;
    const m = state.maps.find(x => x.id === ui.mapId), p = m.pins.find(x => x.id === pin.dataset.pin); if (!p) return;
    drag = { pin, p, sx: e.clientX, sy: e.clientY, moved: false }; pin.setPointerCapture(e.pointerId); e.preventDefault();
  });
  view.addEventListener("pointermove", e => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const r = $("#mapStage img").getBoundingClientRect();
    drag.p.x = clamp((e.clientX - r.left) / r.width, 0, 1); drag.p.y = clamp((e.clientY - r.top) / r.height, 0, 1);
    drag.pin.style.left = drag.p.x * 100 + "%"; drag.pin.style.top = drag.p.y * 100 + "%";
  });
  view.addEventListener("pointerup", e => {
    if (!drag) return; const d = drag; drag = null;
    if (d.moved) { save(); return; }
    const c = d.p.eid ? byId(d.p.eid) : null, m = state.maps.find(x => x.id === ui.mapId);
    openMenu(d.pin, [
      ...(c ? [{ label: `Open ${entName(c)}`, icon: "arrow", fn: () => selectEntity(c.id) }] : []),
      { label: "Edit pin…", icon: "pencil", fn: () => editPin(d.p) },
      { label: "Delete pin", icon: "trash", danger: 1, fn: () => { m.pins = m.pins.filter(x => x !== d.p); save(); renderMaps($("#view")); } },
    ]);
  });
  view.addEventListener("click", e => {
    if (ui.view !== "maps" || !ui.pinMode) return;
    const stage = e.target.closest("#mapStage"); if (!stage || e.target.closest(".pin")) return;
    const r = $("#mapStage img").getBoundingClientRect(), m = state.maps.find(x => x.id === ui.mapId);
    const p = { id: uid(), x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1), eid: "", label: "" };
    m.pins.push(p); ui.pinMode = false; save(); renderMaps($("#view")); editPin(p);
  });
}
function editPin(p) {
  const m = openModal(`${modalHead("Map pin")}
    <label class="fld"><span>Link to an entry <em>(optional)</em></span><select id="pinEnt"><option value="">None, just a label</option>${state.characters.map(c => `<option value="${c.id}" ${c.id === p.eid ? "selected" : ""}>${esc(entName(c))} · ${typeOf(c).label}</option>`).join("")}</select></label>
    <label class="fld"><span>Label</span><input id="pinLabel" value="${esc(p.label)}" placeholder="Defaults to the entry's name" autofocus></label>
    <div class="toolbar"><span class="spacer"></span><button class="btn" data-modal-close>Cancel</button><button class="btn primary" id="pinOk">Save pin</button></div>`);
  $("#pinOk", m).onclick = () => { p.eid = $("#pinEnt", m).value; p.label = $("#pinLabel", m).value.trim(); save(); closeModal(); renderMaps($("#view")); };
}

/* ---------- Compare ---------- */
function similarNames(a, b) {
  const x = (a || "").trim().toLowerCase(), y = (b || "").trim().toLowerCase(); if (!x || !y) return false;
  if (x === y) return true;
  if (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x) || x.includes(" " + y) || y.includes(" " + x))) return true;
  if (Math.abs(x.length - y.length) <= 1 && x.length >= 5) { let d = 0, i = 0, j = 0; while (i < x.length && j < y.length) { if (x[i] === y[j]) { i++; j++; } else { d++; if (d > 1) return false; if (x.length > y.length) i++; else if (y.length > x.length) j++; else { i++; j++; } } } return d + (x.length - i) + (y.length - j) <= 1; }
  return false;
}
function findDuplicates() {
  const out = [], l = state.characters;
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) if (l[i].type === l[j].type && similarNames(l[i].name, l[j].name)) out.push([l[i], l[j]]);
  return out;
}
function renderCompare(el, arg) {
  if (arg) { ui.cmpA = arg; if (ui.cmpB === arg) ui.cmpB = ""; }
  const l = state.characters;
  if (l.length < 2) { el.innerHTML = pageHead("Compare") + emptyState("columns", "Need two entries", "Create at least two entries to compare them side by side."); return; }
  if (!byId(ui.cmpA)) ui.cmpA = state.currentId || l[0].id;
  if (!byId(ui.cmpB) || ui.cmpB === ui.cmpA) ui.cmpB = (l.find(c => c.id !== ui.cmpA && c.type === byId(ui.cmpA).type) || l.find(c => c.id !== ui.cmpA)).id;
  const A = byId(ui.cmpA), B = byId(ui.cmpB);
  const sel = (id, name) => `<select id="${name}">${l.map(c => `<option value="${c.id}" ${c.id === id ? "selected" : ""}>${esc(entName(c))} (${typeOf(c).label})</option>`).join("")}</select>`;
  const keys = [...new Set([...PROFILE[A.type].fields, ...PROFILE[A.type].areas, ...PROFILE[B.type].fields, ...PROFILE[B.type].areas].map(f => f.k))];
  const rows = [["Type", typeOf(A).label, typeOf(B).label], ["Age (story year)", ageText(A), ageText(B)],
    ...keys.map(k => [fieldLabel(A.type, k), A[k], B[k]]),
    ["Background", A.background, B.background],
    ["Tags", A.tags.join(", "), B.tags.join(", ")],
    ["Notes", A.notes.length, B.notes.length], ["Timeline events", A.timeline.length, B.timeline.length], ["Connections", A.relations.length, B.relations.length], ["Photos", A.images.length, B.images.length], ["Words written", entityWords(A), entityWords(B)], ["Completeness", completeness(A).pct + "%", completeness(B).pct + "%"]]
    .filter(r => String(r[1] ?? "").trim() || String(r[2] ?? "").trim());
  const head = c => `<div class="cmp-head" style="--tc:${typeOf(c).color}">${avatarHtml(c, "lg")}<b>${esc(entName(c))}</b><button class="link" data-open="${c.id}">Open</button></div>`;
  const dups = findDuplicates();
  el.innerHTML = pageHead("Compare & merge", "See two entries side by side. Differences are highlighted.", `<button class="btn small" data-vact="swapcmp">${ico("swap", 15)} Swap</button>`) +
    `<div class="cmp-pick">${sel(A.id, "cmpA")}<span class="muted">vs</span>${sel(B.id, "cmpB")}</div>
    <div class="table-wrap"><table class="tbl cmp"><thead><tr><th></th><th>${head(A)}</th><th>${head(B)}</th></tr></thead><tbody>
    ${rows.map(([lbl, a, b]) => { const diff = String(a ?? "").trim() !== String(b ?? "").trim(); return `<tr class="${diff ? "diff" : ""}"><th>${esc(lbl)}</th><td>${esc(a ?? "")}</td><td>${esc(b ?? "")}</td></tr>`; }).join("")}</tbody></table></div>
    <div class="toolbar wrap"><button class="btn primary" data-vact="mergeab">${ico("merge", 16)} Merge ${esc(entName(A))} into ${esc(entName(B))}</button><button class="btn" data-vact="mergeba">Merge ${esc(entName(B))} into ${esc(entName(A))}</button></div>
    ${dups.length ? `<h2 class="sec">Possible duplicates</h2><div class="stack">${dups.slice(0, 8).map(([a, b]) => `<button class="mini-card dupe" data-vact="cmppair" data-a="${a.id}" data-b="${b.id}"><div>${entityChip(a)} <span class="muted">and</span> ${entityChip(b)}</div><span class="muted small">Compare</span></button>`).join("")}</div>` : ""}`;
}
function openMerge(srcId, dstId) {
  const src = byId(srcId); if (!src) return;
  const targets = state.characters.filter(c => c.id !== srcId).sort((a, b) => (b.type === src.type) - (a.type === src.type) || entName(a).localeCompare(entName(b)));
  if (!targets.length) return toast("Create another entry to merge into first");
  const dflt = dstId || targets[0].id;
  const m = openModal(`${modalHead("Merge entries", "Combine two entries into one. Nothing is lost: the merged-away entry goes to Trash for 30 days.")}
    <label class="fld"><span>Merge <b>${esc(entName(src))}</b> into…</span><select id="mgDst">${targets.map(c => `<option value="${c.id}" ${c.id === dflt ? "selected" : ""}>${esc(entName(c))} (${typeOf(c).label})</option>`).join("")}</select></label>
    <div class="radios"><label class="check"><input type="radio" name="mgMode" value="fill" checked><span><b>Fill gaps</b>: keep the target's text, only fill in fields that are empty</span></label>
    <label class="check"><input type="radio" name="mgMode" value="combine"><span><b>Combine text</b>: if both have text, keep both</span></label></div>
    <p class="muted small">Notes, photos, events, connections, tags and scene links are always combined, and links elsewhere are redirected to the target.</p>
    <div class="toolbar"><span class="spacer"></span><button class="btn" data-modal-close>Cancel</button><button class="btn primary" id="mgGo">${ico("merge", 16)} Merge</button></div>`);
  $("#mgGo", m).onclick = async () => { const d = $("#mgDst", m).value, mode = $('input[name="mgMode"]:checked', m).value; closeModal(); await performMerge(srcId, d, mode); };
}
async function performMerge(srcId, dstId, mode) {
  const src = byId(srcId), dst = byId(dstId); if (!src || !dst || src === dst) return;
  await snapshot("Before merging " + entName(src), false);
  TEXT_KEYS.forEach(k => {
    if (k === "name") return;
    const a = (dst[k] || "").trim(), b = (src[k] || "").trim(); if (!b) return;
    if (!a) dst[k] = src[k];
    else if (mode === "combine" && a !== b && !a.includes(b)) dst[k] = a + `\n\n— from ${entName(src)} —\n` + b;
  });
  ["birthYear", "deathYear"].forEach(k => { if (!dst[k] && src[k]) dst[k] = src[k]; });
  dst.fav = dst.fav || src.fav;
  dst.stories = [...new Set([...dst.stories, ...src.stories])]; dst.tags = [...new Set([...dst.tags, ...src.tags])];
  src.images.forEach(i => { if (!dst.images.some(x => x.id === i.id)) dst.images.push(i); }); dst.mainImage ||= dst.images[0]?.id ?? null;
  dst.notes.push(...src.notes); dst.timeline.push(...src.timeline); dst.voiceLines.push(...src.voiceLines); dst.arcBeats.push(...src.arcBeats);
  dst.voiceTraits = [...new Set([...dst.voiceTraits, ...src.voiceTraits])];
  src.relations.forEach(r => { if (!dst.relations.some(x => x.name.trim().toLowerCase() === r.name.trim().toLowerCase() && x.kind === r.kind) && r.name.trim().toLowerCase() !== (dst.name || "").trim().toLowerCase()) dst.relations.push(r); });
  src.customFields.forEach(f => { const ex = dst.customFields.find(x => x.label.trim().toLowerCase() === f.label.trim().toLowerCase()); if (!ex) dst.customFields.push(f); else if (!ex.value) ex.value = f.value; });
  const sn = (src.name || "").trim().toLowerCase();
  if (sn) state.characters.forEach(o => o.relations.forEach(r => { if ((r.name || "").trim().toLowerCase() === sn) r.name = dst.name; }));
  dst.relations = dst.relations.filter(r => (r.name || "").trim().toLowerCase() !== (dst.name || "").trim().toLowerCase());
  state.scenes.forEach(s => { if (s.characterIds.includes(src.id)) { s.characterIds = s.characterIds.filter(x => x !== src.id); if (!s.characterIds.includes(dst.id)) s.characterIds.push(dst.id); } });
  state.maps.forEach(mp => mp.pins.forEach(p => { if (p.eid === src.id) p.eid = dst.id; }));
  trashPush("entity", entName(src) + " (merged)", src, { charType: src.type });
  state.characters = state.characters.filter(c => c.id !== src.id);
  touch(dst); resetWritingBaseline(); save(true);
  selectEntity(dst.id); toast(`Merged into ${entName(dst)}. The original is in Trash.`);
}

/* ---------- view events ---------- */
function bindViews(view) {
  bindWebDrag(view); bindMaps(view);
  view.addEventListener("click", e => {
    if (ui.view === "editor") return;
    if (e.target.closest(".x")) { /* chip remove handled via vact */ }
    const a = e.target.closest("[data-vact]");
    if (a) return viewAction(a, e);
    const o = e.target.closest("[data-open]");
    if (o) selectEntity(o.dataset.open, o.dataset.tab);
  });
  view.addEventListener("input", e => {
    if (ui.view === "scenes" || ui.view === "home") {
      const t = e.target;
      if (t.dataset.sk) { const s = state.scenes.find(x => x.id === t.closest("[data-scene]").dataset.scene); if (s) { s[t.dataset.sk] = t.value; save(); } }
      if (t.id === "homeYear") { state.settings.storyYear = t.value; renderSidebar(); save(); }
    }
  });
  view.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "tlFilter") { ui.tlFilter = t.value; renderGlobalTimeline($("#view")); }
    else if (t.id === "sceneFilter") { ui.sceneFilter = t.value; renderScenes($("#view")); }
    else if (t.dataset.vact === "sceneadd" && t.value) { const s = state.scenes.find(x => x.id === t.closest("[data-scene]").dataset.scene); s.characterIds.push(t.value); save(); renderScenes($("#view")); }
    else if (t.id === "webLabels") { ui.webLabels = t.checked; drawWeb(); }
    else if (t.id === "cmpA") { ui.cmpA = t.value; renderCompare($("#view")); }
    else if (t.id === "cmpB") { ui.cmpB = t.value; renderCompare($("#view")); }
    else if (t.id === "mapFile" && t.files[0]) { addMapFile(t.files[0]); t.value = ""; }
  });
}
async function viewAction(a, e) {
  const v = a.dataset.vact, view = $("#view");
  switch (v) {
    case "new": createEntity(a.dataset.type); break;
    case "import": $("#importFile").click(); break;
    case "export": openExport(); break;
    case "history": openHistory(); break;
    case "prompts": openPrompts({}); break;
    case "goal": { const g = await dialog({ title: "Daily writing goal", body: "How many words a day would you like to write?", ok: "Save", input: { value: String(state.settings.dailyGoal), type: "number" } }); if (g && +g > 0) { state.settings.dailyGoal = Math.round(+g); save(); renderHome(view); } break; }
    case "filtertype": ui.type = a.dataset.type; renderSidebar(); showView("browse"); break;
    case "browsemode": state.settings.browse = a.dataset.mode; save(); renderBrowse(view); break;
    case "browsesort": ui.browseSort = ui.browseSort.k === a.dataset.k ? { k: a.dataset.k, dir: -ui.browseSort.dir } : { k: a.dataset.k, dir: 1 }; renderBrowse(view); break;
    case "scenenew": { const s = { id: uid(), created: Date.now(), chapter: "", title: "", summary: "", characterIds: ui.sceneFilter ? [ui.sceneFilter] : [] }; state.scenes.push(s); save(); renderScenes(view); view.querySelector(`[data-scene="${s.id}"] [data-sk=chapter]`)?.focus(); break; }
    case "scenedel": { const id = a.closest("[data-scene]").dataset.scene; if (await confirmBox("Delete this scene?", "The scene is removed from every entry.")) { state.scenes = state.scenes.filter(s => s.id !== id); save(); renderScenes(view); } break; }
    case "sceneremove": { e.stopPropagation(); const s = state.scenes.find(x => x.id === a.closest("[data-scene]").dataset.scene); s.characterIds = s.characterIds.filter(x => x !== a.dataset.id); save(); renderScenes(view); break; }
    case "webreset": renderWeb(view); break;
    case "mapadd": $("#mapFile").click(); break;
    case "mapsel": ui.mapId = a.dataset.id; ui.pinMode = false; renderMaps(view); break;
    case "pinmode": ui.pinMode = !ui.pinMode; renderMaps(view); break;
    case "maprename": { const m = state.maps.find(x => x.id === ui.mapId), n = await promptBox("Rename map", m.name); if (n) { m.name = n; save(); renderMaps(view); } break; }
    case "mapdel": { const m = state.maps.find(x => x.id === ui.mapId); if (await confirmBox(`Move "${m.name}" to Trash?`, "Pins are kept if you restore it.", "Move to Trash")) { trashPush("map", m.name, m); state.maps = state.maps.filter(x => x !== m); save(); renderMaps(view); toast("Map moved to Trash"); } break; }
    case "swapcmp": [ui.cmpA, ui.cmpB] = [ui.cmpB, ui.cmpA]; renderCompare(view); break;
    case "cmppair": ui.cmpA = a.dataset.a; ui.cmpB = a.dataset.b; renderCompare(view); break;
    case "mergeab": openMerge(ui.cmpA, ui.cmpB); break;
    case "mergeba": openMerge(ui.cmpB, ui.cmpA); break;
  }
}

Object.assign(VIEWS, { home: renderHome, editor: renderEditor, browse: renderBrowse, timeline: renderGlobalTimeline, scenes: renderScenes, web: renderWeb, family: renderFamily, maps: renderMaps, compare: renderCompare });
