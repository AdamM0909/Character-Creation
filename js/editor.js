"use strict";
/* Sidebar, navigation and the entity editor (profile, background, voice, arc, timeline, scenes, notes, gallery, relations). */

const PRESET_TEMPLATES = [
  { name: "Fantasy hero", fields: ["Magic / abilities", "Home region", "Faction / order", "Signature weapon", "Greatest fear"] },
  { name: "Villain", fields: ["Motive", "Method", "Weakness", "Plan", "Redeeming trait", "Origin of grudge"] },
  { name: "Sci-fi crew", fields: ["Ship / station", "Rank", "Specialty", "Augmentations", "Homeworld", "Loyalty"] },
  { name: "Romance lead", fields: ["Love language", "What they hide", "Dealbreakers", "Ideal date", "Past relationships"] },
];
const VOICE_TRAITS = ["Uses contractions", "Formal speech", "Swears", "Humor / sarcasm", "Short sentences", "Rambles when nervous", "Asks lots of questions", "Uses slang", "Goes silent under pressure", "Speaks in metaphors"];
const CLASSIC_BEATS = [["Ordinary world", 0], ["Inciting incident", -1], ["First plot point", 1], ["Rising complications", -2], ["Midpoint", 2], ["All is lost", -4], ["Dark night of the soul", -5], ["Climax", 3], ["Resolution", 4]];

const TABDEFS = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "background", label: "Background", icon: "book" },
  { id: "voice", label: "Voice", icon: "mic", types: ["character"] },
  { id: "arc", label: "Arc", icon: "chart", types: ["character"] },
  { id: "timeline", label: "Timeline", icon: "clock" },
  { id: "scenes", label: "Scenes", icon: "list" },
  { id: "notes", label: "Notes", icon: "note" },
  { id: "gallery", label: "Gallery", icon: "image" },
  { id: "relations", label: "Connections", icon: "web" },
];
function visibleTabs(c) {
  return TABDEFS.filter(t => (!t.types || t.types.includes(c.type)) && (t.id === "profile" || !state.settings.hiddenTabs.includes(t.id)));
}
function tabCount(c, id) {
  return ({ timeline: c.timeline.length, notes: c.notes.length, gallery: c.images.length, relations: c.relations.length, scenes: scenesOf(c).length })[id] || 0;
}
const scenesOf = c => state.scenes.filter(s => s.characterIds.includes(c.id));

