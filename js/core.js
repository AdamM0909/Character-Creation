"use strict";
/* Character Vault core: helpers, data model, storage, history, trash, crypto, UI primitives. */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const pick = a => a[Math.floor(Math.random() * a.length)];
const wc = s => { s = String(s || "").trim(); return s ? s.split(/\s+/).length : 0; };
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const numKey = d => { const m = String(d ?? "").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : Infinity; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ago = ts => {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  if (s < 86400 * 30) return Math.floor(s / 86400) + " d ago";
  return new Date(ts).toLocaleDateString();
};
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
const safeName = s => (s || "untitled").replace(/[^\w-]+/g, "_").slice(0, 60);

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  flag: '<path d="M5 22V4"/><path d="M5 4h13l-2 4 2 4H5"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 2l3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  web: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  tree: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2z"/><path d="M8 7h7"/>',
  columns: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  history: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17v4M17 19h4"/>',
  replace: '<path d="M4 7h11l-3-3M20 17H9l3 3"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  crop: '<path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"/>',
  rotate: '<path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
  merge: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="14" r="2"/><path d="M6 7v10M8 6c7 0 10 3 10 6"/>',
  pinned: '<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',
  share: '<path d="M4 12v7h16v-7M12 15V3M7 8l5-5 5 5"/>',
  printer: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r=".8"/><circle cx="15" cy="15" r=".8"/><circle cx="15" cy="9" r=".8"/><circle cx="9" cy="15" r=".8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  quote: '<path d="M6 17h4l1-4V7H5v6h3zM15 17h4l1-4V7h-6v6h3z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  focus: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  palette: '<path d="M12 3a9 9 0 100 18c1.2 0 2-.8 2-1.8 0-1-.8-1.4-.8-2.4 0-1 .8-1.8 1.8-1.8H17a4 4 0 004-4c0-4.4-4-8-9-8z"/><circle cx="7.5" cy="11" r=".9"/><circle cx="10.5" cy="7" r=".9"/><circle cx="15.5" cy="7.5" r=".9"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6M11 8v6"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  wifi: '<path d="M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 20h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
function ico(name, size = 18, cls = "") {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

/* ---------- data model ---------- */
const TYPES = {
  character: { label: "Character", plural: "Characters", icon: "user", color: "#7c5cff" },
  location: { label: "Place", plural: "Places", icon: "pin", color: "#1fa97a" },
  faction: { label: "Faction", plural: "Factions", icon: "flag", color: "#e8590c" },
  item: { label: "Item", plural: "Items", icon: "gem", color: "#d49a06" },
};
const ROLE_OPTS = ["Protagonist", "Deuteragonist", "Antagonist", "Love interest", "Mentor", "Sidekick", "Supporting", "Minor", "Background"];
const PROFILE = {
  character: {
    fields: [
      { k: "race", l: "Race / species", p: "Human, elf, android…" },
      { k: "gender", l: "Gender / pronouns" },
      { k: "role", l: "Role in story", t: "select", o: ROLE_OPTS },
      { k: "occupation", l: "Occupation" },
      { k: "status", l: "Status", t: "select", o: ["Alive", "Deceased", "Missing", "Unknown"] },
      { k: "birth", l: "Birthplace" },
      { k: "build", l: "Height / build" },
      { k: "looks", l: "Eyes & hair" },
      { k: "alignment", l: "Alignment / morality", p: "Chaotic good…" },
    ],
    areas: [
      { k: "appearance", l: "Appearance", p: "Distinguishing features, style, mannerisms…" },
      { k: "personality", l: "Personality", p: "Traits, quirks, fears, voice…" },
      { k: "goals", l: "Goals & motivations", half: 1 },
      { k: "flaws", l: "Flaws & fears", half: 1 },
    ],
  },
  location: {
    fields: [
      { k: "placeType", l: "Type", t: "select", o: ["City", "Town", "Village", "Fortress", "Kingdom", "Region", "Wilderness", "Building", "Planet", "Other"] },
      { k: "region", l: "Region / parent area" },
      { k: "condition", l: "Condition", t: "select", o: ["Thriving", "Stable", "Struggling", "Ruined", "Hidden", "Lost"] },
      { k: "ruler", l: "Ruler / owner" },
      { k: "population", l: "Population / size" },
      { k: "climate", l: "Climate & terrain" },
      { k: "founded", l: "Founded" },
      { k: "allegiance", l: "Allegiance" },
    ],
    areas: [
      { k: "appearance", l: "Description & atmosphere" },
      { k: "personality", l: "Culture & people" },
      { k: "goals", l: "Landmarks & points of interest", half: 1 },
      { k: "flaws", l: "Dangers & secrets", half: 1 },
    ],
  },
  faction: {
    fields: [
      { k: "factionType", l: "Type", t: "select", o: ["Guild", "Kingdom", "Cult", "Military", "Noble house", "Company", "Order", "Gang", "Government", "Other"] },
      { k: "leader", l: "Leader" },
      { k: "headquarters", l: "Headquarters" },
      { k: "size", l: "Size / reach" },
      { k: "status", l: "Status", t: "select", o: ["Active", "Rising", "Declining", "Disbanded", "Secret"] },
      { k: "founded", l: "Founded" },
      { k: "alignment", l: "Alignment" },
      { k: "symbol", l: "Symbol & colors" },
    ],
    areas: [
      { k: "personality", l: "Beliefs & culture" },
      { k: "structure", l: "Structure & ranks" },
      { k: "goals", l: "Goals", half: 1 },
      { k: "flaws", l: "Weaknesses & enemies", half: 1 },
    ],
  },
  item: {
    fields: [
      { k: "itemType", l: "Type", t: "select", o: ["Weapon", "Armor", "Artifact", "Tool", "Document", "Jewelry", "Vehicle", "Potion", "Other"] },
      { k: "owner", l: "Current owner" },
      { k: "origin", l: "Origin / creator" },
      { k: "rarity", l: "Rarity", t: "select", o: ["Common", "Uncommon", "Rare", "Legendary", "Unique"] },
      { k: "materials", l: "Materials" },
      { k: "value", l: "Value" },
      { k: "condition", l: "Condition", t: "select", o: ["Pristine", "Worn", "Damaged", "Broken", "Lost"] },
    ],
    areas: [
      { k: "appearance", l: "Description" },
      { k: "powers", l: "Powers & properties" },
      { k: "goals", l: "Purpose", half: 1 },
      { k: "flaws", l: "Curses & drawbacks", half: 1 },
    ],
  },
};
const SHARED_KEYS = ["name", "nickname", "age", "background", "family", "skills", "voiceStyle", "catchphrases", "arcStart", "arcWant", "arcNeed", "arcEnd"];
const TEXT_KEYS = [...new Set([...SHARED_KEYS, ...Object.values(PROFILE).flatMap(p => [...p.fields, ...p.areas].map(f => f.k))])];
const KEY_TAB = k => ["background", "family", "skills"].includes(k) ? "background" : ["voiceStyle", "catchphrases"].includes(k) ? "voice" : k.startsWith("arc") ? "arc" : "profile";
const EXTRA_LABELS = { name: "Name", nickname: "Nickname / alias", age: "Age", background: "Background / history", family: "Family & upbringing", skills: "Skills & abilities", voiceStyle: "Speech style", catchphrases: "Catchphrases", arcStart: "Arc: starting point", arcWant: "Arc: what they want", arcNeed: "Arc: what they need", arcEnd: "Arc: ending point" };
function fieldLabel(type, k) {
  const p = PROFILE[type] || PROFILE.character;
  const f = [...p.fields, ...p.areas].find(x => x.k === k);
  return f ? f.l : EXTRA_LABELS[k] || cap(k);
}
const NOTE_TYPES = { Story: "#7c5cff", Plot: "#e8590c", Backstory: "#2f9e44", Relationship: "#d6336c", Dialogue: "#1c7ed6", Secret: "#495057", Research: "#f08c00", Arc: "#0c8599", Other: "#868e96" };
const REL_KINDS = ["Family", "Parent", "Child", "Sibling", "Spouse", "Lover", "Friend", "Ally", "Mentor", "Student", "Colleague", "Rival", "Enemy", "Member of", "Owns", "Located in", "Other"];
const REL_COLORS = { Family: "#2f9e44", Parent: "#2f9e44", Child: "#2f9e44", Sibling: "#2f9e44", Spouse: "#e64980", Lover: "#e64980", Friend: "#1c7ed6", Ally: "#0c8599", Mentor: "#7c5cff", Student: "#7c5cff", Colleague: "#868e96", Rival: "#f08c00", Enemy: "#d6336c", "Member of": "#e8590c", Owns: "#d49a06", "Located in": "#1fa97a", Other: "#adb5bd" };

function blank(type = "character") {
  const c = {
    id: uid(), type, created: Date.now(), updated: Date.now(), fav: false, stories: [], tags: [],
    images: [], mainImage: null, notes: [], relations: [], customFields: [], timeline: [], tlManual: false,
    voiceTraits: [], voiceLines: [], arcBeats: [], birthYear: "", deathYear: "",
  };
  TEXT_KEYS.forEach(k => c[k] = "");
  return c;
}
const DEFAULT_SETTINGS = { theme: "", accent: "", font: "serif", density: "cozy", spell: true, dailyGoal: 300, storyYear: "", hiddenTabs: [], hiddenFields: [], browse: "cards", gallery: "grid", noteSort: "manual" };
let state = {
  characters: [], templates: [], stories: [], scenes: [], maps: [], trash: [],
  settings: { ...DEFAULT_SETTINGS }, writing: { days: {}, lastTotal: null },
  currentId: null, lastBackup: 0, backupSnooze: 0,
};
const ui = { view: "home", tab: "profile", type: "all", story: "", tag: "", fav: false, q: "", role: "", sort: "updated", preview: new Set(), lb: { list: [], i: 0 }, browseSort: { k: "name", dir: 1 } };

const byId = id => state.characters.find(c => c.id === id);
const cur = () => byId(state.currentId);
const touch = c => { if (c) c.updated = Date.now(); };
const entName = c => (c && c.name) || "Unnamed";
const typeOf = c => TYPES[c.type] || TYPES.character;
const subtype = c => ({ character: c.role, location: c.placeType, faction: c.factionType, item: c.itemType }[c.type] || "");
function portraitOf(c) { return c.images.find(i => i.id === c.mainImage) || c.images[0] || null; }
function ageInfo(c) {
  const sy = parseInt(state.settings.storyYear), by = parseInt(c.birthYear), dy = parseInt(c.deathYear);
  if (isNaN(by) || isNaN(sy)) return null;
  if (sy < by) return { unborn: true };
  if (!isNaN(dy) && sy >= dy) return { age: dy - by, dead: true };
  return { age: sy - by };
}
function ageText(c) {
  const a = ageInfo(c);
  if (a) return a.unborn ? "not yet born" : a.age + (a.dead ? " at death" : "");
  return c.age || "";
}
function entitySummary(c) {
  const t = c.type;
  if (t === "character") return [c.race, c.role, ageText(c) && "age " + ageText(c)].filter(Boolean).join(" · ");
  if (t === "location") return [c.placeType, c.region].filter(Boolean).join(" · ");
  if (t === "faction") return [c.factionType, c.leader && "led by " + c.leader].filter(Boolean).join(" · ");
  return [c.itemType, c.rarity, c.owner && "held by " + c.owner].filter(Boolean).join(" · ");
}

/* completeness */
const has = v => String(v || "").trim().length > 0;
const CHECKS = {
  character: [
    { l: "Portrait photo", tab: "gallery", ok: c => c.images.length > 0 },
    { l: "Race / species", tab: "profile", ok: c => has(c.race) },
    { l: "Age or birth year", tab: "profile", ok: c => has(c.age) || has(c.birthYear) },
    { l: "Role in story", tab: "profile", ok: c => has(c.role) },
    { l: "Appearance", tab: "profile", ok: c => has(c.appearance) },
    { l: "Personality", tab: "profile", ok: c => has(c.personality) },
    { l: "Goals", tab: "profile", ok: c => has(c.goals) },
    { l: "Flaws & fears", tab: "profile", ok: c => has(c.flaws) },
    { l: "Background", tab: "background", ok: c => wc(c.background) >= 15 },
    { l: "Voice", tab: "voice", ok: c => has(c.voiceStyle) || c.voiceLines.length > 0 },
    { l: "Character arc", tab: "arc", ok: c => has(c.arcStart) || c.arcBeats.length > 0 },
    { l: "A timeline event", tab: "timeline", ok: c => c.timeline.length > 0 },
    { l: "A relationship", tab: "relations", ok: c => c.relations.length > 0 },
    { l: "A note", tab: "notes", ok: c => c.notes.length > 0 },
  ],
  location: [
    { l: "Photo or map image", tab: "gallery", ok: c => c.images.length > 0 },
    { l: "Type", tab: "profile", ok: c => has(c.placeType) },
    { l: "Description", tab: "profile", ok: c => has(c.appearance) },
    { l: "Culture & people", tab: "profile", ok: c => has(c.personality) },
    { l: "Landmarks", tab: "profile", ok: c => has(c.goals) },
    { l: "Dangers & secrets", tab: "profile", ok: c => has(c.flaws) },
    { l: "History", tab: "background", ok: c => wc(c.background) >= 15 },
    { l: "A connection", tab: "relations", ok: c => c.relations.length > 0 },
    { l: "A note", tab: "notes", ok: c => c.notes.length > 0 },
  ],
  faction: [
    { l: "Emblem or image", tab: "gallery", ok: c => c.images.length > 0 },
    { l: "Type", tab: "profile", ok: c => has(c.factionType) },
    { l: "Leader", tab: "profile", ok: c => has(c.leader) },
    { l: "Beliefs & culture", tab: "profile", ok: c => has(c.personality) },
    { l: "Goals", tab: "profile", ok: c => has(c.goals) },
    { l: "Weaknesses & enemies", tab: "profile", ok: c => has(c.flaws) },
    { l: "History", tab: "background", ok: c => wc(c.background) >= 15 },
    { l: "A connection", tab: "relations", ok: c => c.relations.length > 0 },
    { l: "A note", tab: "notes", ok: c => c.notes.length > 0 },
  ],
  item: [
    { l: "Photo", tab: "gallery", ok: c => c.images.length > 0 },
    { l: "Type", tab: "profile", ok: c => has(c.itemType) },
    { l: "Description", tab: "profile", ok: c => has(c.appearance) },
    { l: "Powers & properties", tab: "profile", ok: c => has(c.powers) },
    { l: "Origin", tab: "profile", ok: c => has(c.origin) },
    { l: "History", tab: "background", ok: c => wc(c.background) >= 15 },
    { l: "A connection", tab: "relations", ok: c => c.relations.length > 0 },
    { l: "A note", tab: "notes", ok: c => c.notes.length > 0 },
  ],
};
function completeness(c) {
  const list = CHECKS[c.type] || CHECKS.character;
  const done = list.filter(x => x.ok(c)), missing = list.filter(x => !x.ok(c));
  return { pct: Math.round(done.length / list.length * 100), done, missing };
}

/* text access (search, find/replace, word counts) */
function textSlots(c) {
  const out = [], L = k => fieldLabel(c.type, k);
  TEXT_KEYS.forEach(k => out.push({ label: L(k), tab: KEY_TAB(k), get: () => c[k], set: v => { c[k] = v; } }));
  c.notes.forEach(n => {
    out.push({ label: `${n.type} note title`, tab: "notes", get: () => n.title, set: v => { n.title = v; } });
    out.push({ label: `${n.type} note: ${n.title || "untitled"}`, tab: "notes", get: () => n.body, set: v => { n.body = v; } });
  });
  c.timeline.forEach(e => {
    out.push({ label: `Event ${e.date || ""} title`, tab: "timeline", get: () => e.title, set: v => { e.title = v; } });
    out.push({ label: `Event ${e.date || ""}`, tab: "timeline", get: () => e.desc, set: v => { e.desc = v; } });
  });
  c.voiceLines.forEach(l => {
    out.push({ label: "Sample line", tab: "voice", get: () => l.text, set: v => { l.text = v; } });
    out.push({ label: "Sample line context", tab: "voice", get: () => l.context, set: v => { l.context = v; } });
  });
  c.customFields.forEach(f => out.push({ label: f.label || "Custom field", tab: "profile", get: () => f.value, set: v => { f.value = v; } }));
  c.relations.forEach(r => {
    out.push({ label: "Relationship name", tab: "relations", get: () => r.name, set: v => { r.name = v; } });
    out.push({ label: `Relationship: ${r.name || "?"}`, tab: "relations", get: () => r.desc, set: v => { r.desc = v; } });
  });
  c.arcBeats.forEach(b => {
    out.push({ label: "Arc beat title", tab: "arc", get: () => b.title, set: v => { b.title = v; } });
    out.push({ label: "Arc beat", tab: "arc", get: () => b.desc, set: v => { b.desc = v; } });
  });
  return out;
}
function entityWords(c) {
  let n = 0;
  TEXT_KEYS.forEach(k => { if (k !== "name" && k !== "nickname") n += wc(c[k]); });
  c.notes.forEach(x => n += wc(x.body));
  c.timeline.forEach(x => n += wc(x.desc));
  c.voiceLines.forEach(x => n += wc(x.text));
  c.customFields.forEach(x => n += wc(x.value));
  c.relations.forEach(x => n += wc(x.desc));
  c.arcBeats.forEach(x => n += wc(x.desc));
  return n;
}
const totalWords = () => state.characters.reduce((n, c) => n + entityWords(c), 0) + state.scenes.reduce((n, s) => n + wc(s.summary), 0);
function trackWriting() {
  const w = state.writing, t = totalWords();
  if (w.lastTotal == null) { w.lastTotal = t; return; }
  if (t > w.lastTotal) { const k = dayKey(); w.days[k] = (w.days[k] || 0) + (t - w.lastTotal); }
  w.lastTotal = t;
}
const resetWritingBaseline = () => { state.writing.lastTotal = totalWords(); };
function writingStreak() {
  const goal = Math.max(1, state.settings.dailyGoal || 1), d = new Date();
  let streak = 0;
  if ((state.writing.days[dayKey(d)] || 0) < goal) d.setDate(d.getDate() - 1);
  while ((state.writing.days[dayKey(d)] || 0) >= goal) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

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
  async get(key = "state") {
    const db = await this.open();
    return new Promise((res, rej) => { const q = db.transaction("kv").objectStore("kv").get(key); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  },
  async set(v, key = "state") {
    const db = await this.open();
    return new Promise((res, rej) => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, key); t.oncomplete = res; t.onerror = () => rej(t.error); });
  },
};
function normalizeState() {
  const s = state;
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings || {}) };
  ["characters", "templates", "stories", "scenes", "maps", "trash"].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  s.writing = { days: {}, lastTotal: null, ...(s.writing || {}) };
  s.characters = s.characters.map(c => { const b = Object.assign(blank(c.type || "character"), c); if (!b.type) b.type = "character"; return b; });
  s.scenes.forEach(x => { x.characterIds ||= []; });
  const cutoff = Date.now() - 30 * 864e5;
  s.trash = s.trash.filter(t => t.deletedAt > cutoff);
  if (!byId(s.currentId)) s.currentId = s.characters[0]?.id ?? null;
}

