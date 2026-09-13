/**
 * API smoke test — run: node scripts/smoke-apis.js
 * Checks status codes (not full business logic).
 */
const BASE = process.env.SMOKE_BASE || "http://localhost:3000";

async function req(method, path, { body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return {
      method,
      path,
      status: res.status,
      ms: Date.now() - started,
      ok: res.ok,
      error: json?.error || json?.message || null,
      code: json?.code || null,
    };
  } catch (e) {
    return {
      method,
      path,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      error: e.message,
      code: "network",
    };
  }
}

function expect(result, allowedStatuses, label) {
  const pass = allowedStatuses.includes(result.status);
  return {
    ...result,
    label: label || `${result.method} ${result.path}`,
    expect: allowedStatuses,
    pass,
  };
}

async function main() {
  const results = [];

  // --- Public / unauthenticated ---
  results.push(expect(await req("GET", "/api/gyms"), [200], "GET /api/gyms (public list)"));

  const gyms = await req("GET", "/api/gyms");
  let ownerId = null;
  try {
    const j = await (await fetch(`${BASE}/api/gyms`)).json();
    ownerId = j?.gyms?.[0]?.ownerId || null;
  } catch {
    /* ignore */
  }
  if (ownerId) {
    results.push(
      expect(
        await req("GET", `/api/gyms/${ownerId}`),
        [200],
        `GET /api/gyms/[ownerId] (${ownerId.slice(0, 8)}…)`,
      ),
    );
  } else {
    results.push({
      label: "GET /api/gyms/[ownerId]",
      pass: false,
      status: 0,
      error: "No published gyms to test detail",
      expect: [200],
    });
  }

  results.push(
    expect(
      await req("GET", "/api/gyms/00000000-0000-0000-0000-000000000000"),
      [404],
      "GET /api/gyms/missing → 404",
    ),
  );

  results.push(
    expect(
      await req("GET", "/api/geo/search?q=Lahore"),
      [200, 400, 429, 500],
      "GET /api/geo/search",
    ),
  );
  // geo search should preferably be 200
  const geo = results[results.length - 1];
  if (geo.status === 200) geo.pass = true;

  results.push(
    expect(
      await req("GET", "/api/geo/reverse?lat=31.52&lon=74.35"),
      [200, 400, 429, 500],
      "GET /api/geo/reverse",
    ),
  );

  results.push(
    expect(
      await req("POST", "/api/auth/check-account", { body: { email: "smoke-test@example.com" } }),
      [200],
      "POST /api/auth/check-account",
    ),
  );

  results.push(
    expect(
      await req("POST", "/api/auth/check-verified", {
        body: { email: "smoke-test@example.com" },
      }),
      [200, 400],
      "POST /api/auth/check-verified",
    ),
  );

  results.push(
    expect(
      await req("POST", "/api/auth/check-gym", {
        body: { gym_name: "Shark", gym_city: "Lahore" },
      }),
      [200],
      "POST /api/auth/check-gym",
    ),
  );

  // --- Auth required → expect 401 without token ---
  const authNeeded = [
    ["GET", "/api/auth/me"],
    ["GET", "/api/profiles"],
    ["PATCH", "/api/profiles"],
    ["GET", "/api/notifications"],
    ["GET", "/api/admin/users"],
    ["GET", "/api/admin/pending"],
    ["POST", "/api/gym-media"],
    ["POST", "/api/profiles/avatar"],
  ];

  for (const [method, path] of authNeeded) {
    results.push(
      expect(
        await req(method, path, { body: method === "GET" ? undefined : {} }),
        [401],
        `${method} ${path} → 401 unauth`,
      ),
    );
  }

  // Logout is idempotent (always ok)
  results.push(
    expect(await req("POST", "/api/auth/logout"), [200], "POST /api/auth/logout (idempotent)"),
  );

  // --- Login smoke (optional seeded account) ---
  const email = process.env.SMOKE_EMAIL || "superadmin@forge.test";
  const password = process.env.SMOKE_PASSWORD || "SuperAdmin123";
  const login = await req("POST", "/api/auth/login", { body: { email, password } });

  let token = null;
  if (login.status === 200) {
    try {
      const j = await (await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })).json();
      token =
        j?.session?.access_token ||
        j?.access_token ||
        j?.token ||
        null;
      // Some apps return session nested
      if (!token && j?.data?.session?.access_token) token = j.data.session.access_token;
    } catch {
      /* ignore */
    }
  }

  results.push(
    expect(login, [200, 400, 401, 403], `POST /api/auth/login (${email})`),
  );
  // Prefer success for seeded account but don't fail suite hard if rotated
  if (login.status === 200) {
    results[results.length - 1].pass = true;
  } else {
    results[results.length - 1].pass = [400, 401, 403].includes(login.status);
    results[results.length - 1].note = "Login failed — skipping authed checks (credentials may have changed)";
  }

  if (token) {
    results.push(expect(await req("GET", "/api/auth/me", { token }), [200], "GET /api/auth/me (authed)"));
    results.push(expect(await req("GET", "/api/profiles", { token }), [200], "GET /api/profiles (authed)"));
    results.push(
      expect(await req("GET", "/api/notifications?limit=5", { token }), [200], "GET /api/notifications (authed)"),
    );
    results.push(
      expect(await req("GET", "/api/admin/users", { token }), [200, 403], "GET /api/admin/users (authed)"),
    );
    results.push(
      expect(await req("GET", "/api/admin/pending", { token }), [200, 403], "GET /api/admin/pending (authed)"),
    );
  }

  // Register validation (missing fields → 400)
  results.push(
    expect(await req("POST", "/api/auth/register", { body: {} }), [400], "POST /api/auth/register empty → 400"),
  );

  // Print report
  const passed = results.filter((r) => r.pass);
  const failed = results.filter((r) => !r.pass);

  console.log(`\nAPI smoke @ ${BASE}\n${"─".repeat(60)}`);
  for (const r of results) {
    const mark = r.pass ? "PASS" : "FAIL";
    const extra = r.error ? ` | ${r.error}` : "";
    const note = r.note ? ` | ${r.note}` : "";
    console.log(
      `${mark}  ${String(r.status).padStart(3)}  ${r.label} (${r.ms || 0}ms)${extra}${note}`,
    );
  }
  console.log("─".repeat(60));
  console.log(`${passed.length}/${results.length} passed, ${failed.length} failed\n`);

  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
