"use server";

import { query } from '@/lib/db';

let cachedXpTable: number[] | null = null;

export async function fetchXpTable(): Promise<number[]> {
  const result = await query(
    'SELECT level, xp FROM xp_levels ORDER BY level ASC'
  );
  
  return result.rows.map(row => row.xp);
}

export async function getXpTable(): Promise<number[]> {
  if (!cachedXpTable) {
    cachedXpTable = await fetchXpTable();
  }
  return cachedXpTable;
}

export type XPInfo = {
  level: number;          // Current level (1-based)
  currentXP: number;      // XP progress within current level
  xpForNextLevel: number; // XP needed to complete current level and reach next
  totalXP: number;        // Total accumulated XP
  levelStartXP: number;   // XP threshold for current level
  levelEndXP: number;     // XP threshold for next level
};

function calculateLevelFromXp(totalXP: number, xpTable: number[]): XPInfo {
  if (totalXP < 0) {
    return {
      level: 1,
      currentXP: 0,
      xpForNextLevel: xpTable[1] || 200,
      totalXP: 0,
      levelStartXP: 0,
      levelEndXP: xpTable[1] || 200,
    };
  }

  let level = 1;
  for (let i = xpTable.length - 1; i >= 0; i--) {
    if (totalXP >= xpTable[i]) {
      level = i + 1;
      break;
    }
  }

  const levelStartXP = xpTable[level - 1];
  const levelEndXP = level < xpTable.length ? xpTable[level] : levelStartXP + 1000; // If max level, add arbitrary amount
  const currentXP = totalXP - levelStartXP;
  const xpForNextLevel = levelEndXP - levelStartXP;

  return {
    level,
    currentXP,
    xpForNextLevel,
    totalXP,
    levelStartXP,
    levelEndXP,
  };
}

export async function getLevelFromXp(totalXP: number): Promise<XPInfo> {
  const xpTable = await getXpTable();
  return calculateLevelFromXp(totalXP, xpTable);
}
