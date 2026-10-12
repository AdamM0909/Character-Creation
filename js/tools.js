"use strict";
/* Tools: palette, find & replace, prompts, name generator, settings, history, trash, export/import, sharing, backups. */

/* ---------- writing prompts ---------- */
const PROMPTS = {
  Backstory: ["What is the earliest memory that still shapes how they act today?", "Which childhood promise did they break, and who was hurt?", "What did their family never talk about at dinner?", "Describe the worst day of their life in three sentences.", "What did they lose that they have never replaced?", "Who raised them, and what did that person get wrong?", "What skill did they learn the hard way?", "Where did they last feel truly at home?"],
  Personality: ["What do they do when they think nobody is watching?", "What small thing makes them furious out of all proportion?", "What lie do they tell themselves most often?", "How do they behave when they are afraid?", "What would they never admit they enjoy?", "What do they notice about a room that others miss?", "Which virtue of theirs is secretly a flaw?", "What are they proud of that nobody else cares about?"],
  Relationships: ["Who would they call at 3 a.m., and who would they never call?", "Who did they betray, and do they know they did?", "Who is the one person who can make them laugh against their will?", "What does their closest friend wish they would change?", "Who do they envy, and why?", "Who from their past would be shocked by who they are now?", "What would they sacrifice for someone they claim not to care about?", "Which relationship ended without a goodbye?"],
  Secrets: ["What is the one secret that would unravel everything if it came out?", "What do they know that they wish they didn't?", "Who knows their secret, and what do they want in return?", "What did they do that they have never told anyone?", "What are they hiding in plain sight?", "What would they do to keep their secret safe?", "Which object do they keep that would give them away?", "What truth about themselves are they avoiding?"],
  Voice: ["Write three lines of dialogue where they refuse to answer a question.", "How do they greet a stranger, a rival and a loved one?", "What do they say when they are lying, and what is their tell?", "Write the apology they would never actually send.", "What is a word or phrase only they would use?", "How does their speech change when they are exhausted?", "Write their voicemail greeting.", "What do they say when they are proud but don't want to show it?"],
  Conflict: ["What do they want so badly that they would break their own rules?", "What is the worst decision they could be forced to make?", "Who stands in their way, and are they right to?", "What would they have to give up to win?", "Where is their line, and what happens when it's crossed?", "What choice will they regret, even though it was correct?", "What is the cost of their greatest strength?", "What would make them change sides?"],
  Worldbuilding: ["What do people here say about outsiders?", "What is the oldest building or object, and what is it hiding?", "What does everyone here fear, and who profits from it?", "What is forbidden here, and who breaks the rule?", "What do they celebrate, and what do they secretly mourn?", "What would a stranger notice in the first five minutes?", "What is the legend, and what is the truth behind it?", "Who is in charge, and who actually holds the power?"],
};
const PROMPT_NOTE_TYPE = { Backstory: "Backstory", Personality: "Story", Relationships: "Relationship", Secrets: "Secret", Voice: "Dialogue", Conflict: "Plot", Worldbuilding: "Research" };
const allPrompts = () => Object.entries(PROMPTS).flatMap(([k, a]) => a.map(p => ({ k, p })));
function dailyPrompt() { const a = allPrompts(), d = Math.floor(Date.now() / 864e5); return a[d % a.length].p; }
function openPrompts({ forNote } = {}) {
  let cat = "", current = pick(allPrompts());
  const render = () => {
    const pool = allPrompts().filter(x => !cat || x.k === cat);
    if (!pool.includes(current)) current = pick(pool);
    const ents = state.characters;
    $("#modal").innerHTML = `${modalHead("Writing prompts", "A nudge for when the page is blank.")}
      <div class="chips wrap">${["", ...Object.keys(PROMPTS)].map(k => `<button class="chip ${cat === k ? "on" : ""}" data-cat="${k}">${k || "All"}</button>`).join("")}</div>
      <blockquote class="prompt-card"><span class="muted small">${esc(current.k)}</span>${esc(current.p)}</blockquote>
      <div class="toolbar wrap"><button class="btn" id="prShuffle">${ico("dice", 16)} Another</button><button class="btn" id="prCopy">${ico("copy", 16)} Copy</button><span class="spacer"></span>
        ${ents.length ? `<select id="prEnt" class="auto">${ents.map(c => `<option value="${c.id}" ${c.id === state.currentId ? "selected" : ""}>${esc(entName(c))}</option>`).join("")}</select><button class="btn primary" id="prAdd">${ico("plus", 16)} Add as note</button>` : ""}</div>`;
  };
  openModal("", { cls: "" }); render();
  const m = $("#modal");
  m.onclick = e => {
    const ch = e.target.closest("[data-cat]"); if (ch) { cat = ch.dataset.cat; render(); return; }
    if (e.target.closest("#prShuffle")) { current = pick(allPrompts().filter(x => !cat || x.k === cat)); render(); }
    else if (e.target.closest("#prCopy")) { navigator.clipboard?.writeText(current.p); toast("Prompt copied"); }
    else if (e.target.closest("#prAdd")) {
      const c = byId($("#prEnt").value); if (!c) return;
      const n = { id: uid(), type: PROMPT_NOTE_TYPE[current.k] || "Story", title: current.p, body: "", pinned: false, updated: Date.now() };
      c.notes.push(n); touch(c); save(); closeModal(); ui.noteFilter = ""; selectEntity(c.id, "notes");
      setTimeout(() => $(`[data-row="${n.id}"] textarea`)?.focus(), 50);
    }
  };
}

