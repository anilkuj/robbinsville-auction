export function getAvgPointsKey(players) {
    if (!players || players.length === 0) return null;
    const allKeys = new Set();
    for (let i = 0; i < players.length; i++) {
        const p = players[i];
        if (p.extra) {
            const keys = Object.keys(p.extra);
            for (let j = 0; j < keys.length; j++) {
                allKeys.add(keys[j]);
            }
        }
        if (allKeys.size > 10) break; // Optimization, assume keys are consistent
    }
    const keys = Array.from(allKeys);
    return keys.find(k => k.toLowerCase() === 'average points')
        || keys.find(k => k.toLowerCase() === 'average_points')
        || keys.find(k => k.toLowerCase().includes('average') && k.toLowerCase().includes('point'))
        || keys.find(k => k.toLowerCase().includes('average'))
        || keys.find(k => k.toLowerCase().includes('points'))
        || null;
}

export function sortPlayersByPoints(playersArray, avgPtsKey) {
    if (!playersArray) return [];
    return [...playersArray].sort((a, b) => {
        if (avgPtsKey) {
            const aPts = parseFloat(a.extra?.[avgPtsKey]) || 0;
            const bPts = parseFloat(b.extra?.[avgPtsKey]) || 0;
            if (aPts !== bPts) return bPts - aPts; // Descending
        }
        const aOrder = a.sortOrder !== undefined ? a.sortOrder : 0;
        const bOrder = b.sortOrder !== undefined ? b.sortOrder : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
    });
}