let saveTimer, savedOnce = false, dirtyForSnap = false;
function save(now) {
  const el = $("#saveState"); if (el) { el.textContent = "Saving…"; el.dataset.s = "saving"; }
  clearTimeout(saveTimer);
  if (now) return persist();
  saveTimer = setTimeout(persist, 450);
}
async function persist() {
  try {
    trackWriting();
    await DB.set(state);
    const el = $("#saveState"); if (el) { el.textContent = "Saved"; el.dataset.s = "ok"; }
    dirtyForSnap = true;
    afterSave();
  } catch (e) {
    const el = $("#saveState"); if (el) { el.textContent = "Save failed"; el.dataset.s = "err"; }
    toast("Could not save: " + (e.message || e));
  }
}
window.addEventListener("beforeunload", () => { if (saveTimer) { clearTimeout(saveTimer); persist(); } });

/* ---------- history snapshots ---------- */
const HIST_KEY = "history";
let lastSnapTs = 0;
const histLoad = async () => (await DB.get(HIST_KEY)) || [];
function snapshotData() {
  return JSON.stringify({
    characters: state.characters.map(c => ({ ...c, images: c.images.map(i => ({ id: i.id, caption: i.caption, data: null })) })),
    templates: state.templates, stories: state.stories, scenes: state.scenes,
    maps: state.maps.map(m => ({ ...m, data: null })),
  });
}
async function snapshot(label, auto) {
  let list = await histLoad();
  list.unshift({ id: uid(), ts: Date.now(), label, auto: !!auto, count: state.characters.length, words: totalWords(), data: snapshotData() });
  const autos = list.filter(s => s.auto), manual = list.filter(s => !s.auto);
  const keep = new Set([...autos.slice(0, 30), ...manual.slice(0, 30)].map(s => s.id));
  list = list.filter(s => keep.has(s.id));
  await DB.set(list, HIST_KEY);
  lastSnapTs = Date.now(); dirtyForSnap = false;
}
function imagePool() {
  const pool = new Map();
  state.characters.forEach(c => c.images.forEach(i => pool.set(i.id, i.data)));
  state.maps.forEach(m => pool.set(m.id, m.data));
  state.trash.forEach(t => {
    if (t.kind === "entity") t.payload.images.forEach(i => pool.set(i.id, i.data));
    if (t.kind === "photo") pool.set(t.payload.id, t.payload.data);
    if (t.kind === "map") pool.set(t.payload.id, t.payload.data);
  });
  return pool;
}
function hydrateEntity(c, pool) {
  c.images = c.images.map(i => ({ ...i, data: i.data || pool.get(i.id) })).filter(i => i.data);
  if (c.mainImage && !c.images.some(i => i.id === c.mainImage)) c.mainImage = c.images[0]?.id ?? null;
  return Object.assign(blank(c.type), c);
}
async function restoreSnapshot(snap, onlyId) {
  await snapshot("Before restore", false);
  const d = JSON.parse(snap.data), pool = imagePool();
  if (onlyId) {
    const src = d.characters.find(c => c.id === onlyId); if (!src) return false;
    const fresh = hydrateEntity(src, pool), i = state.characters.findIndex(c => c.id === onlyId);
    if (i >= 0) state.characters[i] = fresh; else state.characters.push(fresh);
    state.trash = state.trash.filter(t => !(t.kind === "entity" && t.payload.id === onlyId));
  } else {
    state.characters = d.characters.map(c => hydrateEntity(c, pool));
    state.templates = d.templates || []; state.stories = d.stories || []; state.scenes = d.scenes || [];
    state.maps = (d.maps || []).map(m => ({ ...m, data: m.data || pool.get(m.id) })).filter(m => m.data);
  }
  normalizeState(); resetWritingBaseline(); save(true);
  return true;
}

