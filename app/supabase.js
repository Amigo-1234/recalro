/* Supabase browser client. The public project URL/key are supplied by the local server. */
(function () {
  "use strict";

  let client = null;
  let configured = false;

  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.async = true;
      script.onload = () => window.supabase?.createClient ? resolve() : reject(new Error("Supabase JavaScript did not load."));
      script.onerror = () => reject(new Error("Could not load Supabase. Check your internet connection and try again."));
      document.head.append(script);
    });
  }

  const ready = (async () => {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load Recalro configuration.");
    const config = await response.json();
    if (!config.supabaseUrl || !config.supabaseKey) return null;
    configured = true;
    await loadSdk();
    const authStorage = {
      getItem(key) { return localStorage.getItem(key) || sessionStorage.getItem(key); },
      setItem(key, value) {
        const store = document.getElementById("authRemember")?.checked === false ? sessionStorage : localStorage;
        const other = store === localStorage ? sessionStorage : localStorage;
        other.removeItem(key);
        store.setItem(key, value);
      },
      removeItem(key) { localStorage.removeItem(key); sessionStorage.removeItem(key); },
    };
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true, storage:authStorage },
    });
    return client;
  })();

  window.RecalroSupabase = {
    ready,
    get client() { return client; },
    get configured() { return configured; },
  };
})();
