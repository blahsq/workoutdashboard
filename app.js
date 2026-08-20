(function () {
  const fmt = iso => new Date(iso + "T00:00:00").toLocaleDateString("pl-PL", {
    day: "numeric", month: "short", year: "numeric"
  });

  const set = (id, text) => { document.getElementById(id).textContent = text; };

  function render(state, { stale } = {}) {
    const pkg = state.packages[state.packages.length - 1];
    if (!pkg) return renderEmpty(state);

    const total = pkg.size;
    const done = pkg.sessions.length;
    const left = total - done;
    const pct = Math.round((done / total) * 100);

    set("sub", `${state.client} · trener ${state.trainer}${stale ? " · dane offline" : ""}`);
    set("packagePill", `Pakiet ${total} treningów`);
    set("remaining", left);
    set("remainingSub", left === 0 ? "Pakiet wykorzystany" : `z pakietu ${total} treningów`);
    set("usedValue", done);
    set("usedUnit", `/ ${total}`);
    set("usedSub", `Pakiet kupiony ${fmt(pkg.purchasedAt)}`);
    set("percentValue", `${pct}%`);

    const last = pkg.sessions[pkg.sessions.length - 1];
    set("lastSession", last ? `Ostatni trening · ${fmt(last.date)}` : "Brak odbytych treningów");

    // pierścień pokazuje wykorzystaną część pakietu
    const C = 2 * Math.PI * 52;
    const ringFg = document.getElementById("ringFg");
    ringFg.style.strokeDasharray = C;
    requestAnimationFrame(() => { ringFg.style.strokeDashoffset = C * (1 - done / total); });
    requestAnimationFrame(() => { document.getElementById("barFill").style.width = pct + "%"; });

    const slots = Array.from({ length: total }, (_, i) => pkg.sessions[i] || null);
    document.getElementById("slots").innerHTML = slots.map((s, i) => `
      <li class="slot${s ? " is-done" : ""}">
        <span class="slot-num">${i + 1}</span>
        <p class="slot-focus">${s ? fmt(s.date) : "Wolny"}</p>
      </li>
    `).join("");
  }

  function renderEmpty(state) {
    set("sub", `${state.client || "—"} · trener ${state.trainer || "—"}`);
    set("packagePill", "Brak aktywnego pakietu");
    set("remaining", "0");
    set("remainingSub", "Załóż pakiet przez API");
    set("usedValue", "0");
    set("usedUnit", "");
    set("usedSub", "—");
    set("percentValue", "0%");
    set("lastSession", "Brak odbytych treningów");
    document.getElementById("slots").innerHTML = "";
  }

  fetch("/api/state", { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(state => render(state))
    .catch(err => {
      console.warn("[workouts] /api/state niedostępne, używam danych zapasowych:", err.message);
      render(FALLBACK_STATE, { stale: true });
    });
})();
