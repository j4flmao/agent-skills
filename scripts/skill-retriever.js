// Lexical skill retriever (BM25 over name, path and description). Shared by route.js and eval-routing.js.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const STOP = new Set("a an the and or of to in on for with our my this that is are be it its we i you how do does can from into at as by me us new use using need help make build write add set get".split(" "));
const tokens = (s) => s.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").split(" ").map((t) => t.replace(/^\.+|\.+$/g, "")).filter((t) => t.length > 1 && !STOP.has(t));
const stem = (t) => t.replace(/(ing|ies|es|s)$/, (m) => (m === "ies" ? "y" : ""));

function loadSkills() {
  const skills = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "SKILL.md") {
        const text = fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
        const fm = /^---\n([\s\S]*?)\n---/.exec(text)[1];
        const name = /^name:\s*"?([^"\n]+)"?/m.exec(fm)[1].trim();
        const d = /^description:[ \t]*(?:[>|][-+]?[ \t]*\n((?:[ \t]+.*(?:\n|$))+)|(.*))/m.exec(fm);
        const description = (d[1] !== undefined ? d[1] : d[2]).replace(/\s+/g, " ").trim();
        skills.push({ path: path.relative(path.join(root, "skills"), dir).split(path.sep).join("/"), name, description });
      }
    }
  })(path.join(root, "skills"));
  return skills;
}

function buildIndex(skills) {
  const docs = skills.map((s) => {
    const words = tokens(`${s.name.replace(/-/g, " ")} ${s.path.replace(/[/-]/g, " ")} ${s.description}`).map(stem);
    const tf = new Map();
    words.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    return { skill: s, tf, length: words.length };
  });
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, w) => df.set(w, (df.get(w) || 0) + 1)));
  const avgLength = docs.reduce((s, d) => s + d.length, 0) / docs.length;
  const idf = (w) => Math.log(1 + (docs.length - (df.get(w) || 0) + 0.5) / ((df.get(w) || 0) + 0.5));
  function retrieve(prompt, k) {
    const query = [...new Set(tokens(prompt).map(stem))];
    return docs.map((d) => {
      let score = 0;
      for (const w of query) {
        const f = d.tf.get(w) || 0;
        if (f) score += idf(w) * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d.length / avgLength));
      }
      return { path: d.skill.path, name: d.skill.name, score };
    }).sort((a, b) => b.score - a.score).slice(0, k);
  }
  return { docs, idf, retrieve };
}

module.exports = { root, loadSkills, buildIndex };
