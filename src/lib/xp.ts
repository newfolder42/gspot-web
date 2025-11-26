export const xpTable = [
    400,  // Level 2
    900,  // Level 3
    1400, // Level 4
    2100, // Level 5
    2800, // Level 6
    3600, // Level 7
    4500, // Level 8
    5400, // Level 9
    6500, // Level 10
    // ... up to 60
];

export function getLevelFromXp(xp: number): { level: number; xp: number } {
    if (xp < 0) return {
        level: 0,
        xp: 0
    };
    let xpLeft = xp;
    for (let i = xpTable.length - 1; i >= 0; i--) {
        if (xp >= xpTable[i]) return {
            level: i + 1,
            xp: xpLeft
        };
        xpLeft -= xpTable[i];
    }

    return {
        level: 0,
        xp: xp
    };
}