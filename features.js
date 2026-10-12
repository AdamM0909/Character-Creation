"use strict";
/* Extra features: custom fields + templates, voice, timelines, relationship web,
   global search, name generator, age calculator, markdown export, backup helpers.
   Loaded after app.js and shares its globals (state, cur, save, ui, esc, ...). */

const PRESET_TEMPLATES = [
  { name: "Fantasy hero", fields: ["Magic / abilities", "Home region", "Faction / order", "Signature weapon", "Greatest fear"] },
  { name: "Villain", fields: ["Motive", "Method", "Weakness", "Plan", "Redeeming trait", "Origin of grudge"] },
  { name: "Sci-fi crew", fields: ["Ship / station", "Rank", "Specialty", "Augmentations", "Homeworld", "Loyalty"] },
  { name: "Romance lead", fields: ["Love language", "What they hide", "Dealbreakers", "Ideal date", "Past relationships"] },
];
const VOICE_TRAITS = ["Uses contractions", "Formal speech", "Swears", "Humor / sarcasm", "Short sentences",
  "Rambles when nervous", "Asks lots of questions", "Uses slang", "Goes silent under pressure", "Speaks in metaphors"];
const REL_COLORS = { Family: "#2f9e44", Friend: "#1c7ed6", Ally: "#0c8599", Rival: "#f08c00", Enemy: "#d6336c", Lover: "#e64980", Mentor: "#7c4dff", Colleague: "#868e96", Other: "#adb5bd" };

