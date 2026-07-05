const REACTIONS = {
  "arc builder": [
    "You're on the board. Every legend started exactly here.",
    "Foundation's there. Now it's about showing up more consistently.",
    "You've planted the flag. Time to build on it."
  ],
  "arc core": [
    "Solid. You're clearly not just passing through.",
    "You're in the thick of it now. People are noticing.",
    "This is real conviction, not just noise."
  ],
  "arc legend": [
    "This is what real conviction looks like.",
    "You're not just early, you're all in.",
    "This is the kind of consistency that gets noticed."
  ]
};

function getReaction(tier) {
  const pool = REACTIONS[tier] || REACTIONS["arc builder"];
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { getReaction };
