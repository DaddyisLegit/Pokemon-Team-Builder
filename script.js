/**
 * Pokémon Team Builder — Application Logic
 * Handles team state, competitive rules, synergy calculation, and UI rendering.
 */

// Dataset state (populated by init)
let POKEMON = [];
let TYPES = [];
let EFFECTIVENESS = {};

// Active team: array of { pokemon, suggested: boolean }
let team = [];

// DOM element cache
const el = {
  rules: document.getElementById("rules"),
  slots: document.getElementById("slots"),
  message: document.getElementById("message"),
  table: document.getElementById("matchup-table"),
  search: document.getElementById("search"),
  list: document.getElementById("pokemon-list"),
  recommendBtn: document.getElementById("recommend-btn"),
  clearBtn: document.getElementById("clear-btn"),
  partyTray: document.getElementById("party-tray"),
  modal: document.getElementById("detail-modal"),
  panel: document.getElementById("detail-panel"),
};

/* -------------------------------------------------------------------------- */
/* Type Effectiveness Helpers                                                */
/* -------------------------------------------------------------------------- */

// Damage multiplier of attackType against defenderTypes
function effectiveness(attackType, defenderTypes) {
  return defenderTypes.reduce((multiplier, defType) => {
    return multiplier * (EFFECTIVENESS[attackType]?.[defType] ?? 1);
  }, 1);
}

// Counts how many squad members are weak to or resist an attacking type
function countWeakResist(attackType, members) {
  let weak = 0;
  let resist = 0;

  for (const p of members) {
    const mult = effectiveness(attackType, p.types);
    if (mult > 1) {
      weak++;
    } else if (mult < 1) {
      resist++;
    }
  }

  return { weak, resist };
}

/* -------------------------------------------------------------------------- */
/* Squad Rules & Validation                                                   */
/* -------------------------------------------------------------------------- */

const countWhere = (members, key) => members.filter(p => p[key]).length;

// Validates whether candidate can join squad; returns error string or empty string
function getRuleViolation(members, candidate) {
  if (members.length >= TEAM_SIZE) {
    return "Team is full";
  }
  if (members.some(p => p.species.toLowerCase() === candidate.species.toLowerCase())) {
    return "Already have that species";
  }
  if (candidate.isLegendary && countWhere(members, "isLegendary") >= 1) {
    return "Only 1 legendary allowed";
  }
  if (candidate.isPseudo && countWhere(members, "isPseudo") >= 1) {
    return "Only 1 pseudo-legendary allowed";
  }
  if (candidate.isMega && countWhere(members, "isMega") >= 1) {
    return "Only 1 mega evolution allowed";
  }
  return "";
}

/* -------------------------------------------------------------------------- */
/* Scoring & Auto-Recommendation                                              */
/* -------------------------------------------------------------------------- */

function scoreTeam(members) {
  let defense = 0;

  for (const type of TYPES) {
    const { weak, resist } = countWeakResist(type, members);
    defense += resist - 1.5 * weak;
    if (weak >= 2 && resist === 0) {
      defense -= 3; // Penalty for unresisted shared team weakness
    }
  }

  // Offensive coverage: count types hit super-effectively with STAB moves
  const coverage = TYPES.filter(target =>
    members.some(p => p.types.some(t => (EFFECTIVENESS[t]?.[target] ?? 1) > 1))
  ).length;

  const totalBst = members.reduce((sum, p) => sum + p.bst, 0);
  return defense + 1.5 * coverage + totalBst / 100;
}

// Greedily selects legal Pokémon that maximize the squad synergy score
function recommendTeam() {
  team = team.filter(m => !m.suggested);

  if (team.length === 0) {
    showMessage("Tip: pick a few favorites first for a tailored team.");
  }

  while (team.length < TEAM_SIZE) {
    const members = team.map(m => m.pokemon);
    let best = null;
    let bestScore = -Infinity;

    for (const candidate of POKEMON) {
      if (getRuleViolation(members, candidate)) continue;

      const score = scoreTeam([...members, candidate]);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) break;
    team.push({ pokemon: best, suggested: true });
  }

  render();
}

/* -------------------------------------------------------------------------- */
/* Squad Actions                                                              */
/* -------------------------------------------------------------------------- */