const pick = a => a[Math.floor(Math.random() * a.length)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const NAME_SETS = {
  "Fantasy": () => cap(pick(["ael", "bran", "cal", "dor", "eld", "fen", "gal", "hal", "ith", "kor", "lys", "mar", "nor", "per", "rav", "sel", "tor", "vel", "wyn"]) + pick(["a", "e", "i", "o", "an", "en", "ar", "or", "ia"]) + pick(["dor", "wen", "thir", "mir", "la", "ric", "ron", "dis", "na", "vyn", "ra", "gar"])),
  "Elven": () => cap(pick(["ae", "cae", "elen", "lor", "sil", "tha", "ar", "gal", "ny", "fae"]) + pick(["la", "ri", "ne", "vi", "th", "el"]) + pick(["riel", "wen", "dil", "lian", "thas", "nor", "iel"])),
  "Dwarven": () => cap(pick(["bar", "dur", "gim", "thor", "bor", "kaz", "dra", "hurn", "mor", "nal"]) + pick(["in", "ek", "dak", "grim", "li", "bur", "din", "rak", "nar", "gar"])) + " " + pick(["Ironfist", "Stonebeard", "Deepdelver", "Anvilborn", "Goldvein", "Hammerfall"]),
  "Sci-fi": () => pick(["Kira", "Jax", "Nova", "Orin", "Zed", "Lyra", "Taro", "Vex", "Mira", "Cade", "Rho", "Sable"]) + " " + pick(["Voss", "Kade", "Okafor", "Tanaka", "Reyes", "Chen", "Halloran", "Singh", "Mbeki", "Orlov"]),
  "Modern": () => pick(["Emma", "Liam", "Noah", "Ava", "Maya", "Ethan", "Zoe", "Lucas", "Priya", "Marcus", "Chloe", "Diego", "Hana", "Owen"]) + " " + pick(["Walker", "Morgan", "Patel", "Garcia", "Kim", "Brooks", "Nguyen", "Foster", "Rossi", "Hughes"]),
  "Medieval": () => pick(["Edmund", "Godric", "Alys", "Matilda", "Wulfric", "Isolde", "Aldric", "Edith", "Hugh", "Maud", "Leofric", "Cecily"]) + " " + pick(["Smith", "Fletcher", "of Ashford", "Thatcher", "Blackwood", "Hale", "Cooper"]),
};

const ev = {}; // linked backup file state
const evtKey = d => { const m = String(d || "").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : Infinity; };
const sortEvents = list => list.map((e, i) => [e, i]).sort((a, b) => (evtKey(a[0].date) - evtKey(b[0].date)) || (a[1] - b[1]) || 0).map(x => x[0]);

/* ---------- per-character renders ---------- */
function renderExtras() {
  renderCustomFields(); renderTemplates(); renderVoice(); renderTimeline();
  const c = cur(); if (c) $("#tlCount").textContent = c.timeline.length || "";
}

function renderTemplates() {
  const opts = PRESET_TEMPLATES.map((t, i) => `<option value="p:${i}">${esc(t.name)}</option>`)
    .concat(state.templates.map((t, i) => `<option value="u:${i}">★ ${esc(t.name)}</option>`));
  $("#tplSelect").innerHTML = `<option value="">Template…</option>` + opts.join("");
}
function renderCustomFields() {
  const c = cur(); if (!c) return;
  $("#customFields").innerHTML = c.customFields.map(f => `
    <div class="cf" data-cid="${f.id}">
      <div class="cf-head"><input data-cf="label" value="${esc(f.label)}" placeholder="Field name"><button type="button" class="icon-btn" data-act="delcf" title="Remove field">✕</button></div>
      <textarea data-cf="value" rows="2">${esc(f.value)}</textarea>
    </div>`).join("") || `<p class="muted tiny" style="grid-column:1/-1">Add fields of your own (magic type, faction, accent…) or apply a template.</p>`;
}
function renderVoice() {
  const c = cur(); if (!c) return;
  $("#voiceChecks").innerHTML = VOICE_TRAITS.map(t => `<label class="check"><input type="checkbox" data-trait="${esc(t)}" ${c.voiceTraits.includes(t) ? "checked" : ""}> ${esc(t)}</label>`).join("");
  $("#voiceLines").innerHTML = c.voiceLines.map(l => `
    <div class="card" data-lid="${l.id}">
      <div class="card-top"><input data-lf="context" value="${esc(l.context)}" placeholder="Situation (e.g. when angry, flirting)"><button type="button" class="icon-btn" data-act="dellin" title="Remove">🗑</button></div>
      <textarea data-lf="text" rows="2" placeholder="&quot;Something only they would say.&quot;">${esc(l.text)}</textarea>
    </div>`).join("") || `<p class="muted tiny">No sample lines yet.</p>`;
}
function renderTimeline() {
  const c = cur(); if (!c) return;
  $("#eventList").innerHTML = sortEvents(c.timeline).map(e => `
    <div class="tl-item" data-eid="${e.id}">
      <div class="tl-dot"></div>
      <div class="card">
        <div class="card-top">
          <input data-ef="date" class="tl-date" value="${esc(e.date)}" placeholder="Date / year">
          <input data-ef="title" value="${esc(e.title)}" placeholder="What happened?">
          <button type="button" class="icon-btn" data-act="delev" title="Remove">🗑</button>
        </div>
        <textarea data-ef="desc" rows="2" placeholder="Details…">${esc(e.desc)}</textarea>
      </div>
    </div>`).join("") || `<p class="muted">No events yet. Add births, key scenes, turning points.</p>`;
}

/* ---------- global views ---------- */
function openGlobal(title, bodyHtml) {
  $("#empty").hidden = true; $("#editor").hidden = true;
  const g = $("#globalView"); g.hidden = false;
  g.innerHTML = `<div class="toolbar"><h2>${esc(title)}</h2><span class="spacer"></span><button class="btn small" id="gBack">← Back</button></div>${bodyHtml}`;
  $("#gBack").onclick = () => showEditor();
  $("#sidebar").classList.remove("open");
}
function goChar(id, tab) { ui.tab = tab || ui.tab; selectChar(id); }

function showGlobalTimeline(filterId = "") {
  const all = state.characters.flatMap(c => c.timeline.map(e => ({ ...e, c }))).filter(e => !filterId || e.c.id === filterId);
  const sorted = sortEvents(all);
  const sel = `<select id="gFilter" style="width:auto"><option value="">All characters</option>${state.characters.map(c => `<option value="${c.id}" ${c.id === filterId ? "selected" : ""}>${esc(c.name || "Unnamed")}</option>`).join("")}</select>`;
  openGlobal("Master timeline", `<div class="toolbar">${sel}<span class="muted tiny">${sorted.length} events. Click one to edit it.</span></div>
    <div class="timeline">${sorted.map(e => `<div class="tl-item" data-go="${e.c.id}"><div class="tl-dot"></div><div class="card clickable">
      <div class="card-top"><span class="badge" style="--c:var(--accent)">${esc(e.date || "?")}</span><b>${esc(e.title || "Untitled")}</b><span class="spacer"></span><span class="chip">${esc(e.c.name || "Unnamed")}</span></div>
      ${e.desc ? `<div class="muted">${esc(e.desc)}</div>` : ""}</div></div>`).join("") || `<p class="muted">No events yet. Open a character's Timeline tab to add some.</p>`}</div>`);
  $("#gFilter").onchange = e => showGlobalTimeline(e.target.value);
  $$("#globalView [data-go]").forEach(el => el.onclick = () => goChar(el.dataset.go, "timeline"));
}

function showWeb() {
  const chars = state.characters;
  const byName = new Map(chars.map(c => [(c.name || "").trim().toLowerCase(), c.id]));
  const nodes = chars.map(c => ({ id: c.id, label: c.name || "Unnamed", real: true }));
  const ext = new Map(); const edges = new Map();
  chars.forEach(c => c.relations.forEach(r => {
    const nm = (r.name || "").trim(); if (!nm) return;
    let tid = byName.get(nm.toLowerCase());
    if (!tid) { tid = "x:" + nm.toLowerCase(); if (!ext.has(tid)) { ext.set(tid, true); nodes.push({ id: tid, label: nm, real: false }); } }
    if (tid === c.id) return;
    const key = [c.id, tid].sort().join("|");
    const e = edges.get(key) || { a: c.id, b: tid, kinds: new Set() };
    e.kinds.add(r.kind); edges.set(key, e);
  }));
  if (!nodes.length) return openGlobal("Relationship web", `<p class="muted">Create some characters and add relationships first. Relationship names that match a character name link to them automatically.</p>`);
  const W = 900, H = 640, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 110;
  const pos = new Map(nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return [n.id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a }];
  }));
  const lines = [...edges.values()].map(e => {
    const p = pos.get(e.a), q = pos.get(e.b); const kinds = [...e.kinds];
    return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${REL_COLORS[kinds[0]] || "#999"}" stroke-width="3" opacity=".75"/>
      <text x="${(p.x + q.x) / 2}" y="${(p.y + q.y) / 2}" text-anchor="middle" class="web-edge">${esc(kinds.join(" / "))}</text>`;
  }).join("");
  const dots = nodes.map(n => {
    const p = pos.get(n.id); const right = Math.cos(p.a) >= 0;
    return `<g ${n.real ? `class="web-node" data-go="${n.id}"` : ""}>
      <circle cx="${p.x}" cy="${p.y}" r="${n.real ? 16 : 11}" fill="${n.real ? "var(--accent)" : "var(--muted)"}"/>
      <text x="${p.x + (right ? 22 : -22)}" y="${p.y + 5}" text-anchor="${right ? "start" : "end"}" class="web-label">${esc(n.label)}</text></g>`;
  }).join("");
  const legend = Object.entries(REL_COLORS).map(([k, c]) => `<span class="chip"><span class="dot" style="background:${c}"></span> ${k}</span>`).join(" ");
  openGlobal("Relationship web", `<p class="muted tiny">Big dots are your characters (click to open); small grey dots are names not yet in your vault.</p>
    <div class="legend">${legend}</div><svg class="web" viewBox="0 0 ${W} ${H}">${lines}${dots}</svg>`);
  $$("#globalView [data-go]").forEach(el => el.onclick = () => goChar(el.dataset.go, "relations"));
}

/* ---------- search palette ---------- */
function searchIndex() {
  const out = [];
  state.characters.forEach(c => {
    const add = (tab, label, text) => { if (text && String(text).trim()) out.push({ c, tab, label, text: String(text) }); };
    ["nickname", "race", "occupation", "appearance", "personality", "goals", "flaws"].forEach(f => add("profile", cap(f), c[f]));
    add("profile", "Tags", c.tags.join(", "));
    ["background", "family", "skills"].forEach(f => add("background", cap(f), c[f]));
    add("voice", "Speech style", c.voiceStyle); add("voice", "Catchphrases", c.catchphrases);
    c.voiceLines.forEach(l => add("voice", "Sample line", l.context + " " + l.text));
    c.customFields.forEach(f => add("profile", f.label || "Custom field", f.value));
    c.timeline.forEach(e => add("timeline", "Event " + (e.date || ""), e.title + " " + e.desc));
    c.notes.forEach(n => add("notes", n.type + " note: " + (n.title || "untitled"), n.title + " " + n.body));
    c.relations.forEach(r => add("relations", r.kind + ": " + r.name, r.name + " " + r.desc));
    add("profile", "Name", c.name);
  });
  return out;
}
function openSearch() {
  const m = $("#modal"); m.className = "modal";
  m.innerHTML = `<input id="sq" placeholder="Search every character, note, event and line…" autocomplete="off"><div id="sres" class="results"></div>`;
  $("#overlay").hidden = false; $("#sq").focus();
  const idx = searchIndex();
  const run = () => {
    const q = $("#sq").value.trim().toLowerCase();
    if (!q) { $("#sres").innerHTML = `<p class="muted tiny">Type to search ${idx.length} text blocks.</p>`; return; }
    const hits = idx.filter(i => i.text.toLowerCase().includes(q) || (i.c.name || "").toLowerCase().includes(q)).slice(0, 40);
    $("#sres").innerHTML = hits.map((h, n) => {
      const at = Math.max(0, h.text.toLowerCase().indexOf(q)); const snip = h.text.slice(Math.max(0, at - 30), at + 90).replace(/\s+/g, " ");
      return `<div class="hit" data-n="${n}"><b>${esc(h.c.name || "Unnamed")}</b> <span class="muted tiny">${esc(h.label)}</span><div class="muted tiny">…${esc(snip)}…</div></div>`;
    }).join("") || `<p class="muted tiny">No matches.</p>`;
    $$("#sres .hit").forEach(el => el.onclick = () => { const h = hits[+el.dataset.n]; closeOverlay(); goChar(h.c.id, h.tab); });
    ev.hits = hits;
  };
  $("#sq").oninput = run; run();
  $("#sq").onkeydown = e => { if (e.key === "Enter" && ev.hits?.[0]) { const h = ev.hits[0]; closeOverlay(); goChar(h.c.id, h.tab); } };
}

/* ---------- name generator ---------- */
function openNameGen() {
  const m = $("#modal"); m.className = "modal";
  m.innerHTML = `<div class="modal-head"><b>Name generator</b><span class="spacer"></span><button type="button" class="btn small" id="ngClose">Close</button></div>
    <div class="toolbar"><select id="ngSet" style="width:auto">${Object.keys(NAME_SETS).map(k => `<option>${k}</option>`).join("")}</select>
    <button type="button" class="btn primary" id="ngGo">🎲 Roll again</button></div>
    <p class="muted tiny">${cur() ? "Click a name to use it for this character." : "Click a name to copy it."}</p><div id="ngList" class="names"></div>`;
  const roll = () => {
    const f = NAME_SETS[$("#ngSet").value];
    const names = [...new Set(Array.from({ length: 12 }, f))];
    $("#ngList").innerHTML = names.map(n => `<button type="button" class="chip big" data-n="${esc(n)}">${esc(n)}</button>`).join("");
  };
  $("#ngGo").onclick = roll; $("#ngSet").onchange = roll; $("#ngClose").onclick = closeOverlay;
  $("#ngList").onclick = e => {
    const n = e.target.dataset.n; if (!n) return;
    const c = cur();
    if (c) { c.name = n; touch(c); $('[data-f="name"]').value = n; renderSidebar(); save(); toast("Name set to " + n); }
    else navigator.clipboard?.writeText(n).then(() => toast("Copied " + n));
    closeOverlay();
  };
  $("#overlay").hidden = false; roll();
}

/* ---------- markdown export ---------- */
function charMarkdown(c) {
  const L = [`# ${c.name || "Unnamed"}`];
  if (c.nickname) L.push(`*${c.nickname}*`);
  const facts = [["Age", c.age], ["Race / species", c.race], ["Gender", c.gender], ["Role", c.role], ["Occupation", c.occupation],
    ["Status", c.status], ["Birth", c.birth], ["Build", c.build], ["Eyes & hair", c.looks], ["Alignment", c.alignment],
    ["Tags", c.tags.join(", ")], ...c.customFields.map(f => [f.label, f.value])].filter(f => f[1]);
  if (facts.length) L.push("", ...facts.map(([k, v]) => `- **${k}:** ${String(v).replace(/\n/g, " ")}`));
  const sec = (h, t) => t && t.trim() && L.push("", `## ${h}`, t.trim());
  sec("Appearance", c.appearance); sec("Personality", c.personality); sec("Goals & motivations", c.goals); sec("Flaws & fears", c.flaws);
  sec("Background", c.background); sec("Family", c.family); sec("Skills & abilities", c.skills);
  if (c.voiceStyle || c.catchphrases || c.voiceTraits.length || c.voiceLines.length) {
    L.push("", "## Voice");
    if (c.voiceStyle) L.push(c.voiceStyle.trim());
    if (c.catchphrases) L.push("", `**Catchphrases:** ${c.catchphrases.trim()}`);
    if (c.voiceTraits.length) L.push("", ...c.voiceTraits.map(t => `- ${t}`));
    c.voiceLines.forEach(l => L.push("", `> ${l.text}${l.context ? ` *(${l.context})*` : ""}`));
  }
  if (c.timeline.length) L.push("", "## Timeline", ...sortEvents(c.timeline).map(e => `- **${e.date || "?"}:** ${e.title}${e.desc ? ". " + e.desc : ""}`));
  if (c.relations.length) L.push("", "## Relationships", ...c.relations.map(r => `- **${r.name || "?"}** (${r.kind}): ${r.desc || ""}`));
  if (c.notes.length) { L.push("", "## Notes"); c.notes.forEach(n => L.push("", `### ${n.title || "Untitled"} _(${n.type})_`, n.body)); }
  return L.join("\n") + "\n";
}

/* ---------- backup helpers ---------- */
function renderBackup() {
  const when = state.lastBackup ? new Date(state.lastBackup).toLocaleString() : "never";
  const info = $("#backupInfo");
  let linked = "";
  if (ev.handle) linked = ev.ok ? ` Auto-backup to ${ev.handle.name} is on.` : ` Auto-backup to ${ev.handle.name} needs permission.`;
  info.textContent = `Last backup: ${when}.${linked}`;
  const lb = $("#linkBtn"); lb.hidden = !window.showSaveFilePicker;
  lb.textContent = ev.handle ? (ev.ok ? "Change auto-backup file" : "Reconnect auto-backup file") : "Link auto-backup file";
  const stale = state.characters.length && (Date.now() - state.lastBackup > 7 * 864e5) && Date.now() > state.backupSnooze && !(ev.handle && ev.ok);
  const bar = $("#backupBar"); bar.hidden = !stale;
  if (!stale) bar.innerHTML = "";
  if (stale && !bar.firstChild) {
    bar.innerHTML = `<span>⚠ Your characters are stored only in this browser. Last backup: <b>${esc(when)}</b>.</span>
      <button class="btn small primary" id="bbNow">Back up now</button><button class="btn small" id="bbLater">Remind me in 7 days</button>`;
    $("#bbNow").onclick = () => $("#exportBtn").click();
    $("#bbLater").onclick = () => { state.backupSnooze = Date.now() + 7 * 864e5; save(); renderBackup(); };
  }
}
let fileTimer;
function afterSave() {
  renderBackup();
  clearTimeout(fileTimer);
  if (!ev.handle || !ev.ok) return;
  fileTimer = setTimeout(async () => {
    try {
      const w = await ev.handle.createWritable();
      await w.write(JSON.stringify({ app: "character-vault", version: 2, characters: state.characters, templates: state.templates }, null, 1));
      await w.close(); state.lastBackup = Date.now(); renderBackup();
    } catch (e) { ev.ok = false; renderBackup(); toast("Auto-backup failed: " + (e.message || e)); }
  }, 2500);
}
async function linkBackup() {
  try {
    if (ev.handle && !ev.ok) {
      ev.ok = (await ev.handle.requestPermission({ mode: "readwrite" })) === "granted";
    } else {
      ev.handle = await window.showSaveFilePicker({ suggestedName: "character-vault-backup.json", types: [{ description: "JSON", accept: { "application/json": [".json"] } }] });
      ev.ok = true; await DB.set(ev.handle, "handle");
    }
    renderBackup(); if (ev.ok) { afterSave(); toast("Auto-backup linked"); }
  } catch (e) { if (e.name !== "AbortError") toast("Could not link file: " + e.message); }
}

/* ---------- wiring ---------- */
async function initFeatures() {
  try {
    ev.handle = await DB.get("handle");
    if (ev.handle) ev.ok = (await ev.handle.queryPermission({ mode: "readwrite" })) === "granted";
  } catch { ev.handle = null; }
  window.afterSave = afterSave; window.renderExtras = renderExtras; window.renderBackup = renderBackup;
  renderBackup();

  $("#viewTimeline").onclick = () => showGlobalTimeline();
  $("#viewWeb").onclick = showWeb;
  $("#searchBtn").onclick = openSearch;
  $("#linkBtn").onclick = linkBackup;
  $("#nameGenBtn").onclick = openNameGen;
  $("#mdBtn").onclick = () => { const c = cur(); download(`${(c.name || "character").replace(/[^\w-]+/g, "_")}.md`, charMarkdown(c), "text/markdown"); toast("Markdown exported"); };
  $("#focusBg").onclick = () => { const c = cur(); openFocus((c.name || "Character") + ": background", () => c.background, v => { c.background = v; touch(c); $('[data-f="background"]').value = v; updateCounts(); save(); }); };
  $("#calcBtn").onclick = () => {
    const b = parseInt($("#calcBirth").value), s = parseInt($("#calcStory").value);
    if (isNaN(b) || isNaN(s)) return toast("Enter a birth year and a story year");
    const c = cur(); c.age = String(s - b); $('[data-f="age"]').value = c.age; touch(c); renderSidebar(); save(); toast(`Age set to ${c.age}`);
  };
  $("#overlay").onclick = e => { if (e.target.id === "overlay") closeOverlay(); };
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !$("#overlay").hidden) closeOverlay();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
  });

  // custom fields + templates
  $("#addField").onclick = () => { const c = cur(); c.customFields.push({ id: uid(), label: "", value: "" }); touch(c); renderCustomFields(); save(); $$("#customFields .cf").pop().querySelector("input").focus(); };
  $("#customFields").addEventListener("input", e => {
    const row = e.target.closest("[data-cid]"); if (!row || !e.target.dataset.cf) return;
    const f = cur().customFields.find(x => x.id === row.dataset.cid); f[e.target.dataset.cf] = e.target.value; touch(cur()); save();
  });
  $("#customFields").addEventListener("click", e => {
    if (e.target.dataset.act !== "delcf") return;
    const c = cur(); c.customFields = c.customFields.filter(f => f.id !== e.target.closest("[data-cid]").dataset.cid); touch(c); renderCustomFields(); save();
  });
  $("#applyTpl").onclick = () => {
    const v = $("#tplSelect").value; if (!v) return toast("Pick a template first");
    const [k, i] = v.split(":"); const t = (k === "p" ? PRESET_TEMPLATES : state.templates)[+i]; const c = cur();
    const have = new Set(c.customFields.map(f => f.label.toLowerCase()));
    t.fields.filter(l => !have.has(l.toLowerCase())).forEach(l => c.customFields.push({ id: uid(), label: l, value: "" }));
    touch(c); renderCustomFields(); save(); toast(`Applied "${t.name}"`);
  };
  $("#saveTpl").onclick = () => {
    const c = cur(); const labels = c.customFields.map(f => f.label.trim()).filter(Boolean);
    if (!labels.length) return toast("Add some custom fields first");
    const name = prompt("Template name?"); if (!name) return;
    state.templates = state.templates.filter(t => t.name !== name); state.templates.push({ name, fields: labels });
    renderTemplates(); save(); toast("Template saved");
  };
  $("#delTpl").onclick = () => {
    const v = $("#tplSelect").value; if (!v.startsWith("u:")) return toast("Select one of your saved (★) templates to delete");
    if (!confirm("Delete this template?")) return;
    state.templates.splice(+v.slice(2), 1); renderTemplates(); save();
  };

  // voice
  $("#voiceChecks").addEventListener("change", e => {
    const t = e.target.dataset.trait; if (t === undefined) return; const c = cur();
    c.voiceTraits = e.target.checked ? [...c.voiceTraits, t] : c.voiceTraits.filter(x => x !== t); touch(c); save();
  });
  $("#addLine").onclick = () => { const c = cur(); c.voiceLines.push({ id: uid(), context: "", text: "" }); touch(c); renderVoice(); save(); $$("#voiceLines .card").pop().querySelector("input").focus(); };
  $("#voiceLines").addEventListener("input", e => {
    const row = e.target.closest("[data-lid]"); if (!row || !e.target.dataset.lf) return;
    cur().voiceLines.find(x => x.id === row.dataset.lid)[e.target.dataset.lf] = e.target.value; touch(cur()); save();
  });
  $("#voiceLines").addEventListener("click", e => {
    if (e.target.dataset.act !== "dellin") return;
    const c = cur(); c.voiceLines = c.voiceLines.filter(l => l.id !== e.target.closest("[data-lid]").dataset.lid); touch(c); renderVoice(); save();
  });

  // timeline
  $("#addEvent").onclick = () => {
    const c = cur(); const e = { id: uid(), date: "", title: "", desc: "" }; c.timeline.push(e); touch(c);
    renderTimeline(); $("#tlCount").textContent = c.timeline.length; save();
    $(`[data-eid="${e.id}"] input`).focus();
  };
  $("#eventList").addEventListener("input", e => {
    const row = e.target.closest("[data-eid]"); if (!row || !e.target.dataset.ef) return;
    cur().timeline.find(x => x.id === row.dataset.eid)[e.target.dataset.ef] = e.target.value; touch(cur()); save();
  });
  $("#eventList").addEventListener("change", e => {
    if (e.target.dataset.ef !== "date") return;
    // reorder the existing rows in place so focus and half-typed text survive
    const list = $("#eventList"), order = sortEvents(cur().timeline);
    order.forEach(ev2 => list.append(list.querySelector(`[data-eid="${ev2.id}"]`)));
  });
  $("#eventList").addEventListener("click", e => {
    if (e.target.dataset.act !== "delev") return;
    const c = cur(); c.timeline = c.timeline.filter(x => x.id !== e.target.closest("[data-eid]").dataset.eid); touch(c);
    renderTimeline(); $("#tlCount").textContent = c.timeline.length || ""; save();
  });
}
