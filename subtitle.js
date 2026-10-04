// Picks a random subtitle on every page load. Higher weight = shows up more often.
const SUBTITLES = [
  { text: "Ray-RUN EM DOWN-quaza.",                                                             weight: 30 },
  { text: "Ayoo Zoro, what are you doing here?.",    weight: 20 },
  { text: "Gotta build 'em all.",                                                               weight: 15 },
  { text: "Pika pika? Pika chuuu!.",                                                            weight: 12 },
  { text: "Snorlax is not a personality. Pick a real team.",                                    weight: 10 },
  { text: "A swarm of Groudons has appeared.",                                                  weight: 8 },
  { text: "It's super effective... at being a questionable team.",                              weight: 5 },
  { text: "Ahh..that house looks beautiful. I should prolly meet its owner.",                   weight: 3 },
  { text: "A shiny subtitle appeared!",                                                         weight: 1 },
];

function pickWeighted(items) {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll < 0) return item;
  }
  return items[0];
}

document.addEventListener("DOMContentLoaded", () => {
  const el = document.querySelector(".subtitle");
  if (el) el.textContent = pickWeighted(SUBTITLES).text;
});