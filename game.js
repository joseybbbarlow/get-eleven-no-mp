// Card mapping (1-10 only, no Jack!)
const CARD_IMAGES = {
    1: 'images/card_hearts_A.png',
    2: 'images/card_diamonds_02.png',
    3: 'images/card_clubs_03.png',
    4: 'images/card_hearts_04.png',
    5: 'images/card_spades_05.png',
    6: 'images/card_diamonds_06.png',
    7: 'images/card_clubs_07.png',
    8: 'images/card_hearts_08.png',
    9: 'images/card_spades_09.png',
    10: 'images/card_diamonds_10.png'
};

const CARD_BACK = 'images/card_back.png';

// Preload images
const imageCache = {};
function preloadImages() {
    Object.values(CARD_IMAGES).forEach(src => {
        const img = new Image();
        img.src = src;
        imageCache[src] = img;
    });
    const backImg = new Image();
    backImg.src = CARD_BACK;
    imageCache[CARD_BACK] = backImg;
}

// Game State
let gameState = {
    deck: [],
    pyramid: [],
    selected: [],
    bonusCards: [],
    score: 0,
    level: 1,
    timeRemaining: 148,
    gameOver: false,
    combo: 0,
    baseTime: 148
};

let timerInterval = null;

preloadImages();

// Level time reduction
function getTimeForLevel(level) {
    // Start at 148 seconds, reduce by 8 seconds each level, minimum 60 seconds
    return Math.max(60, 148 - ((level - 1) * 8));
}

// Create deck (1-10 only, 5 complete sets)
function createDeck() {
    const deck = [];
    for (let i = 0; i < 5; i++) {
        for (let value = 1; value <= 10; value++) {
            deck.push(value);
        }
    }
    return shuffle(deck);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Setup pyramid
function setupPyramid() {
    const pyramid = [];
    let cardIndex = 0;
    
    for (let row = 0; row < 7; row++) {
        const rowCards = [];
        for (let col = 0; col <= row; col++) {
            if (cardIndex < gameState.deck.length) {
                rowCards.push({
                    value: gameState.deck[cardIndex],
                    row: row,
                    col: col,
                    removed: false,
                    available: false
                });
                cardIndex++;
            }
        }
        pyramid.push(rowCards);
    }
    
    gameState.deck = gameState.deck.slice(cardIndex);
    return pyramid;
}

function updateAvailability() {
    gameState.pyramid.forEach((row, rowIndex) => {
        row.forEach((card, colIndex) => {
            if (!card.removed) {
                card.available = isCardAvailable(rowIndex, colIndex);
            }
        });
    });
}

function isCardAvailable(row, col) {
    const card = gameState.pyramid[row][col];
    if (card.removed) return false;
    
    if (row === gameState.pyramid.length - 1) return true;
    
    const nextRow = gameState.pyramid[row + 1];
    const leftCovered = nextRow[col] && !nextRow[col].removed;
    const rightCovered = nextRow[col + 1] && !nextRow[col + 1].removed;
    
    return !leftCovered && !rightCovered;
}

// Check if moves available
function hasMovesAvailable() {
    const availableCards = [];
    
    // Get available pyramid cards
    gameState.pyramid.forEach(row => {
        row.forEach(card => {
            if (card.available && !card.removed) {
                availableCards.push(card.value);
            }
        });
    });
    
    // Add bonus cards
    gameState.bonusCards.forEach(bonusCard => {
        availableCards.push(bonusCard.value);
    });
    
    if (availableCards.length === 0) return false;
    
    // Check if any combination sums to 11
    // Two cards
    for (let i = 0; i < availableCards.length; i++) {
        for (let j = i + 1; j < availableCards.length; j++) {
            if (availableCards[i] + availableCards[j] === 11) return true;
        }
    }
    
    // Three cards
    for (let i = 0; i < availableCards.length; i++) {
        for (let j = i + 1; j < availableCards.length; j++) {
            for (let k = j + 1; k < availableCards.length; k++) {
                if (availableCards[i] + availableCards[j] + availableCards[k] === 11) return true;
            }
        }
    }
    
    // Four cards
    for (let i = 0; i < availableCards.length; i++) {
        for (let j = i + 1; j < availableCards.length; j++) {
            for (let k = j + 1; k < availableCards.length; k++) {
                for (let l = k + 1; l < availableCards.length; l++) {
                    if (availableCards[i] + availableCards[j] + availableCards[k] + availableCards[l] === 11) return true;
                }
            }
        }
    }
    
    // Five cards (possible with bonus cards)
    for (let i = 0; i < availableCards.length; i++) {
        for (let j = i + 1; j < availableCards.length; j++) {
            for (let k = j + 1; k < availableCards.length; k++) {
                for (let l = k + 1; l < availableCards.length; l++) {
                    for (let m = l + 1; m < availableCards.length; m++) {
                        if (availableCards[i] + availableCards[j] + availableCards[k] + availableCards[l] + availableCards[m] === 11) return true;
                    }
                }
            }
        }
    }
    
    return false;
}

// Rendering
function renderPyramid() {
    const pyramidEl = document.getElementById('pyramid');
    pyramidEl.innerHTML = '';
    
    gameState.pyramid.forEach((row, rowIndex) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'pyramid-row';
        
        row.forEach((card, colIndex) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.style.backgroundImage = `url('${CARD_IMAGES[card.value]}')`;
            
            if (card.removed) {
                cardEl.classList.add('removed');
            } else if (card.available) {
                cardEl.classList.add('available');
                cardEl.onclick = () => selectCard(rowIndex, colIndex);
            } else {
                cardEl.classList.add('unavailable');
            }
            
            if (gameState.selected.some(s => !s.isBonus && s.row === rowIndex && s.col === colIndex)) {
                cardEl.classList.add('selected');
            }
            
            rowEl.appendChild(cardEl);
        });
        
        pyramidEl.appendChild(rowEl);
    });
}