/* ---------- trash ---------- */
function trashPush(kind, label, payload, extra = {}) {
  state.trash.unshift({ id: uid(), kind, label, payload, deletedAt: Date.now(), ...extra });
}
function trashRestore(id) {
  const i = state.trash.findIndex(t => t.id === id); if (i < 0) return "Item not found";
  const t = state.trash[i];
  if (t.kind === "entity") {
    if (byId(t.payload.id)) t.payload.id = uid();
    state.characters.push(Object.assign(blank(t.payload.type), t.payload));
  } else if (t.kind === "note" || t.kind === "photo") {
    const c = byId(t.charId); if (!c) return "The " + (TYPES[t.charType]?.label.toLowerCase() || "character") + " this belonged to no longer exists";
    if (t.kind === "note") c.notes.push(t.payload); else { c.images.push(t.payload); c.mainImage ||= t.payload.id; }
    touch(c);
  } else if (t.kind === "map") state.maps.push(t.payload);
  state.trash.splice(i, 1); resetWritingBaseline(); save();
  return null;
}

/* ---------- export / import / encryption ---------- */
const b64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function deriveKey(pw, salt, iter, usage) {
  if (!crypto?.subtle) throw new Error("Encryption needs a secure (https) page");
  const km = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, km, { name: "AES-GCM", length: 256 }, false, [usage]);
}
async function encryptText(text, pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 250000;
  const key = await deriveKey(pw, salt, iter, "encrypt");
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  return JSON.stringify({ app: "character-vault", encrypted: true, v: 1, kdf: "PBKDF2-SHA256", iter, salt: b64(salt), iv: b64(iv), data: b64(ct) });
}
async function decryptObj(o, pw) {
  const key = await deriveKey(pw, unb64(o.salt), o.iter, "decrypt");
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(o.iv) }, key, unb64(o.data))); }
  catch { throw new Error("Wrong password"); }
}
function exportObject() {
  return { app: "character-vault", version: 3, exported: Date.now(), characters: state.characters, templates: state.templates, stories: state.stories, scenes: state.scenes, maps: state.maps };
}