function showMessage(text) {
  el.message.textContent = text;
}

function addPokemon(pokemon) {
  const error = getRuleViolation(team.map(m => m.pokemon), pokemon);
  if (error) {
    return showMessage(`${error} — ${pokemon.name} not added.`);
  }

  team.push({ pokemon, suggested: false });
  showMessage("");
}

/* -------------------------------------------------------------------------- */
/* Sprite URL Resolution                                                      */
/* -------------------------------------------------------------------------- */

function getPokemonSpriteUrl(p) {
  const clean = str =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const species = clean(p.species);

  // Mega Evolutions
  if (p.isMega) {
    if (p.name.endsWith(" X") || p.name.endsWith("-X")) {
      return `https://play.pokemonshowdown.com/sprites/gen5/${species}-megax.png`;
    }
    if (p.name.endsWith(" Y") || p.name.endsWith("-Y")) {
      return `https://play.pokemonshowdown.com/sprites/gen5/${species}-megay.png`;
    }
    return `https://play.pokemonshowdown.com/sprites/gen5/${species}-mega.png`;
  }

  // Regional forms
  if (p.name.startsWith("Alolan")) return `https://play.pokemonshowdown.com/sprites/gen5/${species}-alola.png`;
  if (p.name.startsWith("Galarian")) return `https://play.pokemonshowdown.com/sprites/gen5/${species}-galar.png`;
  if (p.name.startsWith("Hisuian")) return `https://play.pokemonshowdown.com/sprites/gen5/${species}-hisui.png`;
  if (p.name.startsWith("Paldean")) return `https://play.pokemonshowdown.com/sprites/gen5/${species}-paldea.png`;

  // Specific multi-forme Pokémon
  if (species.startsWith("zygarde")) {
    if (species.includes("10")) {
      return "https://play.pokemonshowdown.com/sprites/gen5/zygarde-10.png";
    }
    return "https://play.pokemonshowdown.com/sprites/gen5/zygarde.png";
  }

  return `https://play.pokemonshowdown.com/sprites/gen5/${species}.png`;
}

/* -------------------------------------------------------------------------- */
/* HTML Renderers                                                             */
/* -------------------------------------------------------------------------- */

const abbr = type => type.slice(0, 3).toUpperCase();

const typeVars = types =>
  `--c1:${TYPE_COLORS[types[0]] || "#334155"};--c2:${TYPE_COLORS[types[1] || types[0]] || "#1e293b"}`;