/* ---------- name generator ---------- */
const NAME_SETS = {
  Fantasy: () => cap(pick(["ael", "bran", "cal", "dor", "eld", "fen", "gal", "hal", "ith", "kor", "lys", "mar", "nor", "per", "rav", "sel", "tor", "vel", "wyn"]) + pick(["a", "e", "i", "o", "an", "en", "ar", "or", "ia"]) + pick(["dor", "wen", "thir", "mir", "la", "ric", "ron", "dis", "na", "vyn", "ra", "gar"])),
  Elven: () => cap(pick(["ae", "cae", "elen", "lor", "sil", "tha", "ar", "gal", "ny", "fae"]) + pick(["la", "ri", "ne", "vi", "th", "el"]) + pick(["riel", "wen", "dil", "lian", "thas", "nor", "iel"])),
  Dwarven: () => cap(pick(["bar", "dur", "gim", "thor", "bor", "kaz", "dra", "hurn", "mor", "nal"]) + pick(["in", "ek", "dak", "grim", "li", "bur", "din", "rak", "nar", "gar"])) + " " + pick(["Ironfist", "Stonebeard", "Deepdelver", "Anvilborn", "Goldvein", "Hammerfall"]),
  "Sci-fi": () => pick(["Kira", "Jax", "Nova", "Orin", "Zed", "Lyra", "Taro", "Vex", "Mira", "Cade", "Rho", "Sable"]) + " " + pick(["Voss", "Kade", "Okafor", "Tanaka", "Reyes", "Chen", "Halloran", "Singh", "Mbeki", "Orlov"]),
  Modern: () => pick(["Emma", "Liam", "Noah", "Ava", "Maya", "Ethan", "Zoe", "Lucas", "Priya", "Marcus", "Chloe", "Diego", "Hana", "Owen"]) + " " + pick(["Walker", "Morgan", "Patel", "Garcia", "Kim", "Brooks", "Nguyen", "Foster", "Rossi", "Hughes"]),
  Medieval: () => pick(["Edmund", "Godric", "Alys", "Matilda", "Wulfric", "Isolde", "Aldric", "Edith", "Hugh", "Maud", "Leofric", "Cecily"]) + " " + pick(["Smith", "Fletcher", "of Ashford", "Thatcher", "Blackwood", "Hale", "Cooper"]),
  Places: () => pick(["Raven", "Stone", "Silver", "Ash", "Storm", "Gold", "Frost", "Willow", "Iron", "Mist"]) + pick(["hollow", "wick", "haven", "reach", "ford", "crest", "gate", "moor", "fall", "spire"]),
};
function openNameGen() {
  const m = openModal(`${modalHead("Name generator")}
    <div class="toolbar"><select id="ngSet" class="auto">${Object.keys(NAME_SETS).map(k => `<option>${k}</option>`).join("")}</select><button class="btn primary" id="ngGo">${ico("dice", 16)} Roll again</button></div>
    <p class="muted small">${cur() ? "Click a name to use it for this entry." : "Click a name to copy it."}</p><div id="ngList" class="names"></div>`);
  const roll = () => { const f = NAME_SETS[$("#ngSet", m).value]; $("#ngList", m).innerHTML = [...new Set(Array.from({ length: 14 }, f))].map(n => `<button class="chip big" data-n="${esc(n)}">${esc(n)}</button>`).join(""); };
  $("#ngGo", m).onclick = roll; $("#ngSet", m).onchange = roll;
  $("#ngList", m).onclick = e => {
    const n = e.target.dataset.n; if (!n) return; const c = cur();
    if (c && ui.view === "editor") { c.name = n; touch(c); const inp = $('[data-f="name"]'); if (inp) inp.value = n; renderSidebar(); updateHero(); save(); toast("Name set to " + n); }
    else navigator.clipboard?.writeText(n).then(() => toast("Copied " + n));
    closeModal();
  };
  roll();
}

