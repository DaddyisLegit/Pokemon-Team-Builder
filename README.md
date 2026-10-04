# Pokémon Team Builder

A Pokédex-styled web app for building a balanced team of six Pokémon. Pick your favorites, watch your team's type weaknesses and resistances update live, and let the built-in recommender fill the empty slots for you.

Built with plain HTML, CSS and JavaScript. There is no framework, no build step and no backend.

**Live demo:** [https://daddyislegit.github.io/Pokemon-Team-Builder/](https://daddyislegit.github.io/Pokemon-Team-Builder/)

## Features

- **Six-slot party.** Add Pokémon from a searchable registry and remove them with one click.
- **Competitive-style team rules**, enforced as you build:
  - No duplicate species
  - Maximum of 1 legendary or mythical
  - Maximum of 1 pseudo-legendary
  - Maximum of 1 Mega Evolution
- **Live type matchup matrix.** For all 18 types, see how many teammates are weak to or resist each one.
- **Smart auto-recommend.** Keep the Pokémon you've picked and the app fills the remaining slots with legal picks that maximize team synergy (see [How the recommender works](#how-the-recommender-works)).
- **Detail popup.** Click any filled slot to see base stats, full type matchups (4× to 0×), offensive coverage, and how that Pokémon fits your team.
- **Flexible search.** Search the registry by name, Pokédex number (`#025`), or type (`fire`).
- **Alternate forms.** Includes Mega, Alolan, Galarian, Hisuian and Paldean forms.
- **Retro Pokédex UI.** Pixel fonts, an LED status bar, a Pokéball party tray, and a random subtitle on every page load.

## Getting started

No installation is needed. The app is a set of static files.

### Run locally

Browsers can block some requests when you open a file directly, so use a small local server:

```bash
# from the project folder
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

### Deploy

Any static host works. For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**. Netlify, Vercel and Cloudflare Pages also work with no configuration.

## Project structure

```
├── index.html      # Page layout and the detail popup container
├── styles.css      # Pokédex theme, layout and animations
├── config.js       # Team size, data URLs, type colors, form filters
├── data.js         # CSV loading and parsing, builds the Pokémon and type models
├── script.js       # Team state, rules, scoring, rendering, event handling
└── subtitle.js     # Weighted random subtitle shown under the title
```

Scripts load in this order: `subtitle.js` → `config.js` → `data.js` → `script.js`.

## Configuration

Everything you're likely to tweak is in `config.js`:

| Setting | What it does |
| --- | --- |
| `TEAM_SIZE` | Number of party slots (default `6`) |
| `PSEUDO_LEGENDARY_BST` | Base stat total used to detect pseudo-legendaries (default `600`) |
| `DATA_SOURCES` | URLs of the four CSV datasets |
| `KEEP_FORM_PREFIXES` | Which alternate forms appear in the registry |
| `TYPE_COLORS` | Badge color for each type |

To change the fonts, edit the `--font-dex`, `--font-title` and `--font-data` variables at the top of `styles.css`, and update the Google Fonts link in `index.html`.

To add or edit the random subtitles, change the `SUBTITLES` list in `subtitle.js`. A higher `weight` makes a line appear more often.

### Hosting the data yourself

By default the app fetches its data from `raw.githubusercontent.com`. Some networks and ad blockers block that domain. To avoid this, download the four CSVs into a `data/` folder and point `DATA_SOURCES` at them:

```js
const DATA_SOURCES = {
  pokemon: "data/Pokemon.csv",
  species: "data/pokemon_species.csv",
  types: "data/types.csv",
  typeEfficacy: "data/type_efficacy.csv",
};
```

## How the recommender works

When you click **Recommend Team**, the app keeps your manually picked Pokémon and fills the remaining slots one at a time. At each step it tries every legal candidate and keeps the one that gives the highest team score:

```
score = defense + 1.5 × offensive coverage + total BST / 100
```

- **Defense:** for each of the 18 types, +1 per teammate that resists it and −1.5 per teammate that is weak to it, with an extra −3 penalty when two or more teammates share a weakness that nobody resists.
- **Offensive coverage:** the number of types the team can hit super-effectively using its members' own types (STAB).
- **Base stat total:** a small bonus for raw strength.

This is a greedy heuristic, so it gives a solid starting team rather than a guaranteed optimum. It doesn't account for movesets, abilities or items.

## Data and credits

- Pokémon stats: [lgreski/pokemonData](https://github.com/lgreski/pokemonData)
- Species and type-effectiveness data: [PokeAPI](https://github.com/PokeAPI/pokeapi)
- Sprites: [Pokémon Showdown](https://play.pokemonshowdown.com/sprites/) (with [PokeAPI sprites](https://github.com/PokeAPI/sprites) as a fallback)
- Fonts: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans), [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) and [DotGothic16](https://fonts.google.com/specimen/DotGothic16) via Google Fonts

## Disclaimer

This is an unofficial fan project. Pokémon and all related names, characters and images are trademarks of Nintendo, Game Freak and The Pokémon Company. This project is not affiliated with or endorsed by them.
