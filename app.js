"use strict";
/* Character Vault: a private character codex. All data lives in this browser (IndexedDB). */

const NOTE_TYPES = {
  Story:        "#7c4dff",
  Plot:         "#e8590c",
  Backstory:    "#2f9e44",
  Relationship: "#d6336c",
  Dialogue:     "#1c7ed6",
  Secret:       "#495057",
  Research:     "#f08c00",
  Arc:          "#0c8599",
  Other:        "#868e96",
};
const REL_KINDS = ["Family", "Friend", "Ally", "Rival", "Enemy", "Lover", "Mentor", "Colleague", "Other"];
const FIELDS = ["name","nickname","age","race","gender","role","occupation","status","birth","build","looks",
  "alignment","appearance","personality","goals","flaws","background","family","skills"];

let state = { characters: [], settings: { theme: "" }, currentId: null };
let ui = { tab: "profile", tag: "", lb: { i: 0 } };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cur = () => state.characters.find(c => c.id === state.currentId);

/* ---------- storage ---------- */
const DB = {
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open("character-vault", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  },
  async get() {
    const db = await this.open();
    return new Promise((res, rej) => {
      const q = db.transaction("kv").objectStore("kv").get("state");
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  },
  async set(v) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, "state");
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
    });
  },
};

let saveTimer;
function save(now) {
  $("#saved").textContent = "Saving…";
  clearTimeout(saveTimer);
  const run = async () => {
    try {
      await DB.set(JSON.parse(JSON.stringify(state)));
      $("#saved").textContent = "Saved";
    } catch (e) {
      $("#saved").textContent = "Save failed";
      toast("Could not save: " + (e.message || e));
    }
  };
  if (now) run(); else saveTimer = setTimeout(run, 400);
}
function touch(c) { c.updated = Date.now(); }

/* ---------- model ---------- */
function blankChar() {
  const c = { id: uid(), created: Date.now(), updated: Date.now(), tags: [], images: [], mainImage: null, notes: [], relations: [] };
  FIELDS.forEach(f => c[f] = "");
  return c;
}

/* ---------- sidebar ---------- */
function renderSidebar() {
  const q = $("#search").value.trim().toLowerCase();
  const role = $("#filterRole").value;
  const sort = $("#sortBy").value;

  // role filter options
  const roles = [...new Set(state.characters.map(c => c.role).filter(Boolean))].sort();
  const rf = $("#filterRole");
  const prev = rf.value;
  rf.innerHTML = `<option value="">All roles</option>` + roles.map(r => `<option>${esc(r)}</option>`).join("");
  rf.value = roles.includes(prev) ? prev : "";

  // tag cloud
  const tags = [...new Set(state.characters.flatMap(c => c.tags))].sort();
  if (ui.tag && !tags.includes(ui.tag)) ui.tag = "";
  $("#tagCloud").innerHTML = tags.map(t => `<span class="chip ${t === ui.tag ? "on" : ""}" data-tag="${esc(t)}">${esc(t)}</span>`).join("");

  let list = state.characters.filter(c => {
    if (rf.value && c.role !== rf.value) return false;
    if (ui.tag && !c.tags.includes(ui.tag)) return false;
    if (!q) return true;
    const hay = [c.name, c.nickname, c.race, c.role, c.occupation, c.tags.join(" "),
      c.notes.map(n => n.title + " " + n.body).join(" "), c.background, c.appearance, c.personality].join(" ").toLowerCase();
    return hay.includes(q);
  });
  const ageNum = c => parseFloat(c.age) || 0;
  list.sort({
    updated: (a, b) => b.updated - a.updated,
    created: (a, b) => b.created - a.created,
    name: (a, b) => (a.name || "~").localeCompare(b.name || "~"),
    age: (a, b) => ageNum(a) - ageNum(b),
  }[sort]);

  $("#charList").innerHTML = list.map(c => {
    const img = c.images.find(i => i.id === c.mainImage) || c.images[0];
    const sub = [c.race, c.role, c.age && "age " + c.age].filter(Boolean).join(" · ");
    return `<li data-id="${c.id}" class="${c.id === state.currentId ? "active" : ""}">
      <div class="avatar" style="${img ? `background-image:url('${img.data}')` : ""}">${img ? "" : esc((c.name || "?")[0].toUpperCase())}</div>
      <div style="min-width:0"><div class="li-name">${esc(c.name || "Unnamed")}</div><div class="li-sub">${esc(sub || "No details yet")}</div></div></li>`;
  }).join("") || `<li class="muted" style="cursor:default">No characters found</li>`;

  const notes = state.characters.reduce((n, c) => n + c.notes.length, 0);
  $("#stats").textContent = `${state.characters.length} characters · ${notes} notes`;
}