/* ---------- UI primitives ---------- */
let modalOpts = {};
function openModal(html, opts = {}) {
  const o = $("#overlay"), m = $("#modal");
  m.onclick = m.oninput = m.onchange = m.onkeydown = null;
  m.className = "modal " + (opts.cls || ""); m.innerHTML = html; modalOpts = opts;
  o.hidden = false; requestAnimationFrame(() => o.classList.add("show"));
  document.body.classList.add("noscroll");
  m.querySelector("[autofocus]")?.focus();
  return m;
}
function closeModal() {
  const o = $("#overlay"); if (o.hidden) return;
  o.hidden = true; o.classList.remove("show"); const mm = $("#modal"); mm.innerHTML = ""; mm.onclick = mm.oninput = mm.onchange = mm.onkeydown = null;
  document.body.classList.remove("noscroll");
  const cb = modalOpts.onClose; modalOpts = {}; cb?.();
}
const modalHead = (title, sub = "") => `<div class="modal-head"><div><h2>${esc(title)}</h2>${sub ? `<p class="muted small">${sub}</p>` : ""}</div><button class="icon-btn" data-modal-close aria-label="Close">${ico("x")}</button></div>`;

function dialog({ title, body = "", ok = "OK", cancel = "Cancel", danger = false, input = null }) {
  return new Promise(res => {
    const d = $("#dialog"); d.hidden = false;
    $(".dlg", d).innerHTML = `<h3>${esc(title)}</h3>${body ? `<p class="muted">${esc(body)}</p>` : ""}${input ? `<input id="dlgInput" value="${esc(input.value || "")}" placeholder="${esc(input.placeholder || "")}" ${input.type ? `type="${input.type}"` : ""}>` : ""}
      <div class="dlg-actions">${cancel ? `<button class="btn" data-d="0">${esc(cancel)}</button>` : ""}<button class="btn ${danger ? "danger-solid" : "primary"}" data-d="1">${esc(ok)}</button></div>`;
    const inp = $("#dlgInput", d);
    const done = v => { d.hidden = true; d.onclick = null; d.onkeydown = null; res(v); };
    d.onclick = e => { const b = e.target.closest("[data-d]"); if (b) done(b.dataset.d === "1" ? (inp ? inp.value : true) : (inp ? null : false)); else if (e.target === d) done(inp ? null : false); };
    d.onkeydown = e => { if (e.key === "Escape") { e.stopPropagation(); done(inp ? null : false); } if (e.key === "Enter" && inp) done(inp.value); };
    (inp || $("[data-d='1']", d)).focus(); inp?.select();
  });
}
const confirmBox = (title, body, ok = "Delete", danger = true) => dialog({ title, body, ok, danger });
const promptBox = (title, value = "", placeholder = "") => dialog({ title, ok: "Save", input: { value, placeholder } });

