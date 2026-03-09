/**
 * Utility to generate creative, colorful commentary for auction events.
 */

const COMMENTARY_TEMPLATES = {
    playerUp: [
        "Next on the block: {name} from Pool {pool}! Base price {price} pts. Who's interested?",
        "Eyes on the stage! {name} ({pool}) is up for grabs at {price} pts!",
        "A potential game-changer: {name} entering the arena! Starting at {price} pts.",
        "Bidding starts now for {name}! A solid addition from Pool {pool} for {price} pts.",
        "The auctioneer calls for {name}! Starting bid: {price}. Let's see some action!"
    ],
    bidPlaced: [
        "{team} jumps in with {amount} pts!",
        "New leader! {team} raises the bar to {amount} pts.",
        "Bidding war alert! {team} takes it to {amount} pts.",
        "Challenge accepted! {team} bids {amount} pts.",
        "The stakes are rising! {team} now at {amount} pts.",
        "Quick reaction from {team}! They are in at {amount} pts."
    ],
    sold: [
        "SOLD! {player} joins {team} for {amount} pts! What a signing!",
        "🔨 The hammer falls! {player} is now part of {team} for {amount} pts.",
        "DEAL DONE! {team} secures {player} for {amount} pts. Great strategy!",
        "Winning bid: {amount}! {player} is heading to {team}!",
        "Absolute steal? {player} sold to {team} for {amount} pts!"
    ],
    unsold: [
        "Silence in the room... {player} goes unsold. A missed opportunity?",
        "No takers for {player}. They'll have to wait for another chance.",
        "Unsold! {player} remains on the table. Unexpected!",
        "The auctioneer moves on. {player} remains pending."
    ],
    paused: [
        "Auction paused. Time for teams to rethink their strategies!",
        "Tactical timeout! The auction is currently on hold.",
        "Break time! Use this pause to check your budgets."
    ],
    resumed: [
        "And we're back! The auction resumes.",
        "Timer is running again! Let's get back to the action.",
        "Auction live! No more waiting."
    ],
    manualSale: [
        "Direct deal! {player} sold to {team} via manual sale for {amount} pts.",
        "Behind the scenes action: {player} signed by {team} for {amount} pts.",
        "MANUAL SALE: {player} joins {team} at {amount} pts."
    ]
};

function getRandomTemplate(type) {
    const templates = COMMENTARY_TEMPLATES[type] || ["Event: {type}"];
    return templates[Math.floor(Math.random() * templates.length)];
}

function generateCommentary(type, data) {
    let template = getRandomTemplate(type);

    // Replace placeholders
    const replacements = {
        name: data.playerName || data.name || "Player",
        player: data.playerName || data.name || "Player",
        pool: data.pool || "?",
        price: (data.price || data.basePrice || 0).toLocaleString(),
        amount: (data.amount || data.saleAmount || 0).toLocaleString(),
        team: data.teamName || data.teamId || "A Team",
        type: type
    };

    Object.entries(replacements).forEach(([key, val]) => {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    });

    return {
        id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        message: template,
        timestamp: Date.now(),
        data: { ...data } // Keep original data for UI if needed
    };
}

module.exports = { generateCommentary };
