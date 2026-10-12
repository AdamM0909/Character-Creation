"use strict";
/* App shell: view routing, sidebar wiring, global shortcuts, boot. */

function showView(v, arg) {
  closeMenu();
  if (!VIEWS[v]) v = "home";
  ui.view = v;
  const el = $("#view"); el.dataset.view = v;
  VIEWS[v](el, arg);
  el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter");
  $("#main").scrollTo({ top: 0 });
  $$("textarea, input[type=text], input:not([type])", el).forEach(x => x.spellcheck = !!state.settings.spell);
  renderNav(); renderSidebar(); closeSidebar();
}
const openSidebar = () => { $("#sidebar").classList.add("open"); $("#scrim").hidden = false; };
function closeSidebar() { $("#sidebar").classList.remove("open"); $("#scrim").hidden = true; }

function bindShell() {
  const view = $("#view");
  bindEditor(view); bindViews(view);

  // sidebar
  $("#newBtn").onclick = () => createEntity(ui.type === "all" ? "character" : ui.type);
  $("#newMenuBtn").onclick = e => openMenu(e.currentTarget, Object.entries(TYPES).map(([k, t]) => ({ label: `New ${t.label.toLowerCase()}`, icon: t.icon, fn: () => createEntity(k) })));
  $("#typePills").onclick = e => { const b = e.target.closest("[data-type]"); if (!b) return; ui.type = b.dataset.type; renderSidebar(); if (ui.view === "browse") showView("browse"); };
  $("#search").oninput = e => { ui.q = e.target.value; renderSidebar(); if (ui.view === "browse") renderBrowse($("#view")); };
  $("#filterStory").onchange = e => { ui.story = e.target.value; renderSidebar(); if (["browse", "timeline", "web"].includes(ui.view)) showView(ui.view); };
  $("#filterRole").onchange = e => { ui.role = e.target.value; renderSidebar(); if (["browse", "timeline", "web"].includes(ui.view)) showView(ui.view); };
  $("#sortBy").onchange = e => { ui.sort = e.target.value; renderSidebar(); };
  $("#favToggle").onclick = () => { ui.fav = !ui.fav; renderSidebar(); if (["browse", "timeline", "web"].includes(ui.view)) showView(ui.view); };
  $("#tagCloud").onclick = e => { const t = e.target.dataset.tag; if (t === undefined) return; ui.tag = ui.tag === t ? "" : t; renderSidebar(); if (["browse", "timeline", "web"].includes(ui.view)) showView(ui.view); };
  $("#charList").onclick = e => { const li = e.target.closest("li[data-id]"); if (li) selectEntity(li.dataset.id); };
  $("#nav").onclick = e => { const b = e.target.closest("[data-view]"); if (b) showView(b.dataset.view, b.dataset.view === "compare" ? state.currentId : undefined); };
  $("#paletteBtn").onclick = () => openPalette();
  $("#settingsBtn").onclick = openSettings;
  $("#exportBtn").onclick = openExport;
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) handleImportFile(f); };
  $("#moreBtn").onclick = e => openMenu(e.currentTarget, [
    { label: "Find & replace", icon: "replace", fn: openFindReplace }, { label: "Writing prompts", icon: "sparkle", fn: () => openPrompts({}) },
    { label: "Name generator", icon: "dice", fn: openNameGen }, { label: "Stories", icon: "folder", fn: manageStories }, { sep: 1 },
    { label: "Version history", icon: "history", fn: openHistory }, { label: "Trash" + (state.trash.length ? ` (${state.trash.length})` : ""), icon: "trash", fn: openTrash },
    { label: "Share or export sheets", icon: "share", fn: () => openShare(cur() ? [cur().id] : []) }, { sep: 1 },
    { label: "Keyboard shortcuts", icon: "keyboard", kbd: "?", fn: openShortcuts },
  ]);
  $("#menuBtn").onclick = openSidebar;
  $("#scrim").onclick = closeSidebar;
  $("#topTitle").onclick = () => showView("home");
  $("#brand").onclick = () => showView("home");

  // modal / overlay
  $("#overlay").addEventListener("mousedown", e => { if (e.target.id === "overlay") closeModal(); });
  $("#overlay").addEventListener("click", e => { if (e.target.closest("[data-modal-close]")) closeModal(); });

  // lightbox
  const lb = $("#lightbox"), step = d => { const l = ui.lb.list; if (!l.length) return; ui.lb.i = (ui.lb.i + d + l.length) % l.length; $("#lbImg").src = l[ui.lb.i].data; $("#lbCap").textContent = l[ui.lb.i].caption || ""; };
  $("#lbClose").onclick = () => lb.hidden = true; $("#lbPrev").onclick = () => step(-1); $("#lbNext").onclick = () => step(1);
  lb.onclick = e => { if (e.target === lb) lb.hidden = true; };

  document.addEventListener("keydown", onKey);
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (!state.settings.theme) applyTheme(); });
}

