const fs = require("fs");
const path = require("path");

const root = __dirname;
const endpoints = JSON.parse(
  fs.readFileSync(path.join(root, "src/api/endpoints.json"), "utf8"),
);

function pathToFs(apiPath) {
  const parts = apiPath.replace(/^\/api\//, "").split("/");
  const mapped = parts.map((p) =>
    p.startsWith(":") ? `[${p.slice(1)}]` : p,
  );
  return path.join(root, "src/app/api", ...mapped, "route.ts");
}

function getExports(file) {
  if (!fs.existsSync(file)) return null;
  const src = fs.readFileSync(file, "utf8");
  const methods = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]) {
    const re = new RegExp(
      String.raw`export\s+(?:async\s+)?(?:function\s+|const\s+)${m}\b`,
    );
    if (re.test(src)) methods.push(m);
  }
  return methods;
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name === "route.ts") acc.push(p);
  }
  return acc;
}

function walkTs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walkTs(p, acc);
    } else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const results = [];
for (const [group, keys] of Object.entries(endpoints)) {
  for (const [key, ep] of Object.entries(keys)) {
    const file = pathToFs(ep.path);
    const methods = getExports(file);
    const rel = path.relative(root, file).split(path.sep).join("/");
    const dyn = ep.path.match(/:[a-zA-Z]+/g) || [];
    const folderDyn = (rel.match(/\[[^\]]+\]/g) || []).map((s) =>
      s.slice(1, -1),
    );
    const expectedDyn = dyn.map((d) => d.slice(1));
    const dynMatch =
      expectedDyn.length === folderDyn.length &&
      expectedDyn.every((d, i) => d === folderDyn[i]);
    results.push({
      group,
      key,
      method: ep.method,
      path: ep.path,
      routeExists: methods !== null,
      routeFile: rel,
      exported: methods || [],
      methodMatch: methods ? methods.includes(ep.method) : false,
      dynamicParams: dyn,
      folderDyn,
      dynMatch: methods !== null ? dynMatch : null,
    });
  }
}

const listedPaths = new Set();
for (const [g, keys] of Object.entries(endpoints)) {
  for (const ep of Object.values(keys)) listedPaths.add(pathToFs(ep.path));
}
const allRoutes = walk(path.join(root, "src/app/api"));
const orphans = allRoutes
  .filter((r) => !listedPaths.has(r))
  .map((r) => ({
    file: path.relative(root, r).split(path.sep).join("/"),
    methods: getExports(r),
    apiPath:
      "/" +
      path
        .relative(path.join(root, "src/app"), path.dirname(r))
        .split(path.sep)
        .join("/")
        .replace(/\[([^\]]+)\]/g, ":$1"),
  }));

