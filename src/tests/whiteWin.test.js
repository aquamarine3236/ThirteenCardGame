import { Combinations, Ranks, Suits } from "../constants";
import { dealHand, findWhiteWinPlayer } from "../dealHand";
import TienLen from "../TienLen";
import {
  cardsToCenter,
  finishWhiteWin,
  startNextHand,
} from "../moves/cardPlayMoves";
import { DEFAULT_RULES, normalizeRules } from "../rules";

function card(rank, suit) {
  return { rank, suit };
}

function makeWhiteHand(type) {
  if (type === "four-twos") {
    return [
      card("2", "S"),
      card("2", "C"),
      card("2", "D"),
      card("2", "H"),
      card("3", "S"),
      card("3", "C"),
      card("4", "S"),
      card("4", "C"),
      card("5", "S"),
      card("5", "C"),
      card("6", "S"),
      card("6", "C"),
      card("7", "S"),
    ];
  }
  if (type === "six-pairs") {
    return ["3", "4", "5", "6", "7", "8"]
      .flatMap(rank => [card(rank, "S"), card(rank, "C")])
      .concat(card("9", "S"));
  }
  return Ranks.map((rank, index) => card(rank, Suits[index % Suits.length]));
}

function makeRegularHand() {
  return ["3", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
    .map((rank, index) => card(rank, Suits[index % Suits.length]));
}

function makeOrderedDeck(firstHand) {
  const firstHandKeys = new Set(
    firstHand.map(({ rank, suit }) => `${rank}${suit}`)
  );
  const remaining = Suits.flatMap(suit =>
    Ranks.map(rank => card(rank, suit))
  ).filter(({ rank, suit }) => !firstHandKeys.has(`${rank}${suit}`));
  return firstHand.concat(remaining);
}

function randomFor(firstHand) {
  const orderedDeck = makeOrderedDeck(firstHand);
  return {
    Die: () => 1,
    Shuffle: () => orderedDeck,
  };
}

function makeContext(currentPlayer = "0") {
  return {
    currentPlayer,
    events: {
      endTurn: jest.fn(),
      setActivePlayers: jest.fn(),
      setStage: jest.fn(),
    },
  };
}

function makeSettledState(rules = DEFAULT_RULES) {
  const normalizedRules = normalizeRules(rules);
  return {
    started: true,
    activePlayerIDs: ["0", "1", "2", "3"],
    players: {
      0: { hand: makeWhiteHand("six-pairs"), stagingArea: [] },
      1: { hand: [card("2", "S")], stagingArea: [card("2", "D")] },
      2: { hand: [card("2", "H")], stagingArea: [] },
      3: { hand: [], stagingArea: [] },
    },
    cardsLeft: { 0: 13, 1: 13, 2: 13, 3: 13 },
    center: [],
    centerPlayerID: null,
    roundType: Combinations.ANY,
    turnOrder: [0, 1, 2, 3],
    winners: [],
    firstMove: true,
    firstWinnerFinishedWithThreeSpades: false,
    rules: normalizedRules,
    netBalances: { 0: 100, 1: 100, 2: 100, 3: 100 },
    handStartBalances: { 0: 100, 1: 100, 2: 100, 3: 100 },
    settlementLog: [],
    handSettlementLogStart: 0,
    handResults: [],
    handNumber: 1,
    handComplete: false,
    previousWinner: null,
    chopChain: null,
    twoCardPot: 0,
  };
}

describe("automatic white wins", () => {
  it.each(["four-twos", "six-pairs", "straight"])(
    "detects %s after dealing",
    type => {
    const result = dealHand(
      randomFor(makeWhiteHand(type)),
      { rank: "3", suit: "S" }
    );

    expect(result.whiteWinPlayer).toBe("0");
    expect(result.players["0"].hand).toHaveLength(13);
    }
  );

  it("does not mistake fewer than six pairs for a white-win hand", () => {
    const hand = [
      card("3", "S"),
      card("3", "C"),
      card("4", "S"),
      card("4", "C"),
      card("5", "S"),
      card("5", "C"),
      card("6", "S"),
      card("6", "C"),
      card("7", "S"),
      card("7", "C"),
      card("8", "S"),
      card("9", "C"),
      card("T", "D"),
    ];

    expect(findWhiteWinPlayer({ 0: { hand } }, ["0"], "0")).toBeNull();
  });

  it("uses the opening player to resolve simultaneous white-win hands", () => {
    const sixPairs = makeWhiteHand("six-pairs");
    const fourTwos = makeWhiteHand("four-twos");
    const players = {
      0: { hand: sixPairs },
      1: { hand: fourTwos },
    };

    expect(findWhiteWinPlayer(players, ["0", "1"], "1")).toBe("1");
  });

  it("uses three times the configured last-place loss without doubling", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      threeSpadesFirstPlaceWhiteWin: true,
      settlement: {
        ...DEFAULT_RULES.settlement,
        mode: "ranked",
        baseStake: 10,
      },
    });
    const G = makeSettledState(rules);

    finishWhiteWin(G, "0");

    expect(G.handComplete).toBe(true);
    expect(G.winners).toEqual(["0"]);
    expect(G.gameResults).toMatchObject({
      rankings: ["0", "1", "2", "3"],
      lastPlacePlayerIDs: ["1", "2", "3"],
      whiteWin: true,
      netBalances: { 0: 170, 1: -70, 2: -70, 3: -30 },
    });
    expect(G.settlementLog.filter(log => log.type === "ranking")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerID: "0", amount: 90 }),
        expect.objectContaining({ playerID: "1", amount: -30 }),
        expect.objectContaining({ playerID: "2", amount: -30 }),
        expect.objectContaining({ playerID: "3", amount: -30 }),
      ])
    );
    expect(G.netBalances).toEqual({ 0: 270, 1: 30, 2: 30, 3: 70 });
    expect(G.settlementLog.filter(log => log.type === "ranking")).toHaveLength(
      4
    );
    expect(G.settlementLog.filter(log => log.type === "thoi-two")).toEqual([
      expect.objectContaining({ from: "1", to: "0", amount: 40 }),
      expect.objectContaining({ from: "2", to: "0", amount: 40 }),
    ]);
  });

  it("does not apply the thối 2 penalty when disabled", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      thoiTwoEnabled: false,
      threeSpadesFirstPlaceWhiteWin: true,
      settlement: {
        ...DEFAULT_RULES.settlement,
        mode: "ranked",
        baseStake: 10,
      },
    });
    const G = makeSettledState(rules);

    finishWhiteWin(G, "0");

    expect(G.gameResults.netBalances).toEqual({
      0: 90,
      1: -30,
      2: -30,
      3: -30,
    });
    expect(G.settlementLog.some(log => log.type === "thoi-two")).toBe(false);
  });

  it("finishes a white-win hand immediately during initial setup", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      threeSpadesFirstPlaceWhiteWin: true,
    });
    const G = TienLen.setup(
      { numPlayers: 4, random: randomFor(makeWhiteHand("six-pairs")) },
      { rules }
    );
    const events = { setActivePlayers: jest.fn() };

    TienLen.turn.onBegin({ G, events });

    expect(G.handComplete).toBe(true);
    expect(G.gameResults.whiteWin).toBe(true);
    expect(Object.values(G.gameResults.netBalances).reduce((sum, amount) => sum + amount, 0)).toBe(
      0
    );
    expect(G.settlementLog.filter(log => log.type === "thoi-two")).toHaveLength(
      3
    );
    expect(events.setActivePlayers).toHaveBeenCalledWith({
      all: "handComplete",
    });
  });

  it("checks the next hand immediately after dealing", () => {
    const G = makeSettledState();
    G.handComplete = true;
    G.previousWinner = "0";
    G.handNumber = 1;
    const context = makeContext("0");
    context.random = randomFor(makeWhiteHand("four-twos"));

    startNextHand(G, context);

    expect(G.handNumber).toBe(2);
    expect(G.handComplete).toBe(true);
    expect(G.gameResults.whiteWin).toBe(true);
    expect(G.gameResults.netBalances).toEqual({
      0: 3,
      1: -1,
      2: -1,
      3: -1,
    });
    expect(context.events.endTurn).toHaveBeenCalledWith({ next: "0" });
  });

  it("starts the hand after a white win from the holder of the selected 3", () => {
    const G = makeSettledState();
    G.handComplete = true;
    G.previousWinner = "2";
    G.gameResults = { whiteWin: true };
    const context = makeContext("2");
    context.random = randomFor(makeRegularHand());

    startNextHand(G, context);

    expect(G.firstPlayer).toBe(0);
    expect(context.events.endTurn).toHaveBeenCalledWith({ next: "0" });
    expect(G.handComplete).toBe(false);
  });

  it("starts a regular next hand from the previous winner", () => {
    const G = makeSettledState();
    G.handComplete = true;
    G.previousWinner = "2";
    G.gameResults = { whiteWin: false };
    const context = makeContext("2");
    context.random = randomFor(makeRegularHand());

    startNextHand(G, context);

    expect(G.firstPlayer).toBe(2);
    expect(context.events.endTurn).toHaveBeenCalledWith({ next: "2" });
  });
});

describe("white-loss settlement", () => {
  it("ranks a player who never played last and charges their remaining 2 once", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      settlement: {
        ...DEFAULT_RULES.settlement,
        baseStake: 10,
      },
    });
    const G = {
      ...makeSettledState(rules),
      players: {
        0: { hand: [], stagingArea: [] },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [card("6", "S")] },
        3: {
          hand: [
            card("2", "H"),
            ...Array.from({ length: 12 }, (_, index) =>
              card(Ranks[index], Suits[(index + 1) % Suits.length])
            ),
          ],
          stagingArea: [],
        },
      },
      cardsLeft: { 0: 0, 1: 0, 2: 1, 3: 13 },
      winners: ["0", "1"],
      firstMove: false,
    };

    cardsToCenter(G, makeContext("2"));

    expect(G.gameResults.rankings).toEqual(["0", "1", "2", "3"]);
    expect(G.gameResults.lastPlacePlayerIDs).toEqual(["3"]);
    expect(
      G.settlementLog.filter(log => log.type === "thoi-two")
    ).toEqual([expect.objectContaining({ from: "3", to: "0", amount: 40 })]);
  });
});