/* ---------- editor ---------- */
function showEditor() {
  const c = cur();
  $("#empty").hidden = !!c;
  $("#editor").hidden = !c;
  if (!c) return;
  FIELDS.forEach(f => { const el = $(`[data-f="${f}"]`); if (el) el.value = c[f] || ""; });
  renderTags(); renderPortrait(); renderNotes(); renderGallery(); renderRelations(); updateCounts(); setTab(ui.tab);
}
function setTab(t) {
  ui.tab = t;
  $$("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === t));
  $$(".tab").forEach(p => p.hidden = p.dataset.panel !== t);
}
function updateCounts() {
  const c = cur(); if (!c) return;
  $("#noteCount").textContent = c.notes.length || "";
  $("#imgCount").textContent = c.images.length || "";
  $("#relCount").textContent = c.relations.length || "";
  const words = [c.background, c.family, c.skills, ...c.notes.map(n => n.body)].join(" ").trim().split(/\s+/).filter(Boolean).length;
  $("#wordCount").textContent = `${words} words across background and notes`;
}
function renderPortrait() {
  const c = cur();
  const img = c.images.find(i => i.id === c.mainImage) || c.images[0];
  const p = $("#portrait");
  p.style.backgroundImage = img ? `url('${img.data}')` : "";
  p.textContent = img ? "" : "📷";
}
function renderTags() {
  const c = cur();
  $$("#tagBox .chip").forEach(e => e.remove());
  const input = $("#tagInput");
  c.tags.forEach(t => {
    const s = document.createElement("span");
    s.className = "chip";
    s.innerHTML = `${esc(t)}<button type="button" data-rm="${esc(t)}" aria-label="Remove tag">✕</button>`;
    input.before(s);
  });
}
function addTag(raw) {
  const c = cur();
  raw.split(",").map(s => s.trim()).filter(Boolean).forEach(t => { if (!c.tags.includes(t)) c.tags.push(t); });
  touch(c); renderTags(); renderSidebar(); save();
}

/* ---------- notes ---------- */
function renderNotes() {
  const c = cur();
  const f = $("#noteFilter").value;
  const list = c.notes.filter(n => !f || n.type === f)
    .sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
  $("#notesList").innerHTML = list.map(n => `
    <div class="card ${n.pinned ? "pinned" : ""}" data-nid="${n.id}" style="--c:${NOTE_TYPES[n.type] || NOTE_TYPES.Other}">
      <div class="card-top">
        <span class="badge">${esc(n.type)}</span>
        <input data-nf="title" value="${esc(n.title)}" placeholder="Note title">
        <button type="button" class="icon-btn" data-act="pin" title="Pin to top">${n.pinned ? "📌" : "📍"}</button>
        <button type="button" class="icon-btn" data-act="delnote" title="Delete note">🗑</button>
      </div>
      <textarea data-nf="body" placeholder="Write your ${esc(n.type.toLowerCase())} note…">${esc(n.body)}</textarea>
      <div class="card-foot muted tiny"><span>${new Date(n.updated).toLocaleString()}</span><span class="wc">${wc(n.body)} words</span></div>
    </div>`).join("") || `<p class="muted">No notes yet. Pick a type above and add one.</p>`;
}
const wc = s => (s.trim() ? s.trim().split(/\s+/).length : 0);

/* ---------- gallery ---------- */
function renderGallery() {
  const c = cur();
  $("#gallery").innerHTML = c.images.map(i => `
    <div class="shot ${i.id === c.mainImage ? "main" : ""}" data-iid="${i.id}">
      <div class="img" style="background-image:url('${i.data}')" data-act="zoom"></div>
      <div class="cap"><input data-icap value="${esc(i.caption)}" placeholder="Caption"></div>
      <div class="acts">
        <button type="button" class="icon-btn" data-act="main" title="Set as main portrait">${i.id === c.mainImage ? "★" : "☆"}</button>
        <button type="button" class="icon-btn" data-act="delimg" title="Remove photo">🗑</button>
      </div>
    </div>`).join("");
}
function resizeImage(file, max = 900, quality = 0.82) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      res(cv.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Not a readable image: " + file.name)); };
    img.src = url;
  });
}
async function addImages(files) {
  const c = cur(); if (!c) return;
  let n = 0;
  for (const f of files) {
    if (!f.type.startsWith("image/")) continue;
    try {
      const data = await resizeImage(f);
      const im = { id: uid(), data, caption: f.name.replace(/\.[^.]+$/, "") };
      c.images.push(im);
      if (!c.mainImage) c.mainImage = im.id;
      n++;
    } catch (e) { toast(e.message); }
  }
  if (n) { touch(c); renderGallery(); renderPortrait(); updateCounts(); renderSidebar(); save(); toast(`${n} photo${n > 1 ? "s" : ""} added`); }
}
function openLightbox(i) {
  const c = cur(); if (!c.images.length) return;
  ui.lb.i = (i + c.images.length) % c.images.length;
  const im = c.images[ui.lb.i];
  $("#lbImg").src = im.data; $("#lbCap").textContent = im.caption;
  $("#lightbox").hidden = false;
}

