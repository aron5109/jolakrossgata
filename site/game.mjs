import puzzles from "./puzzles.mjs";

const FIRST_DAY = "2026-12-01";
const LAST_DAY = "2026-12-24";
const STORAGE_PREFIX = "jolakrossgata:2026:";
const ALPHABET = /[A-ZÁÐÉÍÓÚÝÞÆÖ]/gu;
const DIRECTION = { across: "Lárétt", down: "Lóðrétt" };
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Atlantic/Reykjavik",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const ui = Object.fromEntries([
  "leikurinn", "puzzle-date", "puzzle-title", "puzzle-state",
  "cover", "cover-pattern", "cover-title", "cover-description", "start",
  "play", "active-clue", "board", "letters", "across", "down", "feedback", "check",
  "days", "calendar-description",
].map((id) => [id, document.getElementById(id)]));
const calendarNote = document.querySelector(".calendar-note");

const params = new URLSearchParams(location.search);
const preview = params.get("previewDate");
const previewDate = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
  && /^\d{4}-\d{2}-\d{2}$/.test(preview ?? "")
  && Number.isFinite(Date.parse(preview))
  && new Date(preview).toISOString().slice(0, 10) === preview
  ? preview : null;

function dateInIceland(now = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const dateLabel = (day) => `${day}. desember`;
const keyAt = (row, col) => `${row},${col}`;
const blankProgress = () => ({ startedAt: null, finishedAt: null, letters: {} });
const memory = new Map();

function readProgress(day) {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + day);
    if (stored !== null) {
      const value = JSON.parse(stored);
      if (Number.isFinite(value?.startedAt) && value.letters && typeof value.letters === "object") return value;
    }
  } catch {
    return memory.get(day) ?? blankProgress();
  }
  return memory.get(day) ?? blankProgress();
}

function updateProgress(day, change) {
  const next = change(readProgress(day));
  memory.set(day, next);
  try {
    localStorage.setItem(STORAGE_PREFIX + day, JSON.stringify(next));
  } catch {
    // Keep the current visit playable when the browser blocks local storage.
  }
  return next;
}

let today;
let available = 0;
let selected = 0;
let requestedDay = Number(params.get("dagur")) || 0;
let puzzle;
let progress;
let active;
let current;
let cells = new Map();
let clueButtons = new Map();

function mark(type) {
  const element = document.createElement("span");
  element.className = type === "lock" ? "lock" : "done-mark";
  element.setAttribute("aria-hidden", "true");
  if (type === "done") element.textContent = "✓";
  return element;
}

const dayButtons = puzzles.map(({ day }) => {
  const button = document.createElement("button");
  button.className = "day";
  button.type = "button";
  button.textContent = day;
  button.addEventListener("click", () => {
    if (day > available || day === selected) return;
    requestedDay = day;
    const url = new URL(location.href);
    url.searchParams.set("dagur", day);
    history.replaceState(null, "", url);
    selectDay(day);
    if (ui.leikurinn.getBoundingClientRect().bottom < button.getBoundingClientRect().top) {
      ui.leikurinn.focus();
    }
  });
  return button;
});
ui.days.append(...dayButtons);

function renderCalendar() {
  for (const [index, button] of dayButtons.entries()) {
    const day = index + 1;
    const locked = day > available;
    const solved = !locked && Number.isFinite(readProgress(day).finishedAt);
    const status = locked ? ", lokuð" : solved ? ", leyst" : "";
    button.disabled = locked;
    button.setAttribute("aria-label", dateLabel(day) + status);
    button.setAttribute("aria-pressed", String(day === selected));
    button.replaceChildren(String(day));
    if (locked || solved) button.append(mark(locked ? "lock" : "done"));
    if (today === `2026-12-${String(day).padStart(2, "0")}`) button.setAttribute("aria-current", "date");
    else button.removeAttribute("aria-current");
  }
}

