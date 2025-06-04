document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const playerHandArea = document.getElementById('player-hand-area');
    const jokerArea = document.getElementById('joker-area');
    const deckCountEl = document.getElementById('deck-count');
    const discardCountEl = document.getElementById('discard-count');
    const blindNameEl = document.getElementById('blind-name');
    const scoreNeededEl = document.getElementById('score-needed');
    const currentScoreEl = document.getElementById('current-score');
    const handsLeftEl = document.getElementById('hands-left');
    const discardsLeftEl = document.getElementById('discards-left');
    const moneyEl = document.getElementById('money');
    const playHandButton = document.getElementById('play-hand-button');
    const discardButton = document.getElementById('discard-button');
    const nextActionButton = document.getElementById('next-action-button');
    const gameMessageEl = document.getElementById('game-message');
    const shopContainer = document.getElementById('shop-container');
    const shopItemsEl = document.getElementById('shop-items');
    const exitShopButton = document.getElementById('exit-shop-button');
    const contrastToggle = document.getElementById('toggle-contrast');
    const motionToggle = document.getElementById('toggle-motion');
    const speedRange = document.getElementById('speed-range');
    const speedValue = document.getElementById('speed-value');

    // --- Game Constants ---
    const SUITS = ['♥', '♦', '♣', '♠']; // Hearts, Diamonds, Clubs, Spades
    const RANKS = [
        { rank: '2', value: 2, rankValue: 2 }, { rank: '3', value: 3, rankValue: 3 },
        { rank: '4', value: 4, rankValue: 4 }, { rank: '5', value: 5, rankValue: 5 },
        { rank: '6', value: 6, rankValue: 6 }, { rank: '7', value: 7, rankValue: 7 },
        { rank: '8', value: 8, rankValue: 8 }, { rank: '9', value: 9, rankValue: 9 },
        { rank: 'T', value: 10, rankValue: 10 }, { rank: 'J', value: 10, rankValue: 11 },
        { rank: 'Q', value: 10, rankValue: 12 }, { rank: 'K', value: 10, rankValue: 13 },
        { rank: 'A', value: 11, rankValue: 14 } // Ace high for straights, value 11 for chips
    ];
    const HAND_SIZE = 8;
    const MAX_SELECTED_CARDS = 5;
    const MAX_JOKERS = 5;

    const LEVEL_UP_CHIP_BONUS = 10;
    const LEVEL_UP_MULT_BONUS = 2;
    const MAX_HAND_LEVEL = 10;
    const PLANET_PACK_COST = 7;

    const JOKER_CATALOG = [
        {
            id: 'joker_plus_mult',
            name: 'Joker Stencil',
            description: '+1 Mult for each Joker slot occupied (this counts itself).',
            cost: 6,
            applyEffect: (playedCards, handDetails, currentJokers) => {
                return { chips: 0, mult: currentJokers.length };
            }
        },
        {
            id: 'joker_hearts_chips',
            name: 'Greedy Joker',
            description: '+20 Chips if played hand contains at least 2 Hearts.',
            cost: 5,
            applyEffect: (playedCards, handDetails) => {
                const heartCount = playedCards.filter(card => card.suit === '♥').length;
                return { chips: heartCount >= 2 ? 20 : 0, mult: 0 };
            }
        },
        {
            id: 'joker_pair_mult',
            name: 'Droll Joker',
            description: '+3 Mult if played hand is a Pair.',
            cost: 4,
            applyEffect: (playedCards, handDetails) => {
                return { chips: 0, mult: handDetails.handName === 'Pair' ? 3 : 0 };
            }
        },
        {
            id: 'joker_ace_chips',
            name: 'Sly Joker',
            description: '+15 Chips if an Ace is in the played hand.',
            cost: 4,
            applyEffect: (playedCards, handDetails) => {
                const hasAce = playedCards.some(card => card.rank === 'A');
                return { chips: hasAce ? 15 : 0, mult: 0 };
            }
        }
    ];

    // --- Game State Variables ---
    let deck = [];
    let playerHand = [];
    let discardPile = [];
    let selectedCards = [];
    let jokers = []; // Array of joker objects

    let money = 0;
    let currentScore = 0;
    let scoreNeeded = 300;
    let handsLeft = 4;
    let discardsLeft = 3;

    let currentBlindIndex = 0;
    const blinds = [
        { name: "Small Blind", score: 300, hands: 4, discards: 3, reward: 5 },
        { name: "Big Blind", score: 600, hands: 4, discards: 3, reward: 8 },
        { name: "Boss Blind (Easy)", score: 1000, hands: 3, discards: 2, reward: 10 } // Simplified boss
    ];

    const HAND_SCORES = {
        'High Card': { chips: 5, mult: 1, level: 0, baseChips: 5, baseMult: 1 },
        'Pair': { chips: 10, mult: 2, level: 0, baseChips: 10, baseMult: 2 },
        'Two Pair': { chips: 20, mult: 3, level: 0, baseChips: 20, baseMult: 3 },
        'Three of a Kind': { chips: 30, mult: 4, level: 0, baseChips: 30, baseMult: 4 },
        'Straight': { chips: 40, mult: 5, level: 0, baseChips: 40, baseMult: 5 },
        'Flush': { chips: 50, mult: 6, level: 0, baseChips: 50, baseMult: 6 },
        'Full House': { chips: 60, mult: 7, level: 0, baseChips: 60, baseMult: 7 },
        'Four of a Kind': { chips: 80, mult: 8, level: 0, baseChips: 80, baseMult: 8 },
        'Straight Flush': { chips: 100, mult: 10, level: 0, baseChips: 100, baseMult: 10 },
    };


    // --- Card and Deck Functions ---
    function createCard(suit, rankObj) {
        return {
            suit: suit,
            rank: rankObj.rank,
            value: rankObj.value, // Base value for chip calculation
            id: rankObj.rank + suit, // Unique ID for the card
            display: rankObj.rank + suit
        };
    }

    function createDeck() {
        const newDeck = [];
        for (const suit of SUITS) {
            for (const rankObj of RANKS) {
                newDeck.push(createCard(suit, rankObj));
            }
        }
        return newDeck;
    }

    function shuffleDeck(deckToShuffle) {
        for (let i = deckToShuffle.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
        }
    }

    function dealCard() {
        if (deck.length === 0) {
            if (discardPile.length === 0) {
                gameMessageEl.textContent = "No cards left in deck or discard!";
                return null; // Should not happen in normal play if hands are limited
            }
            // Reshuffle discard pile into deck
            deck = [...discardPile];
            discardPile = [];
            shuffleDeck(deck);
            gameMessageEl.textContent = "Reshuffled discard pile into deck.";
        }
        return deck.pop();
    }

    function drawCardsToFillHand() {
        while (playerHand.length < HAND_SIZE && (deck.length > 0 || discardPile.length > 0) ) { // check discardPile too
            const card = dealCard();
            if (card) {
                playerHand.push(card);
            } else {
                break; // No more cards to deal
            }
        }
    }

    // --- UI Rendering Functions ---
    function renderPlayerHand() {
        playerHandArea.innerHTML = '';
        playerHand.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.classList.add('card');
            // Add suit-specific classes for potential styling
            if (card.suit === '♥' || card.suit === '♦') {
                cardEl.classList.add('suit-red');
            } else {
                cardEl.classList.add('suit-black');
            }

            const rankEl = document.createElement('span');
            rankEl.classList.add('rank');
            rankEl.textContent = card.rank;

            const suitEl = document.createElement('span');
            suitEl.classList.add('suit');
            suitEl.textContent = card.suit;

            if (card.suit === '♥' || card.suit === '♦') {
                suitEl.style.color = 'red';
            } else {
                suitEl.style.color = 'black';
            }


            cardEl.appendChild(rankEl);
            cardEl.appendChild(suitEl);

            cardEl.dataset.cardId = card.id; // Store card id for selection logic

            if (selectedCards.find(sc => sc.id === card.id)) {
                cardEl.classList.add('selected-card');
            }

            cardEl.addEventListener('click', () => toggleCardSelection(cardEl, card));
            playerHandArea.appendChild(cardEl);
        });
    }

    function renderGameStats() {
        const currentBlind = blinds[currentBlindIndex];
        blindNameEl.textContent = currentBlind.name;
        scoreNeededEl.textContent = currentBlind.score;
        scoreNeeded = currentBlind.score; // Update game state variable

        currentScoreEl.textContent = currentScore;
        handsLeftEl.textContent = handsLeft;
        discardsLeftEl.textContent = discardsLeft;
        moneyEl.textContent = money;
        deckCountEl.textContent = deck.length;
        discardCountEl.textContent = discardPile.length;
    }

    function updateGameMessage(message, isError = false) {
        gameMessageEl.textContent = message;
        gameMessageEl.style.color = isError ? 'red' : '#f0f0f0';
    }

    // --- Card Selection ---
    function toggleCardSelection(cardElement, cardObject) {
        const index = selectedCards.findIndex(sc => sc.id === cardObject.id);
        if (index > -1) {
            selectedCards.splice(index, 1);
            cardElement.classList.remove('selected-card');
        } else {
            if (selectedCards.length < MAX_SELECTED_CARDS) {
                selectedCards.push(cardObject);
                cardElement.classList.add('selected-card');
            } else {
                updateGameMessage(`You can only select up to ${MAX_SELECTED_CARDS} cards.`, true);
            }
        }
    }

    function clearSelectedCards() {
        selectedCards = [];
        // Remove 'selected-card' class from all card elements in hand
        const handCardElements = playerHandArea.querySelectorAll('.card');
        handCardElements.forEach(el => el.classList.remove('selected-card'));
    }


    // --- Game Flow & Actions ---
    function initializeBlind(blindConfig) {
        currentScore = 0;
        // scoreNeeded = blindConfig.score; // This is already set in renderGameStats
        handsLeft = blindConfig.hands;
        discardsLeft = blindConfig.discards;
        updateGameMessage(`Playing ${blindConfig.name}. Score ${blindConfig.score} to win.`);

        playHandButton.disabled = false;
        discardButton.disabled = discardsLeft <= 0; // Disable if no discards from start
        nextActionButton.style.display = 'none';
    }

    function getRankValue(rank) {
        const rankObj = RANKS.find(r => r.rank === rank);
        return rankObj ? rankObj.rankValue : 0;
    }

    function getCardChipValue(rank) {
        const rankObj = RANKS.find(r => r.rank === rank);
        return rankObj ? rankObj.value : 0;
    }


    function evaluatePokerHand(hand) { // hand is an array of selected card objects
        let identifiedHandName = 'High Card'; // Default to High Card
        let calculatedChips = 0;
        let calculatedMult = 1;
        let currentLevel = 0;

        if (!hand || hand.length === 0 || hand.length > 5) {
            if (hand && hand.length > 0) {
                let highCardBaseScore = 0;
                hand.forEach(card => highCardBaseScore += getCardChipValue(card.rank));
                calculatedChips = Math.round(highCardBaseScore / hand.length) + (HAND_SCORES['High Card'].baseChips || 5);
                calculatedMult = HAND_SCORES['High Card'].baseMult || 1;
            } else {
                calculatedChips = HAND_SCORES['High Card'].baseChips || 5;
                calculatedMult = HAND_SCORES['High Card'].baseMult || 1;
            }
            currentLevel = HAND_SCORES['High Card'].level || 0;
            // High Card currently doesn't benefit from LEVEL_UP_CHIP_BONUS/MULT_BONUS in this setup.
            return { handName: identifiedHandName, chips: calculatedChips, mult: calculatedMult, level: currentLevel };
        }

        const rankCounts = {};
        const suitCounts = {};
        let ranks = [];
        // let suits = []; // Not directly used but good for debugging

        hand.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
            suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
            ranks.push(getRankValue(card.rank));
            // suits.push(card.suit);
        });

        ranks.sort((a, b) => a - b);

        const isFlushDetected = Object.values(suitCounts).some(count => count === hand.length) && hand.length === 5;
        let isStraightDetected = false;
        if (hand.length === 5) {
            let uniqueSortedRanks = [...new Set(ranks)].sort((a,b) => a - b);
            if (uniqueSortedRanks.length === 5) {
                isStraightDetected = (uniqueSortedRanks[4] - uniqueSortedRanks[0] === 4);
                if (!isStraightDetected && uniqueSortedRanks[0] === 2 && uniqueSortedRanks[1] === 3 && uniqueSortedRanks[2] === 4 && uniqueSortedRanks[3] === 5 && uniqueSortedRanks[4] === 14) {
                    isStraightDetected = true;
                }
            }
        }

        const counts = Object.values(rankCounts);
        if (isStraightDetected && isFlushDetected) identifiedHandName = 'Straight Flush';
        else if (counts.includes(4) && hand.length >= 4) identifiedHandName = 'Four of a Kind';
        else if (counts.includes(3) && counts.includes(2) && hand.length === 5) identifiedHandName = 'Full House';
        else if (isFlushDetected) identifiedHandName = 'Flush';
        else if (isStraightDetected) identifiedHandName = 'Straight';
        else if (counts.includes(3) && hand.length >= 3) identifiedHandName = 'Three of a Kind';
        else if (counts.filter(count => count === 2).length === 2 && hand.length >= 4) identifiedHandName = 'Two Pair';
        else if (counts.filter(count => count === 2).length === 1 && hand.length >= 2) identifiedHandName = 'Pair';
        // Default is 'High Card'

        let handTypeDetails = HAND_SCORES[identifiedHandName];
        currentLevel = handTypeDetails.level || 0;

        if (identifiedHandName === 'High Card') {
            let highCardBaseScore = 0;
            hand.forEach(card => highCardBaseScore += getCardChipValue(card.rank));
            // High Card does not benefit from level up bonuses in this implementation.
            calculatedChips = Math.round(highCardBaseScore / hand.length) + handTypeDetails.baseChips;
            calculatedMult = handTypeDetails.baseMult;
        } else {
            calculatedChips = handTypeDetails.baseChips + (currentLevel * LEVEL_UP_CHIP_BONUS);
            calculatedMult = handTypeDetails.baseMult + (currentLevel * LEVEL_UP_MULT_BONUS);
        }

        return { handName: identifiedHandName, chips: calculatedChips, mult: calculatedMult, level: currentLevel };
    }

    function handlePlayHand() {
        console.log("Play Hand button clicked with cards:", selectedCards);
        if (handsLeft <= 0) {
            updateGameMessage("No hands left to play.", true);
            return;
        }
        if (selectedCards.length === 0) {
            updateGameMessage("Select some cards to play a hand.", true);
            return;
        }
        // Max selected cards is already handled by toggleCardSelection

        const handResult = evaluatePokerHand(selectedCards);
        // baseChips and baseMult now effectively include hand level bonuses from evaluatePokerHand
        let baseChips = handResult.chips;
        let baseMult = handResult.mult;

        let jokerChips = 0;
        let jokerMult = 0;

        // Apply Joker Effects
        jokers.forEach(jokerInstance => { // Assuming 'jokers' is the array of player's active jokers
            if (jokerInstance && typeof jokerInstance.applyEffect === 'function') {
                const effect = jokerInstance.applyEffect(selectedCards, handResult, jokers); // Pass selectedCards, handResult, and all current jokers
                jokerChips += effect.chips || 0;
                jokerMult += effect.mult || 0;
            }
        });

        const totalChips = baseChips + jokerChips;
        const totalMult = baseMult + jokerMult;
        const finalMult = totalMult <= 0 ? 1 : totalMult;
        const totalScoreThisHand = totalChips * finalMult;

        currentScore += totalScoreThisHand;
        updateGameMessage(`Played ${handResult.handName} (Lvl ${handResult.level || 0})! Score: ${totalScoreThisHand} (Chips: ${totalChips} x Mult: ${finalMult}) (Joker Chips: ${jokerChips}, Joker Mult: ${jokerMult})`);

        playerHand = playerHand.filter(cardInHand => !selectedCards.find(sc => sc.id === cardInHand.id));
        discardPile.push(...selectedCards);

        clearSelectedCards();
        drawCardsToFillHand();
        renderPlayerHand();

        handsLeft--;
        checkBlindEnd();
        renderGameStats();
    }

    function handleDiscard() {
        console.log("Discard button clicked with cards:", selectedCards);
        if (discardsLeft <= 0) {
            updateGameMessage("No discards left for this blind.", true);
            return;
        }
        if (selectedCards.length === 0) {
            updateGameMessage("Select cards to discard.", true);
            return;
        }
        // Balatro allows discarding 1 to 5 cards.
        if (selectedCards.length > MAX_SELECTED_CARDS) {
            updateGameMessage(`You can only discard up to ${MAX_SELECTED_CARDS} cards.`, true);
            return;
        }

        playerHand = playerHand.filter(cardInHand => !selectedCards.find(sc => sc.id === cardInHand.id));
        discardPile.push(...selectedCards);

        updateGameMessage(`Discarded ${selectedCards.length} card(s).`);
        clearSelectedCards();
        drawCardsToFillHand();
        renderPlayerHand();

        discardsLeft--;
        renderGameStats();
        if (discardsLeft <= 0) {
            discardButton.disabled = true;
        }
    }

    function checkBlindEnd() {
        const currentBlind = blinds[currentBlindIndex];
        if (currentScore >= currentBlind.score) {
            money += currentBlind.reward;
            updateGameMessage(`Blind "${currentBlind.name}" cleared! You earned $${currentBlind.reward}.`, false);
            playHandButton.disabled = true;
            discardButton.disabled = true;
            nextActionButton.textContent = "Go to Shop";
            nextActionButton.style.display = 'inline-block';
            nextActionButton.onclick = enterShop;
            return;
        }

        if (handsLeft <= 0) {
            updateGameMessage(`Game Over! Ran out of hands. Final score: ${currentScore} (Needed: ${currentBlind.score})`, true);
            playHandButton.disabled = true;
            discardButton.disabled = true;
            nextActionButton.textContent = "Restart Game";
            nextActionButton.style.display = 'inline-block';
            nextActionButton.onclick = startGame; // Restart the whole game sequence
            return;
        }

        // Update button states based on remaining hands/discards
        playHandButton.disabled = handsLeft <= 0;
        discardButton.disabled = discardsLeft <= 0;
    }

    function enterShop() {
        updateGameMessage("Welcome to the Shop!");
        shopContainer.style.display = 'block';
        nextActionButton.style.display = 'none';
        renderShop();
    }

    function exitShop() {
        shopContainer.style.display = 'none';
        currentBlindIndex++;
        if (currentBlindIndex >= blinds.length) {
            updateGameMessage("Congratulations! You've beaten all blinds!", false);
            playHandButton.disabled = true;
            discardButton.disabled = true;
            nextActionButton.textContent = "Play Again?";
            nextActionButton.style.display = 'inline-block';
            nextActionButton.onclick = startGame; // Restart the whole game sequence
        } else {
            initializeBlind(blinds[currentBlindIndex]);
            // Deck should persist between blinds unless a specific rule says otherwise
            // playerHand = []; // Clear hand from previous blind
            // shuffleDeck(deck); // Optional: reshuffle before new blind, or continue with current deck state
            drawCardsToFillHand();
            renderPlayerHand();
            renderGameStats();
        }
    }

    // --- Shop Logic (Structured Jokers & Planet Packs) ---

    function renderShop() {
        shopItemsEl.innerHTML = ''; // Clear previous items

        // Offer Jokers
        let offeredJokers = [];
        const availableJokersFromCatalog = JOKER_CATALOG.filter(catJoker => !jokers.some(ownedJoker => ownedJoker.id === catJoker.id));
        const shuffledJokers = [...availableJokersFromCatalog].sort(() => 0.5 - Math.random());
        // Offer fewer jokers to make space for planet packs more often
        offeredJokers = shuffledJokers.slice(0, Math.min(2, shuffledJokers.length));

        if (offeredJokers.length === 0 && availableJokersFromCatalog.length > 0 && Math.random() < 0.75) {
             offeredJokers.push(availableJokersFromCatalog[Math.floor(Math.random() * availableJokersFromCatalog.length)]);
        }

        offeredJokers.forEach(jokerToSell => {
            const itemEl = document.createElement('div');
            itemEl.classList.add('shop-item'); // Use existing .shop-item styling
            itemEl.innerHTML = `
                <h4>${jokerToSell.name}</h4>
                <p>${jokerToSell.description}</p>
                <p class="item-cost">Cost: $${jokerToSell.cost}</p>
            `;
            // Pass the actual joker object from catalog to buyItem
            itemEl.addEventListener('click', () => buyItem(jokerToSell));
            shopItemsEl.appendChild(itemEl);
        });

        // Offer Planet Pack
        const allHandsMaxLevel = Object.values(HAND_SCORES).every(h => h.handName === 'High Card' || (h.level || 0) >= MAX_HAND_LEVEL);
        if (!allHandsMaxLevel && (offeredJokers.length < 2 || Math.random() < 0.6) ) { // Good chance if few jokers or general random chance
            const planetPackItemData = {
                id: 'planet_pack',
                name: 'Planet Pack',
                description: 'Level up a random poker hand, increasing its base Chips & Mult.',
                cost: PLANET_PACK_COST
            };
            const itemEl = document.createElement('div');
            itemEl.classList.add('shop-item');
            itemEl.innerHTML = `
                <h4>${planetPackItemData.name}</h4>
                <p>${planetPackItemData.description}</p>
                <p class="item-cost">Cost: $${planetPackItemData.cost}</p>
            `;
            itemEl.addEventListener('click', () => buyItem(planetPackItemData));
            shopItemsEl.appendChild(itemEl);
        }

        if (shopItemsEl.innerHTML === '') {
             shopItemsEl.innerHTML = '<p>Shop is currently empty. Check back next round!</p>';
        }
    }

    function buyItem(itemToBuy) {
        if (itemToBuy.id === 'planet_pack') {
            if (money >= itemToBuy.cost) {
                money -= itemToBuy.cost;
                applyPlanetPack();
                // applyPlanetPack shows its own message, then we show bought message.
                updateGameMessage(`Bought ${itemToBuy.name}!`);
                renderGameStats();
                renderShop();
            } else {
                updateGameMessage("Not enough money for Planet Pack!", true);
            }
            return;
        }

        // Existing Joker buying logic
        if (itemToBuy.cost === undefined) {
            updateGameMessage("This item cannot be purchased (no cost defined).", true);
            return;
        }

        if (JOKER_CATALOG.some(j => j.id === itemToBuy.id)) {
            if (jokers.length >= MAX_JOKERS) {
                updateGameMessage("You have no more Joker slots!", true);
                return;
            }
            if (jokers.some(ownedJoker => ownedJoker.id === itemToBuy.id)) {
                 updateGameMessage("You already own this Joker!", true);
                 return;
            }
        }

        if (money >= itemToBuy.cost) {
            money -= itemToBuy.cost;
            if (JOKER_CATALOG.some(j => j.id === itemToBuy.id)) {
                 const newJokerInstance = JSON.parse(JSON.stringify(itemToBuy));
                 jokers.push(newJokerInstance);
                 renderJokers();
            }
            updateGameMessage(`Bought ${itemToBuy.name}!`);
            renderGameStats();
            renderShop();
        } else {
            updateGameMessage("Not enough money!", true);
        }
    }

    function applyPlanetPack() {
        const upgradableHands = Object.keys(HAND_SCORES).filter(handName => {
            return handName !== 'High Card' && (HAND_SCORES[handName].level || 0) < MAX_HAND_LEVEL;
        });

        if (upgradableHands.length === 0) {
            updateGameMessage("All eligible poker hands are already max level! +$${Math.floor(PLANET_PACK_COST / 2)} back.", false);
            money += Math.floor(PLANET_PACK_COST / 2);
            // renderGameStats will be called by buyItem after this
            return;
        }

        const randomHandName = upgradableHands[Math.floor(Math.random() * upgradableHands.length)];
        HAND_SCORES[randomHandName].level = (HAND_SCORES[randomHandName].level || 0) + 1;

        // This message might be briefly overridden by "Bought Planet Pack!" from buyItem.
        // Consider a small timeout or appending messages if needed, but for now, this is fine.
        updateGameMessage(`${randomHandName} leveled up to Level ${HAND_SCORES[randomHandName].level}! Base chips/mult increased.`, false);
    }

    function renderJokers() {
        jokerArea.innerHTML = '';
        if (jokers.length === 0) {
            jokerArea.innerHTML = '<p style="font-style: italic; color: #888;">No Jokers</p>';
            return;
        }
        jokers.forEach(joker => {
            const jokerEl = document.createElement('div');
            jokerEl.classList.add('joker-card');
            jokerEl.style.border = "1px solid gold";
            jokerEl.style.padding = "5px";
            jokerEl.style.margin = "5px";
            jokerEl.style.backgroundColor = "#444"; // Darker background for joker cards
            jokerEl.style.borderRadius = "4px";
            jokerEl.style.fontSize = "0.8em";
            jokerEl.style.width = "120px";
            jokerEl.style.height = "auto"; // Adjust height based on content
            jokerEl.style.display = "flex";
            jokerEl.style.flexDirection = "column";
            jokerEl.style.justifyContent = "space-between";


            const nameEl = document.createElement('h5');
            nameEl.textContent = joker.name;
            nameEl.style.margin = "0 0 5px 0";
            nameEl.style.color = "gold";
            nameEl.style.fontSize = "0.9em";


            const descEl = document.createElement('p');
            descEl.textContent = joker.description;
            descEl.style.margin = "0";
            descEl.style.fontSize = "0.85em";

            jokerEl.appendChild(nameEl);
            jokerEl.appendChild(descEl);
            jokerArea.appendChild(jokerEl);
        });
    }

    // --- Initial Game Setup ---
    function startGame() {
        deck = createDeck();
        shuffleDeck(deck);
        playerHand = [];
        discardPile = [];
        selectedCards = [];
        jokers = [];

        // Reset hand levels
        for (const handName in HAND_SCORES) {
            if (HAND_SCORES.hasOwnProperty(handName)) {
                HAND_SCORES[handName].level = 0;
            }
        }

        currentBlindIndex = 0;
        money = 10; // Start with some money for the first shop

        initializeBlind(blinds[currentBlindIndex]);

        drawCardsToFillHand();
        renderPlayerHand();
        renderGameStats(); // This will use the initialized blind values
        renderJokers();
        updateGameMessage(`Game started! Playing ${blinds[currentBlindIndex].name}.`);

        shopContainer.style.display = 'none';
        playHandButton.style.display = 'inline-block';
        discardButton.style.display = 'inline-block';
        nextActionButton.style.display = 'none';

        speedValue.textContent = speedRange.value + 'x';
        document.documentElement.style.setProperty('--speed-mult', speedRange.value);
    }

    // --- Event Listeners ---
    playHandButton.addEventListener('click', handlePlayHand);
    discardButton.addEventListener('click', handleDiscard);
    exitShopButton.addEventListener('click', exitShop);
    contrastToggle.addEventListener('change', () => {
        document.body.classList.toggle('high-contrast', contrastToggle.checked);
    });
    motionToggle.addEventListener('change', () => {
        document.body.classList.toggle('reduce-motion', motionToggle.checked);
    });
    speedRange.addEventListener('input', () => {
        const val = speedRange.value;
        speedValue.textContent = val + 'x';
        document.documentElement.style.setProperty('--speed-mult', val);
    });
    // nextActionButton's click is set dynamically based on game state

    // --- Start the game ---
    startGame();
});