/* ---------- command palette + global search ---------- */
function commandList() {
  return [
    { label: "New character", icon: "user", kbd: "Alt+N", fn: () => createEntity("character") },
    { label: "New place", icon: "pin", fn: () => createEntity("location") },
    { label: "New faction", icon: "flag", fn: () => createEntity("faction") },
    { label: "New item", icon: "gem", fn: () => createEntity("item") },
    { label: "Go to Home", icon: "home", kbd: "Alt+H", fn: () => showView("home") },
    { label: "Browse everything", icon: "grid", kbd: "Alt+B", fn: () => showView("browse") },
    { label: "Master timeline", icon: "clock", kbd: "Alt+T", fn: () => showView("timeline") },
    { label: "Scenes & chapters", icon: "list", fn: () => showView("scenes") },
    { label: "Relationship web", icon: "web", kbd: "Alt+W", fn: () => showView("web") },
    { label: "Family tree", icon: "tree", fn: () => showView("family") },
    { label: "Maps", icon: "map", fn: () => showView("maps") },
    { label: "Compare & merge", icon: "columns", fn: () => showView("compare") },
    { label: "Writing prompts", icon: "sparkle", kbd: "Alt+P", fn: () => openPrompts({}) },
    { label: "Find & replace", icon: "replace", kbd: "Alt+R", fn: openFindReplace },
    { label: "Name generator", icon: "dice", fn: openNameGen },
    { label: "Manage stories", icon: "folder", fn: manageStories },
    { label: "Version history", icon: "history", fn: openHistory },
    { label: "Trash", icon: "trash", fn: openTrash },
    { label: "Export backup", icon: "download", fn: openExport },
    { label: "Import backup", icon: "upload", fn: () => $("#importFile").click() },
    { label: "Share or export sheets", icon: "share", fn: () => openShare(cur() ? [cur().id] : []) },
    { label: "Settings & appearance", icon: "sliders", kbd: "Alt+,", fn: openSettings },
    { label: "Keyboard shortcuts", icon: "keyboard", kbd: "?", fn: openShortcuts },
    ...(deferredInstall ? [{ label: "Install as an app", icon: "download", fn: installApp }] : []),
  ];
}
function searchIndex() {
  const out = [];
  state.characters.forEach(c => textSlots(c).forEach(s => { const t = String(s.get() || ""); if (t.trim()) out.push({ c, tab: s.tab, label: s.label, text: t }); }));
  return out;
}
function openPalette(initial = "") {
  const m = openModal(`<div class="palette"><div class="pal-in">${ico("search", 18)}<input id="palQ" placeholder="Search everything, or type a command…" autocomplete="off" autofocus><kbd>Esc</kbd></div><div id="palRes" class="results"></div></div>`, { cls: "palette-modal" });
  const idx = searchIndex(), cmds = commandList();
  let items = [], sel = 0;
  const go = it => { closeModal(); it.fn(); };
  const draw = () => {
    $("#palRes", m).innerHTML = items.map((it, i) => it.head ? `<div class="menu-head">${esc(it.head)}</div>` :
      `<div class="hit ${i === sel ? "sel" : ""}" data-i="${i}">${it.icon ? `<span class="hit-ico" style="${it.color ? `--tc:${it.color}` : ""}">${ico(it.icon, 16)}</span>` : ""}<div class="grow"><b>${esc(it.title)}</b>${it.sub ? `<div class="muted small">${it.sub}</div>` : ""}</div>${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ""}</div>`).join("") || `<p class="muted small pad">No matches.</p>`;
    $(`[data-i="${sel}"]`, m)?.scrollIntoView({ block: "nearest" });
  };
  const run = () => {
    const q = $("#palQ", m).value.trim().toLowerCase(); items = [];
    if (!q) { items = [{ head: "Commands" }, ...cmds.map(c => ({ ...c, title: c.label }))]; }
    else {
      const ents = state.characters.filter(c => (c.name || "").toLowerCase().includes(q) || (c.nickname || "").toLowerCase().includes(q)).slice(0, 6);
      const cm = cmds.filter(c => c.label.toLowerCase().includes(q)).slice(0, 5);
      const hits = idx.filter(i => i.text.toLowerCase().includes(q) && !(i.label === "Name")).slice(0, 25);
      if (ents.length) items.push({ head: "Entries" }, ...ents.map(c => ({ title: entName(c), sub: esc(entitySummary(c) || typeOf(c).label), icon: typeOf(c).icon, color: typeOf(c).color, fn: () => selectEntity(c.id) })));
      if (cm.length) items.push({ head: "Commands" }, ...cm.map(c => ({ ...c, title: c.label })));
      const scn = state.scenes.filter(s => (s.title + " " + s.summary + " " + s.chapter).toLowerCase().includes(q)).slice(0, 5);
      if (scn.length) items.push({ head: "Scenes" }, ...scn.map(s => ({ title: sceneLabel(s), sub: esc((s.summary || "").slice(0, 90)), icon: "list", fn: () => { ui.sceneFilter = ""; showView("scenes"); } })));
      if (hits.length) items.push({ head: "Found in text" }, ...hits.map(h => { const at = Math.max(0, h.text.toLowerCase().indexOf(q)), snip = h.text.slice(Math.max(0, at - 30), at + 80).replace(/\s+/g, " ");
        return { title: entName(h.c), sub: `${esc(h.label)} · …${esc(snip)}…`, icon: typeOf(h.c).icon, color: typeOf(h.c).color, fn: () => selectEntity(h.c.id, h.tab) }; }));
    }
    sel = items.findIndex(i => !i.head); if (sel < 0) sel = 0; draw();
  };
  $("#palQ", m).value = initial;
  $("#palQ", m).oninput = run;
  $("#palQ", m).onkeydown = e => {
    const sel2 = d => { let n = sel; do { n = clamp(n + d, 0, items.length - 1); } while (items[n]?.head && n > 0 && n < items.length - 1); if (!items[n]?.head) sel = n; draw(); };
    if (e.key === "ArrowDown") { e.preventDefault(); sel2(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel2(-1); }
    else if (e.key === "Enter" && items[sel] && !items[sel].head) { e.preventDefault(); go(items[sel]); }
  };
  $("#palRes", m).onclick = e => { const h = e.target.closest("[data-i]"); if (h && !items[+h.dataset.i].head) go(items[+h.dataset.i]); };
  run();
}

/* ---------- find & replace ---------- */
function openFindReplace() {
  const m = openModal(`${modalHead("Find & replace", "Search every field of every entry. A snapshot is saved before replacing, so you can undo it from History.")}
    <div class="grid two"><label class="fld"><span>Find</span><input id="frFind" autofocus placeholder="Text to find"></label><label class="fld"><span>Replace with</span><input id="frRep" placeholder="Replacement"></label></div>
    <div class="toolbar wrap"><label class="check inline"><input type="checkbox" id="frCase"><span>Match case</span></label><label class="check inline"><input type="checkbox" id="frWord"><span>Whole word</span></label>
      <select id="frScope" class="auto"><option value="all">All entries</option>${cur() ? `<option value="cur">Only ${esc(entName(cur()))}</option>` : ""}</select><span class="spacer"></span><span class="muted small" id="frCount"></span></div>
    <div id="frRes" class="results fr-res"></div>
    <div class="toolbar"><span class="spacer"></span><button class="btn" data-modal-close>Close</button><button class="btn primary" id="frGo" disabled>${ico("replace", 16)} Replace all</button></div>`, { cls: "wide" });
  let hits = [], rx = null;
  const scan = () => {
    const f = $("#frFind", m).value; hits = [];
    if (!f) { $("#frRes", m).innerHTML = `<p class="muted small pad">Type something to search.</p>`; $("#frCount", m).textContent = ""; $("#frGo", m).disabled = true; return; }
    const src = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); rx = new RegExp($("#frWord", m).checked ? `\\b${src}\\b` : src, $("#frCase", m).checked ? "g" : "gi");
    const scope = $("#frScope", m).value === "cur" && cur() ? [cur()] : state.characters;
    scope.forEach(c => textSlots(c).forEach(s => { const t = String(s.get() || ""); const mm = t.match(rx); if (mm) hits.push({ c, s, t, n: mm.length }); }));
    if ($("#frScope", m).value !== "cur") state.scenes.forEach(sc => ["title", "summary"].forEach(k => { const t = String(sc[k] || ""), mm = t.match(rx); if (mm) hits.push({ scene: sc, c: { name: "Scenes", type: "character", id: "" }, s: { label: "Scene " + k, tab: "", get: () => sc[k], set: v => { sc[k] = v; } }, t, n: mm.length }); }));
    const total = hits.reduce((a, h) => a + h.n, 0);
    $("#frCount", m).textContent = `${total} match${total === 1 ? "" : "es"} in ${hits.length} place${hits.length === 1 ? "" : "s"}`;
    $("#frGo", m).disabled = !total;
    $("#frRes", m).innerHTML = hits.slice(0, 120).map((h, i) => { rx.lastIndex = 0; const at = h.t.search(new RegExp(rx.source, rx.flags.replace("g", ""))), snip = h.t.slice(Math.max(0, at - 25), at + 70).replace(/\s+/g, " ");
      const marked = esc(snip).replace(new RegExp(esc(f).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $("#frCase", m).checked ? "g" : "gi"), s => `<mark>${s}</mark>`);
      return `<div class="hit" data-i="${i}"><b>${esc(h.c.name || "Unnamed")}</b> <span class="muted small">${esc(h.s.label)} · ${h.n}×</span><div class="muted small">…${marked}…</div></div>`; }).join("") || `<p class="muted small pad">No matches.</p>`;
  };
  ["frFind", "frCase", "frWord", "frScope"].forEach(id => $("#" + id, m).addEventListener("input", scan));
  $("#frRes", m).onclick = e => { const h = e.target.closest("[data-i]"); if (!h) return; const x = hits[+h.dataset.i]; if (x.c.id) { closeModal(); selectEntity(x.c.id, x.s.tab); } };
  $("#frGo", m).onclick = async () => {
    const total = hits.reduce((a, h) => a + h.n, 0), rep = $("#frRep", m).value;
    if (!(await confirmBox(`Replace ${total} match${total === 1 ? "" : "es"}?`, `"${$("#frFind", m).value}" becomes "${rep}". A snapshot is saved first.`, "Replace all", false))) return;
    await snapshot("Before find & replace", false);
    hits.forEach(h => { h.s.set(h.t.replace(rx, () => rep)); if (h.c.id) touch(h.c); });
    save(true); closeModal(); showView(ui.view); renderSidebar(); toast(`Replaced ${total} match${total === 1 ? "" : "es"}`);
  };
  scan();
}

/* ---------- stories ---------- */
const STORY_COLORS = ["#7c5cff", "#e8590c", "#1fa97a", "#d6336c", "#1c7ed6", "#d49a06", "#0c8599", "#868e96"];
function manageStories() {
  const m = openModal(`${modalHead("Stories", "Group entries by book, series or world. An entry can belong to several.")}<div id="stList" class="stack"></div>
    <div class="toolbar"><button class="btn primary" id="stAdd">${ico("plus", 16)} New story</button><span class="spacer"></span><button class="btn" data-modal-close>Done</button></div>`);
  const draw = () => {
    $("#stList", m).innerHTML = state.stories.map(s => `<div class="story-row" data-id="${s.id}"><input type="color" value="${s.color}" data-sf="color" aria-label="Color"><input data-sf="name" value="${esc(s.name)}" placeholder="Story name"><span class="muted small">${state.characters.filter(c => c.stories.includes(s.id)).length} entries</span><button class="icon-btn sm" data-del title="Delete story">${ico("trash", 15)}</button></div>`).join("") || `<p class="muted small">No stories yet.</p>`;
  };
  draw();
  m.oninput = e => { const r = e.target.closest("[data-id]"); if (!r || !e.target.dataset.sf) return; state.stories.find(s => s.id === r.dataset.id)[e.target.dataset.sf] = e.target.value; save(); renderSidebar(); };
  m.onclick = async e => {
    if (e.target.closest("#stAdd")) { state.stories.push({ id: uid(), name: "New story", color: STORY_COLORS[state.stories.length % STORY_COLORS.length] }); save(); draw(); renderSidebar(); $$("#stList [data-sf=name]", m).pop().select(); }
    const del = e.target.closest("[data-del]");
    if (del) { const id = del.closest("[data-id]").dataset.id; if (await confirmBox("Delete this story?", "Entries keep their data; they just leave the story.")) { state.stories = state.stories.filter(s => s.id !== id); state.characters.forEach(c => c.stories = c.stories.filter(x => x !== id)); save(); draw(); renderSidebar(); if (ui.view === "editor") updateHero(); } }
  };
}