function refreshDate() {
  const next = previewDate ?? dateInIceland();
  if (today === next) return;
  today = next;
  available = today < FIRST_DAY ? 0 : today >= LAST_DAY ? 24 : Number(today.slice(-2));
  const validRequest = Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= available;
  const nextDay = validRequest ? requestedDay : available;
  calendarNote.hidden = today >= LAST_DAY;
  ui["calendar-description"].textContent = today > LAST_DAY ? "Allar 24 gáturnar eru opnar." : "1.–24. desember";
  if (nextDay !== selected || !puzzle) selectDay(nextDay);
  else renderCalendar();
}

function selectDay(day) {
  selected = day;
  puzzle = puzzles[day - 1];
  progress = puzzle ? readProgress(day) : blankProgress();
  renderCalendar();
  renderPuzzle();
}

const pattern = [
  "..###....", "...#.....", ".#####...", "...#..#..", ".#.#..#..",
  ".#######.", ".#....#..", "....####.", "......#..",
];
for (const character of pattern.join("")) {
  const tile = document.createElement("span");
  if (character === ".") tile.className = "blank";
  ui["cover-pattern"].append(tile);
}

ui.start.addEventListener("click", () => {
  if (!puzzle) return;
  progress = updateProgress(selected, (previous) => ({ ...previous, startedAt: previous.startedAt ?? Date.now() }));
  renderPuzzle();
  if (current) focusCell(current, active);
});

function renderPuzzle() {
  const started = Number.isFinite(progress.startedAt);
  const solved = Number.isFinite(progress.finishedAt);
  ui["puzzle-date"].textContent = puzzle ? dateLabel(selected) : "";
  ui["puzzle-title"].textContent = started ? puzzle.theme : "Krossgáta dagsins";
  ui["puzzle-state"].hidden = !solved;
  ui["puzzle-state"].textContent = solved ? "Leyst" : "";
  ui.cover.hidden = started;
  ui.play.hidden = !started;
  ui.start.hidden = !puzzle || started;

  if (!started) {
    ui["cover-title"].textContent = puzzle ? "Gátan er tilbúin" : "Fyrsta gátan opnar 1. desember";
    ui["cover-description"].textContent = puzzle
      ? "Gátan og vísbendingarnar birtast þegar þú byrjar."
      : "Hver gáta verður áfram opin eftir að hún birtist.";
    for (const element of [ui.board, ui.letters, ui.across, ui.down, ui["active-clue"], ui.feedback]) {
      element.replaceChildren();
    }
    cells.clear();
    clueButtons.clear();
    current = null;
    active = null;
    return;
  }

  buildBoard(solved);
  showResult(solved);
}

function keysFor(entry) {
  return Array.from(entry.answer, (_, index) => keyAt(
    entry.row + (entry.direction === "down" ? index : 0),
    entry.col + (entry.direction === "across" ? index : 0),
  ));
}