let menuState = null;
function closeMenu() { if (!menuState) return; menuState.el.remove(); document.removeEventListener("mousedown", menuState.out, true); menuState = null; }
function openMenu(anchor, itemsOrFn, { align = "left" } = {}) {
  closeMenu();
  const items = typeof itemsOrFn === "function" ? itemsOrFn() : itemsOrFn;
  const m = document.createElement("div"); m.className = "menu"; m.setAttribute("role", "menu");
  m.innerHTML = items.map((it, i) => it.sep ? "<hr>" : it.head ? `<div class="menu-head">${esc(it.head)}</div>` :
    `<button class="menu-item ${it.danger ? "danger" : ""}" data-i="${i}">${it.icon ? ico(it.icon, 16) : '<span class="ico-sp"></span>'}<span class="grow">${esc(it.label)}</span>${it.check ? `<span class="chk">${ico("check", 14)}</span>` : ""}${it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ""}</button>`).join("");
  document.body.append(m);
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  let left = align === "right" ? r.right - mw : r.left;
  left = clamp(left, 8, innerWidth - mw - 8);
  let top = r.bottom + 6; if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  m.style.left = left + "px"; m.style.top = top + "px";
  const out = e => { if (!m.contains(e.target)) closeMenu(); };
  menuState = { el: m, out };
  setTimeout(() => document.addEventListener("mousedown", out, true), 0);
  m.onclick = e => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    const it = items[+b.dataset.i];
    if (it.keepOpen) { it.fn?.(); openMenu(anchor, itemsOrFn, { align }); } else { closeMenu(); it.fn?.(); }
  };
}