/* ---------- settings ---------- */
function openSettings() {
  const s = state.settings;
  const swatches = [{ id: "", name: "Auto", bg: "linear-gradient(135deg,#f5f1ea 50%,#14121b 50%)", accent: "#7c5cff" }, ...THEMES];
  const accents = ["#7c5cff", "#d6336c", "#e8590c", "#d49a06", "#1fa97a", "#0c8599", "#1c7ed6", "#495057"];
  const hiddenTabsOpts = TABDEFS.filter(t => t.id !== "profile");
  const m = openModal(`${modalHead("Settings & appearance")}
    <h3 class="sec first">Theme</h3>
    <div class="swatches">${swatches.map(t => `<button class="swatch ${s.theme === t.id ? "on" : ""}" data-theme="${t.id}" style="--sw-bg:${t.bg};--sw-p:${t.panel || t.bg};--sw-a:${t.accent}"><i></i><span>${t.name}</span></button>`).join("")}</div>
    <h3 class="sec">Accent color</h3>
    <div class="toolbar wrap">${accents.map(a => `<button class="acc ${s.accent === a ? "on" : ""}" data-acc="${a}" style="background:${a}" aria-label="${a}"></button>`).join("")}<input type="color" id="accCustom" value="${s.accent || "#7c5cff"}" title="Custom color"><button class="btn small" data-acc="">Theme default</button></div>
    <div class="grid two"><div><h3 class="sec">Headings</h3><div class="seg" data-seg="font">${[["serif", "Serif"], ["sans", "Sans"]].map(([k, l]) => `<button class="${s.font === k ? "on" : ""}" data-v="${k}">${l}</button>`).join("")}</div></div>
    <div><h3 class="sec">Density</h3><div class="seg" data-seg="density">${[["cozy", "Cozy"], ["compact", "Compact"]].map(([k, l]) => `<button class="${s.density === k ? "on" : ""}" data-v="${k}">${l}</button>`).join("")}</div></div></div>
    <h3 class="sec">Writing</h3>
    <div class="grid"><label class="fld"><span>Daily word goal</span><input type="number" id="setGoal" min="1" value="${s.dailyGoal}"></label><label class="fld"><span>Story year</span><input type="number" id="setYear" value="${esc(s.storyYear)}"></label>
    <label class="check"><input type="checkbox" id="setSpell" ${s.spell ? "checked" : ""}><span>Spell check while typing</span></label></div>
    <h3 class="sec">Layout</h3>
    <p class="muted small">Hide the tabs and fields you don't use. Your data stays; it's just tucked away.</p>
    <div class="checks">${hiddenTabsOpts.map(t => `<label class="check"><input type="checkbox" data-tab-vis="${t.id}" ${s.hiddenTabs.includes(t.id) ? "" : "checked"}><span>${t.label} tab</span></label>`).join("")}</div>
    ${Object.entries(PROFILE).map(([type, p]) => `<details class="fieldset"><summary>${ico(TYPES[type].icon, 15)} ${TYPES[type].label} fields</summary><div class="checks">${[...p.fields, ...p.areas, ...(type === "character" ? [{ k: "age", l: "Age" }, { k: "family", l: "Family & upbringing" }, { k: "skills", l: "Skills & abilities" }] : [])].map(f => `<label class="check"><input type="checkbox" data-field-vis="${f.k}" ${s.hiddenFields.includes(f.k) ? "" : "checked"}><span>${esc(f.l)}</span></label>`).join("")}<label class="check"><input type="checkbox" data-field-vis="__custom" ${s.hiddenFields.includes("__custom") ? "" : "checked"}><span>Custom fields</span></label></div></details>`).join("")}
    <h3 class="sec">Data</h3>
    <div class="toolbar wrap"><button class="btn small" data-go="export">${ico("download", 15)} Export backup</button><button class="btn small" data-go="import">${ico("upload", 15)} Import</button><button class="btn small" data-go="history">${ico("history", 15)} History</button><button class="btn small" data-go="trash">${ico("trash", 15)} Trash</button><button class="btn small" data-go="link">${ico("link", 15)} Auto-backup file</button>${deferredInstall ? `<button class="btn small" data-go="install">${ico("download", 15)} Install app</button>` : ""}</div>
    <div class="toolbar"><span class="spacer"></span><button class="btn primary" data-modal-close>Done</button></div>`, { cls: "wide" });
  const commit = () => { save(); applyTheme(); };
  m.onclick = e => {
    const th = e.target.closest("[data-theme]"); if (th) { s.theme = th.dataset.theme; $$(".swatch", m).forEach(x => x.classList.toggle("on", x === th)); commit(); return; }
    const ac = e.target.closest("[data-acc]"); if (ac) { s.accent = ac.dataset.acc; $$(".acc", m).forEach(x => x.classList.toggle("on", x === ac)); commit(); return; }
    const sg = e.target.closest("[data-seg] button"); if (sg) { const k = sg.parentElement.dataset.seg; s[k] = sg.dataset.v; $$("button", sg.parentElement).forEach(x => x.classList.toggle("on", x === sg)); commit(); return; }
    const go = e.target.closest("[data-go]"); if (go) { closeModal(); ({ export: openExport, import: () => $("#importFile").click(), history: openHistory, trash: openTrash, link: linkBackup, install: installApp })[go.dataset.go](); }
  };
  m.oninput = e => {
    const t = e.target;
    if (t.id === "accCustom") { s.accent = t.value; $$(".acc", m).forEach(x => x.classList.remove("on")); commit(); }
    else if (t.id === "setGoal") { s.dailyGoal = Math.max(1, parseInt(t.value) || 1); save(); }
    else if (t.id === "setYear") { s.storyYear = t.value; save(); renderSidebar(); }
    else if (t.id === "setSpell") { s.spell = t.checked; commit(); }
    else if (t.dataset.tabVis) { const id = t.dataset.tabVis; s.hiddenTabs = t.checked ? s.hiddenTabs.filter(x => x !== id) : [...new Set([...s.hiddenTabs, id])]; save(); }
    else if (t.dataset.fieldVis) { const id = t.dataset.fieldVis; s.hiddenFields = t.checked ? s.hiddenFields.filter(x => x !== id) : [...new Set([...s.hiddenFields, id])]; save(); }
  };
  modalOpts.onClose = () => { if (ui.view === "editor") { const c = cur(); if (c && !visibleTabs(c).some(t => t.id === ui.tab)) ui.tab = "profile"; } showView(ui.view); };
}