/* ---------- sidebar ---------- */
function passesFilters(c) {
  if (ui.type !== "all" && c.type !== ui.type) return false;
  if (ui.story && !c.stories.includes(ui.story)) return false;
  if (ui.fav && !c.fav) return false;
  if (ui.tag && !c.tags.includes(ui.tag)) return false;
  if (ui.role && subtype(c) !== ui.role) return false;
  const q = ui.q.trim().toLowerCase();
  if (!q) return true;
  const hay = [c.name, c.nickname, subtype(c), c.race, c.occupation, c.tags.join(" "), c.notes.map(n => n.title + " " + n.body).join(" "), c.background, c.appearance, c.personality].join(" ").toLowerCase();
  return hay.includes(q);
}
function sortedFiltered() {
  const ageNum = c => parseFloat(ageText(c)) || 0;
  const cmp = {
    updated: (a, b) => b.updated - a.updated,
    created: (a, b) => b.created - a.created,
    name: (a, b) => (a.name || "~").localeCompare(b.name || "~"),
    age: (a, b) => ageNum(a) - ageNum(b),
    complete: (a, b) => completeness(b).pct - completeness(a).pct,
  }[ui.sort];
  return state.characters.filter(passesFilters).sort((a, b) => (b.fav - a.fav) || cmp(a, b));
}
function avatarHtml(c, cls = "") {
  const im = portraitOf(c), t = typeOf(c);
  return `<div class="avatar ${cls}" style="--tc:${t.color};${im ? `background-image:url('${im.data}')` : ""}">${im ? "" : (c.name ? esc(c.name.trim()[0].toUpperCase()) : ico(t.icon, 18))}</div>`;
}
function renderSidebar() {
  // type pills
  const counts = { all: state.characters.length };
  Object.keys(TYPES).forEach(t => counts[t] = state.characters.filter(c => c.type === t).length);
  $("#typePills").innerHTML = [["all", "All", "grid"], ...Object.entries(TYPES).map(([k, v]) => [k, v.plural, v.icon])]
    .map(([k, l, i]) => `<button class="pill ${ui.type === k ? "on" : ""}" data-type="${k}" title="${l}">${ico(i, 15)}<span>${counts[k]}</span></button>`).join("");
  // story / role filters
  const sf = $("#filterStory");
  sf.innerHTML = `<option value="">All stories</option>` + state.stories.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  if (!state.stories.some(s => s.id === ui.story)) ui.story = ""; sf.value = ui.story;
  const roles = [...new Set(state.characters.filter(c => ui.type === "all" || c.type === ui.type).map(subtype).filter(Boolean))].sort();
  const rf = $("#filterRole");
  rf.innerHTML = `<option value="">All kinds</option>` + roles.map(r => `<option>${esc(r)}</option>`).join("");
  if (!roles.includes(ui.role)) ui.role = ""; rf.value = ui.role;
  $("#favToggle").classList.toggle("on", ui.fav);
  // tags
  const tags = [...new Set(state.characters.flatMap(c => c.tags))].sort();
  if (ui.tag && !tags.includes(ui.tag)) ui.tag = "";
  $("#tagCloud").innerHTML = tags.map(t => `<span class="chip ${t === ui.tag ? "on" : ""}" data-tag="${esc(t)}">${esc(t)}</span>`).join("");
  // list
  const list = sortedFiltered();
  $("#charList").innerHTML = list.map(c => {
    const t = typeOf(c), cp = completeness(c).pct, sum = entitySummary(c);
    return `<li data-id="${c.id}" class="${c.id === state.currentId && ui.view === "editor" ? "active" : ""}" style="--tc:${t.color}">
      ${avatarHtml(c)}
      <div class="li-body"><div class="li-name">${esc(entName(c))}${c.fav ? `<span class="li-star">${ico("star", 12)}</span>` : ""}</div>
      <div class="li-sub">${esc(sum || t.label)}</div>
      <div class="li-bar" title="${cp}% complete"><i style="width:${cp}%"></i></div></div></li>`;
  }).join("") || `<li class="li-empty">${state.characters.length ? "Nothing matches these filters." : "No entries yet. Create your first one!"}</li>`;
  const notes = state.characters.reduce((n, c) => n + c.notes.length, 0);
  $("#stats").textContent = `${state.characters.length} entries · ${notes} notes · ${totalWords().toLocaleString()} words`;
  const nl = $("#nameList"); if (nl) nl.innerHTML = state.characters.map(c => `<option value="${esc(c.name)}"></option>`).join("");
}
function renderNav() {
  $$("#nav [data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === ui.view));
}

/* ---------- entity lifecycle ---------- */
function createEntity(type = "character") {
  const c = blank(type);
  if (ui.story) c.stories = [ui.story];
  state.characters.unshift(c);
  selectEntity(c.id, "profile");
  save();
  const n = $('[data-f="name"]'); n?.focus();
  return c;
}
function selectEntity(id, tab) {
  state.currentId = id;
  const c = cur(); if (!c) return;
  if (tab) ui.tab = tab;
  if (!visibleTabs(c).some(t => t.id === ui.tab)) ui.tab = "profile";
  showView("editor");
  save();
}
async function deleteEntity(c) {
  const ok = await confirmBox(`Move "${entName(c)}" to Trash?`, "You can restore it from the Trash for 30 days.", "Move to Trash");
  if (!ok) return;
  trashPush("entity", entName(c), c, { charType: c.type });
  state.characters = state.characters.filter(x => x.id !== c.id);
  state.currentId = state.characters[0]?.id ?? null;
  save(true); showView(state.currentId ? "editor" : "home");
  toast(`${entName(c)} moved to Trash`, { action: "Undo", fn: () => { const t = state.trash.find(x => x.payload.id === c.id); if (t) { trashRestore(t.id); selectEntity(c.id); } } });
}
function duplicateEntity(c) {
  const copy = JSON.parse(JSON.stringify(c));
  copy.id = uid(); copy.name = (c.name || "Unnamed") + " (copy)"; copy.created = copy.updated = Date.now();
  state.characters.unshift(copy); selectEntity(copy.id); toast("Duplicated");
}

/* ---------- editor shell ---------- */
function renderEditor(el) {
  const c = cur();
  if (!c) { ui.view = "home"; return renderHome(el); }
  el.innerHTML = `<div class="editor">${heroHtml(c)}<nav class="tabs" id="tabs">${tabsHtml(c)}</nav><div class="tab-body" id="tabBody"></div></div>`;
  renderTab();
}
function tabsHtml(c) {
  return visibleTabs(c).map(t => {
    const n = tabCount(c, t.id);
    return `<button type="button" data-tab="${t.id}" class="${t.id === ui.tab ? "active" : ""}">${ico(t.icon, 16)}<span>${t.label}</span><span class="count" data-count="${t.id}">${n || ""}</span></button>`;
  }).join("");
}
function updateTabCounts() {
  const c = cur(); if (!c) return;
  $$("#tabs [data-count]").forEach(s => { const n = tabCount(c, s.dataset.count); s.textContent = n || ""; });
}
function ringHtml(pct) {
  const r = 26, C = 2 * Math.PI * r;
  return `<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="${r}" class="ring-bg"/><circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><b>${pct}%</b>`;
}
function heroHtml(c) {
  const im = portraitOf(c), t = typeOf(c), cp = completeness(c);
  return `<header class="hero" style="--tc:${t.color}">
    <div class="hero-bg" ${im ? `style="background-image:url('${im.data}')"` : ""}></div>
    <div class="hero-in">
      <button type="button" class="portrait" data-act="portrait" title="${im ? "View photo" : "Add a photo"}" style="${im ? `background-image:url('${im.data}')` : ""}">${im ? "" : ico(t.icon, 44)}</button>
      <div class="hero-main">
        <div class="hero-top"><span class="typechip">${ico(t.icon, 14)} ${t.label}</span><span id="storyChips">${storyChips(c)}</span></div>
        <input class="title-input" data-f="name" value="${esc(c.name)}" placeholder="${t.label} name">
        <input class="subtitle-input" data-f="nickname" value="${esc(c.nickname)}" placeholder="Nickname, alias or title">
        <p class="hero-sum" id="heroSum">${esc(entitySummary(c))}</p>
      </div>
      <div class="hero-side">
        <button type="button" class="ring" id="heroRing" data-act="progress" title="${cp.pct}% complete. Click to see what's missing">${ringHtml(cp.pct)}</button>
        <div class="hero-actions">
          <button type="button" class="icon-btn fav ${c.fav ? "on" : ""}" data-act="fav" title="Favorite">${ico("star", 20)}</button>
          <button type="button" class="icon-btn" data-act="share" title="Share or export">${ico("share", 20)}</button>
          <button type="button" class="icon-btn" data-act="menu" title="More">${ico("dots", 20)}</button>
        </div>
      </div>
    </div></header>`;
}
function storyChips(c) {
  const chips = c.stories.map(id => state.stories.find(s => s.id === id)).filter(Boolean)
    .map(s => `<span class="story-chip" style="--sc:${s.color}">${esc(s.name)}</span>`).join("");
  return chips + `<button type="button" class="story-add" data-act="story" title="Assign to stories">${ico("folder", 13)} ${state.stories.length ? "Stories" : "Add to story"}</button>`;
}
function updateHero() {
  const c = cur(); if (!c || ui.view !== "editor") return;
  const sum = $("#heroSum"); if (sum) sum.textContent = entitySummary(c);
  const ring = $("#heroRing"); if (ring) { const cp = completeness(c); ring.innerHTML = ringHtml(cp.pct); ring.title = `${cp.pct}% complete. Click to see what's missing`; }
  const sc = $("#storyChips"); if (sc) sc.innerHTML = storyChips(c);
  const pr = $(".portrait"), im = portraitOf(c);
  if (pr) { pr.style.backgroundImage = im ? `url('${im.data}')` : ""; pr.innerHTML = im ? "" : ico(typeOf(c).icon, 44); }
  const bg = $(".hero-bg"); if (bg) bg.style.backgroundImage = im ? `url('${im.data}')` : "";
  const fav = $('[data-act="fav"]'); if (fav) fav.classList.toggle("on", c.fav);
}
function setTab(t) {
  const c = cur(); if (!c || !visibleTabs(c).some(x => x.id === t)) t = "profile";
  ui.tab = t;
  $$("#tabs [data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === t));
  renderTab();
}
const RENDER = {};
function renderTab() {
  const c = cur(), body = $("#tabBody"); if (!c || !body) return;
  body.innerHTML = RENDER[ui.tab](c);
  body.classList.remove("enter"); void body.offsetWidth; body.classList.add("enter");
  RENDER[ui.tab + "_after"]?.(c);
  applyHiddenFields();
  $$("textarea, input[type=text], input:not([type])", body).forEach(el => el.spellcheck = !!state.settings.spell);
  updateTabCounts();
}
function applyHiddenFields() { /* hidden fields are skipped at render time */ }

/* ---------- field helpers ---------- */
function fieldInput(f, c) {
  const v = c[f.k] || "";
  if (f.t === "select") {
    const opts = !v || f.o.includes(v) ? f.o : [...f.o, v];
    return `<label class="fld"><span>${esc(f.l)}</span><select data-f="${f.k}"><option value="">(unset)</option>${opts.map(o => `<option ${o === v ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></label>`;
  }
  return `<label class="fld"><span>${esc(f.l)}</span><input data-f="${f.k}" value="${esc(v)}" placeholder="${esc(f.p || "")}"></label>`;
}
const areaInput = (f, c, rows = 4) => `<label class="fld"><span>${esc(f.l)}</span><textarea data-f="${f.k}" rows="${rows}" placeholder="${esc(f.p || "")}">${esc(c[f.k] || "")}</textarea></label>`;
const rowTools = (list, manual) => `${manual ? `<span class="grip" title="Drag to reorder">${ico("grip", 16)}</span>` : ""}`;
const moveBtns = () => `<button type="button" class="icon-btn sm" data-act="up" title="Move up">${ico("up", 15)}</button><button type="button" class="icon-btn sm" data-act="down" title="Move down">${ico("down", 15)}</button>`;

/* ---------- profile ---------- */
RENDER.profile = c => {
  const def = PROFILE[c.type], hid = new Set(state.settings.hiddenFields);
  const fields = def.fields.filter(f => !hid.has(f.k)).map(f => fieldInput(f, c)).join("");
  const areas = def.areas.filter(f => !hid.has(f.k));
  const full = areas.filter(f => !f.half).map(f => areaInput(f, c, 4)).join("");
  const halves = areas.filter(f => f.half).map(f => areaInput(f, c, 4)).join("");
  const ageBox = c.type === "character" ? `
    <div class="card-box agebox">
      ${hid.has("age") ? "" : `<label class="fld"><span>Age</span><input data-f="age" value="${esc(c.age)}" placeholder="27, ageless, unknown"></label>`}
      <label class="fld"><span>Birth year</span><input type="number" data-f="birthYear" value="${esc(c.birthYear)}" placeholder="e.g. 1180"></label>
      <label class="fld"><span>Death year <em>(optional)</em></span><input type="number" data-f="deathYear" value="${esc(c.deathYear)}"></label>
      <label class="fld"><span>Story year <em>(shared)</em></span><input type="number" id="storyYear" value="${esc(state.settings.storyYear)}" placeholder="e.g. 1204"></label>
      <div class="ageinfo" id="ageInfo"></div>
    </div>` : "";
  return `
    ${ageBox}
    <div class="grid">${fields}</div>
    <div class="toolbar wrap">
      ${c.type === "character" ? `<button type="button" class="btn small" data-act="namegen">${ico("dice", 15)} Name generator</button>` : ""}
    </div>
    <div class="fld"><span>Tags <em>(Enter or comma to add)</em></span><div class="tagbox" id="tagBox">${c.tags.map(t => `<span class="chip">${esc(t)}<button type="button" data-rmtag="${esc(t)}" aria-label="Remove tag">${ico("x", 12)}</button></span>`).join("")}<input id="tagInput" placeholder="add tag" list="tagList"></div><datalist id="tagList">${[...new Set(state.characters.flatMap(x => x.tags))].map(t => `<option value="${esc(t)}">`).join("")}</datalist></div>
    ${full}
    ${halves ? `<div class="grid two">${halves}</div>` : ""}
    ${hid.has("__custom") ? "" : `
    <h3 class="sec">Custom fields</h3>
    <div class="toolbar wrap">
      <select id="tplSelect" class="auto"><option value="">Template…</option>${PRESET_TEMPLATES.map((t, i) => `<option value="p:${i}">${esc(t.name)}</option>`).join("")}${state.templates.map((t, i) => `<option value="u:${i}">★ ${esc(t.name)}</option>`).join("")}</select>
      <button type="button" class="btn small" data-act="tplapply">Apply</button>
      <button type="button" class="btn small" data-act="tplsave">Save my fields as template</button>
      <button type="button" class="btn small" data-act="tpldel">Delete template</button>
      <span class="spacer"></span>
      <button type="button" class="btn small primary" data-act="cfadd">${ico("plus", 15)} Add field</button>
    </div>
    <div id="customFields" class="grid">${customFieldsHtml(c)}</div>`}`;
};
RENDER.profile_after = c => { updateAgeInfo(); };
function customFieldsHtml(c) {
  return c.customFields.map(f => `
    <div class="cf" data-row="${f.id}" data-list="customFields">
      <div class="cf-head"><input data-k="label" value="${esc(f.label)}" placeholder="Field name"><button type="button" class="icon-btn sm" data-act="del" title="Remove field">${ico("x", 15)}</button></div>
      <textarea data-k="value" rows="2">${esc(f.value)}</textarea>
    </div>`).join("") || `<p class="muted small" style="grid-column:1/-1">Add fields of your own (magic type, faction, accent…) or apply a template.</p>`;
}
function updateAgeInfo() {
  const el = $("#ageInfo"), c = cur(); if (!el || !c) return;
  const a = ageInfo(c), sy = state.settings.storyYear;
  el.innerHTML = a ? (a.unborn ? `${ico("clock", 16)} Not yet born in ${sy}.` : `${ico("clock", 16)} In story year <b>${esc(sy)}</b>: <b>${a.age}</b> years old${a.dead ? " at death" : ""}.`)
    : `${ico("info", 16)} Enter a birth year and a story year to compute their age automatically across the whole vault.`;
}

/* ---------- background ---------- */
RENDER.background = c => {
  const hid = new Set(state.settings.hiddenFields);
  const fields = c.type === "character"
    ? [{ k: "background", l: "Background / history", p: "Where they came from, what shaped them…" }, { k: "family", l: "Family & upbringing" }, { k: "skills", l: "Skills & abilities" }]
    : [{ k: "background", l: "History", p: "How did it come to be? What has happened here?" }];
  return `<div class="toolbar"><span class="muted small" id="wordCount"></span><span class="spacer"></span><button type="button" class="btn small" data-act="focusbg">${ico("focus", 15)} Focus mode</button></div>
    ${fields.filter(f => !hid.has(f.k)).map((f, i) => areaInput(f, c, i === 0 ? 14 : 5)).join("")}`;
};
RENDER.background_after = c => updateWordCount();
function updateWordCount() {
  const el = $("#wordCount"), c = cur(); if (!el || !c) return;
  el.textContent = `${wc([c.background, c.family, c.skills].join(" "))} words in this section · ${entityWords(c)} words in total`;
}

/* ---------- voice ---------- */
RENDER.voice = c => `
  <label class="fld"><span>Speech style</span><textarea data-f="voiceStyle" rows="4" placeholder="Rhythm, vocabulary, accent, how they talk when angry or nervous…">${esc(c.voiceStyle)}</textarea></label>
  <label class="fld"><span>Catchphrases &amp; verbal tics</span><textarea data-f="catchphrases" rows="3">${esc(c.catchphrases)}</textarea></label>
  <h3 class="sec">Dialogue checklist</h3>
  <div class="checks">${VOICE_TRAITS.map(t => `<label class="check"><input type="checkbox" data-trait="${esc(t)}" ${c.voiceTraits.includes(t) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div>
  <div class="toolbar"><h3 class="sec" style="margin:0">Sample lines</h3><span class="spacer"></span><button type="button" class="btn small primary" data-act="lineadd">${ico("plus", 15)} Add line</button></div>
  <div class="stack" id="voiceLines">${voiceLinesHtml(c)}</div>`;
function voiceLinesHtml(c) {
  return c.voiceLines.map(l => `
    <div class="card" data-row="${l.id}" data-list="voiceLines">
      <div class="card-top"><input data-k="context" value="${esc(l.context)}" placeholder="Situation (when angry, flirting…)"><button type="button" class="icon-btn sm" data-act="del" title="Remove">${ico("trash", 15)}</button></div>
      <textarea data-k="text" rows="2" placeholder="Something only they would say.">${esc(l.text)}</textarea>
    </div>`).join("") || `<p class="muted small">No sample lines yet. Add a few to keep their dialogue consistent.</p>`;
}

/* ---------- arc ---------- */
RENDER.arc = c => `
  <div class="arc-top"><div class="arc-chart" id="arcChart">${arcSvg(c)}</div></div>
  <div class="grid two">
    <label class="fld"><span>Starting point <em>(who they are at the start)</em></span><textarea data-f="arcStart" rows="3">${esc(c.arcStart)}</textarea></label>
    <label class="fld"><span>Ending point <em>(who they become)</em></span><textarea data-f="arcEnd" rows="3">${esc(c.arcEnd)}</textarea></label>
    <label class="fld"><span>What they want <em>(outer goal)</em></span><textarea data-f="arcWant" rows="3">${esc(c.arcWant)}</textarea></label>
    <label class="fld"><span>What they need <em>(inner truth or lie)</em></span><textarea data-f="arcNeed" rows="3">${esc(c.arcNeed)}</textarea></label>
  </div>
  <div class="toolbar wrap"><h3 class="sec" style="margin:0">Arc beats</h3><span class="muted small">Drag the slider: -5 is rock bottom, +5 is triumph.</span><span class="spacer"></span>
    <button type="button" class="btn small" data-act="beatclassic">${ico("sparkle", 15)} Insert classic beats</button>
    <button type="button" class="btn small primary" data-act="beatadd">${ico("plus", 15)} Add beat</button></div>
  <div class="stack" id="beatList">${beatsHtml(c)}</div>`;
function beatsHtml(c) {
  return c.arcBeats.map(b => `
    <div class="card beat" data-row="${b.id}" data-list="arcBeats">
      <div class="card-top"><span class="grip" title="Drag to reorder">${ico("grip", 16)}</span><input data-k="title" value="${esc(b.title)}" placeholder="Beat name (e.g. Midpoint)">
        <label class="val"><input type="range" min="-5" max="5" step="1" data-k="value" value="${esc(b.value ?? 0)}"><b>${b.value > 0 ? "+" : ""}${b.value ?? 0}</b></label>
        ${moveBtns()}<button type="button" class="icon-btn sm" data-act="del" title="Remove">${ico("trash", 15)}</button></div>
      <textarea data-k="desc" rows="2" placeholder="What happens, and how does it change them?">${esc(b.desc)}</textarea>
    </div>`).join("") || `<p class="muted small">No beats yet. Insert the classic story beats, or add your own.</p>`;
}
function arcSvg(c) {
  const bs = c.arcBeats, W = 760, H = 230, px = 44, py = 24;
  if (bs.length < 2) return `<div class="empty-chart">${ico("chart", 28)}<p>Add two or more beats to draw ${esc(c.name || "their")} arc.</p></div>`;
  const X = i => px + (W - 2 * px) * i / (bs.length - 1), Y = v => py + (H - 2 * py) * (1 - ((+v || 0) + 5) / 10);
  const pts = bs.map((b, i) => [X(i), Y(b.value)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; }
  const area = `${d} L${pts[pts.length - 1][0]},${H - py} L${pts[0][0]},${H - py} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" class="arc-svg" role="img" aria-label="Character arc chart">
    <defs><linearGradient id="arcG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <line x1="${px}" x2="${W - px}" y1="${Y(0)}" y2="${Y(0)}" class="arc-zero"/>
    <text x="8" y="${Y(5) + 4}" class="arc-ax">+5</text><text x="8" y="${Y(0) + 4}" class="arc-ax">0</text><text x="8" y="${Y(-5) + 4}" class="arc-ax">-5</text>
    <path d="${area}" fill="url(#arcG)"/><path d="${d}" class="arc-line"/>
    ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="6" class="arc-dot"/><text x="${p[0]}" y="${H - 4}" text-anchor="middle" class="arc-lbl">${esc((bs[i].title || "Beat " + (i + 1)).slice(0, 16))}</text>`).join("")}
  </svg>`;
}
function redrawArc() { const c = cur(), el = $("#arcChart"); if (c && el) el.innerHTML = arcSvg(c); }

/* ---------- timeline ---------- */
const sortEvents = list => list.map((e, i) => [e, i]).sort((a, b) => (numKey(a[0].date) - numKey(b[0].date)) || (a[1] - b[1])).map(x => x[0]);
const eventsOf = c => c.tlManual ? c.timeline : sortEvents(c.timeline);
function ageAtEvent(c, e) {
  const by = parseInt(c.birthYear), y = numKey(e.date);
  return isNaN(by) || !isFinite(y) || y < by ? "" : `age ${Math.floor(y - by)}`;
}
RENDER.timeline = c => `
  <div class="toolbar wrap"><button type="button" class="btn primary" data-act="evadd">${ico("plus", 16)} Add event</button>
    <label class="check inline"><input type="checkbox" data-act="tlsort" ${c.tlManual ? "" : "checked"}><span>Sort by date automatically</span></label>
    <span class="muted small">${c.tlManual ? "Manual order: drag the handles or use the arrows." : "Dates can be years (1204, -50) or any text; the first number found is used to sort."}</span></div>
  <div class="timeline" id="eventList">${eventsHtml(c)}</div>`;
function eventsHtml(c) {
  return eventsOf(c).map(e => `
    <div class="tl-item" data-row="${e.id}" data-list="timeline">
      <div class="tl-dot"></div>
      <div class="card">
        <div class="card-top">${c.tlManual ? `<span class="grip" title="Drag to reorder">${ico("grip", 16)}</span>` : ""}
          <input data-k="date" class="tl-date" value="${esc(e.date)}" placeholder="Date / year">
          <input data-k="title" value="${esc(e.title)}" placeholder="What happened?">
          ${ageAtEvent(c, e) ? `<span class="badge soft">${ageAtEvent(c, e)}</span>` : ""}
          ${c.tlManual ? moveBtns() : ""}<button type="button" class="icon-btn sm" data-act="del" title="Remove">${ico("trash", 15)}</button>
        </div>
        <textarea data-k="desc" rows="2" placeholder="Details…">${esc(e.desc)}</textarea>
      </div>
    </div>`).join("") || `<p class="muted">No events yet. Add births, key scenes and turning points.</p>`;
}

/* ---------- scenes tab ---------- */
RENDER.scenes = c => {
  const mine = scenesOf(c), others = state.scenes.filter(s => !s.characterIds.includes(c.id));
  return `<div class="toolbar wrap"><button type="button" class="btn primary" data-act="scenenew">${ico("plus", 16)} New scene with ${esc(c.name || "this entry")}</button>
    ${others.length ? `<select id="sceneAdd" class="auto"><option value="">Add to an existing scene…</option>${sortScenes(others).map(s => `<option value="${s.id}">${esc(sceneLabel(s))}</option>`).join("")}</select>` : ""}
    <span class="spacer"></span><button type="button" class="btn small" data-act="openscenes">${ico("list", 15)} All scenes</button></div>
    <div class="stack" id="sceneList">${sceneRows(c, mine)}</div>`;
};
const sceneLabel = s => `${s.chapter ? s.chapter + ": " : ""}${s.title || "Untitled scene"}`;
const sortScenes = list => [...list].sort((a, b) => numKey(a.chapter) - numKey(b.chapter) || (a.created || 0) - (b.created || 0));
function sceneRows(c, mine) {
  return sortScenes(mine).map(s => `
    <div class="card" data-scene="${s.id}">
      <div class="card-top"><input data-sk="chapter" class="tl-date" value="${esc(s.chapter)}" placeholder="Chapter"><input data-sk="title" value="${esc(s.title)}" placeholder="Scene title">
        <button type="button" class="icon-btn sm" data-act="sceneunlink" title="Remove from this scene">${ico("x", 15)}</button></div>
      <textarea data-sk="summary" rows="2" placeholder="What happens in this scene?">${esc(s.summary)}</textarea>
      <div class="chips">${s.characterIds.map(id => byId(id)).filter(Boolean).map(x => `<span class="chip">${esc(entName(x))}</span>`).join("")}</div>
    </div>`).join("") || `<p class="muted">${esc(c.name || "This entry")} isn't in any scenes yet. Track where they appear chapter by chapter.</p>`;
}

/* ---------- notes ---------- */
RENDER.notes = c => `
  <div class="toolbar wrap">
    <select id="noteType" class="auto">${Object.keys(NOTE_TYPES).map(t => `<option>${t}</option>`).join("")}</select>
    <button type="button" class="btn primary" data-act="noteadd">${ico("plus", 16)} Add note</button>
    <button type="button" class="btn small" data-act="noteprompt">${ico("sparkle", 15)} From a prompt</button>
    <span class="spacer"></span>
    <select id="noteFilter" class="auto" title="Filter"><option value="">All types</option>${Object.keys(NOTE_TYPES).map(t => `<option ${ui.noteFilter === t ? "selected" : ""}>${t}</option>`).join("")}</select>
    <select id="noteSort" class="auto" title="Order"><option value="manual" ${state.settings.noteSort === "manual" ? "selected" : ""}>Manual order</option><option value="recent" ${state.settings.noteSort === "recent" ? "selected" : ""}>Recently edited</option></select>
  </div>
  <div class="stack" id="notesList">${notesHtml(c)}</div>`;
function notesHtml(c) {
  const manual = state.settings.noteSort === "manual";
  let list = c.notes.filter(n => !ui.noteFilter || n.type === ui.noteFilter);
  list = [...list].sort((a, b) => (b.pinned - a.pinned) || (manual ? 0 : b.updated - a.updated));
  const prev = id => ui.preview.has(id);
  return list.map(n => `
    <div class="card note ${n.pinned ? "pinned" : ""}" data-row="${n.id}" data-list="notes" style="--c:${NOTE_TYPES[n.type] || NOTE_TYPES.Other}">
      <div class="card-top">${manual ? `<span class="grip" title="Drag to reorder">${ico("grip", 16)}</span>` : ""}
        <select data-k="type" class="badge-select">${Object.keys(NOTE_TYPES).map(t => `<option ${t === n.type ? "selected" : ""}>${t}</option>`).join("")}</select>
        <input data-k="title" value="${esc(n.title)}" placeholder="Note title">
        <button type="button" class="icon-btn sm" data-act="preview" title="${prev(n.id) ? "Edit" : "Preview formatting"}">${ico(prev(n.id) ? "pencil" : "eye", 15)}</button>
        <button type="button" class="icon-btn sm" data-act="focus" title="Focus mode">${ico("focus", 15)}</button>
        <button type="button" class="icon-btn sm ${n.pinned ? "on" : ""}" data-act="pin" title="Pin to top">${ico("pinned", 15)}</button>
        ${manual ? moveBtns() : ""}<button type="button" class="icon-btn sm" data-act="del" title="Move to Trash">${ico("trash", 15)}</button>
      </div>
      ${prev(n.id) ? `<div class="md">${md(n.body)}</div>` : `<textarea data-k="body" rows="5" placeholder="Write your ${esc(n.type.toLowerCase())} note… (Markdown: # heading, **bold**, *italic*, - list)">${esc(n.body)}</textarea>`}
      <div class="card-foot muted small"><span>${new Date(n.updated).toLocaleString()}</span><span class="wcnt">${wc(n.body)} words</span></div>
    </div>`).join("") || `<p class="muted">No notes yet. Pick a type above and add one, or start from a writing prompt.</p>`;
}
function md(src) {
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  let out = "", list = false;
  for (const line of String(src || "").split("\n")) {
    const li = line.match(/^\s*[-*]\s+(.*)/);
    if (li) { if (!list) { out += "<ul>"; list = true; } out += `<li>${inline(li[1])}</li>`; continue; }
    if (list) { out += "</ul>"; list = false; }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) out += `<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`;
    else if (line.trim()) out += `<p>${inline(line)}</p>`;
  }
  return (out + (list ? "</ul>" : "")) || '<p class="muted">Nothing here yet.</p>';
}
function openFocus(title, get, set) {
  const m = openModal(`<div class="modal-head"><b>${esc(title)}</b><span class="spacer"></span><span class="muted small" id="fwc"></span><button type="button" class="btn small" data-modal-close>Done</button></div><textarea id="ftext" spellcheck="${state.settings.spell}"></textarea>`, { cls: "focus" });
  const t = $("#ftext", m); t.value = get();
  const upd = () => $("#fwc").textContent = wc(t.value) + " words";
  t.oninput = () => { set(t.value); upd(); }; upd(); t.focus();
}

/* ---------- gallery ---------- */
RENDER.gallery = c => {
  const lay = state.settings.gallery;
  return `<div class="drop" id="drop"><div class="drop-in">${ico("upload", 26)}<p><b>Drop photos here</b>, paste from the clipboard, or</p>
      <div class="toolbar center"><button type="button" class="btn primary" data-act="pickimg">${ico("image", 16)} Upload photos</button><button type="button" class="btn" data-act="linkimg">${ico("link", 16)} Add from link</button></div>
      <input type="file" id="imgFile" accept="image/*" multiple hidden>
      <p class="muted small">Photos are resized and stored in this browser. Crop, rotate and reorder them below. ★ makes a photo the main portrait.</p></div></div>
    <div class="toolbar"><span class="muted small">${c.images.length} photo${c.images.length === 1 ? "" : "s"}</span><span class="spacer"></span>
      <div class="seg">${[["grid", "grid", "Grid"], ["board", "columns", "Mood board"], ["large", "image", "Large"]].map(([k, i, t]) => `<button type="button" class="${lay === k ? "on" : ""}" data-act="gallay" data-lay="${k}" title="${t}">${ico(i, 16)}</button>`).join("")}</div></div>
    <div class="gallery lay-${lay}" id="gallery">${galleryHtml(c)}</div>`;
};
function galleryHtml(c) {
  return c.images.map(i => `
    <figure class="shot ${i.id === c.mainImage ? "main" : ""}" data-row="${i.id}" data-list="images">
      <div class="img" data-act="zoom"><img src="${i.data}" alt="${esc(i.caption)}" loading="lazy">${i.id === c.mainImage ? `<span class="mainbadge">${ico("star", 12)} Main</span>` : ""}</div>
      <figcaption><input data-k="caption" value="${esc(i.caption)}" placeholder="Caption"></figcaption>
      <div class="acts">
        <span class="grip" title="Drag to reorder">${ico("grip", 16)}</span>
        <button type="button" class="icon-btn sm ${i.id === c.mainImage ? "on" : ""}" data-act="main" title="Set as main portrait">${ico("star", 15)}</button>
        <button type="button" class="icon-btn sm" data-act="crop" title="Crop">${ico("crop", 15)}</button>
        <button type="button" class="icon-btn sm" data-act="rotate" title="Rotate 90°">${ico("rotate", 15)}</button>
        ${moveBtns()}
        <button type="button" class="icon-btn sm" data-act="del" title="Move to Trash">${ico("trash", 15)}</button>
      </div>
    </figure>`).join("");
}
function resizeImage(src, max = 1100, quality = 0.84) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => rej(new Error("Not a readable image"));
    img.src = src;
  });
}
async function fileToImage(file, max) {
  const url = URL.createObjectURL(file);
  try { return await resizeImage(url, max); } finally { URL.revokeObjectURL(url); }
}
async function addImages(files) {
  const c = cur(); if (!c) return;
  let n = 0;
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    try {
      const data = await fileToImage(f);
      const im = { id: uid(), data, caption: f.name.replace(/\.[^.]+$/, "") };
      c.images.push(im); c.mainImage ||= im.id; n++;
    } catch (e) { toast(`${f.name}: ${e.message}`); }
  }
  if (n) { touch(c); if (ui.tab === "gallery") renderTab(); updateHero(); updateTabCounts(); renderSidebar(); save(); toast(`${n} photo${n > 1 ? "s" : ""} added`); }
}
async function addImageFromUrl() {
  const url = await dialog({ title: "Add photo from a link", body: "Paste the address of an image. Some sites block this; if so, save the image and upload it instead.", ok: "Import", input: { placeholder: "https://…" } });
  if (!url) return;
  try {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const b = await r.blob();
    await addImages([new File([b], url.split("/").pop().split("?")[0] || "link-image", { type: b.type || "image/jpeg" })]);
  } catch { toast("That site doesn't allow importing. Save the image and upload it instead."); }
}
function openCrop(imgId) {
  const c = cur(), im = c.images.find(i => i.id === imgId); if (!im) return;
  let ratio = 0, box = { x: 0, y: 0, w: 0, h: 0 }, dispW = 0, dispH = 0, start = null, work = im.data;
  const m = openModal(`${modalHead("Crop & rotate")}
    <div class="crop-wrap"><div class="crop-stage" id="cropStage"><img id="cropImg" alt="" src="${work}"><div class="crop-box" id="cropBox">${["nw", "ne", "sw", "se"].map(h => `<i data-h="${h}" class="h-${h}"></i>`).join("")}</div></div></div>
    <div class="toolbar wrap"><select id="cropRatio" class="auto"><option value="0">Free</option><option value="1">Square 1:1</option><option value="0.8">Portrait 4:5</option><option value="0.6667">Portrait 2:3</option><option value="1.3333">Landscape 4:3</option><option value="1.7778">Wide 16:9</option></select>
      <button type="button" class="btn small" id="cropRot">${ico("rotate", 15)} Rotate</button><span class="spacer"></span>
      <button type="button" class="btn" data-modal-close>Cancel</button><button type="button" class="btn primary" id="cropOk">${ico("check", 16)} Apply</button></div>`, { cls: "wide" });
  const img = $("#cropImg", m), boxEl = $("#cropBox", m);
  const applyBox = () => { boxEl.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`; };
  const fit = () => {
    if (!ratio) return;
    let w = Math.min(box.w, dispW), h = w / ratio; if (h > dispH) { h = dispH; w = h * ratio; }
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    box = { w, h, x: clamp(cx - w / 2, 0, dispW - w), y: clamp(cy - h / 2, 0, dispH - h) };
  };
  const layout = () => { dispW = img.clientWidth; dispH = img.clientHeight; box = { x: dispW * .1, y: dispH * .1, w: dispW * .8, h: dispH * .8 }; fit(); applyBox(); };
  img.onload = layout;
  boxEl.onpointerdown = e => { start = { x: e.clientX, y: e.clientY, box: { ...box }, h: e.target.dataset.h }; boxEl.setPointerCapture(e.pointerId); e.preventDefault(); };
  boxEl.onpointermove = e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y, b = start.box, h = start.h;
    if (!h) { box = { ...b, x: clamp(b.x + dx, 0, dispW - b.w), y: clamp(b.y + dy, 0, dispH - b.h) }; }
    else {
      let x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
      if (h.includes("w")) x1 = clamp(b.x + dx, 0, x2 - 24); if (h.includes("e")) x2 = clamp(b.x + b.w + dx, x1 + 24, dispW);
      if (h.includes("n")) y1 = clamp(b.y + dy, 0, y2 - 24); if (h.includes("s")) y2 = clamp(b.y + b.h + dy, y1 + 24, dispH);
      if (ratio) {
        let w = x2 - x1, hh = w / ratio;
        if (h.includes("n")) y1 = y2 - hh; else y2 = y1 + hh;
        if (y1 < 0) { y1 = 0; hh = y2 - y1; w = hh * ratio; if (h.includes("w")) x1 = x2 - w; else x2 = x1 + w; }
        if (y2 > dispH) { y2 = dispH; hh = y2 - y1; w = hh * ratio; if (h.includes("w")) x1 = x2 - w; else x2 = x1 + w; }
      }
      box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }
    applyBox();
  };
  boxEl.onpointerup = boxEl.onpointercancel = () => { start = null; };
  $("#cropRatio", m).onchange = e => { ratio = parseFloat(e.target.value) || 0; fit(); applyBox(); };
  $("#cropRot", m).onclick = async () => {
    const i2 = new Image(); i2.src = work; await i2.decode();
    const cv = document.createElement("canvas"); cv.width = i2.naturalHeight; cv.height = i2.naturalWidth;
    const x = cv.getContext("2d"); x.translate(cv.width / 2, cv.height / 2); x.rotate(Math.PI / 2); x.drawImage(i2, -i2.naturalWidth / 2, -i2.naturalHeight / 2);
    work = cv.toDataURL("image/jpeg", 0.9); img.src = work;
  };
  $("#cropOk", m).onclick = async () => {
    const i2 = new Image(); i2.src = work; await i2.decode();
    const k = i2.naturalWidth / dispW, cv = document.createElement("canvas");
    const sw = Math.max(1, box.w * k), sh = Math.max(1, box.h * k), s = Math.min(1, 1400 / Math.max(sw, sh));
    cv.width = Math.round(sw * s); cv.height = Math.round(sh * s);
    cv.getContext("2d").drawImage(i2, box.x * k, box.y * k, sw, sh, 0, 0, cv.width, cv.height);
    im.data = cv.toDataURL("image/jpeg", 0.9); touch(c); closeModal(); renderTab(); updateHero(); renderSidebar(); save(); toast("Photo updated");
  };
}
async function rotateImage(im) {
  const i2 = new Image(); i2.src = im.data; await i2.decode();
  const cv = document.createElement("canvas"); cv.width = i2.naturalHeight; cv.height = i2.naturalWidth;
  const x = cv.getContext("2d"); x.translate(cv.width / 2, cv.height / 2); x.rotate(Math.PI / 2); x.drawImage(i2, -i2.naturalWidth / 2, -i2.naturalHeight / 2);
  im.data = cv.toDataURL("image/jpeg", 0.9);
}
function openLightbox(i) {
  const c = cur(); if (!c || !c.images.length) return;
  ui.lb = { list: c.images, i: (i + c.images.length) % c.images.length };
  const im = ui.lb.list[ui.lb.i];
  $("#lbImg").src = im.data; $("#lbCap").textContent = im.caption || ""; $("#lightbox").hidden = false;
}

/* ---------- relations ---------- */
RENDER.relations = c => `
  <div class="toolbar"><button type="button" class="btn primary" data-act="reladd">${ico("plus", 16)} Add connection</button>
    <span class="muted small">Type a name that matches another entry to link them. “Parent” means that person is this one's parent; “Child” means they are this one's child.</span></div>
  <div class="stack" id="relList">${relationsHtml(c)}</div>`;
function relationsHtml(c) {
  return c.relations.map(r => {
    const target = state.characters.find(x => x.id !== c.id && (x.name || "").trim().toLowerCase() === (r.name || "").trim().toLowerCase() && r.name);
    return `<div class="card rel" data-row="${r.id}" data-list="relations" style="--c:${REL_COLORS[r.kind] || "#999"}">
      <div class="card-top"><input data-k="name" value="${esc(r.name)}" placeholder="Who or what?" list="nameList">
        <select data-k="kind" class="auto">${REL_KINDS.map(k => `<option ${k === r.kind ? "selected" : ""}>${k}</option>`).join("")}</select>
        ${target ? `<button type="button" class="btn small" data-act="openrel" data-id="${target.id}" title="Open ${esc(entName(target))}">${ico("arrow", 14)} Open</button>` : ""}
        <button type="button" class="icon-btn sm" data-act="del" title="Remove">${ico("trash", 15)}</button></div>
      <textarea data-k="desc" rows="2" placeholder="History, tension, how they met…">${esc(r.desc)}</textarea>
    </div>`;
  }).join("") || `<p class="muted">No connections recorded yet.</p>`;
}

/* ---------- drag & drop reordering ---------- */
let dragState = null;
function bindDnD(view) {
  view.addEventListener("pointerdown", e => { const g = e.target.closest(".grip"); if (g) { const row = g.closest("[data-row]"); if (row) row.draggable = true; } });
  view.addEventListener("pointerup", () => { $$("[data-row][draggable=true]", view).forEach(r => r.draggable = false); });
  view.addEventListener("dragstart", e => {
    const row = e.target.closest?.("[data-row]"); if (!row || !row.draggable) return;
    dragState = { list: row.dataset.list, id: row.dataset.row };
    e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", row.dataset.row);
    setTimeout(() => row.classList.add("dragging"), 0);
  });
  view.addEventListener("dragover", e => {
    if (!dragState) return;
    const row = e.target.closest("[data-row]"); if (!row || row.dataset.list !== dragState.list || row.dataset.row === dragState.id) return;
    e.preventDefault();
    $$(".drop-before,.drop-after", view).forEach(x => x.classList.remove("drop-before", "drop-after"));
    const r = row.getBoundingClientRect(), horiz = row.closest(".gallery");
    const before = horiz ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    row.classList.add(before ? "drop-before" : "drop-after");
  });
  view.addEventListener("drop", e => {
    if (!dragState) return;
    const row = e.target.closest("[data-row]"); if (!row || row.dataset.list !== dragState.list) return;
    e.preventDefault();
    const before = row.classList.contains("drop-before");
    moveItem(dragState.list, dragState.id, row.dataset.row, before);
  });
  view.addEventListener("dragend", () => {
    dragState = null;
    $$(".dragging,.drop-before,.drop-after", view).forEach(x => x.classList.remove("dragging", "drop-before", "drop-after"));
    $$("[data-row][draggable=true]", view).forEach(r => r.draggable = false);
  });
}
function moveItem(listName, id, targetId, before) {
  const c = cur(); const arr = c?.[listName]; if (!arr || id === targetId) return;
  const from = arr.findIndex(x => x.id === id); if (from < 0) return;
  const [it] = arr.splice(from, 1);
  let to = arr.findIndex(x => x.id === targetId); if (to < 0) to = arr.length;
  arr.splice(before ? to : to + 1, 0, it);
  touch(c); reRenderList(listName); save();
}
function stepItem(listName, id, dir) {
  const c = cur(); const arr = c?.[listName]; if (!arr) return;
  const vis = visibleOrder(listName), p = vis.indexOf(id), q = p + dir;
  if (p < 0 || q < 0 || q >= vis.length) return;
  moveItem(listName, id, vis[q], dir < 0);
}
function visibleOrder(listName) {
  const c = cur();
  if (listName === "notes") { const manual = state.settings.noteSort === "manual"; return [...c.notes.filter(n => !ui.noteFilter || n.type === ui.noteFilter)].sort((a, b) => (b.pinned - a.pinned) || (manual ? 0 : b.updated - a.updated)).map(x => x.id); }
  if (listName === "timeline") return eventsOf(c).map(x => x.id);
  return c[listName].map(x => x.id);
}
function reRenderList(listName) {
  const c = cur();
  const map = { notes: ["#notesList", notesHtml], timeline: ["#eventList", eventsHtml], images: ["#gallery", galleryHtml], arcBeats: ["#beatList", beatsHtml], relations: ["#relList", relationsHtml], voiceLines: ["#voiceLines", voiceLinesHtml], customFields: ["#customFields", customFieldsHtml] }[listName];
  if (!map) return;
  const el = $(map[0]); if (el) el.innerHTML = map[1](c);
  if (listName === "arcBeats") redrawArc();
  if (listName === "images") { updateHero(); renderSidebar(); }
  updateTabCounts();
}

/* ---------- editor events ---------- */
function rowItem(el) {
  const r = el.closest("[data-row]"); if (!r) return null;
  const c = cur(), arr = c?.[r.dataset.list]; if (!arr) return null;
  const item = arr.find(x => x.id === r.dataset.row);
  return item ? { r, list: r.dataset.list, item, c } : null;
}
function bindEditor(view) {
  bindDnD(view);
  view.addEventListener("input", e => {
    if (ui.view !== "editor") return;
    const t = e.target, c = cur(); if (!c) return;
    if (t.id === "storyYear") { state.settings.storyYear = t.value; updateAgeInfo(); renderSidebar(); updateHero(); save(); return; }
    if (t.dataset.f) {
      c[t.dataset.f] = t.value; touch(c); save();
      if (["name", "nickname", "age", "birthYear", "deathYear", "race", "role", "placeType", "factionType", "itemType", "region", "leader", "owner", "rarity"].includes(t.dataset.f)) { renderSidebar(); updateHero(); }
      else updateHero();
      if (["age", "birthYear", "deathYear"].includes(t.dataset.f)) updateAgeInfo();
      if (["background", "family", "skills"].includes(t.dataset.f)) updateWordCount();
      return;
    }
    if (t.dataset.trait !== undefined) { const v = t.dataset.trait; c.voiceTraits = t.checked ? [...c.voiceTraits, v] : c.voiceTraits.filter(x => x !== v); touch(c); save(); return; }
    if (t.dataset.sk) { const s = state.scenes.find(x => x.id === t.closest("[data-scene]").dataset.scene); if (s) { s[t.dataset.sk] = t.value; save(); } return; }
    if (t.dataset.k) {
      const ri = rowItem(t); if (!ri) return;
      ri.item[t.dataset.k] = t.dataset.k === "value" && t.type === "range" ? parseInt(t.value) : t.value;
      if (ri.list === "notes") { ri.item.updated = Date.now(); const w = ri.r.querySelector(".wcnt"); if (w && t.dataset.k === "body") w.textContent = wc(t.value) + " words"; }
      if (ri.list === "arcBeats") { redrawArc(); const b = ri.r.querySelector(".val b"); if (b && t.type === "range") b.textContent = (ri.item.value > 0 ? "+" : "") + ri.item.value; }
      touch(c); save(); updateHero();
      if (ri.list === "notes" && t.dataset.k === "type") reRenderList("notes");
      if (ri.list === "relations" && (t.dataset.k === "name" || t.dataset.k === "kind")) { ri.r.style.setProperty("--c", REL_COLORS[ri.item.kind] || "#999"); }
    }
  });
  view.addEventListener("change", e => {
    if (ui.view !== "editor") return;
    const t = e.target, c = cur();
    if (t.id === "noteFilter") { ui.noteFilter = t.value; reRenderList("notes"); }
    else if (t.id === "noteSort") { state.settings.noteSort = t.value; save(); reRenderList("notes"); }
    else if (t.id === "sceneAdd" && t.value) { const s = state.scenes.find(x => x.id === t.value); if (s && !s.characterIds.includes(c.id)) { s.characterIds.push(c.id); save(); renderTab(); updateTabCounts(); } }
    else if (t.dataset.k === "date" && t.closest("[data-list=timeline]") && !c.tlManual) {
      const list = $("#eventList");
      eventsOf(c).forEach(ev => list.append(list.querySelector(`[data-row="${ev.id}"]`)));
    } else if (t.dataset.act === "tlsort") { c.tlManual = !t.checked; touch(c); save(); renderTab(); }
    else if (t.id === "imgFile") { addImages([...t.files]); t.value = ""; }
    else if (t.dataset.k === "name" && t.closest("[data-list=relations]")) reRenderList("relations");
  });
  view.addEventListener("keydown", e => {
    if (e.target.id !== "tagInput") return;
    const c = cur();
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTags(e.target.value); e.target.value = ""; }
    else if (e.key === "Backspace" && !e.target.value && c.tags.length) { c.tags.pop(); touch(c); refreshTags(); save(); }
  });
  view.addEventListener("focusout", e => { if (e.target.id === "tagInput" && e.target.value.trim()) { addTags(e.target.value); e.target.value = ""; } });
  view.addEventListener("click", editorClick);
  // drag & drop files onto the gallery
  view.addEventListener("dragover", e => { const d = e.target.closest("#drop"); if (d && e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); d.classList.add("over"); } });
  view.addEventListener("dragleave", e => { e.target.closest?.("#drop")?.classList.remove("over"); });
  view.addEventListener("drop", e => { const d = e.target.closest("#drop"); if (d && e.dataTransfer?.files?.length) { e.preventDefault(); d.classList.remove("over"); addImages([...e.dataTransfer.files]); } });
  document.addEventListener("paste", e => {
    if (ui.view !== "editor" || ui.tab !== "gallery") return;
    const files = [...(e.clipboardData?.files || [])]; if (files.length) addImages(files);
  });
}
function addTags(raw) {
  const c = cur();
  raw.split(",").map(s => s.trim()).filter(Boolean).forEach(t => { if (!c.tags.includes(t)) c.tags.push(t); });
  touch(c); refreshTags(); renderSidebar(); updateHero(); save();
}
function refreshTags() {
  const c = cur(), box = $("#tagBox"); if (!box) return;
  $$(".chip", box).forEach(x => x.remove());
  const input = $("#tagInput");
  c.tags.forEach(t => { const s = document.createElement("span"); s.className = "chip"; s.innerHTML = `${esc(t)}<button type="button" data-rmtag="${esc(t)}" aria-label="Remove tag">${ico("x", 12)}</button>`; input.before(s); });
  renderSidebar();
}
function newItem(c, listName, obj, focusSel) {
  c[listName].push(obj); touch(c); reRenderList(listName); save();
  const row = $(`[data-row="${obj.id}"]`); (row?.querySelector(focusSel || "input,textarea"))?.focus();
  row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function deleteRowItem(ri) {
  const { c, list, item } = ri;
  const arr = c[list], idx = arr.indexOf(item);
  const finish = () => { touch(c); reRenderList(list); updateHero(); save(); };
  if (list === "notes") {
    arr.splice(idx, 1); trashPush("note", item.title || `${item.type} note`, item, { charId: c.id, charType: c.type }); finish();
    toast("Note moved to Trash", { action: "Undo", fn: () => { const t = state.trash.find(x => x.payload === item); if (t) { trashRestore(t.id); reRenderList("notes"); updateTabCounts(); } } });
  } else if (list === "images") {
    arr.splice(idx, 1); trashPush("photo", item.caption || "Photo", item, { charId: c.id, charType: c.type });
    if (c.mainImage === item.id) c.mainImage = arr[0]?.id ?? null; finish();
    toast("Photo moved to Trash", { action: "Undo", fn: () => { const t = state.trash.find(x => x.payload === item); if (t) { trashRestore(t.id); reRenderList("images"); } } });
  } else { arr.splice(idx, 1); finish(); }
}
async function editorClick(e) {
  if (ui.view !== "editor") return;
  const c = cur(); if (!c) return;
  const tabBtn = e.target.closest("#tabs [data-tab]"); if (tabBtn) return setTab(tabBtn.dataset.tab);
  const rm = e.target.closest("[data-rmtag]"); if (rm) { c.tags = c.tags.filter(x => x !== rm.dataset.rmtag); touch(c); refreshTags(); save(); return; }
  if (e.target.closest("#tagBox") && !e.target.closest("button")) { $("#tagInput")?.focus(); return; }
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, ri = rowItem(a);
  switch (act) {
    case "portrait": if (c.images.length) openLightbox(Math.max(0, c.images.findIndex(i => i.id === c.mainImage))); else setTab("gallery"); break;
    case "fav": c.fav = !c.fav; touch(c); updateHero(); renderSidebar(); save(); break;
    case "share": openShare([c.id]); break;
    case "menu": openMenu(a, [
      { label: "Duplicate", icon: "copy", fn: () => duplicateEntity(c) },
      { label: "Merge into another…", icon: "merge", fn: () => openMerge(c.id) },
      { label: "Compare with…", icon: "columns", fn: () => showView("compare", c.id) },
      { sep: 1 },
      { label: "Share or export…", icon: "share", fn: () => openShare([c.id]) },
      { label: "Export as Markdown", icon: "download", fn: () => { download(`${safeName(c.name)}.md`, entityMarkdown(c), "text/markdown"); toast("Markdown exported"); } },
      { label: "Print / save as PDF", icon: "printer", fn: () => printShare([c.id]) },
      { sep: 1 },
      { label: "Move to Trash", icon: "trash", danger: 1, fn: () => deleteEntity(c) },
    ], { align: "right" }); break;
    case "progress": { const cp = completeness(c); openMenu(a, cp.missing.length ? [{ head: `${cp.pct}% complete. Still missing:` }, ...cp.missing.map(m => ({ label: m.l, icon: "arrow", fn: () => setTab(m.tab) }))] : [{ head: "Everything is filled in. Nicely done!" }], { align: "right" }); break; }
    case "story": openMenu(a, () => [...state.stories.map(s => ({ label: s.name, check: c.stories.includes(s.id), keepOpen: 1, fn: () => { c.stories = c.stories.includes(s.id) ? c.stories.filter(x => x !== s.id) : [...c.stories, s.id]; touch(c); updateHero(); renderSidebar(); save(); } })), ...(state.stories.length ? [{ sep: 1 }] : []), { label: "Manage stories…", icon: "folder", fn: manageStories }]); break;
    case "namegen": openNameGen(); break;
    case "focusbg": openFocus(`${entName(c)}: background`, () => c.background, v => { c.background = v; touch(c); const ta = $('[data-f="background"]'); if (ta) ta.value = v; updateWordCount(); save(); }); break;
    // custom fields / templates
    case "cfadd": newItem(c, "customFields", { id: uid(), label: "", value: "" }); break;
    case "tplapply": {
      const v = $("#tplSelect").value; if (!v) return toast("Pick a template first");
      const [k, i] = v.split(":"), t = (k === "p" ? PRESET_TEMPLATES : state.templates)[+i];
      const have = new Set(c.customFields.map(f => f.label.toLowerCase()));
      t.fields.filter(l => !have.has(l.toLowerCase())).forEach(l => c.customFields.push({ id: uid(), label: l, value: "" }));
      touch(c); reRenderList("customFields"); save(); toast(`Applied "${t.name}"`); break;
    }
    case "tplsave": {
      const labels = c.customFields.map(f => f.label.trim()).filter(Boolean); if (!labels.length) return toast("Add some custom fields first");
      const name = await promptBox("Template name"); if (!name) return;
      state.templates = state.templates.filter(t => t.name !== name); state.templates.push({ name, fields: labels }); save(); renderTab(); toast("Template saved"); break;
    }
    case "tpldel": {
      const v = $("#tplSelect").value; if (!v.startsWith("u:")) return toast("Select one of your saved (★) templates to delete");
      if (!(await confirmBox("Delete this template?", "Fields already added to entries stay."))) return;
      state.templates.splice(+v.slice(2), 1); save(); renderTab(); break;
    }
    // voice / arc / timeline / relations
    case "lineadd": newItem(c, "voiceLines", { id: uid(), context: "", text: "" }); break;
    case "beatadd": newItem(c, "arcBeats", { id: uid(), title: "", value: 0, desc: "" }); break;
    case "beatclassic": CLASSIC_BEATS.forEach(([t, v]) => c.arcBeats.push({ id: uid(), title: t, value: v, desc: "" })); touch(c); reRenderList("arcBeats"); save(); break;
    case "evadd": newItem(c, "timeline", { id: uid(), date: "", title: "", desc: "" }); break;
    case "reladd": newItem(c, "relations", { id: uid(), name: "", kind: "Friend", desc: "" }); break;
    case "openrel": selectEntity(a.dataset.id, "relations"); break;
    // scenes
    case "scenenew": { const s = { id: uid(), created: Date.now(), chapter: "", title: "", summary: "", characterIds: [c.id] }; state.scenes.push(s); save(); renderTab(); updateTabCounts(); $(`[data-scene="${s.id}"] [data-sk=chapter]`)?.focus(); break; }
    case "sceneunlink": { const s = state.scenes.find(x => x.id === a.closest("[data-scene]").dataset.scene); s.characterIds = s.characterIds.filter(x => x !== c.id); save(); renderTab(); updateTabCounts(); break; }
    case "openscenes": showView("scenes"); break;
    // notes
    case "noteadd": { const n = { id: uid(), type: $("#noteType").value, title: "", body: "", pinned: false, updated: Date.now() }; ui.noteFilter = ""; newItem(c, "notes", n); break; }
    case "noteprompt": openPrompts({ forNote: true }); break;
    case "preview": ui.preview.has(ri.item.id) ? ui.preview.delete(ri.item.id) : ui.preview.add(ri.item.id); reRenderList("notes"); break;
    case "focus": openFocus(ri.item.title || `${ri.item.type} note`, () => ri.item.body, v => { ri.item.body = v; ri.item.updated = Date.now(); touch(c); const ta = $(`[data-row="${ri.item.id}"] textarea`); if (ta) ta.value = v; save(); }); break;
    case "pin": ri.item.pinned = !ri.item.pinned; touch(c); reRenderList("notes"); save(); break;
    // gallery
    case "pickimg": $("#imgFile").click(); break;
    case "linkimg": addImageFromUrl(); break;
    case "gallay": state.settings.gallery = a.dataset.lay; save(); renderTab(); break;
    case "zoom": openLightbox(c.images.findIndex(i => i.id === ri.item.id)); break;
    case "main": c.mainImage = ri.item.id; touch(c); reRenderList("images"); save(); break;
    case "crop": openCrop(ri.item.id); break;
    case "rotate": await rotateImage(ri.item); touch(c); reRenderList("images"); save(); break;
    // generic
    case "del": if (ri) deleteRowItem(ri); break;
    case "up": if (ri) stepItem(ri.list, ri.item.id, -1); break;
    case "down": if (ri) stepItem(ri.list, ri.item.id, 1); break;
  }
}
