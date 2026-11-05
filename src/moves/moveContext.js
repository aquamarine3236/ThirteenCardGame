export function unpackMove(contextOrG, legacyContext, ...legacyArgs) {
  if (
    contextOrG &&
    contextOrG.G !== undefined &&
    contextOrG.ctx &&
    !contextOrG.players
  ) {
    const args =
      legacyContext === undefined && legacyArgs.length === 0
        ? []
        : [legacyContext, ...legacyArgs];
    return {
      G: contextOrG.G,
      ctx: {
        ...contextOrG.ctx,
        playerID: contextOrG.playerID,
        events: contextOrG.events,
        random: contextOrG.random,
      },
      args,
    };
  }
  return { G: contextOrG, ctx: legacyContext, args: legacyArgs };
}