function openShortcuts() {
  const rows = [["Ctrl / Cmd + K", "Search everything & commands"], ["Alt + N", "New character"], ["Alt + Shift + N", "New note on this entry"], ["Alt + 1…9", "Switch tab"], ["Alt + ↑ / ↓", "Previous / next entry"], ["Alt + H", "Home dashboard"], ["Alt + B", "Browse"], ["Alt + T", "Master timeline"], ["Alt + W", "Relationship web"], ["Alt + P", "Writing prompts"], ["Alt + R", "Find & replace"], ["Alt + ,", "Settings"], ["/", "Focus the sidebar search"], ["?", "This list"], ["Esc", "Close windows & menus"]];
  openModal(`${modalHead("Keyboard shortcuts")}<div class="kbd-list">${rows.map(([k, d]) => `<div><span>${esc(d)}</span><span>${k.split(" + ").map(x => `<kbd>${esc(x)}</kbd>`).join(" + ")}</span></div>`).join("")}</div>`);
}

/* ---------- history & trash ---------- */
async function openHistory() {
  const list = await histLoad();
  const m = openModal(`${modalHead("Version history", "Snapshots of your text, saved automatically while you work. Photos are not duplicated in snapshots; deleted photos stay recoverable in Trash.")}
    <div class="toolbar"><button class="btn primary" id="hsNow">${ico("plus", 16)} Save a snapshot now</button></div>
    <div class="stack" id="hsList">${list.map(s => `<div class="hist" data-id="${s.id}"><div class="hist-main"><b>${esc(s.label)}</b> ${s.auto ? '<span class="badge soft">auto</span>' : '<span class="badge">manual</span>'}<div class="muted small">${new Date(s.ts).toLocaleString()} · ${s.count} entries · ${s.words.toLocaleString()} words</div></div>
      <div class="hist-act"><button class="btn small" data-act="browse">Browse</button><button class="btn small danger" data-act="restore">Restore all</button></div><div class="hist-detail" hidden></div></div>`).join("") || `<p class="muted">No snapshots yet. They appear automatically as you edit.</p>`}</div>`, { cls: "wide" });
  $("#hsNow", m).onclick = async () => { const n = await promptBox("Name this snapshot", "Manual snapshot"); if (!n) return; await snapshot(n, false); toast("Snapshot saved"); closeModal(); openHistory(); };
  m.onclick = async e => {
    const b = e.target.closest("[data-act]"); if (!b) { return; }
    const row = b.closest(".hist"), snap = list.find(s => s.id === row.dataset.id);
    if (b.dataset.act === "restore") {
      if (!(await confirmBox("Restore this snapshot?", "Everything is rolled back to this point. A snapshot of your current state is saved first, so you can undo this.", "Restore", false))) return;
      await restoreSnapshot(snap); closeModal(); showView(state.currentId ? "editor" : "home"); renderSidebar(); toast("Snapshot restored");
    } else if (b.dataset.act === "browse") {
      const det = $(".hist-detail", row); det.hidden = !det.hidden; if (det.hidden || det.dataset.done) return; det.dataset.done = 1;
      const d = JSON.parse(snap.data);
      det.innerHTML = d.characters.map(sc => { const cc = byId(sc.id), st = !cc ? "deleted" : cc.updated !== sc.updated ? "changed" : "same";
        return `<div class="hist-ent"><span class="grow">${esc(sc.name || "Unnamed")} <span class="muted small">${TYPES[sc.type]?.label || ""}</span></span><span class="badge ${st === "same" ? "soft" : ""}">${st}</span>${st !== "same" ? `<button class="btn small" data-act="one" data-eid="${sc.id}">Restore this one</button>` : ""}</div>`; }).join("") || `<p class="muted small">Empty snapshot.</p>`;
    } else if (b.dataset.act === "one") {
      if (await restoreSnapshot(snap, b.dataset.eid)) { toast("Entry restored"); b.closest(".hist-ent").querySelector(".badge").textContent = "same"; b.remove(); renderSidebar(); }
    }
  };
}
function openTrash() {
  const draw = () => {
    const kinds = { entity: "Entry", note: "Note", photo: "Photo", map: "Map" };
    $("#modal").innerHTML = `${modalHead("Trash", "Deleted items stay here for 30 days.")}
      <div class="stack">${state.trash.map(t => `<div class="hist" data-id="${t.id}"><div class="hist-main"><span class="badge">${kinds[t.kind]}</span> <b>${esc(t.label || "Untitled")}</b><div class="muted small">Deleted ${ago(t.deletedAt)} · ${Math.max(0, 30 - Math.floor((Date.now() - t.deletedAt) / 864e5))} days left</div></div>
        <div class="hist-act"><button class="btn small" data-act="restore">${ico("rotate", 14)} Restore</button><button class="btn small danger" data-act="purge">Delete forever</button></div></div>`).join("") || `<p class="muted pad">Trash is empty.</p>`}</div>
      ${state.trash.length ? `<div class="toolbar"><span class="spacer"></span><button class="btn danger" data-act="empty">Empty Trash</button></div>` : ""}`;
  };
  openModal("", { cls: "wide" }); draw();
  $("#modal").onclick = async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "empty") { if (await confirmBox("Empty the Trash?", "Everything in it will be gone for good.", "Empty Trash")) { state.trash = []; save(); draw(); } return; }
    const id = b.closest(".hist").dataset.id;
    if (b.dataset.act === "restore") { const err = trashRestore(id); if (err) toast(err); else { toast("Restored"); renderSidebar(); if (ui.view !== "home") showView(ui.view); } draw(); }
    if (b.dataset.act === "purge") { state.trash = state.trash.filter(t => t.id !== id); save(); draw(); }
  };
}

