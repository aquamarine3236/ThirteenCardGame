// src/moves/cardAreaMoves.js
import { compareCards } from "./helper-functions/cardComparison";
import { INVALID_MOVE } from "boardgame.io/core";
import { isCard } from "../rules";
import { unpackMove } from "./moveContext";

export function relocateCards(contextOrG, legacyContext, ...legacyArgs) {
  const { G, ctx, args } = unpackMove(
    contextOrG,
    legacyContext,
    ...legacyArgs
  );
  const [result, destination] = args;
  const playerID =
    ctx.playerID === undefined ? ctx.currentPlayer : ctx.playerID;
  const player = G.players[playerID];
  if (
    G.pendingThreePairLeadPlayer ||
    !player ||
    !Array.isArray(player.hand) ||
    !Array.isArray(player.stagingArea)
  ) {
    return INVALID_MOVE;
  }

  if (Array.isArray(result)) {
    if (!["hand", "stagingArea"].includes(destination) || result.some(card => !isCard(card))) {
      return INVALID_MOVE;
    }

    const source = destination === "hand" ? "stagingArea" : "hand";
    const sourceItems = player[source].slice();
    const destinationItems = player[destination].slice();
    const moved = [];
    for (const card of result) {
      const index = sourceItems.findIndex(
        item => item.rank === card.rank && item.suit === card.suit
      );
      if (index === -1) return INVALID_MOVE;
      moved.push(sourceItems.splice(index, 1)[0]);
    }
    player[source] = sourceItems;
    player[destination] = destinationItems.concat(moved);
    return;
  }

  if (
    !result ||
    !result.source ||
    !result.destination ||
    !Number.isInteger(result.source.index) ||
    !Number.isInteger(result.destination.index)
  ) {
    return result && result.destination === null ? undefined : INVALID_MOVE;
  }

  const source = result.source.droppableId;
  const target = result.destination.droppableId;
  if (!["hand", "stagingArea"].includes(source) || !["hand", "stagingArea"].includes(target)) {
    return INVALID_MOVE;
  }
  const sourceItems = player[source].slice();
  const targetItems = source === target ? sourceItems : player[target].slice();
  const sourceIndex = result.source.index;
  const destinationIndex = result.destination.index;
  if (
    sourceIndex < 0 ||
    sourceIndex >= sourceItems.length ||
    destinationIndex < 0 ||
    destinationIndex > targetItems.length - (source === target ? 1 : 0)
  ) {
    return INVALID_MOVE;
  }

  if (source === target) {
    const [reorderedItem] = sourceItems.splice(sourceIndex, 1);
    sourceItems.splice(destinationIndex, 0, reorderedItem);
    player[source] = sourceItems;
  } else {
    const [reorderedItem] = sourceItems.splice(sourceIndex, 1);
    targetItems.splice(destinationIndex, 0, reorderedItem);
    player[source] = sourceItems;
    player[target] = targetItems;
  }
}

export function clearStagingArea(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  const playerID =
    ctx.playerID === undefined ? ctx.currentPlayer : ctx.playerID;
  const player = G.players[playerID];
  if (G.pendingThreePairLeadPlayer || !player) return INVALID_MOVE;
  player.hand = player.hand.concat(player.stagingArea);
  player.stagingArea = [];
}

export function sortStagingArea(contextOrG, legacyContext) {
  const { G, ctx } = unpackMove(contextOrG, legacyContext);
  const playerID =
    ctx.playerID === undefined ? ctx.currentPlayer : ctx.playerID;
  const player = G.players[playerID];
  if (G.pendingThreePairLeadPlayer || !player) return INVALID_MOVE;
  player.stagingArea.sort(compareCards);
}
