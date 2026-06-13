// Server-side stub — not used in local mode
export const supabaseAdmin = new Proxy({} as any, {
  get() { throw new Error("supabaseAdmin is not available in local mode"); },
});