function renderBonusCards() {
    const bonusContainer = document.getElementById('bonusCards');
    bonusContainer.innerHTML = '';
    
    gameState.bonusCards.forEach((bonusCard, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'bonus-card';
        cardEl.style.backgroundImage = `url('${CARD_IMAGES[bonusCard.value]}')`;
        cardEl.onclick = () => selectBonusCard(index);
        
        if (gameState.selected.some(s => s.isBonus && s.bonusIndex === index)) {
            cardEl.classList.add('selected');
        }
        
        bonusContainer.appendChild(cardEl);
    });
}

function selectCard(row, col) {
    const card = gameState.pyramid[row][col];
    if (!card.available || card.removed) return;
    
    const selectedIndex = gameState.selected.findIndex(s => !s.isBonus && s.row === row && s.col === col);
    
    if (selectedIndex >= 0) {
        gameState.selected.splice(selectedIndex, 1);
    } else {
        gameState.selected.push({ row, col, value: card.value, isBonus: false });
    }
    
    checkSelection();
}

function selectBonusCard(bonusIndex) {
    const selectedIndex = gameState.selected.findIndex(s => s.isBonus && s.bonusIndex === bonusIndex);
    
    if (selectedIndex >= 0) {
        gameState.selected.splice(selectedIndex, 1);
    } else {
        const bonusCard = gameState.bonusCards[bonusIndex];
        gameState.selected.push({ bonusIndex, value: bonusCard.value, isBonus: true });
    }
    
    checkSelection();
}

function checkSelection() {
    const sum = gameState.selected.reduce((acc, card) => acc + card.value, 0);
    
    if (sum === 11) {
        // Auto-remove when sum is 11
        setTimeout(() => removeSelected(), 100);
    }
    
    renderPyramid();
    renderBonusCards();
}

function removeSelected() {
    if (gameState.selected.length === 0) return;
    
    const sum = gameState.selected.reduce((acc, card) => acc + card.value, 0);
    
    if (sum === 11) {
        // Remove cards
        gameState.selected.forEach(card => {
            if (card.isBonus) {
                gameState.bonusCards.splice(card.bonusIndex, 1);
            } else {
                gameState.pyramid[card.row][card.col].removed = true;
            }
        });
        
        // Update score
        const points = gameState.selected.length * 10;
        gameState.score += points;
        gameState.combo++;
        
        // Check for bonus card (5 combos without drawing)
        if (gameState.combo >= 5) {
            addBonusCard();
            gameState.combo = 0;
        }
        
        gameState.selected = [];
        updateAvailability();
        renderPyramid();
        renderBonusCards();
        updateStats();
        
        checkWinCondition();
    }
}

function addBonusCard() {
    // Generate a random card value (1-10) for bonus
    const randomValue = Math.floor(Math.random() * 10) + 1;
    gameState.bonusCards.push({ value: randomValue });
    
    showNotification('⭐ BONUS CARD!', 'bonus');
    renderBonusCards();
}

