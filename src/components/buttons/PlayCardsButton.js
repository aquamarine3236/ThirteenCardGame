import React from "react";
import PropTypes from "prop-types";
import { validPlay } from "../../moves/cardPlayMoves";

export default function PlayCardsButton({
  currentPlayer,
  playerID,
  player,
  roundType,
  center,
  requiredOpeningCard,
  rules,
  isFinalPlay,
  cardsToCenter,
}) {
  const stagingArea = player.stagingArea;
  const p = validPlay(
    stagingArea,
    roundType,
    center,
    requiredOpeningCard,
    rules,
    isFinalPlay
  );
  if (typeof p === "string") {
    return (
      <button
        className="disabled"
        disabled={true}
        key="playcards"
        title={p}
        type="button"
      >
        Play
      </button>
    );
  } else if (playerID !== currentPlayer) {
    return (
      <button className="wait" key="playcards" type="button">
        Play
      </button>
    );
  } else {
    return (
      <button type="button" onClick={() => cardsToCenter()}>
        Play
      </button>
    );
  }
}

PlayCardsButton.propTypes = {
  currentPlayer: PropTypes.string,
  playerID: PropTypes.string,
  player: PropTypes.object,
  roundType: PropTypes.string,
  center: PropTypes.array,
  requiredOpeningCard: PropTypes.object,
  rules: PropTypes.object,
  isFinalPlay: PropTypes.bool,
  cardsToCenter: PropTypes.func,
};
