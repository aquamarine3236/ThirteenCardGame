import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlayCardsButton from "../components/buttons/PlayCardsButton";
import TienLenButton from "../components/buttons/TienLenButton";
import GameArea from "../components/GameArea";
import { DEFAULT_RULES } from "../rules";
import { Combinations } from "../constants";

jest.mock("../components/CardArea", () => () => null);

function getButtonMarkup(element) {
  return renderToStaticMarkup(element);
}

describe("action button labels", () => {
  it("keeps Play fixed when a regular play is invalid, waiting, or ready", () => {
    const invalid = getButtonMarkup(
      <PlayCardsButton
        currentPlayer="0"
        playerID="0"
        player={{ stagingArea: [] }}
        roundType={Combinations.ANY}
        center={[]}
        rules={DEFAULT_RULES}
        cardsToCenter={jest.fn()}
      />
    );
    const waiting = getButtonMarkup(
      <PlayCardsButton
        currentPlayer="1"
        playerID="0"
        player={{ stagingArea: [{ rank: "3", suit: "S" }] }}
        roundType={Combinations.ANY}
        center={[]}
        rules={DEFAULT_RULES}
        cardsToCenter={jest.fn()}
      />
    );
    const ready = getButtonMarkup(
      <PlayCardsButton
        currentPlayer="0"
        playerID="0"
        player={{ stagingArea: [{ rank: "3", suit: "S" }] }}
        roundType={Combinations.ANY}
        center={[]}
        rules={DEFAULT_RULES}
        cardsToCenter={jest.fn()}
      />
    );

    expect(invalid).toContain(">Play</button>");
    expect(waiting).toContain(">Play</button>");
    expect(ready).toContain(">Play</button>");
  });

  it("keeps Play fixed when free-play validation changes", () => {
    const invalid = getButtonMarkup(
      <TienLenButton
        player={{ stagingArea: [] }}
        roundType={Combinations.ANY}
        center={[]}
        rules={DEFAULT_RULES}
        tienLenPlay={jest.fn()}
      />
    );
    const ready = getButtonMarkup(
      <TienLenButton
        player={{ stagingArea: [{ rank: "3", suit: "S" }] }}
        roundType={Combinations.ANY}
        center={[]}
        rules={DEFAULT_RULES}
        tienLenPlay={jest.fn()}
      />
    );

    expect(invalid).toContain(">Play</button>");
    expect(ready).toContain(">Play</button>");
  });
});

describe("game results", () => {
  it("renders each rank once in the final results list", () => {
    const markup = renderToStaticMarkup(
      <GameArea
        playerID="0"
        ctx={{ currentPlayer: "0" }}
        moves={{ startNextHand: jest.fn() }}
        matchData={[{ id: 0, name: "Mây" }]}
        G={{
          handComplete: true,
          gameResults: {
            handNumber: 1,
            rankings: ["0"],
            netBalances: { 0: 1 },
            cumulativeBalances: { 0: 101 },
            whiteWin: false,
          },
          handResults: [],
          winners: ["0"],
          pendingThreePairLeadPlayer: null,
          turnOrder: [0, null, null, null],
          cardsLeft: { 0: 0 },
          netBalances: { 0: 101 },
        }}
      />
    );

    expect(markup).toContain("<li>Hạng 1: Mây: +1 (tổng: 101)</li>");
    expect(markup).not.toContain("1. Mây:");
  });
});
