// utils/helper.js

// Calculate sum of cards
const calculateSum = (cards) => {
  if (!Array.isArray(cards)) throw new Error("Invalid cards array");
  let sum = 0;
  let aceCount = 0;

  cards.forEach((card) => {
    if (card.value === "A") {
      aceCount += 1;
      sum += 11;
    } else if (["K", "Q", "J"].includes(card.value)) {
      sum += 10;
    } else {
      sum += parseInt(card.value);
    }
  });

  // Adjust for Aces if sum > 21
  while (sum > 21 && aceCount > 0) {
    sum -= 10;
    aceCount -= 1;
  }

  return sum;
};

// utils/helper.js

const createDeck = () => {
  const suits = ["Heart", "Diamond", "Spade", "Club"];
  const values = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const deck = [];
  suits.forEach((suit) => {
    values.forEach((value) => {
      deck.push({
        suit,
        value,
        img: `/imgs/${suit}${value}.svg`,
      });
    });
  });
  return deck;
};

const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

module.exports = { createDeck, shuffleDeck };

module.exports = {
  calculateSum,
  createDeck,
  shuffleDeck,
};