let toastT;
function toast(msg, { action, fn, ms = 3400 } = {}) {
  const t = $("#toast");
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ""}`;
  t.hidden = false; requestAnimationFrame(() => t.classList.add("show"));
  if (action) t.querySelector("button").onclick = () => { fn?.(); t.classList.remove("show"); t.hidden = true; };
  clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.hidden = true, 250); }, ms);
}

/* ---------- theming ---------- */
const THEMES = [
  { id: "light", name: "Ivory", bg: "#f5f1ea", panel: "#ffffff", accent: "#7c5cff" },
  { id: "dark", name: "Midnight", bg: "#14121b", panel: "#1f1c29", accent: "#9d84ff" },
  { id: "parchment", name: "Parchment", bg: "#ecdfc4", panel: "#f6ecd6", accent: "#9a3b26" },
  { id: "noir", name: "Noir", bg: "#0b0b0c", panel: "#161617", accent: "#e0b860" },
  { id: "forest", name: "Forest", bg: "#101a14", panel: "#18271e", accent: "#5fcf8a" },
  { id: "ocean", name: "Ocean", bg: "#0d1a26", panel: "#142536", accent: "#3fc1d6" },
  { id: "rose", name: "Rose", bg: "#fbeef1", panel: "#ffffff", accent: "#d6336c" },
];
function readableOn(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ""); if (!m) return "#fff";
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return (.2126 * r + .7152 * g + .0722 * b) > .45 ? "#16121f" : "#ffffff";
}
function applyTheme() {
  const s = state.settings, root = document.documentElement;
  let t = s.theme; if (!THEMES.some(x => x.id === t)) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.dataset.theme = t; root.dataset.font = s.font; root.dataset.density = s.density;
  if (s.accent) { root.style.setProperty("--accent", s.accent); root.style.setProperty("--accent-text", readableOn(s.accent)); }
  else { root.style.removeProperty("--accent"); root.style.removeProperty("--accent-text"); }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(root).getPropertyValue("--bg").trim() || "#f5f1ea");
  $$("textarea, input[type=text], input:not([type])").forEach(el => el.spellcheck = !!s.spell);
}
