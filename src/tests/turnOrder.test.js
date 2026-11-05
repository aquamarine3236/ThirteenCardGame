// src/tests/turnOrder.test.js

import { Client } from "boardgame.io/client";
import { default as TienLen } from "../TienLen";
import { Combinations } from "../constants";
import {
  attachCurrentPlayerMoves,
  updateClientState,
} from "./currentPlayerMoves";

describe("Turn order", () => {
  let client;

  beforeEach(() => {
    client = Client({
      game: TienLen,
      numPlayers: 4,
    });
    attachCurrentPlayerMoves(client);
    updateClientState(client, (G, ctx) => {
      G.firstMove = false;
      G.players = {
      0: {
        hand: [
          { rank: "3", suit: "C" },
          { rank: "6", suit: "S" },
          { rank: "5", suit: "C" },
          { rank: "8", suit: "C" },
        ],
        stagingArea: [],
      },
      1: {
        hand: [
          { rank: "4", suit: "C" },
          { rank: "9", suit: "S" },
          { rank: "T", suit: "S" },
          { rank: "Q", suit: "D" },
        ],
        stagingArea: [],
      },
      2: {
        hand: [
          { rank: "5", suit: "H" },
          { rank: "4", suit: "D" },
          { rank: "6", suit: "D" },
          { rank: "7", suit: "C" },
          { rank: "4", suit: "H" },
          { rank: "4", suit: "S" },
        ],
        stagingArea: [],
      },
      3: {
        hand: [
          { rank: "6", suit: "H" },
          { rank: "5", suit: "D" },
          { rank: "9", suit: "C" },
          { rank: "T", suit: "C" },
        ],
        stagingArea: [],
      },
      };
      G.cardsLeft = { 0: 4, 1: 4, 2: 6, 3: 4 };
      ctx.currentPlayer = "0";
    });
  });

  it("should pass to the next player, wrapping around", () => {
    // pass turn along
    client.moves.relocateCards([{ rank: "3", suit: "C" }], "stagingArea");
    client.moves.cardsToCenter();

    let { ctx } = client.store.getState();

    expect(ctx.currentPlayer).toEqual("1");

    client.moves.relocateCards([{ rank: "4", suit: "C" }], "stagingArea");
    client.moves.cardsToCenter();
    ctx = client.store.getState()["ctx"];
    expect(ctx.currentPlayer).toEqual("2");

    client.moves.relocateCards([{ rank: "5", suit: "H" }], "stagingArea");
    client.moves.cardsToCenter();
    ctx = client.store.getState()["ctx"];
    expect(ctx.currentPlayer).toEqual("3");

    client.moves.relocateCards([{ rank: "6", suit: "H" }], "stagingArea");
    client.moves.cardsToCenter();
    ctx = client.store.getState()["ctx"];
    let G = client.store.getState()["G"];
    expect(ctx.currentPlayer).toEqual("0");
    expect(G.turnOrder).toEqual([0, 1, 2, 3]);
  });

  describe("skips", () => {
    let G;

    beforeEach(() => {
      updateClientState(client, G => {
        G.turnOrder = [0, null, 2, 3];
      });
      G = client.store.getState()["G"];
    });

    it("should skip any players who have passed", () => {
      client.moves.relocateCards([{ rank: "3", suit: "C" }], "stagingArea");
      client.moves.cardsToCenter();

      let { ctx } = client.store.getState();
      expect(ctx.currentPlayer).toEqual("2");

      client.moves.relocateCards([{ rank: "4", suit: "D" }], "stagingArea");
      client.moves.cardsToCenter();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("3");

      client.moves.relocateCards([{ rank: "5", suit: "D" }], "stagingArea");
      client.moves.cardsToCenter(); // player 3 passes
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("0");

      client.moves.relocateCards([{ rank: "6", suit: "S" }], "stagingArea");
      client.moves.cardsToCenter();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      G = client.store.getState()["G"];
      expect(G.turnOrder).toEqual([0, null, 2, 3]);
    });

    it("should remove players who pass from the turn order", () => {
      client.moves.relocateCards([{ rank: "3", suit: "C" }], "stagingArea");
      client.moves.cardsToCenter();

      let { ctx } = client.store.getState();

      expect(ctx.currentPlayer).toEqual("2");

      client.moves.relocateCards([{ rank: "4", suit: "D" }], "stagingArea");
      client.moves.cardsToCenter();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("3");

      client.moves.passTurn(); // player 3 passes
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("0");

      client.moves.relocateCards([{ rank: "5", suit: "C" }], "stagingArea");
      client.moves.cardsToCenter();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");

      client.moves.relocateCards([{ rank: "6", suit: "D" }], "stagingArea");
      client.moves.cardsToCenter();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("0");
      G = client.store.getState()["G"];
      expect(G.turnOrder).toEqual([0, null, 2, null]);
    });
  });

  describe("tien len", () => {
    let G;
    let ctx;

    beforeEach(() => {
      updateClientState(client, (G, ctx) => {
        ctx.currentPlayer = "1";
        G.turnOrder = [null, 1, 2, null];
        G.center = [{ rank: "4", suit: "C" }];
        G.roundType = Combinations.SINGLE;
      });
      G = client.store.getState()["G"];
      ctx = client.store.getState()["ctx"];
    });

    it("should start whenever 1 player is left in turn order", () => {
      client.moves.passTurn();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "tienLen",
        "3": "notTurn",
      });
    });

    it("should persist as long as the player makes tien len moves", () => {
      client.moves.passTurn();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "tienLen",
        "3": "notTurn",
      });

      client.moves.relocateCards([{ rank: "4", suit: "D" }], "stagingArea");
      client.moves.tienLenPlay();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "tienLen",
        "3": "notTurn",
      });

      client.moves.relocateCards([{ rank: "4", suit: "H" }], "stagingArea");
      client.moves.tienLenPlay();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "tienLen",
        "3": "notTurn",
      });
    });

    it("should end when the player makes a non-tien len move", () => {
      client.moves.passTurn();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "tienLen",
        "3": "notTurn",
      });

      client.moves.relocateCards([{ rank: "4", suit: "D" }], "stagingArea");
      client.moves.tienLenPlay();
      ctx = client.store.getState()["ctx"];
      expect(ctx.currentPlayer).toEqual("2");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "tienLen",
        "3": "notTurn",
      });

      client.moves.relocateCards([{ rank: "4", suit: "S" }], "stagingArea");
      client.moves.tienLenPlay();
      ctx = client.store.getState()["ctx"];
      G = client.store.getState()["G"];
      expect(ctx.currentPlayer).toEqual("3");
      expect(ctx.activePlayers).toEqual({
        "0": "notTurn",
        "1": "notTurn",
        "2": "notTurn",
        "3": null,
      });
      expect(G.turnOrder).toEqual([0, 1, 2, 3]);
    });
  });
});
