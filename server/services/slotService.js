const crypto = require('crypto');

// Símbolos temáticos de San Patricio
const SYMBOLS = ['🍒', '🍋', '🍇', '💎', '🍀']; // El trébol es el Jackpot
const PAYTABLE = {
    '🍀': 50, // 3 tréboles multiplican x50
    '💎': 20,
    '🍇': 10,
    '🍋': 5,
    '🍒': 2
};

function generateSpinResult() {
    // RNG Criptográficamente seguro
    const reel1 = SYMBOLS[crypto.randomInt(0, SYMBOLS.length)];
    const reel2 = SYMBOLS[crypto.randomInt(0, SYMBOLS.length)];
    const reel3 = SYMBOLS[crypto.randomInt(0, SYMBOLS.length)];

    return [reel1, reel2, reel3];
}

function calculatePayout(bet, result) {
    const [r1, r2, r3] = result;
    // Lógica simple: si los 3 son iguales, paga
    if (r1 === r2 && r2 === r3) {
        const multiplier = PAYTABLE[r1] || 0;
        return bet * multiplier;
    }
    return 0; // Perdió
}

module.exports = { generateSpinResult, calculatePayout };