function buildBoard(solved) {
  cells = new Map();
  clueButtons = new Map();
  ui.board.replaceChildren();
  ui.board.style.setProperty("--columns", puzzle.cols);
  ui.board.toggleAttribute("data-solved", solved);
  for (const direction of Object.keys(DIRECTION)) ui[direction].replaceChildren();

  const entries = puzzle.entries.map((entry) => ({ ...entry, keys: keysFor(entry) }));
  for (const entry of entries) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const number = document.createElement("span");
    const clue = document.createElement("span");
    button.type = "button";
    button.disabled = solved;
    number.textContent = entry.number;
    clue.textContent = entry.clue;
    button.append(number, clue);
    item.append(button);
    ui[entry.direction].append(item);
    clueButtons.set(entry, button);
    button.addEventListener("click", () => {
      const next = entry.keys.find((key) => !progress.letters[key]) ?? entry.keys[0];
      focusCell(next, entry);
    });
    entry.keys.forEach((key, index) => {
      const cell = cells.get(key) ?? { entries: [], answer: entry.answer[index] };
      cell.entries.push(entry);
      cells.set(key, cell);
    });
  }

  const tiles = document.createDocumentFragment();
  for (let row = 0; row < puzzle.rows; row++) {
    for (let col = 0; col < puzzle.cols; col++) {
      const key = keyAt(row, col);
      const cell = cells.get(key);
      const tile = document.createElement("div");
      tile.className = "cell";
      tiles.append(tile);
      if (!cell) {
        tile.setAttribute("aria-hidden", "true");
        continue;
      }

      const start = cell.entries.find((entry) => entry.keys[0] === key);
      if (start) {
        const number = document.createElement("span");
        number.className = "cell-number";
        number.textContent = start.number;
        number.setAttribute("aria-hidden", "true");
        tile.append(number);
      }

      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.autocapitalize = "characters";
      input.spellcheck = false;
      input.readOnly = solved;
      input.value = progress.letters[key] ?? "";
      input.setAttribute("aria-label", `Röð ${row + 1}, dálkur ${col + 1}${start ? `, vísbending ${start.number}` : ""}`);
      cell.input = input;
      cell.tile = tile;
      tile.append(input);

      if (!solved) {
        input.addEventListener("focus", () => {
          setCurrent(key);
          input.select();
        });
        input.addEventListener("pointerdown", () => {
          if (document.activeElement === input) switchDirection(key);
        });
        input.addEventListener("keydown", onCellKeydown);
        input.addEventListener("input", (event) => {
          if (!event.isComposing) enterLetters(input.value);
        });
        input.addEventListener("compositionend", () => enterLetters(input.value));
        input.addEventListener("paste", (event) => {
          event.preventDefault();
          enterLetters(event.clipboardData.getData("text"));
        });
      }
    }
  }
  ui.board.append(tiles);
  ui.letters.replaceChildren();
  ui.letters.hidden = solved;
  for (const letter of "ÁÐÉÍÓÚÝÞÆÖ") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = letter;
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => enterLetters(letter));
    ui.letters.append(button);
  }

  active = null;
  current = null;
  ui["active-clue"].textContent = "";
  ui["active-clue"].hidden = solved;
  if (solved) {
    const first = entries[0].keys[0];
    for (const [key, cell] of cells) cell.input.tabIndex = key === first ? 0 : -1;
    return;
  }
  const first = entries.find(({ direction }) => direction === "across") ?? entries[0];
  const next = first.keys.find((key) => !progress.letters[key]) ?? first.keys[0];
  setCurrent(next, first);
}

function setCurrent(key, preferred = active) {
  const cell = cells.get(key);
  const entry = cell.entries.includes(preferred) ? preferred : cell.entries[0];
  if (active !== entry) {
    const label = document.createElement("strong");
    label.textContent = `${entry.number} ${DIRECTION[entry.direction].toLocaleLowerCase("is")}`;
    ui["active-clue"].replaceChildren(label, entry.clue);
  }
  active = entry;
  current = key;
  for (const [position, cell] of cells) {
    cell.input.tabIndex = position === current ? 0 : -1;
    cell.tile.classList.toggle("in-word", active.keys.includes(position));
    cell.tile.classList.toggle("is-current", position === current);
  }
  for (const [other, button] of clueButtons) button.setAttribute("aria-pressed", String(other === active));
}

function focusCell(key, preferred = active) {
  setCurrent(key, preferred);
  const input = cells.get(key).input;
  input.focus();
  input.select();
}

function switchDirection(key) {
  const next = cells.get(key).entries.find((entry) => entry !== active);
  if (next) setCurrent(key, next);
}

function saveLetters(changes) {
  if (Number.isFinite(progress.finishedAt)) return;
  progress = updateProgress(selected, (latest) => {
    if (Number.isFinite(latest.finishedAt)) return latest;
    const letters = { ...latest.letters };
    for (const [key, value] of changes) {
      if (value) letters[key] = value;
      else delete letters[key];
    }
    return { ...latest, letters };
  });
  if (Number.isFinite(progress.finishedAt)) {
    renderPuzzle();
    renderCalendar();
    return;
  }
  for (const [key, cell] of cells) {
    const value = progress.letters[key] ?? "";
    if (cell.input.value !== value) cell.input.value = value;
  }
  ui.feedback.textContent = "";
}