// Extract apiRequest(group, key) from all src files
const tsFiles = walkTs(path.join(root, "src"));
const clientCalls = []; // {group, key, file, line}
const callRe =
  /apiRequest(?:\s*<[^>]*>)?\s*\(\s*["']([a-zA-Z0-9_]+)["']\s*,\s*["']([a-zA-Z0-9_]+)["']/g;
// also multi-line: apiRequest<\n...>("group", "key"
const callRe2 =
  /apiRequest(?:\s*<[\s\S]*?>)?\s*\(\s*["']([a-zA-Z0-9_]+)["']\s*,\s*["']([a-zA-Z0-9_]+)["']/g;

for (const f of tsFiles) {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(root, f).split(path.sep).join("/");
  // skip client definition itself for "calls" but include wrappers
  let m;
  const re = new RegExp(callRe2.source, "g");
  while ((m = re.exec(src)) !== null) {
    const before = src.slice(0, m.index);
    const line = before.split("\n").length;
    clientCalls.push({ group: m[1], key: m[2], file: rel, line });
  }
}

const knownKeys = new Set();
for (const [g, keys] of Object.entries(endpoints)) {
  for (const k of Object.keys(keys)) knownKeys.add(`${g}.${k}`);
}

const brokenClientKeys = clientCalls.filter(
  (c) => !knownKeys.has(`${c.group}.${c.key}`),
);

const coveredByClient = new Set(
  clientCalls.map((c) => `${c.group}.${c.key}`),
);

const missingClient = results.filter(
  (r) => !coveredByClient.has(`${r.group}.${r.key}`),
);

// Raw fetch to /api/ that bypasses endpoints.json
const rawFetches = [];
const fetchRe = /fetch\s*\(\s*[`'"](\/api\/[^`'"]+)/g;
const fetchRe2 = /fetch\s*\(\s*`(\/api\/[^`]+)`/g;
for (const f of tsFiles) {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(root, f).split(path.sep).join("/");
  if (rel.startsWith("src/app/api/")) continue; // skip route internals
  let m;
  const re = /fetch\s*\(\s*(['"`])(\/api\/[^'"`]+)\1/g;
  while ((m = re.exec(src)) !== null) {
    const line = src.slice(0, m.index).split("\n").length;
    rawFetches.push({ url: m[2], file: rel, line });
  }
  // template with vars: `/api/foo/${x}` or `/api/foo?${params}`
  const reT = /fetch\s*\(\s*`(\/api\/[^`]+)`/g;
  while ((m = reT.exec(src)) !== null) {
    const line = src.slice(0, m.index).split("\n").length;
    rawFetches.push({ url: m[1], file: rel, line, template: true });
  }
}

const missingRoute = results.filter((r) => !r.routeExists);
const methodMismatch = results.filter(
  (r) => r.routeExists && !r.methodMatch,
);
const dynMismatch = results.filter(
  (r) => r.routeExists && r.dynMatch === false,
);
const matched = results.filter(
  (r) => r.routeExists && r.methodMatch,
);

const byGroup = {};
for (const g of Object.keys(endpoints)) {
  const items = results.filter((r) => r.group === g);
  byGroup[g] = {
    total: items.length,
    routeOk: items.filter((r) => r.routeExists && r.methodMatch).length,
    missingRoute: items.filter((r) => !r.routeExists).map((r) => r.key),
    methodMismatch: items
      .filter((r) => r.routeExists && !r.methodMatch)
      .map((r) => ({
        key: r.key,
        expected: r.method,
        exported: r.exported,
      })),
    missingClient: items
      .filter((r) => !coveredByClient.has(`${r.group}.${r.key}`))
      .map((r) => r.key),
    hasClient: items
      .filter((r) => coveredByClient.has(`${r.group}.${r.key}`))
      .map((r) => r.key),
    dynamic: items
      .filter((r) => r.dynamicParams.length)
      .map((r) => ({
        key: r.key,
        path: r.path,
        folder: r.folderDyn,
        dynMatch: r.dynMatch,
      })),
  };
}

console.log(
  JSON.stringify(
    {
      summary: {
        totalEndpoints: results.length,
        matchedRouteAndMethod: matched.length,
        missingRoute: missingRoute.length,
        methodMismatch: methodMismatch.length,
        missingClient: missingClient.length,
        orphanRoutes: orphans.length,
        brokenClientKeys: brokenClientKeys.length,
        dynMismatch: dynMismatch.length,
        uniqueClientCalls: coveredByClient.size,
      },
      missingRoute: missingRoute.map((r) => ({
        ref: `${r.group}.${r.key}`,
        method: r.method,
        path: r.path,
        expectedFile: r.routeFile,
      })),
      methodMismatch: methodMismatch.map((r) => ({
        ref: `${r.group}.${r.key}`,
        expected: r.method,
        exported: r.exported,
        path: r.path,
        file: r.routeFile,
      })),
      dynMismatch: dynMismatch.map((r) => ({
        ref: `${r.group}.${r.key}`,
        path: r.path,
        folderDyn: r.folderDyn,
        file: r.routeFile,
      })),
      orphans,
      missingClient: missingClient.map((r) => ({
        ref: `${r.group}.${r.key}`,
        method: r.method,
        path: r.path,
      })),
      brokenClientKeys,
      rawFetches,
      byGroup,
      // per-path method coverage: which methods endpoints declare vs route exports
      pathMethodCoverage: (() => {
        const map = {};
        for (const r of results) {
          if (!map[r.path]) {
            map[r.path] = {
              file: r.routeFile,
              declared: [],
              exported: r.exported,
            };
          }
          map[r.path].declared.push(`${r.group}.${r.key}:${r.method}`);
        }
        return Object.entries(map).map(([p, v]) => ({
          path: p,
          ...v,
          undeclaredExports: v.exported.filter(
            (m) => !v.declared.some((d) => d.endsWith(`:${m}`)),
          ),
        }));
      })(),
    },
    null,
    2,
  ),
);
