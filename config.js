// Team builder configuration & dataset endpoints
const TEAM_SIZE = 6;
const PSEUDO_LEGENDARY_BST = 600;

// Remote dataset URLs (PokeAPI & public Pokémon data)
const DATA_SOURCES = {
  pokemon: "https://raw.githubusercontent.com/lgreski/pokemonData/master/Pokemon.csv",
  species: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv",
  types: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/types.csv",
  typeEfficacy: "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/type_efficacy.csv",
};

// Alternate forms to include (empty string represents base form)
const KEEP_FORM_PREFIXES = ["Mega", "Alolan", "Galarian", "Hisuian", "Paldean"];

// UI elemental type badge colors
const TYPE_COLORS = {
  normal: "#8a8a7a",
  fire: "#ee8130",
  water: "#6390f0",
  electric: "#d9a900",
  grass: "#5aa642",
  ice: "#4fb5b0",
  fighting: "#c22e28",
  poison: "#a33ea1",
  ground: "#b8944a",
  flying: "#8f7bd6",
  psychic: "#f95587",
  bug: "#8a9a14",
  rock: "#9a8528",
  ghost: "#735797",
  dragon: "#5b36ea",
  dark: "#5a4a40",
  steel: "#7c8ba0",
  fairy: "#d685ad",
};