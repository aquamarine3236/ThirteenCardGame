import { Combinations } from "../constants";
import { INVALID_MOVE } from "boardgame.io/core";
import { timeoutTurn } from "../moves/cardPlayMoves";

function makeState(overrides = {}) {
  return {
    started: true,
    handComplete: false,
    activePlayerIDs: ["0", "1", "2", "3"],
    players: {
      0: { hand: [{ rank: "3", suit: "S" }], stagingArea: [] },
      1: { hand: [{ rank: "4", suit: "S" }], stagingArea: [] },
      2: { hand: [{ rank: "5", suit: "S" }], stagingArea: [] },
      3: { hand: [{ rank: "6", suit: "S" }], stagingArea: [] },
    },
    turnOrder: [0, 1, 2, 3],
    winners: [],
    center: [{ rank: "7", suit: "S" }],
    centerPlayerID: "3",
    roundType: Combinations.SINGLE,
    pendingThreePairLeadPlayer: null,
    openingThreePairLeadPlayer: null,
    openingThreePairLeadPenaltyApplied: false,
    chopChain: null,
    twoCardPot: 0,
    turnDeadlineAt: 2000,
    previousWinner: "2",
    ...overrides,
  };
}

function makeContext(currentPlayer, turn = 4, activePlayers = null) {
  return {
    currentPlayer,
    turn,
    activePlayers,
    events: {
      endTurn: jest.fn(),
      setActivePlayers: jest.fn(),
      setStage: jest.fn(),
    },
  };
}

describe("turn timeout", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("automatically passes after the deadline and rejects stale timeout requests", () => {
    jest.spyOn(Date, "now").mockReturnValue(2001);
    const G = makeState();
    const context = makeContext("0");

    expect(timeoutTurn(G, context, 4, G.turnDeadlineAt)).toBeUndefined();
    expect(G.turnOrder).toEqual([null, 1, 2, 3]);
    expect(context.events.endTurn).toHaveBeenCalled();
    expect(timeoutTurn(G, makeContext("0"), 3, G.turnDeadlineAt)).toBe(
      INVALID_MOVE
    );
  });

  it("does not pass early and auto-declines an expired 3-pair lead choice", () => {
    jest.spyOn(Date, "now").mockReturnValue(1999);
    const earlyState = makeState();
    expect(
      timeoutTurn(
        earlyState,
        makeContext("0"),
        4,
        earlyState.turnDeadlineAt
      )
    ).toBe(INVALID_MOVE);
    expect(earlyState.turnOrder).toEqual([0, 1, 2, 3]);

    jest.spyOn(Date, "now").mockReturnValue(2000);
    const G = makeState({ pendingThreePairLeadPlayer: "0" });
    const context = makeContext("0");
    timeoutTurn(G, context, 4, G.turnDeadlineAt);

    expect(G.pendingThreePairLeadPlayer).toBeNull();
    expect(G.firstPlayer).toBe(2);
    expect(context.events.endTurn).toHaveBeenCalledWith({ next: "2" });
  });

  it("clears the table and advances after a timed-out free lead", () => {
    jest.spyOn(Date, "now").mockReturnValue(2001);
    const G = makeState({
      turnOrder: [0, null, null, null],
      center: [{ rank: "2", suit: "S" }],
      activePlayers: { 0: "tienLen" },
    });
    const context = makeContext("0", 4, { 0: "tienLen" });

    timeoutTurn(G, context, 4, G.turnDeadlineAt);

    expect(G.turnOrder).toEqual([0, 1, 2, 3]);
    expect(G.center).toEqual([]);
    expect(G.centerPlayerID).toBeNull();
    expect(G.roundType).toBe(Combinations.ANY);
    expect(context.events.endTurn).toHaveBeenCalledWith({ next: "1" });
  });
});