function onKey(e) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (e.key === "Escape") {
    if (!$("#lightbox").hidden) { $("#lightbox").hidden = true; return; }
    if (!$("#dialog").hidden) return;
    if (menuState) { closeMenu(); return; }
    if (!$("#overlay").hidden) { closeModal(); return; }
    closeSidebar(); return;
  }
  if (!$("#lightbox").hidden) { if (e.key === "ArrowLeft") $("#lbPrev").click(); if (e.key === "ArrowRight") $("#lbNext").click(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#overlay").hidden ? openPalette() : closeModal(); return; }
  if (!$("#overlay").hidden || !$("#dialog").hidden) return;
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    const c = e.code, go = f => { e.preventDefault(); f(); };
    if (c === "KeyN") return go(() => e.shiftKey ? addNoteShortcut() : createEntity(ui.type === "all" ? "character" : ui.type));
    if (c === "KeyH") return go(() => showView("home"));
    if (c === "KeyB") return go(() => showView("browse"));
    if (c === "KeyT") return go(() => showView("timeline"));
    if (c === "KeyW") return go(() => showView("web"));
    if (c === "KeyP") return go(() => openPrompts({}));
    if (c === "KeyR") return go(openFindReplace);
    if (c === "Comma") return go(openSettings);
    if (c === "ArrowUp" || c === "ArrowDown") return go(() => { const l = sortedFiltered(), i = l.findIndex(x => x.id === state.currentId), n = l[clamp(i + (c === "ArrowUp" ? -1 : 1), 0, l.length - 1)]; if (n) selectEntity(n.id); });
    const m = /^Digit([1-9])$/.exec(c);
    if (m && ui.view === "editor") return go(() => { const t = visibleTabs(cur())[+m[1] - 1]; if (t) setTab(t.id); });
    return;
  }
  if (typing || e.ctrlKey || e.metaKey) return;
  if (e.key === "/") { e.preventDefault(); $("#search").focus(); }
  else if (e.key === "?") { e.preventDefault(); openShortcuts(); }
}
function addNoteShortcut() {
  const c = cur(); if (!c) return;
  const n = { id: uid(), type: "Story", title: "", body: "", pinned: false, updated: Date.now() };
  c.notes.push(n); touch(c); ui.noteFilter = ""; save(); ui.tab = "notes"; showView("editor");
  $(`[data-row="${n.id}"] input`)?.focus();
}

(async function boot() {
  try { const saved = await DB.get(); if (saved) Object.assign(state, saved); }
  catch (e) { setTimeout(() => toast("Storage is unavailable, so changes won't be kept."), 300); }
  normalizeState();
  if (state.writing.lastTotal == null) resetWritingBaseline();
  applyTheme(); bindShell(); renderSidebar();
  showView("home");
  initBackups(); registerSW();
})();
