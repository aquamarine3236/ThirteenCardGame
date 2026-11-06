import { INVALID_MOVE } from "boardgame.io/core";
import { Combinations } from "../constants";
import {
  cardsToCenter,
  passTurn,
  startNextHand,
  acceptThreePairLead,
  declineThreePairLead,
  validPlay,
} from "../moves/cardPlayMoves";
import {
  relocateCards,
  sortStagingArea,
} from "../moves/cardAreaMoves";
import { validChop } from "../moves/helper-functions/cardComparison";
import TienLen, { playerView } from "../TienLen";
import { DEFAULT_RULES, normalizeRules } from "../rules";

function makeState(overrides = {}) {
  const rules = normalizeRules();
  return {
    players: {
      0: { hand: [], stagingArea: [] },
      1: { hand: [{ rank: "2", suit: "H" }], stagingArea: [] },
      2: { hand: [], stagingArea: [] },
      3: { hand: [], stagingArea: [] },
    },
    cardsLeft: { 0: 1, 1: 1, 2: 0, 3: 0 },
    center: [],
    centerPlayerID: null,
    roundType: Combinations.ANY,
    turnOrder: [0, 1, 2, 3],
    winners: [],
    firstPlayer: 0,
    firstMove: false,
    rules,
    netBalances: { 0: 0, 1: 0, 2: 0, 3: 0 },
    handStartBalances: { 0: 0, 1: 0, 2: 0, 3: 0 },
    settlementLog: [],
    handSettlementLogStart: 0,
    handResults: [],
    handNumber: 1,
    handComplete: false,
    previousWinner: null,
    ...overrides,
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

function makeDeckWithThreePairCandidates() {
  const low = ["3", "4", "5"].flatMap(rank =>
    ["S", "C"].map(suit => ({ rank, suit }))
  );
  const high = ["6", "7", "8"].flatMap(rank =>
    ["S", "C"].map(suit => ({ rank, suit }))
  );
  const lowExtras = [
    { rank: "2", suit: "S" },
    { rank: "8", suit: "D" },
    { rank: "9", suit: "S" },
    { rank: "T", suit: "S" },
    { rank: "J", suit: "S" },
    { rank: "K", suit: "S" },
    { rank: "A", suit: "D" },
  ];
  const highExtras = [
    { rank: "2", suit: "C" },
    { rank: "9", suit: "C" },
    { rank: "T", suit: "C" },
    { rank: "J", suit: "C" },
    { rank: "Q", suit: "C" },
    { rank: "K", suit: "C" },
    { rank: "A", suit: "C" },
  ];
  const lowerFiller = [
    { rank: "3", suit: "D" },
    { rank: "3", suit: "H" },
    ...["5", "6", "7", "9", "T", "J", "K", "2"].map(rank => ({
      rank,
      suit: "D",
    })),
    { rank: "A", suit: "S" },
    { rank: "Q", suit: "S" },
    { rank: "Q", suit: "D" },
  ];
  const upperFiller = [
    { rank: "4", suit: "D" },
    { rank: "4", suit: "H" },
    ...["5", "6", "7", "9", "T", "J", "K", "2"].map(rank => ({
      rank,
      suit: "H",
    })),
    { rank: "A", suit: "H" },
    { rank: "Q", suit: "H" },
    { rank: "8", suit: "H" },
  ];
  return [
    low.concat(lowExtras),
    high.concat(highExtras),
    lowerFiller,
    upperFiller,
  ].reduce((deck, hand) => deck.concat(hand), []);
}

describe("custom rules", () => {
  it("uses the default opening card and rejects invalid settings", () => {
    expect(normalizeRules().openingCard).toEqual({ rank: "3", suit: "S" });
    expect(normalizeRules().allowTwoAsLastCard).toBe(false);
    expect(normalizeRules().thoiTwoEnabled).toBe(true);
    expect(normalizeRules().settlement.baseStake).toBe(1);
    expect(normalizeRules().chops.threePairSingleTwo).toBe(true);
    expect(normalizeRules().chops.threePairLead).toBe(true);
    expect(normalizeRules().chops.fourKindSingleTwo).toBe(true);
    expect(normalizeRules().chops.fourKindPairTwo).toBe(false);
    expect(normalizeRules().chops.fourPairPairTwo).toBe(true);
    expect(normalizeRules().chops.fourPairCutRound).toBe(true);
    expect(
      normalizeRules({
        ...DEFAULT_RULES,
        allowTwoAsLastCard: true,
      }).allowTwoAsLastCard
    ).toBe(true);
    expect(
      normalizeRules({
        ...DEFAULT_RULES,
        thoiTwoEnabled: false,
      }).thoiTwoEnabled
    ).toBe(false);
    const previousRules = { ...DEFAULT_RULES };
    delete previousRules.thoiTwoEnabled;
    expect(normalizeRules(previousRules).thoiTwoEnabled).toBe(true);
    expect(() =>
      normalizeRules({ ...DEFAULT_RULES, thoiTwoEnabled: "yes" })
    ).toThrow("thối 2");
    expect(() =>
      normalizeRules({
        ...DEFAULT_RULES,
        allowTwoAsLastCard: "yes",
      })
    ).toThrow("final-two");
    expect(
      normalizeRules({
        ...DEFAULT_RULES,
        chops: { ...DEFAULT_RULES.chops, fourPairCutRound: false },
      }).chops.fourPairCutRound
    ).toBe(false);
    expect(normalizeRules().settlement.twoCardMultipliers).toEqual({
      S: 1,
      C: 2,
      D: 3,
      H: 4,
    });
    expect(normalizeRules().settlement.mode).toBe("winner-vs-others");
    expect(normalizeRules().settlement.rankPayouts).toEqual([3, 1, -1, -3]);
    expect(() =>
      normalizeRules({
        ...DEFAULT_RULES,
        openingCard: { rank: "2", suit: "S" },
      })
    ).toThrow("opening card");
    expect(() =>
      normalizeRules({
        ...DEFAULT_RULES,
        settlement: {
          ...DEFAULT_RULES.settlement,
          baseStake: -1,
        },
      })
    ).toThrow("settlement");
    expect(() =>
      normalizeRules({
        ...DEFAULT_RULES,
        settlement: {
          ...DEFAULT_RULES.settlement,
          baseStake: 0,
        },
      })
    ).toThrow("settlement");
    expect(() =>
      normalizeRules({
        ...DEFAULT_RULES,
        settlement: {
          ...DEFAULT_RULES.settlement,
          rankPayouts: [4, 1, -1, -3],
        },
      })
    ).toThrow("settlement");
    expect(() =>
      normalizeRules({
        ...DEFAULT_RULES,
        settlement: {
          ...DEFAULT_RULES.settlement,
          twoCardMultipliers: { S: 1, C: 2, D: 3, H: -1 },
        },
      })
    ).toThrow("settlement");
  });

  it("validates custom setup data before a match starts", () => {
    expect(
      TienLen.validateSetupData({ rules: normalizeRules() })
    ).toBeUndefined();
    expect(
      TienLen.validateSetupData({
        rules: { ...DEFAULT_RULES, openingCard: { rank: "2", suit: "S" } },
      })
    ).toContain("opening card");
    expect(
      TienLen.validateSetupData({
        rules: { ...DEFAULT_RULES, allowTwoAsLastCard: "yes" },
      })
    ).toContain("final-two");
    expect(TienLen.validateSetupData({ unexpected: true })).toContain(
      "setup data"
    );
  });

  it("requires the configured opening card on the first play", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      openingCard: { rank: "3", suit: "C" },
    });
    expect(
      validPlay(
        [{ rank: "3", suit: "S" }],
        Combinations.ANY,
        [],
        rules.openingCard,
        rules
      )
    ).toContain("First Play");
    expect(
      validPlay(
        [{ rank: "3", suit: "C" }],
        Combinations.ANY,
        [],
        rules.openingCard,
        rules
      )
    ).toBe(true);
  });

  it("applies configurable chop permissions", () => {
    const threePairs = [
      { rank: "3", suit: "S" },
      { rank: "3", suit: "C" },
      { rank: "4", suit: "S" },
      { rank: "4", suit: "C" },
      { rank: "5", suit: "S" },
      { rank: "5", suit: "C" },
    ];
    const singleTwo = [{ rank: "2", suit: "H" }];
    expect(validChop(singleTwo, threePairs)).toBe(true);
    const disabledThreePairChops = normalizeRules({
      ...DEFAULT_RULES,
      chops: { ...DEFAULT_RULES.chops, threePairSingleTwo: false },
    });
    expect(validChop(singleTwo, threePairs, disabledThreePairChops)).toBe(
      false
    );
    const threePairChops = normalizeRules({
      ...DEFAULT_RULES,
      chops: { ...DEFAULT_RULES.chops, threePairSingleTwo: true },
    });
    expect(validChop(singleTwo, threePairs, threePairChops)).toBe(true);
    expect(
      validChop(
        [singleTwo[0], { rank: "2", suit: "S" }],
        threePairs,
        threePairChops
      )
    ).toBe(false);

    const fourKind = [
      { rank: "4", suit: "S" },
      { rank: "4", suit: "C" },
      { rank: "4", suit: "D" },
      { rank: "4", suit: "H" },
    ];
    const pairTwos = [
      { rank: "2", suit: "S" },
      { rank: "2", suit: "H" },
    ];
    expect(validChop(singleTwo, fourKind)).toBe(true);
    expect(validChop(pairTwos, fourKind)).toBe(false);
    const pairTwoChops = normalizeRules({
      ...DEFAULT_RULES,
      chops: { ...DEFAULT_RULES.chops, fourKindPairTwo: true },
    });
    expect(validChop(pairTwos, fourKind, pairTwoChops)).toBe(true);
    expect(validChop(singleTwo, fourKind, pairTwoChops)).toBe(true);
  });

  it("enforces the chop strength order from three pairs to four pairs", () => {
    const threePairs = ["3", "4", "5"].flatMap(rank =>
      ["S", "C"].map(suit => ({ rank, suit }))
    );
    const fourKind = ["S", "C", "D", "H"].map(suit => ({
      rank: "6",
      suit,
    }));
    const fourPairs = ["7", "8", "9", "T"].flatMap(rank =>
      ["S", "C"].map(suit => ({ rank, suit }))
    );

    expect(validChop(threePairs, fourKind)).toBe(true);
    expect(validChop(threePairs, fourPairs)).toBe(true);
    expect(validChop(fourKind, fourPairs)).toBe(true);
    expect(validChop(fourKind, threePairs)).toBe(false);
    expect(validChop(fourPairs, fourKind)).toBe(false);
  });

  it("rejects forged cards and invalid plays on the server", () => {
    const G = makeState({
      players: {
        0: {
          hand: [{ rank: "3", suit: "S" }],
          stagingArea: [{ rank: "4", suit: "S" }],
        },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
    });
    const before = JSON.stringify(G);
    expect(
      relocateCards(G, makeContext(), [{ rank: "A", suit: "S" }], "stagingArea")
    ).toBe(INVALID_MOVE);
    expect(JSON.stringify(G)).toBe(before);

    G.center = [{ rank: "5", suit: "S" }];
    G.roundType = Combinations.SINGLE;
    expect(cardsToCenter(G, makeContext())).toBe(INVALID_MOVE);
  });

  it("prevents a 2 from finishing a hand unless the rule is enabled", () => {
    const illegalFinish = makeState({
      activePlayerIDs: ["0", "1"],
      players: {
        0: {
          hand: [],
          stagingArea: [
            { rank: "2", suit: "S" },
            { rank: "2", suit: "H" },
          ],
        },
        1: { hand: [{ rank: "3", suit: "S" }], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
      cardsLeft: { 0: 2, 1: 1, 2: 0, 3: 0 },
    });

    expect(cardsToCenter(illegalFinish, makeContext("0"))).toBe(INVALID_MOVE);
    expect(illegalFinish.winners).toEqual([]);
    expect(illegalFinish.players["0"].stagingArea).toHaveLength(2);

    const allowedRules = normalizeRules({
      ...DEFAULT_RULES,
      allowTwoAsLastCard: true,
    });
    const allowedFinish = makeState({
      activePlayerIDs: ["0", "1"],
      players: {
        0: { hand: [], stagingArea: [{ rank: "2", suit: "H" }] },
        1: { hand: [{ rank: "3", suit: "S" }], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
      cardsLeft: { 0: 1, 1: 1, 2: 0, 3: 0 },
      rules: allowedRules,
    });

    cardsToCenter(allowedFinish, makeContext("0"));
    expect(allowedFinish.winners).toEqual(["0"]);
    expect(allowedFinish.handComplete).toBe(true);
  });

  it("reorders cards within a hand and across the hand and staging area", () => {
    const G = makeState({
      players: {
        0: {
          hand: [
            { rank: "3", suit: "S" },
            { rank: "4", suit: "S" },
          ],
          stagingArea: [
            { rank: "5", suit: "S" },
            { rank: "6", suit: "S" },
          ],
        },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
    });

    relocateCards(G, makeContext("0"), {
      source: { droppableId: "hand", index: 0 },
      destination: { droppableId: "hand", index: 1 },
    });
    expect(G.players["0"].hand.map(card => card.rank)).toEqual(["4", "3"]);

    relocateCards(G, makeContext("0"), {
      source: { droppableId: "stagingArea", index: 0 },
      destination: { droppableId: "stagingArea", index: 1 },
    });
    expect(G.players["0"].stagingArea.map(card => card.rank)).toEqual([
      "6",
      "5",
    ]);

    relocateCards(G, makeContext("0"), {
      source: { droppableId: "hand", index: 1 },
      destination: { droppableId: "stagingArea", index: 0 },
    });
    expect(G.players["0"].hand.map(card => card.rank)).toEqual(["4"]);
    expect(G.players["0"].stagingArea.map(card => card.rank)).toEqual([
      "3",
      "6",
      "5",
    ]);
  });

  it("returns staged cards to hand and alternates sort direction", () => {
    const G = makeState({
      players: {
        0: {
          hand: [
            { rank: "3", suit: "S" },
            { rank: "A", suit: "H" },
          ],
          stagingArea: [
            { rank: "2", suit: "S" },
            { rank: "4", suit: "C" },
          ],
        },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
    });

    sortStagingArea(G, makeContext("0"));

    expect(G.players["0"].stagingArea).toEqual([]);
    expect(
      G.players["0"].hand.map(card => `${card.rank}${card.suit}`)
    ).toEqual(["3S", "4C", "AH", "2S"]);

    sortStagingArea(G, makeContext("0"));
    expect(
      G.players["0"].hand.map(card => `${card.rank}${card.suit}`)
    ).toEqual(["2S", "AH", "4C", "3S"]);
  });

  it("settles the final ranking, chops, and leftover 2s as virtual balances", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      settlement: {
        ...DEFAULT_RULES.settlement,
        baseStake: 10,
      },
    });
    const G = makeState({
      players: {
        0: { hand: [], stagingArea: [{ rank: "3", suit: "S" }] },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [{ rank: "2", suit: "H" }], stagingArea: [] },
      },
      winners: ["1", "2"],
      cardsLeft: { 0: 1, 1: 0, 2: 0, 3: 1 },
      rules,
    });
    cardsToCenter(G, makeContext());
    expect(G.gameResults.rankings).toEqual(["1", "2", "0", "3"]);
    expect(G.gameResults.netBalances).toEqual({
      0: -10,
      1: 70,
      2: -10,
      3: -50,
    });
    expect(
      Object.values(G.gameResults.netBalances).reduce((sum, value) => sum + value, 0)
    ).toBe(0);
    expect(G.netBalances).toEqual(G.gameResults.cumulativeBalances);
    expect(G.handComplete).toBe(true);
    expect(G.handResults).toHaveLength(1);
    expect(G.gameResults.lastPlacePlayerIDs).toEqual(["3"]);
  });

  it("counts a white win only when the first-place player finishes with the single 3 of spades", () => {
    const makeWhiteWinState = cards => {
      const rules = normalizeRules({
        ...DEFAULT_RULES,
        threeSpadesFirstPlaceWhiteWin: true,
      });
      return makeState({
        activePlayerIDs: ["0", "1"],
        players: {
          0: { hand: [], stagingArea: cards },
          1: { hand: [{ rank: "4", suit: "S" }], stagingArea: [] },
          2: { hand: [], stagingArea: [] },
          3: { hand: [], stagingArea: [] },
        },
        cardsLeft: { 0: cards.length, 1: 1, 2: 0, 3: 0 },
        rules,
        threeSpadesPlayer: "0",
      });
    };

    const finishesWithThreeSpades = makeWhiteWinState([
      { rank: "3", suit: "S" },
    ]);
    cardsToCenter(finishesWithThreeSpades, makeContext("0"));
    expect(finishesWithThreeSpades.gameResults.whiteWin).toBe(true);

    const playsThreeSpadesEarlier = makeWhiteWinState([
      { rank: "4", suit: "S" },
    ]);
    cardsToCenter(playsThreeSpadesEarlier, makeContext("0"));
    expect(playsThreeSpadesEarlier.gameResults.whiteWin).toBe(false);

    const finishesWithACombination = makeWhiteWinState([
      { rank: "3", suit: "S" },
      { rank: "3", suit: "C" },
    ]);
    cardsToCenter(finishesWithACombination, makeContext("0"));
    expect(finishesWithACombination.gameResults.whiteWin).toBe(false);
  });

  it("adds each hand's settlement to the match balance and retains its record", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      settlement: {
        ...DEFAULT_RULES.settlement,
        baseStake: 10,
      },
    });
    const previousResult = { handNumber: 1 };
    const previousBalances = { 0: -10, 1: 30, 2: -10, 3: -10 };
    const G = makeState({
      players: {
        0: { hand: [], stagingArea: [{ rank: "3", suit: "S" }] },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
      winners: ["1", "2"],
      cardsLeft: { 0: 1, 1: 0, 2: 0, 3: 1 },
      rules,
      handNumber: 2,
      handResults: [previousResult],
      handStartBalances: { ...previousBalances },
      netBalances: { ...previousBalances },
    });

    expect(G.rules.settlement.baseStake).toBe(10);
    expect(G.netBalances).toEqual(previousBalances);
    cardsToCenter(G, makeContext());

    expect(G.gameResults.netBalances).toEqual({
      0: -10,
      1: 30,
      2: -10,
      3: -10,
    });
    expect(G.netBalances).toEqual({
      0: -20,
      1: 60,
      2: -20,
      3: -20,
    });
    expect(G.handResults[0]).toBe(previousResult);
    expect(G.handResults[1]).toBe(G.gameResults);
  });

  it("supports configurable positive and negative payouts by rank", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      settlement: {
        ...DEFAULT_RULES.settlement,
        mode: "ranked",
        baseStake: 10,
        rankPayouts: [4, 1, -2, -3],
      },
    });
    const G = makeState({
      players: {
        0: { hand: [], stagingArea: [{ rank: "3", suit: "S" }] },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
      winners: ["1", "2"],
      cardsLeft: { 0: 1, 1: 0, 2: 0, 3: 1 },
      rules,
    });

    cardsToCenter(G, makeContext());

    expect(G.gameResults.netBalances).toEqual({
      0: -20,
      1: 40,
      2: 10,
      3: -30,
    });
    expect(
      Object.values(G.gameResults.netBalances).reduce(
        (sum, value) => sum + value,
        0
      )
    ).toBe(0);
  });

  it("uses the value of the actual 2 when it is chopped", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      chops: {
        ...DEFAULT_RULES.chops,
        fourKindPairTwo: true,
        fourKindCutRound: true,
      },
      settlement: {
        ...DEFAULT_RULES.settlement,
        baseStake: 10,
      },
    });
    const pairTwos = [
      { rank: "2", suit: "S" },
      { rank: "2", suit: "H" },
    ];
    const fourKind = [
      { rank: "4", suit: "S" },
      { rank: "4", suit: "C" },
      { rank: "4", suit: "D" },
      { rank: "4", suit: "H" },
    ];
    const G = makeState({
      center: pairTwos,
      centerPlayerID: "1",
      roundType: Combinations.PAIR,
      turnOrder: [0, null, 2, 3],
      rules,
      players: {
        0: { hand: [], stagingArea: fourKind },
        1: { hand: [], stagingArea: [] },
        2: { hand: [], stagingArea: [] },
        3: { hand: [], stagingArea: [] },
      },
      cardsLeft: { 0: 4, 1: 2, 2: 0, 3: 0 },
    });

    cardsToCenter(G, makeContext());
    expect(G.netBalances).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 });
    expect(G.settlementLog).toEqual([]);
    passTurn(G, makeContext("1"));
    passTurn(G, makeContext("2"));
    passTurn(G, makeContext("3"));
    expect(G.netBalances).toEqual({ 0: 50, 1: -50, 2: 0, 3: 0 });
    expect(G.settlementLog[0]).toMatchObject({
      type: "chop-fourKindPairTwo",
      from: "1",
      to: "0",
      amount: 50,
    });
    expect(G.turnOrder).toEqual([null, 1, 2, 3]);
  });

  it("offers the lowest 3-pair lead and charges the 4x stake penalty when beaten", () => {
    const rules = normalizeRules({
      ...DEFAULT_RULES,
      settlement: {
        ...DEFAULT_RULES.settlement,
        baseStake: 10,
      },
    });
    const G = makeState({
      handComplete: true,
      previousWinner: "3",
      rules,
      netBalances: { 0: 5, 1: 0, 2: 0, 3: -5 },
    });
    const random = {
      Die: () => 0,
      Shuffle: () => makeDeckWithThreePairCandidates(),
    };
    startNextHand(G, { ...makeContext("2"), random });

    expect(G.pendingThreePairLeadPlayer).toBe("0");

    acceptThreePairLead(G, makeContext("0"));
    expect(G.center).toHaveLength(6);
    expect(G.centerPlayerID).toBe("0");
    expect(G.cardsLeft["0"]).toBe(7);

    G.players["1"].stagingArea = [
      { rank: "6", suit: "S" },
      { rank: "6", suit: "C" },
      { rank: "7", suit: "S" },
      { rank: "7", suit: "C" },
      { rank: "8", suit: "S" },
      { rank: "8", suit: "C" },
    ];
    cardsToCenter(G, makeContext("1"));
    expect(G.netBalances).toEqual({ 0: -35, 1: 40, 2: 0, 3: -5 });
    expect(G.settlementLog[0]).toMatchObject({
      type: "failed-three-pair-lead",
      from: "0",
      to: "1",
      amount: 40,
    });
  });

  it("lets the previous winner open when the 3-pair lead is declined", () => {
    const G = makeState({ handComplete: true, previousWinner: "3" });
    const random = {
      Die: () => 0,
      Shuffle: () => makeDeckWithThreePairCandidates(),
    };
    const context = makeContext("2");
    startNextHand(G, { ...context, random });
    const leadContext = makeContext("0");
    declineThreePairLead(G, leadContext);

    expect(G.pendingThreePairLeadPlayer).toBeNull();
    expect(G.firstPlayer).toBe(3);
    expect(leadContext.events.endTurn).toHaveBeenCalledWith({ next: "3" });
  });

  it("hides other players' hands and unplayed staging cards", () => {
    const G = makeState();
    const view = playerView(G, {}, "0");
    expect(view.players["0"].hand).toEqual([]);
    expect(view.players["1"].hand).toEqual([]);
    expect(view.players["1"].stagingArea).toEqual([]);
    expect(G.players["1"].hand).toEqual([{ rank: "2", suit: "H" }]);
  });
});
