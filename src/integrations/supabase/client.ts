// LocalStorage-based mock Supabase client — no network needed
const OWNER_ID = "local-owner-001";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getList<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function setList<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Auth mock ─────────────────────────────────────────────────────────────────
const authListeners: Array<(event: string, session: any) => void> = [];
const SESSION_KEY = "sk_session";

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function saveSession(s: any) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  authListeners.forEach(fn => fn("SIGNED_IN", s));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  authListeners.forEach(fn => fn("SIGNED_OUT", null));
}

function makeSession(email: string, name?: string) {
  const userId = OWNER_ID;
  const user = { id: userId, email, user_metadata: { full_name: name || email } };
  const session = { user, access_token: "local", refresh_token: "local" };
  // Ensure owner profile + role exists
  const profiles = getList<any>("sk_profiles");
  if (!profiles.find((p: any) => p.id === userId)) {
    profiles.push({ id: userId, full_name: name || email, created_at: new Date().toISOString() });
    setList("sk_profiles", profiles);
  }
  const roles = getList<any>("sk_user_roles");
  if (!roles.find((r: any) => r.user_id === userId)) {
    roles.push({ id: uid(), user_id: userId, role: "owner" });
    setList("sk_user_roles", roles);
  }
  return session;
}

const auth = {
  getUser: async () => {
    const s = getSession();
    return { data: { user: s?.user ?? null }, error: null };
  },
  getSession: async () => {
    const s = getSession();
    return { data: { session: s }, error: null };
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const users = getList<any>("sk_users");
    const u = users.find((x: any) => x.email === email);
    if (!u || u.password !== password) return { data: null, error: { message: "Invalid email or password" } };
    const s = makeSession(email, u.name);
    saveSession(s);
    return { data: { session: s, user: s.user }, error: null };
  },
  signUp: async ({ email, password, options }: any) => {
    const users = getList<any>("sk_users");
    if (users.find((x: any) => x.email === email)) return { data: null, error: { message: "User already exists" } };
    const name = options?.data?.full_name;
    users.push({ email, password, name });
    setList("sk_users", users);
    const s = makeSession(email, name);
    saveSession(s);
    return { data: { session: s, user: s.user }, error: null };
  },
  signOut: async () => { clearSession(); return { error: null }; },
  onAuthStateChange: (fn: (event: string, session: any) => void) => {
    authListeners.push(fn);
    return { data: { subscription: { unsubscribe: () => { const i = authListeners.indexOf(fn); if (i > -1) authListeners.splice(i, 1); } } } };
  },
};

// ── Table key map ─────────────────────────────────────────────────────────────
const TABLE_KEY: Record<string, string> = {
  sites: "sk_sites",
  entries: "sk_entries",
  profiles: "sk_profiles",
  user_roles: "sk_user_roles",
  site_members: "sk_site_members",
};

// ── Query builder ─────────────────────────────────────────────────────────────
function makeQuery(table: string) {
  const key = TABLE_KEY[table] || `sk_${table}`;
  let _filters: Array<{ col: string; op: string; val: any }> = [];
  let _order: { col: string; asc: boolean } | null = null;
  let _single = false;
  let _selectCols = "*";

  const q: any = {
    select(cols = "*") { _selectCols = cols; return q; },
    eq(col: string, val: any) { _filters.push({ col, op: "eq", val }); return q; },
    order(col: string, opts?: { ascending?: boolean }) { _order = { col, asc: opts?.ascending ?? true }; return q; },
    single() { _single = true; return q; },
    maybeSingle() { _single = true; return q; },

    // Execute (thenable)
    then(resolve: (v: any) => any, reject?: (e: any) => any) {
      try {
        let data = getList<any>(key);
        for (const f of _filters) {
          if (f.op === "eq") data = data.filter((r: any) => r[f.col] === f.val);
        }
        if (_order) {
          const { col, asc } = _order;
          data = [...data].sort((a, b) => {
            if (a[col] < b[col]) return asc ? -1 : 1;
            if (a[col] > b[col]) return asc ? 1 : -1;
            return 0;
          });
        }
        if (_single) {
          return resolve({ data: data[0] ?? null, error: null });
        }
        return resolve({ data, error: null });
      } catch (e) {
        return reject ? reject(e) : resolve({ data: null, error: e });
      }
    },
  };
  return q;
}

// ── Mutation builder ──────────────────────────────────────────────────────────
function makeInsert(table: string, rows: any | any[]) {
  const key = TABLE_KEY[table] || `sk_${table}`;
  return {
    then(resolve: (v: any) => any) {
      const list = getList<any>(key);
      const items = Array.isArray(rows) ? rows : [rows];
      const now = new Date().toISOString();
      const inserted = items.map(r => ({ id: uid(), created_at: now, ...r }));
      setList(key, [...list, ...inserted]);
      return resolve({ data: inserted, error: null });
    },
  };
}

function makeUpdate(table: string, updates: any) {
  const key = TABLE_KEY[table] || `sk_${table}`;
  let _filters: Array<{ col: string; val: any }> = [];
  const q = {
    eq(col: string, val: any) { _filters.push({ col, val }); return q; },
    then(resolve: (v: any) => any) {
      let list = getList<any>(key);
      list = list.map((r: any) => {
        const match = _filters.every(f => r[f.col] === f.val);
        return match ? { ...r, ...updates } : r;
      });
      setList(key, list);
      return resolve({ data: null, error: null });
    },
  };
  return q;
}

function makeDelete(table: string) {
  const key = TABLE_KEY[table] || `sk_${table}`;
  let _filters: Array<{ col: string; val: any }> = [];
  const q = {
    eq(col: string, val: any) { _filters.push({ col, val }); return q; },
    then(resolve: (v: any) => any) {
      let list = getList<any>(key);
      list = list.filter((r: any) => !_filters.every(f => r[f.col] === f.val));
      setList(key, list);
      return resolve({ data: null, error: null });
    },
  };
  return q;
}

// ── Main client ───────────────────────────────────────────────────────────────
export const supabase = {
  auth,
  from(table: string) {
    return {
      select: (cols = "*") => { const q = makeQuery(table); return q.select(cols); },
      insert: (rows: any) => makeInsert(table, rows),
      update: (updates: any) => makeUpdate(table, updates),
      delete: () => makeDelete(table),
    };
  },
};
