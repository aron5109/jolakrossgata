import { readFileSync, writeFileSync } from "node:fs";
import content from "../content/december-2026.mjs";

const ACROSS = 1;
const DOWN = 2;
const answerPattern = /^[A-ZÁÐÉÍÓÚÝÞÆÖ]+$/u;
const target = new URL("../site/puzzles.mjs", import.meta.url);
const key = (row, col) => `${row},${col}`;

function normalize(answer) {
  return answer.normalize("NFC").toLocaleUpperCase("is").replace(/[\s-]/gu, "");
}

function coordinates({ answer, row, col, direction }) {
  return Array.from(answer, (letter, index) => [
    row + (direction === DOWN ? index : 0),
    col + (direction === ACROSS ? index : 0),
    letter,
  ]);
}

function bounds(grid) {
  const rows = [...grid.values()].map(({ row }) => row);
  const cols = [...grid.values()].map(({ col }) => col);
  return { top: Math.min(...rows), bottom: Math.max(...rows), left: Math.min(...cols), right: Math.max(...cols) };
}

function candidates(word, grid) {
  const choices = new Map();
  for (const cell of grid.values()) {
    if (cell.directions === (ACROSS | DOWN)) continue;
    const direction = cell.directions === ACROSS ? DOWN : ACROSS;
    for (let index = 0; index < word.answer.length; index++) {
      if (word.answer[index] !== cell.letter) continue;
      const row = cell.row - (direction === DOWN ? index : 0);
      const col = cell.col - (direction === ACROSS ? index : 0);
      choices.set(`${row},${col},${direction}`, { ...word, row, col, direction });
    }
  }
  return [...choices.values()].filter((entry) => fits(entry, grid));
}

function fits(entry, grid) {
  const { row, col, direction, answer } = entry;
  const dr = direction === DOWN ? 1 : 0;
  const dc = direction === ACROSS ? 1 : 0;
  if (grid.has(key(row - dr, col - dc)) || grid.has(key(row + dr * answer.length, col + dc * answer.length))) return false;

  return coordinates(entry).every(([r, c, letter]) => {
    const cell = grid.get(key(r, c));
    if (cell) return cell.letter === letter && !(cell.directions & direction);
    return !grid.has(key(r - dc, c - dr)) && !grid.has(key(r + dc, c + dr));
  });
}

function place(entry, grid) {
  for (const [row, col, letter] of coordinates(entry)) {
    const index = key(row, col);
    const directions = (grid.get(index)?.directions ?? 0) | entry.direction;
    grid.set(index, { row, col, letter, directions });
  }
}

function score(grid) {
  const { top, bottom, left, right } = bounds(grid);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const intersections = [...grid.values()].filter(({ directions }) => directions === (ACROSS | DOWN)).length;
  return width * height * 0.15 + Math.abs(width - height) * 0.45
    + Math.max(0, width - 10) * 2.2 + Math.max(0, height - 15) * 1.25 - intersections * 2.8;
}

function makePuzzle(words, day) {
  let seed = day;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  let best;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 360; attempt++) {
    const pool = [...words];
    const first = pool.splice(Math.floor(random() * pool.length), 1)[0];
    const opening = { ...first, row: 0, col: 0, direction: attempt % 2 ? ACROSS : DOWN };
    let grid = new Map();
    const entries = [opening];
    place(opening, grid);

    while (pool.length) {
      const options = pool.flatMap((word) => candidates(word, grid));
      let winner;
      let winnerGrid;
      let winnerScore = Infinity;
      for (const entry of options) {
        const next = new Map(grid);
        place(entry, next);
        const rank = score(next) + random() * 18;
        if (rank < winnerScore) {
          winner = entry;
          winnerGrid = next;
          winnerScore = rank;
        }
      }
      if (!winner) break;
      entries.push(winner);
      pool.splice(pool.findIndex(({ answer }) => answer === winner.answer), 1);
      grid = winnerGrid;
    }

    if (pool.length === 0 && score(grid) < bestScore) {
      best = { entries, grid };
      bestScore = score(grid);
    }
  }

  if (!best) throw new Error(`Gat ekki raðað öllum orðunum fyrir ${day}. desember.`);
  const { top, bottom, left, right } = bounds(best.grid);
  const starts = new Map();
  const entries = best.entries
    .map(({ answer, clue, row, col, direction }) => ({ answer, clue, row: row - top, col: col - left, direction }))
    .sort((a, b) => a.row - b.row || a.col - b.col || a.direction - b.direction)
    .map((entry) => {
      const start = key(entry.row, entry.col);
      if (!starts.has(start)) starts.set(start, starts.size + 1);
      return { ...entry, direction: entry.direction === ACROSS ? "across" : "down", number: starts.get(start) };
    });

  return { rows: bottom - top + 1, cols: right - left + 1, entries };
}

if (content.length !== 24) throw new Error("Desember þarf nákvæmlega 24 krossgátur.");
const used = new Set();
const puzzles = content.map(([theme, definitions], index) => {
  const day = index + 1;
  if (!theme.trim() || definitions.length !== 7) throw new Error(`Ófullgerð gáta fyrir dag ${day}.`);
  const words = definitions.map(([name, clue]) => {
    const answer = normalize(name);
    if (!answerPattern.test(answer) || !clue.trim() || used.has(answer)) {
      throw new Error(`Ógilt eða endurtekið orð fyrir dag ${day}: ${name}`);
    }
    used.add(answer);
    return { answer, clue };
  });
  return { day, theme, ...makePuzzle(words, day) };
});

const output = `// Búið til með node scripts/build-puzzles.mjs. Breytið content/december-2026.mjs.\nexport default ${JSON.stringify(puzzles, null, 2)};\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(target, "utf8") !== output) throw new Error("Keyrið node scripts/build-puzzles.mjs til að uppfæra gögnin.");
  console.log(`Staðfestar ${puzzles.length} krossgátur og ${used.size} orð.`);
} else {
  writeFileSync(target, output);
  console.log(`Tilbúnar ${puzzles.length} krossgátur og ${used.size} orð.`);
}