/* ---------- relationships ---------- */
function renderRelations() {
  const c = cur();
  $("#relList").innerHTML = c.relations.map(r => `
    <div class="card" data-rid="${r.id}">
      <div class="card-top">
        <input data-rf="name" value="${esc(r.name)}" placeholder="Who? (character or person)">
        <select data-rf="kind" style="width:auto">${REL_KINDS.map(k => `<option ${k === r.kind ? "selected" : ""}>${k}</option>`).join("")}</select>
        <button type="button" class="icon-btn" data-act="delrel" title="Remove">🗑</button>
      </div>
      <textarea data-rf="desc" rows="3" placeholder="Describe the relationship, history, tension…">${esc(r.desc)}</textarea>
    </div>`).join("") || `<p class="muted">No relationships recorded yet.</p>`;
}

/* ---------- misc ---------- */
let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600);
}
function selectChar(id) {
  state.currentId = id; showEditor(); renderSidebar(); save();
  $("#sidebar").classList.remove("open");
  $("#main").scrollTo(0, 0);
}
function applyTheme() {
  const t = state.settings.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = t;
}
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- events ---------- */
function bind() {
  $("#newBtn").onclick = () => {
    const c = blankChar(); c.name = "New character";
    state.characters.unshift(c); selectChar(c.id);
    const n = $('[data-f="name"]'); n.focus(); n.select();
  };
  $("#search").oninput = renderSidebar;
  $("#filterRole").onchange = renderSidebar;
  $("#sortBy").onchange = renderSidebar;
  $("#menuBtn").onclick = () => $("#sidebar").classList.add("open");
  $("#themeBtn").onclick = () => {
    state.settings.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(); save();
  };
  $("#tagCloud").onclick = e => {
    const t = e.target.dataset.tag; if (t === undefined) return;
    ui.tag = ui.tag === t ? "" : t; renderSidebar();
  };
  $("#charList").onclick = e => { const li = e.target.closest("li[data-id]"); if (li) selectChar(li.dataset.id); };

  // profile fields
  $("#editor").addEventListener("input", e => {
    const f = e.target.dataset.f; const c = cur();
    if (f && c) {
      c[f] = e.target.value; touch(c); save();
      if (["name", "nickname", "age", "race", "role"].includes(f)) renderSidebar();
      if (f === "background" || f === "family" || f === "skills") updateCounts();
    }
  });
  $("#editor").addEventListener("submit", e => e.preventDefault());
  $("#tabs").onclick = e => { if (e.target.dataset.tab) setTab(e.target.dataset.tab); };

  // tags
  $("#tagInput").addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (e.target.value.trim()) addTag(e.target.value); e.target.value = ""; }
    else if (e.key === "Backspace" && !e.target.value) { const c = cur(); if (c.tags.length) { c.tags.pop(); renderTags(); renderSidebar(); save(); } }
  });
  $("#tagInput").addEventListener("blur", e => { if (e.target.value.trim()) { addTag(e.target.value); e.target.value = ""; } });
  $("#tagBox").onclick = e => {
    const t = e.target.dataset.rm;
    if (t !== undefined) { const c = cur(); c.tags = c.tags.filter(x => x !== t); touch(c); renderTags(); renderSidebar(); save(); }
    else $("#tagInput").focus();
  };

  // hero actions
  $("#delBtn").onclick = () => {
    const c = cur();
    if (!confirm(`Delete "${c.name || "this character"}" permanently? Export a backup first if unsure.`)) return;
    state.characters = state.characters.filter(x => x.id !== c.id);
    state.currentId = state.characters[0]?.id ?? null;
    showEditor(); renderSidebar(); save(true); toast("Character deleted");
  };
  $("#dupBtn").onclick = () => {
    const copy = JSON.parse(JSON.stringify(cur()));
    copy.id = uid(); copy.name += " (copy)"; copy.created = copy.updated = Date.now();
    state.characters.unshift(copy); selectChar(copy.id); toast("Duplicated");
  };
  $("#printBtn").onclick = () => window.print();
  window.addEventListener("beforeprint", () => $$("textarea").forEach(t => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }));
  $("#portrait").onclick = () => { const c = cur(); if (c.images.length) openLightbox(Math.max(0, c.images.findIndex(i => i.id === c.mainImage))); else { setTab("gallery"); } };

  // notes
  $("#noteType").innerHTML = Object.keys(NOTE_TYPES).map(t => `<option>${t}</option>`).join("");
  $("#noteFilter").innerHTML = `<option value="">All note types</option>` + Object.keys(NOTE_TYPES).map(t => `<option>${t}</option>`).join("");
  $("#noteFilter").onchange = renderNotes;
  $("#addNote").onclick = () => {
    const c = cur(); const type = $("#noteType").value;
    c.notes.push({ id: uid(), type, title: "", body: "", pinned: false, updated: Date.now() });
    touch(c); $("#noteFilter").value = ""; renderNotes(); updateCounts(); save();
    const first = $$("#notesList .card").find(el => el.dataset.nid === c.notes[c.notes.length - 1].id);
    first?.querySelector("input").focus();
  };
  $("#notesList").addEventListener("input", e => {
    const card = e.target.closest("[data-nid]"); if (!card) return;
    const n = cur().notes.find(x => x.id === card.dataset.nid);
    n[e.target.dataset.nf] = e.target.value; n.updated = Date.now(); touch(cur()); save();
    if (e.target.dataset.nf === "body") { card.querySelector(".wc").textContent = wc(n.body) + " words"; updateCounts(); }
  });
  $("#notesList").addEventListener("click", e => {
    const act = e.target.closest("[data-act]")?.dataset.act; const card = e.target.closest("[data-nid]");
    if (!act || !card) return;
    const c = cur(); const n = c.notes.find(x => x.id === card.dataset.nid);
    if (act === "pin") { n.pinned = !n.pinned; }
    if (act === "delnote") { if ((n.title || n.body) && !confirm("Delete this note?")) return; c.notes = c.notes.filter(x => x !== n); }
    touch(c); renderNotes(); updateCounts(); save();
  });

  // gallery
  $("#pickImg").onclick = () => $("#imgFile").click();
  $("#imgFile").onchange = e => { addImages([...e.target.files]); e.target.value = ""; };
  const drop = $("#drop");
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => addImages([...e.dataTransfer.files]));
  document.addEventListener("paste", e => {
    if (!cur() || ui.tab !== "gallery") return;
    const files = [...(e.clipboardData?.files || [])]; if (files.length) addImages(files);
  });
  $("#gallery").addEventListener("input", e => {
    if (!("icap" in e.target.dataset)) return;
    const c = cur(); c.images.find(i => i.id === e.target.closest("[data-iid]").dataset.iid).caption = e.target.value; touch(c); save();
  });
  $("#gallery").addEventListener("click", e => {
    const act = e.target.closest("[data-act]")?.dataset.act; const el = e.target.closest("[data-iid]");
    if (!act || !el) return;
    const c = cur(); const idx = c.images.findIndex(i => i.id === el.dataset.iid);
    if (act === "zoom") return openLightbox(idx);
    if (act === "main") c.mainImage = c.images[idx].id;
    if (act === "delimg") {
      if (!confirm("Remove this photo?")) return;
      const [gone] = c.images.splice(idx, 1);
      if (c.mainImage === gone.id) c.mainImage = c.images[0]?.id ?? null;
    }
    touch(c); renderGallery(); renderPortrait(); updateCounts(); renderSidebar(); save();
  });
  $("#lbClose").onclick = () => $("#lightbox").hidden = true;
  $("#lbPrev").onclick = () => openLightbox(ui.lb.i - 1);
  $("#lbNext").onclick = () => openLightbox(ui.lb.i + 1);
  $("#lightbox").onclick = e => { if (e.target.id === "lightbox") e.currentTarget.hidden = true; };
  document.addEventListener("keydown", e => {
    if ($("#lightbox").hidden) return;
    if (e.key === "Escape") $("#lightbox").hidden = true;
    if (e.key === "ArrowLeft") openLightbox(ui.lb.i - 1);
    if (e.key === "ArrowRight") openLightbox(ui.lb.i + 1);
  });

  // relationships
  $("#addRel").onclick = () => {
    const c = cur(); c.relations.push({ id: uid(), name: "", kind: "Friend", desc: "" });
    touch(c); renderRelations(); updateCounts(); save();
    $$("#relList .card").pop()?.querySelector("input").focus();
  };
  $("#relList").addEventListener("input", e => {
    const card = e.target.closest("[data-rid]"); if (!card) return;
    const r = cur().relations.find(x => x.id === card.dataset.rid); r[e.target.dataset.rf] = e.target.value; touch(cur()); save();
  });
  $("#relList").addEventListener("click", e => {
    if (e.target.closest("[data-act]")?.dataset.act !== "delrel") return;
    const c = cur(); const id = e.target.closest("[data-rid]").dataset.rid;
    c.relations = c.relations.filter(r => r.id !== id); touch(c); renderRelations(); updateCounts(); save();
  });

  // backup
  $("#exportBtn").onclick = () => {
    download(`character-vault-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ app: "character-vault", version: 1, characters: state.characters }, null, 1), "application/json");
    toast("Backup downloaded");
  };
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== "character-vault" || !Array.isArray(data.characters)) throw new Error("Not a Character Vault backup");
      const ids = new Set(state.characters.map(c => c.id));
      let added = 0;
      data.characters.forEach(c => {
        const base = blankChar(); const merged = Object.assign(base, c);
        if (ids.has(merged.id)) merged.id = uid();
        state.characters.push(merged); added++;
      });
      renderSidebar(); if (!state.currentId && state.characters[0]) state.currentId = state.characters[0].id;
      showEditor(); save(true); toast(`Imported ${added} character${added === 1 ? "" : "s"}`);
    } catch (err) { toast("Import failed: " + err.message); }
  };
  window.addEventListener("beforeunload", () => { if (saveTimer) save(true); });
}

/* ---------- boot ---------- */
(async function init() {
  try {
    const saved = await DB.get();
    if (saved) state = Object.assign(state, saved);
  } catch (e) { toast("Storage unavailable: changes will not persist"); }
  state.characters = state.characters.map(c => Object.assign(blankChar(), c));
  if (!state.characters.some(c => c.id === state.currentId)) state.currentId = state.characters[0]?.id ?? null;
  applyTheme(); bind(); renderSidebar(); showEditor();
})();