function drawCard() {
    if (gameState.deck.length === 0) {
        showNotification('Deck is empty!', 'error');
        return;
    }
    
    // Drawing resets combo
    gameState.combo = 0;
    
    // Add card to pyramid (it goes back into the pyramid)
    const newCard = gameState.deck.shift();
    
    // Find first available spot in pyramid to add it
    let added = false;
    for (let row = gameState.pyramid.length - 1; row >= 0 && !added; row--) {
        for (let col = 0; col < gameState.pyramid[row].length && !added; col++) {
            if (gameState.pyramid[row][col].removed) {
                gameState.pyramid[row][col] = {
                    value: newCard,
                    row: row,
                    col: col,
                    removed: false,
                    available: false
                };
                added = true;
            }
        }
    }
    
    updateAvailability();
    renderPyramid();
    updateDeckCount();
    
    // Check if still have moves after drawing
    checkMovesAvailable();
}

function checkMovesAvailable() {
    if (!hasMovesAvailable() && gameState.deck.length === 0) {
        // No moves left - game over
        setTimeout(() => endGame(false, 'No more moves!'), 500);
    }
}

function updateDeckCount() {
    const deckPile = document.getElementById('deckPile');
    const deckCount = document.getElementById('deckCount');
    
    if (gameState.deck.length > 0) {
        deckPile.style.backgroundImage = `url('${CARD_BACK}')`;
        deckCount.textContent = gameState.deck.length;
    } else {
        deckPile.style.backgroundImage = 'none';
        deckPile.style.background = '#999';
        deckCount.textContent = '0';
    }
}

function updateStats() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('cardsLeft').textContent = countRemainingCards();
}

function countRemainingCards() {
    let count = 0;
    gameState.pyramid.forEach(row => {
        row.forEach(card => {
            if (!card.removed) count++;
        });
    });
    return count;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        
        const timerEl = document.getElementById('timer');
        timerEl.textContent = gameState.timeRemaining;
        
        if (gameState.timeRemaining <= 30) {
            timerEl.classList.add('warning');
        } else {
            timerEl.classList.remove('warning');
        }
        
        if (gameState.timeRemaining <= 0) {
            clearInterval(timerInterval);
            endGame(false, 'Time\'s up!');
        }
    }, 1000);
}

function checkWinCondition() {
    if (countRemainingCards() === 0) {
        // Level complete!
        clearInterval(timerInterval);
        setTimeout(() => showLevelComplete(), 500);
    }
}

function showLevelComplete() {
    const overlay = document.getElementById('messageOverlay');
    const box = document.getElementById('messageBox');
    const title = document.getElementById('messageTitle');
    const text = document.getElementById('messageText');
    
    title.textContent = `Level ${gameState.level} Complete!`;
    text.textContent = `Score: ${gameState.score}\nGet ready for Level ${gameState.level + 1}!`;
    box.className = 'message-box';
    
    overlay.classList.add('show');
}

function nextLevel() {
    document.getElementById('messageOverlay').classList.remove('show');
    
    gameState.level++;
    gameState.timeRemaining = getTimeForLevel(gameState.level);
    gameState.deck = createDeck();
    gameState.pyramid = setupPyramid();
    gameState.selected = [];
    gameState.combo = 0;
    // Bonus cards disappear between levels!
    gameState.bonusCards = [];
    
    updateAvailability();
    renderPyramid();
    renderBonusCards();
    updateDeckCount();
    updateStats();
    
    startTimer();
}

function endGame(won, message) {
    gameState.gameOver = true;
    clearInterval(timerInterval);
    
    const overlay = document.getElementById('messageOverlay');
    const box = document.getElementById('messageBox');
    const title = document.getElementById('messageTitle');
    const text = document.getElementById('messageText');
    const btn = box.querySelector('.btn');
    
    if (won) {
        title.textContent = '🎉 Amazing!';
        text.textContent = `Final Score: ${gameState.score}\nLevel: ${gameState.level}`;
        box.className = 'message-box';
    } else {
        title.textContent = '😔 Game Over';
        text.textContent = `${message}\nFinal Score: ${gameState.score}\nLevel: ${gameState.level}`;
        box.className = 'message-box game-over';
    }
    
    btn.textContent = 'Play Again';
    btn.onclick = resetGame;
    
    overlay.classList.add('show');
}

function showNotification(text, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = text;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 1500);
}

function resetGame() {
    document.getElementById('messageOverlay').classList.remove('show');
    initGame();
}

function initGame() {
    gameState = {
        deck: createDeck(),
        pyramid: [],
        selected: [],
        bonusCards: [],
        score: 0,
        level: 1,
        timeRemaining: 148,
        gameOver: false,
        combo: 0
    };
    
    gameState.pyramid = setupPyramid();
    updateAvailability();
    
    renderPyramid();
    renderBonusCards();
    updateDeckCount();
    updateStats();
    
    startTimer();
}

// Start game when page loads
window.addEventListener('load', () => {
    initGame();
});