/* ---------- export / import ---------- */
function openExport() {
  const m = openModal(`${modalHead("Export backup", "Download all your entries, notes, photos, scenes and maps as one file.")}
    <label class="check"><input type="checkbox" id="exEnc"><span><b>Protect with a password</b> (AES-256 encryption)</span></label>
    <div id="exPw" hidden><label class="fld"><span>Password</span><input type="password" id="exP1" autocomplete="new-password"></label><label class="fld"><span>Repeat password</span><input type="password" id="exP2" autocomplete="new-password"></label>
      <p class="muted small">${ico("lock", 13)} If you forget the password, the backup cannot be opened. There is no recovery.</p></div>
    <div class="toolbar"><span class="spacer"></span><button class="btn" data-modal-close>Cancel</button><button class="btn primary" id="exGo">${ico("download", 16)} Download</button></div>`);
  $("#exEnc", m).onchange = e => { $("#exPw", m).hidden = !e.target.checked; if (e.target.checked) $("#exP1", m).focus(); };
  $("#exGo", m).onclick = async () => {
    try {
      let text = JSON.stringify(exportObject()), name = `character-vault-${dayKey()}`;
      if ($("#exEnc", m).checked) {
        const p1 = $("#exP1", m).value; if (p1.length < 6) return toast("Use a password of at least 6 characters");
        if (p1 !== $("#exP2", m).value) return toast("The passwords don't match");
        text = await encryptText(text, p1); name += "-encrypted";
      }
      download(name + ".json", text, "application/json");
      state.lastBackup = Date.now(); save(); renderBackup(); closeModal(); toast("Backup downloaded");
      if (ui.view === "home") renderHome($("#view"));
    } catch (e) { toast("Export failed: " + e.message); }
  };
}
async function handleImportFile(file) {
  try {
    let data = JSON.parse(await file.text());
    if (data.encrypted) {
      const pw = await dialog({ title: "Encrypted backup", body: "Enter the password used when this backup was exported.", ok: "Unlock", input: { type: "password" } });
      if (pw == null) return;
      data = JSON.parse(await decryptObj(data, pw));
    }
    if (data.app !== "character-vault" || !Array.isArray(data.characters)) throw new Error("Not a Character Vault backup");
    const m = openModal(`${modalHead("Import backup", `${data.characters.length} entries found${data.exported ? `, exported ${new Date(data.exported).toLocaleDateString()}` : ""}.`)}
      <div class="radios"><label class="check"><input type="radio" name="imMode" value="merge" checked><span><b>Merge</b>: add new entries and update ones that are newer in the backup. Nothing is deleted.</span></label>
      <label class="check"><input type="radio" name="imMode" value="replace"><span><b>Replace everything</b>: your current data is swapped for the backup (a snapshot is saved first).</span></label></div>
      <div class="toolbar"><span class="spacer"></span><button class="btn" data-modal-close>Cancel</button><button class="btn primary" id="imGo">Import</button></div>`);
    $("#imGo", m).onclick = async () => {
      const mode = $('input[name="imMode"]:checked', m).value; closeModal();
      await snapshot("Before import", false);
      const incoming = data.characters.map(c => Object.assign(blank(c.type || "character"), c));
      if (mode === "replace") {
        state.characters = incoming; state.templates = data.templates || []; state.stories = data.stories || []; state.scenes = data.scenes || []; state.maps = data.maps || [];
        toast(`Replaced with ${incoming.length} entries`);
      } else {
        let added = 0, updated = 0;
        incoming.forEach(c => { const ex = byId(c.id); if (!ex) { state.characters.push(c); added++; } else if (c.updated > ex.updated) { state.characters[state.characters.indexOf(ex)] = c; updated++; } });
        (data.templates || []).forEach(t => { if (!state.templates.some(x => x.name === t.name)) state.templates.push(t); });
        (data.stories || []).forEach(s => { if (!state.stories.some(x => x.id === s.id)) state.stories.push(s); });
        (data.scenes || []).forEach(s => { if (!state.scenes.some(x => x.id === s.id)) state.scenes.push(s); });
        (data.maps || []).forEach(mp => { if (!state.maps.some(x => x.id === mp.id)) state.maps.push(mp); });
        toast(`Imported: ${added} new, ${updated} updated`);
      }
      normalizeState(); resetWritingBaseline(); save(true); renderSidebar(); showView(state.currentId ? "editor" : "home");
    };
  } catch (e) { toast("Import failed: " + e.message); }
}