function typeChipsHtml(types) {
  return types
    .map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${abbr(t)}</span>`)
    .join("");
}

function tagsHtml(p) {
  const tags = [];
  if (p.isLegendary) tags.push("LEGEND");
  if (p.isPseudo) tags.push("PSEUDO");
  if (p.isMega) tags.push("MEGA");

  return tags
    .map(t => `<span class="tag tag-${t.toLowerCase()}">${t}</span>`)
    .join("");
}

function renderPartyTray() {
  if (!el.partyTray) return;

  let html = "";
  for (let i = 0; i < TEAM_SIZE; i++) {
    const member = team[i];
    if (member) {
      const p = member.pokemon;
      const typeColor = TYPE_COLORS[p.types[0]] || "#ff3d6e";
      html += `
        <div class="party-ball filled" style="--ball-glow:${typeColor}" title="Slot #0${i + 1}: ${p.name} (${p.types.join('/')})">
          <div class="party-ball-top"></div>
          <div class="party-ball-center"></div>
          <div class="party-ball-bottom"></div>
        </div>`;
    } else {
      html += `
        <div class="party-ball empty" title="Slot #0${i + 1}: Open Slot">
          <div class="party-ball-top"></div>
          <div class="party-ball-center"></div>
          <div class="party-ball-bottom"></div>
        </div>`;
    }
  }

  el.partyTray.innerHTML = html;
}

function renderRules(members) {
  const rules = [
    ["Legendary", countWhere(members, "isLegendary"), 1],
    ["Pseudo-Legend", countWhere(members, "isPseudo"), 1],
    ["Mega Evolution", countWhere(members, "isMega"), 1],
  ];

  el.rules.innerHTML =
    rules
      .map(([label, count, max]) => `
        <div class="rule ${count >= max ? "used" : ""}">
          <span class="rule-led"></span>
          <span class="rule-label">${label}</span>
          <span class="rule-count">${count}/${max}</span>
        </div>`)
      .join("") +
    `<div class="rule ${members.length >= TEAM_SIZE ? "used team-full" : ""}">
      <span class="rule-led"></span>
      <span class="rule-label">Party Cap</span>
      <span class="rule-count">${members.length}/${TEAM_SIZE}</span>
    </div>`;
}

function renderSlots() {
  let html = "";

  for (let i = 0; i < TEAM_SIZE; i++) {
    const member = team[i];

    if (!member) {
      html += `
        <div class="slot empty">
          <span class="slot-idx">#0${i + 1}</span>
          <div class="empty-dock">
            <div class="dock-pokeball">
              <div class="dock-pokeball-center"></div>
            </div>
            <div class="dock-pulse"></div>
          </div>
          <span class="empty-text">EMPTY DOCK</span>
          <span class="empty-sub">+ SELECT POKÉMON</span>
        </div>`;
      continue;
    }

    const p = member.pokemon;
    const spriteUrl = getPokemonSpriteUrl(p);
    const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
    const bstPercent = Math.min(100, Math.max(12, Math.round((p.bst / 720) * 100)));
    const formattedId = p.id ? `#${String(p.id).padStart(3, "0")}` : "";

    html += `
      <div class="slot clickable ${member.suggested ? "suggested" : ""}" data-index="${i}" tabindex="0" style="${typeVars(p.types)}" title="${p.name} — click for details">
        <div class="slot-header-row">
          <span class="slot-idx">#0${i + 1}</span>
          <span class="slot-dex-num">${formattedId}</span>
          <button class="remove-btn" data-index="${i}" title="Release from party" aria-label="Remove ${p.name}">✕</button>
        </div>

        <div class="slot-visual">
          <div class="sprite-pedestal"></div>
          <img class="slot-sprite" src="${spriteUrl}" alt="${p.name}" loading="lazy" data-fallback="${fallbackUrl}"
               onerror="if(this.dataset.fallback && this.src !== this.dataset.fallback){ this.src=this.dataset.fallback; } else { this.style.opacity='0'; }">
        </div>

        <div class="slot-body">
          <strong class="slot-name">${p.name}</strong>
          <div class="slot-chips">${typeChipsHtml(p.types)}</div>

          <div class="bst-gauge">
            <div class="bst-label-row">
              <span class="bst-label">BST <strong>${p.bst}</strong></span>
              ${member.suggested ? '<span class="suggested-pill">★ AUTO</span>' : ""}
            </div>
            <div class="bst-track">
              <div class="bst-fill" style="width: ${bstPercent}%"></div>
            </div>
          </div>

          ${tagsHtml(p) ? `<div class="slot-tags">${tagsHtml(p)}</div>` : ""}
        </div>
      </div>`;
  }

  el.slots.innerHTML = html;
}

function renderMatchupTable(members) {
  let header = "<tr><th class='row-head'>TYPE</th>";
  let weakRow = "<tr><td class='row-head weak-title'>WEAK</td>";
  let resistRow = "<tr><td class='row-head resist-title'>RESIST</td>";

  for (const type of TYPES) {
    const { weak, resist } = countWeakResist(type, members);
    header += `<th><span class="matchup-chip" style="background:${TYPE_COLORS[type]}">${abbr(type)}</span></th>`;
    weakRow += `<td class="${weak > 0 ? "weak" : ""}">${weak ? `-${weak}` : "·"}</td>`;
    resistRow += `<td class="${resist > 0 ? "resist" : ""}">${resist ? `+${resist}` : "·"}</td>`;
  }

  el.table.innerHTML = `${header}</tr>${weakRow}</tr>${resistRow}</tr>`;
}

