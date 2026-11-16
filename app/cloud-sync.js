/* Debounced, per-user persistence for the existing Recalro state document. */
(function () {
  "use strict";

  const OWNER_KEY = "recalro-app-state-owner";
  let activeUserId = null;
  let timer = 0;
  let pending = null;
  let writing = null;

  const client = async () => window.RecalroSupabase?.ready;
  const local = (fn) => { try { return fn(); } catch { return null; } };

  async function writePending() {
    if (writing) return writing;
    if (!pending) return true;
    writing = (async () => {
      let payload = null;
      try {
        const db = await client();
        if (!db) return false;
        while (pending && db) {
          payload = pending;
          pending = null;
          const { error } = await db.from("user_app_state").upsert(payload, { onConflict: "user_id" });
          if (error) throw error;
        }
        return true;
      } catch (error) {
        if (!pending && payload) pending = payload;
        window.R?.emit("save-error", error);
        console.error("Recalro: cloud save failed.", error);
        return false;
      }
    })();
    try {
      return await writing;
    } finally {
      writing = null;
    }
  }

  function schedule() {
    if (!activeUserId || !window.R) return;
    pending = { user_id: activeUserId, state: JSON.parse(JSON.stringify(window.R.state)), updated_at: new Date().toISOString() };
    clearTimeout(timer);
    timer = setTimeout(() => void writePending(), 700);
  }

  async function flush() {
    clearTimeout(timer);
    if (activeUserId && window.R) {
      pending = { user_id: activeUserId, state: JSON.parse(JSON.stringify(window.R.state)), updated_at: new Date().toISOString() };
      if (!await writePending()) throw new Error("Learning progress could not sync. Check your connection and try again before switching accounts.");
    }
  }

  async function activate(userId) {
    if (!userId || !window.R) return;
    if (activeUserId === userId) return;
    const db = await client();
    if (!db) return;

    const previousOwner = local(() => localStorage.getItem(OWNER_KEY));
    if (activeUserId) await flush();
    if (previousOwner && previousOwner !== userId) window.R.resetForCloudUser();
    activeUserId = null;
    pending = null;

    const { data, error } = await db.from("user_app_state").select("state").eq("user_id", userId).maybeSingle();
    if (error) throw error;

    if (data?.state && typeof data.state === "object" && !Array.isArray(data.state) && Object.keys(data.state).length) {
      window.R.replaceState(data.state);
    }
    local(() => localStorage.setItem(OWNER_KEY, userId));
    activeUserId = userId;
    if (!data || !Object.keys(data.state || {}).length) await flush();
  }

  async function deactivate() {
    await flush();
    activeUserId = null;
    pending = null;
    clearTimeout(timer);
  }

  window.RecalroCloudSync = { activate, deactivate, flush, schedule };
})();
