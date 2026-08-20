(function () {
  const d = PACKAGE_DATA;
  const total = d.packageSize;
  const done = d.sessions.filter(s => s.done).length;
  const left = total - done;
  const pct = Math.round((done / total) * 100);

  const fmt = iso => new Date(iso + "T00:00:00").toLocaleDateString("pl-PL", {
    day: "numeric", month: "short", year: "numeric"
  });

  const set = (id, text) => { document.getElementById(id).textContent = text; };

  set("sub", `${d.client} · trener ${d.trainer}`);
  set("packagePill", `Pakiet ${total} treningów`);
  set("remaining", left);
  set("remainingSub", left === 0 ? "Pakiet wykorzystany" : `z pakietu ${total} treningów`);
  set("usedValue", done);
  set("usedUnit", `/ ${total}`);
  set("usedSub", `Pakiet kupiony ${fmt(d.purchasedAt)}`);
  set("percentValue", `${pct}%`);

  const lastDone = [...d.sessions].reverse().find(s => s.done);
  set("lastSession", lastDone ? `Ostatni trening · ${fmt(lastDone.date)}` : "Brak odbytych treningów");

  // pierścień pokazuje wykorzystaną część pakietu
  const C = 2 * Math.PI * 52;
  const ringFg = document.getElementById("ringFg");
  ringFg.style.strokeDasharray = C;
  requestAnimationFrame(() => { ringFg.style.strokeDashoffset = C * (1 - done / total); });

  requestAnimationFrame(() => { document.getElementById("barFill").style.width = pct + "%"; });

  document.getElementById("slots").innerHTML = d.sessions.map(s => `
    <li class="slot${s.done ? " is-done" : ""}">
      <span class="slot-num">${s.n}</span>
      <p class="slot-focus">${s.done ? fmt(s.date) : "Wolny"}</p>
    </li>
  `).join("");
})();
