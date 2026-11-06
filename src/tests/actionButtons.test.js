import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PlayCardsButton from "../components/buttons/PlayCardsButton";
import TienLenButton from "../components/buttons/TienLenButton";
import { DEFAULT_RULES } from "../rules";
import { Combinations } from "../constants";

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