function enterLetters(text) {
  if (!current || Number.isFinite(progress.finishedAt)) return;
  const letters = text.normalize("NFC").toLocaleUpperCase("is").match(ALPHABET) ?? [];
  const index = active.keys.indexOf(current);
  if (letters.length === 0) {
    if (text === "") saveLetters([[current, ""]]);
    else cells.get(current).input.value = progress.letters[current] ?? "";
    return;
  }

  const changes = active.keys.slice(index, index + letters.length).map((key, offset) => [key, letters[offset]]);
  const next = active.keys[Math.min(index + changes.length, active.keys.length - 1)];
  saveLetters(changes);
  if (!Number.isFinite(progress.finishedAt)) focusCell(next);
}

const arrows = {
  ArrowLeft: [0, -1, "across"],
  ArrowRight: [0, 1, "across"],
  ArrowUp: [-1, 0, "down"],
  ArrowDown: [1, 0, "down"],
};

function onCellKeydown(event) {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  const { key } = event;
  if (arrows[key]) {
    event.preventDefault();
    const [dr, dc, direction] = arrows[key];
    const [row, col] = current.split(",").map(Number);
    const destination = keyAt(row + dr, col + dc);
    const entry = cells.get(current).entries.find((item) => item.direction === direction);
    if (entry?.keys.includes(destination)) focusCell(destination, entry);
    else if (entry) setCurrent(current, entry);
    return;
  }
  if (key === " " || key === "Enter") {
    event.preventDefault();
    switchDirection(current);
    return;
  }
  if (key === "Backspace" || key === "Delete") {
    event.preventDefault();
    const index = active.keys.indexOf(current);
    const remove = key === "Backspace" && !progress.letters[current] && index > 0
      ? active.keys[index - 1] : current;
    saveLetters([[remove, ""]]);
    if (!Number.isFinite(progress.finishedAt)) focusCell(remove);
  }
}

function formatElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  const parts = [];
  if (minutes >= 60) parts.push(`${Math.floor(minutes / 60)} klst.`);
  if (minutes > 0) parts.push(`${minutes % 60} mín.`);
  parts.push(`${seconds % 60} sek.`);
  return parts.join(" ");
}

function showResult(solved) {
  ui.check.hidden = solved;
  ui.feedback.classList.toggle("success", solved);
  ui.feedback.textContent = solved
    ? `Gátan er leyst! Tíminn þinn var ${formatElapsed(progress.finishedAt - progress.startedAt)}`
    : "";
}

ui.check.addEventListener("click", () => {
  if (!puzzle || !Number.isFinite(progress.startedAt)) return;
  const latest = readProgress(selected);
  const entered = [...cells].filter(([key]) => latest.letters[key]);
  if (entered.length < cells.size) {
    ui.feedback.textContent = "Það vantar enn stafi í gátuna.";
    return;
  }
  if (entered.some(([key, cell]) => latest.letters[key] !== cell.answer)) {
    ui.feedback.textContent = "Sumir stafirnir passa ekki. Prófaðu aftur.";
    return;
  }

  progress = updateProgress(selected, (previous) => ({ ...previous, finishedAt: previous.finishedAt ?? Date.now() }));
  renderCalendar();
  renderPuzzle();
  ui.feedback.tabIndex = -1;
  ui.feedback.focus();
});

window.addEventListener("storage", (event) => {
  if (!event.key?.startsWith(STORAGE_PREFIX)) return;
  renderCalendar();
  if (event.key !== STORAGE_PREFIX + selected) return;
  const latest = readProgress(selected);
  const stateChanged = latest.startedAt !== progress.startedAt || latest.finishedAt !== progress.finishedAt;
  progress = latest;
  if (stateChanged) renderPuzzle();
  else {
    for (const [key, cell] of cells) {
      const value = progress.letters[key] ?? "";
      if (cell.input.value !== value) cell.input.value = value;
    }
  }
});

refreshDate();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshDate();
});
if (!previewDate) {
  function scheduleNextDate() {
    // Iceland is on UTC year-round. Recalculate after the callback in case the browser delayed it.
    const now = new Date();
    const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    setTimeout(() => {
      refreshDate();
      scheduleNextDate();
    }, next - now.getTime() + 30);
  }
  scheduleNextDate();
}