function renderPicker() {
  const rawQuery = el.search.value.toLowerCase().trim();
  const numQuery = rawQuery.replace("#", "").trim();
  const isNum = numQuery && !isNaN(numQuery);

  const matches = POKEMON.filter(p => {
    if (!rawQuery) return true;
    if (isNum && p.id === Number(numQuery)) return true;
    if (p.name.toLowerCase().includes(rawQuery)) return true;
    if (p.types.some(t => t.startsWith(rawQuery))) return true;
    return false;
  }).slice(0, 96);

  el.list.innerHTML = matches
    .map(p => {
      const formattedId = p.id ? `#${String(p.id).padStart(3, "0")}` : "";
      const spriteUrl = getPokemonSpriteUrl(p);
      const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;

      return `
        <button class="pokemon-card" data-name="${p.name}" style="${typeVars(p.types)}" title="${p.name}">
          <span class="card-dex-tag">${formattedId}</span>
          <div class="card-sprite-wrap">
            <img class="card-sprite" src="${spriteUrl}" alt="${p.name}" loading="lazy" data-fallback="${fallbackUrl}"
                 onerror="if(this.dataset.fallback && this.src !== this.dataset.fallback){ this.src=this.dataset.fallback; } else { this.style.opacity='0'; }">
          </div>
          <div class="card-details">
            <span class="card-name">${p.name}</span>
            <div class="card-chips">${typeChipsHtml(p.types)}</div>
            <span class="card-bst">BST ${p.bst}</span>
          </div>
        </button>`;
    })
    .join("");
}

function render() {
  const members = team.map(m => m.pokemon);
  renderPartyTray();
  renderRules(members);
  renderSlots();
  renderMatchupTable(members);
  renderPicker();
}


/* -------------------------------------------------------------------------- */
/* Pokémon Detail Popup                                                       */
/* -------------------------------------------------------------------------- */

const STAT_LABELS = [
  ["hp", "HP"], ["atk", "ATK"], ["def", "DEF"],
  ["spa", "SP.ATK"], ["spd", "SP.DEF"], ["spe", "SPEED"],
];

const multLabel = m => (m === 0 ? "0×" : m === 0.25 ? "¼×" : m === 0.5 ? "½×" : `${m}×`);

// Groups every attacking type by how it hits this Pokémon
function defensiveProfile(p) {
  const groups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
  for (const type of TYPES) {
    const m = effectiveness(type, p.types);
    if (groups[m]) groups[m].push(type);
  }
  return groups;
}

function statColor(v) {
  if (v >= 130) return "#00e5ff";
  if (v >= 100) return "#2fe084";
  if (v >= 70) return "#ffcb05";
  if (v >= 50) return "#ee8130";
  return "#ff385c";
}

