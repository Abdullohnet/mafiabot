import { type RoleId, ROLES, getRolesForPlayerCount } from "./roles.js";

export type Phase = "lobby" | "night" | "day" | "voting" | "ended";

export interface Player {
  userId: number;
  username: string;
  name: string;
  roleId: RoleId;
  alive: boolean;
  hasUsedSpecial: boolean;
}

export interface NightAction {
  actorId: number;
  targetId: number | null;
}

export interface Game {
  chatId: number;
  hostId: number;
  phase: Phase;
  round: number;
  players: Map<number, Player>;
  nightActions: Map<string, NightAction>;
  votes: Map<number, number>;
  dayMessage?: string;

  sukunaBypassUsed: boolean;
  aizenSwapUsed: boolean;
  lightNoteUsed: boolean;
  erwinShielded: boolean;
  rinDead: boolean;
  obitoAwakened: boolean;
  tomiokaDead: boolean;
  rengokuDead: boolean;
  tsunadeDead: boolean;

  nightTimer?: ReturnType<typeof setTimeout>;
  dayTimer?: ReturnType<typeof setTimeout>;
}

const games = new Map<number, Game>();

export function createGame(chatId: number, hostId: number): Game {
  const game: Game = {
    chatId, hostId,
    phase: "lobby",
    round: 0,
    players: new Map(),
    nightActions: new Map(),
    votes: new Map(),
    sukunaBypassUsed: false,
    aizenSwapUsed: false,
    lightNoteUsed: false,
    erwinShielded: true,
    rinDead: false,
    obitoAwakened: false,
    tomiokaDead: false,
    rengokuDead: false,
    tsunadeDead: false,
  };
  games.set(chatId, game);
  return game;
}

export function getGame(chatId: number): Game | undefined {
  return games.get(chatId);
}

export function deleteGame(chatId: number): void {
  const g = games.get(chatId);
  if (g?.nightTimer) clearTimeout(g.nightTimer);
  if (g?.dayTimer) clearTimeout(g.dayTimer);
  games.delete(chatId);
}

export function addPlayer(game: Game, userId: number, username: string, name: string): boolean {
  if (game.players.has(userId)) return false;
  game.players.set(userId, {
    userId, username, name,
    roleId: "marin",
    alive: true,
    hasUsedSpecial: false,
  });
  return true;
}

export function assignRoles(game: Game): void {
  const playerList = [...game.players.values()];
  const roleIds = getRolesForPlayerCount(playerList.length);

  const shuffled = [...roleIds].sort(() => Math.random() - 0.5);
  playerList.forEach((p, i) => {
    p.roleId = shuffled[i];
  });
}

export function getAlivePlayers(game: Game): Player[] {
  return [...game.players.values()].filter(p => p.alive);
}

export function getMafiaPlayers(game: Game): Player[] {
  return getAlivePlayers(game).filter(p => ROLES[p.roleId].faction === "mafia");
}

export function getTownPlayers(game: Game): Player[] {
  return getAlivePlayers(game).filter(p => ROLES[p.roleId].faction === "town");
}

export function getPlayerByUserId(game: Game, userId: number): Player | undefined {
  return game.players.get(userId);
}

export function getActiveDoctor(game: Game): Player | undefined {
  if (!game.tsunadeDead) {
    return [...game.players.values()].find(p => p.roleId === "tsunade" && p.alive);
  }
  return [...game.players.values()].find(p => p.roleId === "unahana" && p.alive);
}

export function getActiveDetective(game: Game): Player | undefined {
  if (!game.tomiokaDead) {
    return [...game.players.values()].find(p => p.roleId === "tomioka" && p.alive);
  }
  if (!game.rengokuDead) {
    return [...game.players.values()].find(p => p.roleId === "rengoku" && p.alive);
  }
  const erwin = [...game.players.values()].find(p => p.roleId === "erwin" && p.alive);
  if (erwin && game.tomiokaDead && game.rengokuDead) return erwin;
  return undefined;
}

export function checkWinCondition(game: Game): "mafia" | "town" | "obito" | null {
  const alive = getAlivePlayers(game);
  const mafiaAlive = alive.filter(p => ROLES[p.roleId].faction === "mafia").length;
  const townAlive = alive.filter(p =>
    ROLES[p.roleId].faction === "town" || ROLES[p.roleId].faction === "neutral"
  ).length;

  if (mafiaAlive === 0) return "town";
  if (mafiaAlive >= townAlive) return "mafia";

  if (game.obitoAwakened) {
    const obito = alive.find(p => p.roleId === "obito");
    if (obito && mafiaAlive === 0 && alive.length === 1) return "obito";
  }

  return null;
}

export function processVotes(game: Game): number | null {
  const tally = new Map<number, number>();
  for (const votedId of game.votes.values()) {
    tally.set(votedId, (tally.get(votedId) ?? 0) + 1);
  }
  let maxVotes = 0;
  let eliminated: number | null = null;
  let tied = false;
  for (const [userId, count] of tally) {
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = userId;
      tied = false;
    } else if (count === maxVotes) {
      tied = true;
    }
  }
  return tied ? null : eliminated;
}