/* ---------- share sheets (HTML / PDF / Markdown) ---------- */
function entityMarkdown(c) {
  const t = typeOf(c), def = PROFILE[c.type], L = [`# ${c.name || "Unnamed"}`, `*${t.label}*${c.nickname ? ` · ${c.nickname}` : ""}`];
  const facts = [...def.fields.map(f => [f.l, c[f.k]]), ["Age", ageText(c)], ["Tags", c.tags.join(", ")], ...c.customFields.map(f => [f.label, f.value])].filter(f => String(f[1] || "").trim());
  if (facts.length) L.push("", ...facts.map(([k, v]) => `- **${k}:** ${String(v).replace(/\n/g, " ")}`));
  const sec = (h, x) => x && String(x).trim() && L.push("", `## ${h}`, String(x).trim());
  def.areas.forEach(f => sec(f.l, c[f.k]));
  sec(c.type === "character" ? "Background" : "History", c.background); sec("Family", c.family); sec("Skills & abilities", c.skills);
  if (c.voiceStyle || c.catchphrases || c.voiceTraits.length || c.voiceLines.length) {
    L.push("", "## Voice"); if (c.voiceStyle) L.push(c.voiceStyle.trim()); if (c.catchphrases) L.push("", `**Catchphrases:** ${c.catchphrases.trim()}`);
    if (c.voiceTraits.length) L.push("", ...c.voiceTraits.map(x => `- ${x}`)); c.voiceLines.forEach(l => L.push("", `> ${l.text}${l.context ? ` *(${l.context})*` : ""}`));
  }
  if (c.arcStart || c.arcEnd || c.arcWant || c.arcNeed || c.arcBeats.length) { L.push("", "## Character arc"); [["Start", c.arcStart], ["Want", c.arcWant], ["Need", c.arcNeed], ["End", c.arcEnd]].forEach(([k, v]) => v && L.push(`- **${k}:** ${v.replace(/\n/g, " ")}`)); c.arcBeats.forEach(b => L.push(`- ${b.title} (${b.value > 0 ? "+" : ""}${b.value}): ${b.desc || ""}`)); }
  if (c.timeline.length) L.push("", "## Timeline", ...eventsOf(c).map(e => `- **${e.date || "?"}:** ${e.title}${e.desc ? ". " + e.desc : ""}`));
  if (c.relations.length) L.push("", "## Connections", ...c.relations.map(r => `- **${r.name || "?"}** (${r.kind}): ${r.desc || ""}`));
  if (c.notes.length) { L.push("", "## Notes"); c.notes.forEach(n => L.push("", `### ${n.title || "Untitled"} _(${n.type})_`, n.body)); }
  return L.join("\n") + "\n";
}
const SHARE_THEMES = {
  parchment: "--bg:#efe3c8;--paper:#f8f0dc;--ink:#2d2318;--muted:#7a6a52;--accent:#9a3b26;--line:#d8c9a6",
  light: "--bg:#ece9f3;--paper:#ffffff;--ink:#1f1b2d;--muted:#6b6780;--accent:#6a4cf0;--line:#e3dff0",
  dark: "--bg:#0f0d15;--paper:#1b1826;--ink:#ece8f6;--muted:#9a93ad;--accent:#a38bff;--line:#2e2940",
  noir: "--bg:#000;--paper:#111;--ink:#f1efe8;--muted:#9a978c;--accent:#e0b860;--line:#2a2a2a",
};
function buildShareHtml(ents, o) {
  const css = `*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 Georgia,'Iowan Old Style',serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover{max-width:820px;margin:40px auto;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:60px 48px;text-align:center}.cover h1{font-size:44px;margin:.2em 0}.cover p{color:var(--muted)}
  .toc{text-align:left;margin:30px auto 0;max-width:420px;padding:0;list-style:none}.toc li{padding:6px 0;border-bottom:1px dotted var(--line)}.toc a{color:var(--ink);text-decoration:none}
  .sheet{max-width:820px;margin:28px auto;background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:42px 48px;box-shadow:0 6px 30px rgba(0,0,0,.08)}
  .head{display:flex;gap:26px;align-items:center;border-bottom:3px double var(--line);padding-bottom:22px;margin-bottom:20px}.head img{width:150px;height:150px;object-fit:cover;border-radius:16px;border:3px solid var(--accent)}
  .head h1{margin:0;font-size:36px;line-height:1.1}.head .nick{color:var(--muted);font-style:italic;margin:2px 0 8px}.tag{display:inline-block;font:600 12px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);border:1px solid var(--accent);border-radius:99px;padding:2px 10px;margin:0 6px 4px 0}
  h2{font-size:15px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:26px 0 8px;font-family:system-ui,sans-serif}h3{margin:14px 0 4px}
  .facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px 22px;margin:0}.facts div{border-bottom:1px solid var(--line);padding-bottom:4px}.facts dt{font:600 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.facts dd{margin:0}
  p{margin:.5em 0;white-space:pre-wrap}ul{padding-left:20px}blockquote{margin:8px 0;padding:6px 16px;border-left:4px solid var(--accent);color:var(--muted);font-style:italic}
  .tl{list-style:none;padding:0;margin:0}.tl li{padding:6px 0 6px 18px;border-left:3px solid var(--line);position:relative}.tl li:before{content:"";position:absolute;left:-7px;top:14px;width:11px;height:11px;border-radius:50%;background:var(--accent)}.tl b{color:var(--accent)}
  .note{border:1px solid var(--line);border-radius:12px;padding:10px 16px;margin:10px 0;break-inside:avoid}.note .nt{font:600 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
  .photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.photos figure{margin:0}.photos img{width:100%;height:170px;object-fit:cover;border-radius:10px}.photos figcaption{font-size:12px;color:var(--muted);text-align:center}
  footer{text-align:center;color:var(--muted);font:12px system-ui,sans-serif;padding:20px}
  @media print{body{background:var(--paper)}.sheet,.cover{box-shadow:none;border:none;margin:0;max-width:none;border-radius:0;break-after:page;padding:28px 10px}.sheet:last-of-type{break-after:auto}}
  @media(max-width:620px){.sheet,.cover{padding:24px 18px;margin:12px}.head{flex-direction:column;align-items:flex-start}}`;
  const list = (tag, items) => items.length ? `<${tag}>${items.join("")}</${tag}>` : "";
  const sheet = c => {
    const t = typeOf(c), def = PROFILE[c.type], im = portraitOf(c);
    const facts = [...def.fields.map(f => [f.l, c[f.k]]), ["Age", ageText(c)], ...c.customFields.map(f => [f.label, f.value])].filter(f => String(f[1] || "").trim());
    let h = `<section class="sheet" id="e-${c.id}"><div class="head">${o.photos && im ? `<img src="${im.data}" alt="">` : ""}<div><span class="tag">${t.label}</span>${c.role && c.type === "character" ? `<span class="tag">${esc(c.role)}</span>` : ""}<h1>${esc(entName(c))}</h1>${c.nickname ? `<p class="nick">${esc(c.nickname)}</p>` : ""}${c.tags.map(x => `<span class="tag">${esc(x)}</span>`).join("")}</div></div>`;
    if (facts.length) h += `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
    def.areas.forEach(f => { if (has(c[f.k])) h += `<h2>${esc(f.l)}</h2><p>${esc(c[f.k])}</p>`; });
    if (o.background) [["background", c.type === "character" ? "Background" : "History"], ["family", "Family"], ["skills", "Skills & abilities"]].forEach(([k, l]) => { if (has(c[k])) h += `<h2>${l}</h2><p>${esc(c[k])}</p>`; });
    if (o.voice && c.type === "character" && (c.voiceStyle || c.catchphrases || c.voiceTraits.length || c.voiceLines.length)) {
      h += `<h2>Voice</h2>${c.voiceStyle ? `<p>${esc(c.voiceStyle)}</p>` : ""}${c.catchphrases ? `<p><b>Catchphrases:</b> ${esc(c.catchphrases)}</p>` : ""}${list("ul", c.voiceTraits.map(x => `<li>${esc(x)}</li>`))}${c.voiceLines.map(l => `<blockquote>${esc(l.text)}${l.context ? ` <small>(${esc(l.context)})</small>` : ""}</blockquote>`).join("")}`;
    }
    if (o.arc && c.type === "character" && (c.arcStart || c.arcEnd || c.arcWant || c.arcNeed || c.arcBeats.length)) {
      h += `<h2>Character arc</h2><dl class="facts">${[["Start", c.arcStart], ["Want", c.arcWant], ["Need", c.arcNeed], ["End", c.arcEnd]].filter(x => has(x[1])).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>${list("ul", c.arcBeats.map(b => `<li><b>${esc(b.title)}</b> (${b.value > 0 ? "+" : ""}${b.value}) ${esc(b.desc)}</li>`))}`;
    }
    if (o.timeline && c.timeline.length) h += `<h2>Timeline</h2><ul class="tl">${eventsOf(c).map(e => `<li><b>${esc(e.date || "?")}</b> ${esc(e.title)}${e.desc ? `<br><span style="color:var(--muted)">${esc(e.desc)}</span>` : ""}</li>`).join("")}</ul>`;
    if (o.relations && c.relations.length) h += `<h2>Connections</h2>${list("ul", c.relations.map(r => `<li><b>${esc(r.name || "?")}</b> (${esc(r.kind)})${r.desc ? ": " + esc(r.desc) : ""}</li>`))}`;
    const notes = c.notes.filter(n => o.noteTypes.includes(n.type));
    if (notes.length) h += `<h2>Notes</h2>${notes.map(n => `<div class="note"><div class="nt">${esc(n.type)}</div>${n.title ? `<h3>${esc(n.title)}</h3>` : ""}${md(n.body)}</div>`).join("")}`;
    if (o.photos && c.images.length > 1) h += `<h2>Gallery</h2><div class="photos">${c.images.slice(0, o.maxPhotos).map(i => `<figure><img src="${i.data}" alt="">${i.caption ? `<figcaption>${esc(i.caption)}</figcaption>` : ""}</figure>`).join("")}</div>`;
    return h + `</section>`;
  };
  const cover = ents.length > 1 ? `<section class="cover"><p>Codex</p><h1>${esc(o.title || "Character Vault")}</h1><p>${ents.length} entries · ${new Date().toLocaleDateString()}</p><ol class="toc">${ents.map(c => `<li><a href="#e-${c.id}">${esc(entName(c))}</a> <span style="color:var(--muted)">· ${typeOf(c).label}</span></li>`).join("")}</ol></section>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(ents.length === 1 ? entName(ents[0]) : o.title || "Character Vault")}</title><style>:root{${SHARE_THEMES[o.theme] || SHARE_THEMES.parchment}}${css}</style></head><body>${cover}${ents.map(sheet).join("")}<footer>Made with Character Vault</footer></body></html>`;
}
function printHtml(html) {
  const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.append(f);
  f.onload = () => setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 350);
  f.srcdoc = html;
}
const defaultShareOpts = () => ({ theme: "parchment", photos: true, maxPhotos: 8, background: true, voice: true, arc: true, timeline: true, relations: true, noteTypes: Object.keys(NOTE_TYPES).filter(t => t !== "Secret"), title: "My Cast" });
function printShare(ids) { const ents = ids.map(byId).filter(Boolean); if (ents.length) printHtml(buildShareHtml(ents, defaultShareOpts())); }
function openShare(ids) {
  const o = defaultShareOpts(), sel = new Set(ids);
  const m = openModal(`${modalHead("Share or export", "Create a polished sheet you can send to beta readers, co-writers or print. Secret notes are left out by default.")}
    <h3 class="sec first">Include</h3>
    <div class="toolbar wrap"><button class="btn small" data-pick="cur">Just this entry</button><button class="btn small" data-pick="chars">All characters</button><button class="btn small" data-pick="all">Everything</button><button class="btn small" data-pick="none">None</button><span class="muted small" id="shCount"></span></div>
    <div class="share-ents" id="shEnts">${state.characters.map(c => `<label class="check"><input type="checkbox" data-eid="${c.id}" ${sel.has(c.id) ? "checked" : ""}><span>${esc(entName(c))} <em class="muted small">${typeOf(c).label}</em></span></label>`).join("")}</div>
    <h3 class="sec">Sections</h3>
    <div class="checks">${[["photos", "Photos"], ["background", "Background & history"], ["voice", "Voice"], ["arc", "Character arc"], ["timeline", "Timeline"], ["relations", "Connections"]].map(([k, l]) => `<label class="check"><input type="checkbox" data-opt="${k}" checked><span>${l}</span></label>`).join("")}</div>
    <h3 class="sec">Note types to include</h3>
    <div class="checks">${Object.keys(NOTE_TYPES).map(t => `<label class="check"><input type="checkbox" data-nt="${t}" ${o.noteTypes.includes(t) ? "checked" : ""}><span>${t}${t === "Secret" ? " 🔒" : ""}</span></label>`).join("")}</div>
    <div class="grid two"><label class="fld"><span>Style</span><select id="shTheme"><option value="parchment">Parchment</option><option value="light">Clean light</option><option value="dark">Midnight</option><option value="noir">Noir</option></select></label>
    <label class="fld"><span>Title <em>(for multiple entries)</em></span><input id="shTitle" value="${esc(o.title)}"></label></div>
    <div class="toolbar wrap"><span class="spacer"></span><button class="btn" id="shMd">${ico("download", 16)} Markdown</button><button class="btn" id="shPdf">${ico("printer", 16)} Save as PDF</button><button class="btn primary" id="shHtml">${ico("share", 16)} Download page</button></div>`, { cls: "wide" });
  const chosen = () => $$("[data-eid]:checked", m).map(x => byId(x.dataset.eid)).filter(Boolean);
  const count = () => $("#shCount", m).textContent = `${chosen().length} selected`;
  count();
  m.onchange = e => { if (e.target.dataset.eid) count(); };
  m.onclick = e => {
    const p = e.target.closest("[data-pick]");
    if (p) { $$("[data-eid]", m).forEach(x => { const c = byId(x.dataset.eid); x.checked = ({ cur: c.id === state.currentId, chars: c.type === "character", all: true, none: false })[p.dataset.pick]; }); count(); }
  };
  const opts = () => {
    const r = { ...o, theme: $("#shTheme", m).value, title: $("#shTitle", m).value };
    $$("[data-opt]", m).forEach(x => r[x.dataset.opt] = x.checked);
    r.noteTypes = $$("[data-nt]:checked", m).map(x => x.dataset.nt); return r;
  };
  const need = () => { const l = chosen(); if (!l.length) { toast("Pick at least one entry"); return null; } return l; };
  $("#shHtml", m).onclick = () => { const l = need(); if (!l) return; download(`${l.length === 1 ? safeName(l[0].name) : safeName(opts().title)}.html`, buildShareHtml(l, opts()), "text/html"); toast("Page downloaded. Open it in any browser or send it as-is."); };
  $("#shPdf", m).onclick = () => { const l = need(); if (!l) return; printHtml(buildShareHtml(l, opts())); };
  $("#shMd", m).onclick = () => { const l = need(); if (!l) return; download(`${l.length === 1 ? safeName(l[0].name) : safeName(opts().title)}.md`, l.map(entityMarkdown).join("\n---\n\n"), "text/markdown"); toast("Markdown exported"); };
}

/* ---------- backups (banner, linked file, auto snapshots) ---------- */
const linkState = { handle: null, ok: false };
let fileTimer;
function renderBackup() {
  const bar = $("#backupBar"); if (!bar) return;
  const stale = state.characters.length && (Date.now() - state.lastBackup > 7 * 864e5) && Date.now() > state.backupSnooze && !(linkState.handle && linkState.ok);
  if (!stale) { bar.hidden = true; bar.innerHTML = ""; return; }
  bar.hidden = false;
  if (!bar.firstChild) {
    bar.innerHTML = `<span>${ico("info", 16)} Your work is stored only in this browser. Last backup: <b>${state.lastBackup ? ago(state.lastBackup) : "never"}</b>.</span><button class="btn small primary" id="bbNow">Back up now</button><button class="btn small" id="bbLater">Remind me in 7 days</button>`;
    $("#bbNow").onclick = openExport;
    $("#bbLater").onclick = () => { state.backupSnooze = Date.now() + 7 * 864e5; save(); renderBackup(); };
  }
}
function afterSave() {
  renderBackup();
  if (dirtyForSnap && Date.now() - lastSnapTs > 10 * 60e3) snapshot("Autosave", true).catch(() => {});
  clearTimeout(fileTimer);
  if (!linkState.handle || !linkState.ok) return;
  fileTimer = setTimeout(async () => {
    try {
      const w = await linkState.handle.createWritable();
      await w.write(JSON.stringify(exportObject())); await w.close();
      state.lastBackup = Date.now(); renderBackup();
    } catch (e) { linkState.ok = false; toast("Auto-backup failed: " + (e.message || e)); }
  }, 3000);
}
async function linkBackup() {
  if (!window.showSaveFilePicker) return toast("Auto-backup files need Chrome or Edge on desktop");
  try {
    if (linkState.handle && !linkState.ok) linkState.ok = (await linkState.handle.requestPermission({ mode: "readwrite" })) === "granted";
    else {
      linkState.handle = await window.showSaveFilePicker({ suggestedName: "character-vault-backup.json", types: [{ description: "JSON", accept: { "application/json": [".json"] } }] });
      linkState.ok = true; await DB.set(linkState.handle, "handle");
    }
    if (linkState.ok) { toast(`Auto-backup is on: ${linkState.handle.name}`); afterSave(); }
  } catch (e) { if (e.name !== "AbortError") toast("Could not link file: " + e.message); }
}
async function initBackups() {
  try {
    linkState.handle = await DB.get("handle");
    if (linkState.handle) linkState.ok = (await linkState.handle.queryPermission({ mode: "readwrite" })) === "granted";
  } catch { linkState.handle = null; }
  try {
    const h = await histLoad(); lastSnapTs = h[0]?.ts || 0;
    if (state.characters.length && Date.now() - lastSnapTs > 30 * 60e3) await snapshot("Session start", true);
  } catch { /* history is best-effort */ }
  renderBackup();
}

/* ---------- PWA ---------- */
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
async function installApp() { if (!deferredInstall) return toast("Use your browser's menu: Install app / Add to Home Screen"); deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; }
function registerSW() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
}
