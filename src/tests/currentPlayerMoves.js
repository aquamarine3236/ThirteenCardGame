export function updateClientState(client, update) {
  const state = client.store.getState();
  const nextState = JSON.parse(JSON.stringify(state));
  update(nextState.G, nextState.ctx);
  client.store.dispatch({
    type: "UPDATE",
    state: nextState,
    deltalog: [],
    clientOnly: true,
  });
}

export function attachCurrentPlayerMoves(client) {
  let dispatchers = client.moves;
  const updatePlayerID = client.updatePlayerID.bind(client);
  const moveProxy = new Proxy(
    {},
    {
      get: (target, moveName) => (...args) => {
        const currentPlayer = client.store.getState().ctx.currentPlayer;
        client.updatePlayerID(currentPlayer);
        return dispatchers[moveName](...args);
      },
    }
  );

  client.updatePlayerID = playerID => {
    updatePlayerID(playerID);
    dispatchers = client.moves;
    client.moves = moveProxy;
  };
  client.moves = moveProxy;
}
