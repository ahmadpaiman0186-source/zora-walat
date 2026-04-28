/**
 * Audit relative ESM imports: existence, .js extension, case-sensitive name match.
 * Run: node scripts/audit-esm-imports.mjs
 * Exit 1 if any issues.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, "..");

const roots = [path.join(serverRoot, "src"), path.join(serverRoot, "test")];
const extAllow = new Set([".js", ".mjs", ".cjs", ".json", ".node", ".wasm"]);

const RE = {
  fromSq: /\bfrom\s+'([^']+)'/g,
  fromDq: /\bfrom\s+"([^"]+)"/g,
  sideSq: /\bimport\s+'([^']+)'/g,
  sideDq: /\bimport\s+"([^"]+)"/g,
  dynSq: /\bimport\s*\(\s*'([^']+)'\s*\)/g,
  dynDq: /\bimport\s*\(\s*"([^"]+)"\s*\)/g,
  expFromSq: /\bexport\s+[^;]*\s+from\s+'([^']+)'/g,
  expFromDq: /\bexport\s+[^;]*\s+from\s+"([^"]+)"/g,
};

/**
 * @param {string} text
 * @param {RegExp} re
 * @param {(s: string) => void} fn
 */
function forEachSpec(text, re, fn) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m[1].startsWith(".") || m[1].startsWith("..")) fn(m[1]);
  }
}

/** @param {string} dir @param {string} base */
function actualFilenameCase(dir, base) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  for (const e of fs.readdirSync(dir)) {
    if (e === base) return e;
  }
  for (const e of fs.readdirSync(dir)) {
    if (e.toLowerCase() === String(base).toLowerCase()) return e;
  }
  return null;
}

/** @param {string} file @param {string} spec */
function checkImport(file, spec) {
  const raw = spec.replaceAll("\\", "/");
  if (!raw.startsWith(".") && !raw.startsWith("..")) {
    return { ok: true };
  }
  const fromDir = path.dirname(file);
  const joined = path.normalize(path.join(fromDir, raw));
  const relToServer = path.relative(serverRoot, joined);
  if (raw.includes("\0") || !relToServer || relToServer.startsWith("..")) {
    return { ok: false, kind: "out_of_tree", message: `Out of tree: ${spec}` };
  }
  const posix = relToServer.split(path.sep).join("/");
  const ext = path.posix.extname(posix);
  if (ext && !extAllow.has(ext)) {
    return { ok: false, kind: "weird_ext", message: `Bad ext: ${ext} in ${spec}` };
  }
  if (!ext) {
    return {
      ok: false,
      kind: "no_extension",
      message: `No extension: '${spec}' in ${path.relative(serverRoot, file)}`,
    };
  }
  if (!fs.existsSync(joined)) {
    return {
      ok: false,
      kind: "missing",
      message: `Not found: ${path.relative(serverRoot, joined)} ← '${spec}' in ${path.relative(serverRoot, file)}`,
    };
  }
  if (fs.statSync(joined).isDirectory()) {
    return {
      ok: false,
      kind: "is_dir",
      message: `Is directory: ${spec} in ${path.relative(serverRoot, file)}`,
    };
  }
  const segs = posix.split("/");
  const fileName = segs[segs.length - 1];
  const parentDir = path.join(serverRoot, ...segs.slice(0, -1));
  const actual = actualFilenameCase(parentDir, fileName);
  if (actual && actual !== fileName) {
    return {
      ok: false,
      kind: "case_mismatch",
      message: `Case: spec '${fileName}' vs disk '${actual}' in ${path.relative(serverRoot, file)} (import: ${spec})`,
    };
  }
  return { ok: true };
}

function scanFile(p) {
  const text = fs.readFileSync(p, "utf8");
  const rel = path.relative(serverRoot, p);
  /** @param {string} s */
  const on = (s) => {
    const r = checkImport(p, s);
    if (!r.ok) issues.push({ file: rel, spec: s, ...r });
  };
  forEachSpec(text, RE.fromSq, on);
  forEachSpec(text, RE.fromDq, on);
  forEachSpec(text, RE.sideSq, on);
  forEachSpec(text, RE.sideDq, on);
  forEachSpec(text, RE.dynSq, on);
  forEachSpec(text, RE.dynDq, on);
  forEachSpec(text, RE.expFromSq, on);
  forEachSpec(text, RE.expFromDq, on);
}

const issues = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|mjs|cjs)$/.test(name)) scanFile(p);
  }
}

for (const r of roots) walk(r);

const key = (x) => `${x.file}::${x.message}::${x.spec}`;
const seen = new Set();
const uniq = issues.filter((i) => {
  const k = key(i);
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(JSON.stringify({ count: uniq.length, issues: uniq }, null, 2));
process.exit(uniq.length ? 1 : 0);