function typeRowHtml(label, types, cls) {
  if (!types.length) return "";
  const chips = types
    .map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${abbr(t)}</span>`)
    .join("");
  return `<div class="dm-row ${cls}"><span class="dm-mult">${label}</span><div class="dm-chips">${chips}</div></div>`;
}

function openDetails(index) {
  const member = team[index];
  if (!member) return;

  const p = member.pokemon;
  const others = team.filter((_, i) => i !== index).map(m => m.pokemon);
  const prof = defensiveProfile(p);

  // Offense: types this Pokémon hits super-effectively with its own (STAB) types
  const hits = TYPES.filter(target => p.types.some(t => (EFFECTIVENESS[t]?.[target] ?? 1) > 1));

  // Team role: attacking types that hurt teammates but that this Pokémon resists
  const covers = TYPES.filter(type => {
    const teammatesWeak = countWeakResist(type, others).weak;
    return teammatesWeak > 0 && effectiveness(type, p.types) < 1;
  });
  // Shared liabilities: types that hit both this Pokémon and teammates hard
  const sharedWeak = TYPES.filter(type => {
    return effectiveness(type, p.types) > 1 && countWeakResist(type, others).weak > 0;
  });

  const spriteUrl = getPokemonSpriteUrl(p);
  const fallbackUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
  const formattedId = p.id ? `#${String(p.id).padStart(3, "0")}` : "";

  const statsHtml = STAT_LABELS.map(([key, label]) => {
    const v = p.stats?.[key] ?? 0;
    const pct = Math.min(100, Math.round((v / 200) * 100));
    return `
      <div class="dm-stat">
        <span class="dm-stat-label">${label}</span>
        <span class="dm-stat-val">${v}</span>
        <div class="dm-stat-track"><div class="dm-stat-fill" style="width:${pct}%;background:${statColor(v)}"></div></div>
      </div>`;
  }).join("");

  const chipList = list => list.length
    ? `<div class="dm-chips">${list.map(t => `<span class="type-chip" style="background:${TYPE_COLORS[t]}">${abbr(t)}</span>`).join("")}</div>`
    : `<span class="dm-none">None</span>`;

  el.panel.innerHTML = `
    <div class="dm-head" style="${typeVars(p.types)}">
      <button class="dm-close" data-close aria-label="Close details">✕</button>
      <div class="dm-sprite-wrap">
        <img class="dm-sprite" src="${spriteUrl}" alt="${p.name}" data-fallback="${fallbackUrl}"
             onerror="if(this.dataset.fallback && this.src !== this.dataset.fallback){ this.src=this.dataset.fallback; } else { this.style.opacity='0'; }">
      </div>
      <div class="dm-title">
        <span class="dm-dex">${formattedId}${p.generation ? ` · GEN ${p.generation}` : ""}</span>
        <h3>${p.name}</h3>
        <div class="dm-chips">${typeChipsHtml(p.types)}</div>
        ${tagsHtml(p) ? `<div class="slot-tags">${tagsHtml(p)}</div>` : ""}
        ${member.suggested ? '<span class="suggested-pill">★ AUTO-PICKED</span>' : ""}
      </div>
    </div>

    <div class="dm-body">
      <section>
        <h4>Base Stats <span class="dm-total">BST ${p.bst}</span></h4>
        ${statsHtml}
      </section>

      <section>
        <h4>Type Matchups (defending)</h4>
        ${typeRowHtml("4×", prof[4], "weak")}
        ${typeRowHtml("2×", prof[2], "weak")}
        ${typeRowHtml("½×", prof[0.5], "resist")}
        ${typeRowHtml("¼×", prof[0.25], "resist")}
        ${typeRowHtml("0×", prof[0], "immune")}
      </section>

      <section>
        <h4>Offense</h4>
        <p class="dm-label">Hits super-effectively (STAB)</p>
        ${chipList(hits)}
      </section>

      <section>
        <h4>Role on Your Team</h4>
        <p class="dm-label">Resists types that threaten teammates</p>
        ${others.length ? chipList(covers) : '<span class="dm-none">Add more Pokémon to compare</span>'}
        <p class="dm-label">Shares weaknesses with teammates</p>
        ${others.length ? chipList(sharedWeak) : '<span class="dm-none">Add more Pokémon to compare</span>'}
      </section>
    </div>`;

  el.modal.hidden = false;
  document.body.classList.add("modal-open");
  el.panel.scrollTop = 0;
}

function closeDetails() {
  el.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

/* -------------------------------------------------------------------------- */
/* Event Listeners                                                            */
/* -------------------------------------------------------------------------- */

el.list.addEventListener("click", e => {
  const card = e.target.closest(".pokemon-card");
  if (!card) return;
  addPokemon(POKEMON.find(p => p.name === card.dataset.name));
  render();
});

el.slots.addEventListener("click", e => {
  const btn = e.target.closest(".remove-btn");
  if (btn) {
    team.splice(Number(btn.dataset.index), 1);
    render();
    return;
  }

  // Clicking a filled slot opens its detail popup
  const slot = e.target.closest(".slot.clickable");
  if (slot) openDetails(Number(slot.dataset.index));
});

el.slots.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const slot = e.target.closest(".slot.clickable");
  if (!slot || e.target.closest(".remove-btn")) return;
  e.preventDefault();
  openDetails(Number(slot.dataset.index));
});

el.modal.addEventListener("click", e => {
  if (e.target.closest("[data-close]")) closeDetails();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !el.modal.hidden) closeDetails();
});

el.search.addEventListener("input", renderPicker);
el.recommendBtn.addEventListener("click", recommendTeam);
el.clearBtn.addEventListener("click", () => {
  team = [];
  closeDetails();
  showMessage("");
  render();
});

/* -------------------------------------------------------------------------- */
/* Initialization                                                             */
/* -------------------------------------------------------------------------- */

async function init() {
  showMessage("Loading Pokémon data…");

  try {
    ({ pokemon: POKEMON, types: TYPES, effectiveness: EFFECTIVENESS } = await loadData());
    showMessage("");
    render();
  } catch (err) {
    console.error("Failed to load Pokémon data:", err);
    showMessage(`Couldn't load Pokémon data: ${err.message}`);
  }
}

init();