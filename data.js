/**
 * Data Loader Module
 * Fetches required Pokémon datasets and transforms them into lookup models.
 */

// RFC-4180 compliant CSV parser
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter(r => r.length > 1);
  return body.map(r =>
    Object.fromEntries(header.map((h, idx) => [h.trim(), (r[idx] ?? "").trim()]))
  );
}

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
  }
  return parseCsv(await res.text());
}

// Build standard battle types (IDs 1 through 18)
function buildTypes(typeRows) {
  return typeRows
    .filter(t => Number(t.id) <= 18)
    .map(t => ({ id: Number(t.id), name: t.identifier }));
}

// Build effectiveness table: effectiveness[attackingType][defendingType] = damageMultiplier
function buildEffectiveness(types, efficacyRows) {
  const nameById = Object.fromEntries(types.map(t => [t.id, t.name]));
  const table = {};

  for (const row of efficacyRows) {
    const atk = nameById[row.damage_type_id];
    const def = nameById[row.target_type_id];
    if (!atk || !def) continue;

    (table[atk] ??= {})[def] = Number(row.damage_factor) / 100;
  }

  return table;
}

// Map species metadata: legendary/mythical status and evolution stage
function buildSpeciesInfo(speciesRows) {
  const byId = Object.fromEntries(speciesRows.map(s => [s.id, s]));
  const getStage = s => (s.evolves_from_species_id ? 1 + getStage(byId[s.evolves_from_species_id]) : 1);
  const info = {};

  for (const s of speciesRows) {
    info[s.id] = {
      legendary: s.is_legendary === "1" || s.is_mythical === "1",
      stage: getStage(s),
    };
  }

  return info;
}

// Filter and map raw Pokémon rows into candidate objects
function buildPokemon(rows, speciesInfo) {
  const shouldKeep = row => {
    const form = row.Form;
    return !form || KEEP_FORM_PREFIXES.some(prefix => form.startsWith(prefix));
  };

  return rows.filter(shouldKeep).map(row => {
    const info = speciesInfo[row.ID] || { legendary: false, stage: 1 };
    const bst = Number(row.Total);
    const isMega = row.Form.startsWith("Mega");

    return {
      id: Number(row.ID) || 0,
      name: row.Form || row.Name,
      species: row.Name,
      types: [row.Type1, row.Type2].filter(Boolean).map(t => t.toLowerCase()),
      bst,
      generation: Number(row.Generation) || 0,
      stats: {
        hp: Number(row.HP) || 0,
        atk: Number(row.Attack) || 0,
        def: Number(row.Defense) || 0,
        spa: Number(row["Sp. Atk"]) || 0,
        spd: Number(row["Sp. Def"]) || 0,
        spe: Number(row.Speed) || 0,
      },
      isLegendary: info.legendary,
      isMega,
      isPseudo: !info.legendary && !isMega && info.stage === 3 && bst === PSEUDO_LEGENDARY_BST,
    };
  });
}

/**
 * Loads all Pokémon data sources in parallel.
 * @returns {Promise<{ pokemon: Array, types: Array, effectiveness: Object }>}
 */
async function loadData() {
  const [pokemonRows, speciesRows, typeRows, efficacyRows] = await Promise.all([
    fetchCsv(DATA_SOURCES.pokemon),
    fetchCsv(DATA_SOURCES.species),
    fetchCsv(DATA_SOURCES.types),
    fetchCsv(DATA_SOURCES.typeEfficacy),
  ]);

  const types = buildTypes(typeRows);
  const speciesInfo = buildSpeciesInfo(speciesRows);
  const pokemon = buildPokemon(pokemonRows, speciesInfo);

  // Mega evolutions of pseudo-legendaries retain pseudo-legendary classification
  for (const p of pokemon) {
    if (p.isMega) {
      p.isPseudo = pokemon.some(other => !other.isMega && other.species === p.species && other.isPseudo);
    }
  }

  return {
    pokemon,
    types: types.map(t => t.name),
    effectiveness: buildEffectiveness(types, efficacyRows),
  };
}