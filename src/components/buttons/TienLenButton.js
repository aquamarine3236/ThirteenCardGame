import React from "react";
import PropTypes from "prop-types";
import {
  validCombination,
  validChop,
  compareHighest,
} from "../../moves/helper-functions/cardComparison";
import { validPlay } from "../../moves/cardPlayMoves";

export default function TienLenButton({
  player,
  roundType,
  center,
  requiredOpeningCard,
  rules,
  tienLenPlay,
}) {
  const stagingArea = player.stagingArea;
  const handType = validCombination(stagingArea);
  let classList;
  let text = "Tien Len - ";
  const validation = validPlay(
    stagingArea,
    "any",
    [],
    requiredOpeningCard,
    rules
  );
  const invalidPlay = validation !== true;
  if (invalidPlay) {
    text += validation;
    classList = "disabled";
  } else if (validChop(center, stagingArea, rules)) {
    text += "Tien Len";
    classList = "tien-len";
  } else if (
    roundType !== handType ||
    compareHighest(stagingArea, center) !== 1 ||
    stagingArea.length !== center.length
  ) {
    text += stagingArea.length === 1 ? "Play Card" : "Play Cards";
  } else {
    text += "Tien Len";
    classList = "tien-len";
  }
  return (
    <button
      className={classList}
      disabled={invalidPlay}
      key="tienLenPlay"
      onClick={invalidPlay ? () => null : () => tienLenPlay()}
    >
      {text}
    </button>
  );
}

TienLenButton.propTypes = {
  player: PropTypes.object,
  roundType: PropTypes.string,
  center: PropTypes.array,
  requiredOpeningCard: PropTypes.object,
  rules: PropTypes.object,
  tienLenPlay: PropTypes.func,
};
