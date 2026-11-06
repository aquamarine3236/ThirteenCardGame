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
  isFinalPlay,
  tienLenPlay,
}) {
  const stagingArea = player.stagingArea;
  const handType = validCombination(stagingArea);
  let classList;
  const validation = validPlay(
    stagingArea,
    "any",
    [],
    requiredOpeningCard,
    rules,
    isFinalPlay
  );
  const invalidPlay = validation !== true;
  if (invalidPlay) {
    classList = "disabled";
  } else if (
    validChop(center, stagingArea, rules) ||
    (roundType === handType &&
      compareHighest(stagingArea, center) === 1 &&
      stagingArea.length === center.length)
  ) {
    classList = "tien-len";
  }
  return (
    <button
      className={classList}
      disabled={invalidPlay}
      key="tienLenPlay"
      title={invalidPlay ? validation : undefined}
      type="button"
      onClick={invalidPlay ? () => null : () => tienLenPlay()}
    >
      Play
    </button>
  );
}

TienLenButton.propTypes = {
  player: PropTypes.object,
  roundType: PropTypes.string,
  center: PropTypes.array,
  requiredOpeningCard: PropTypes.object,
  rules: PropTypes.object,
  isFinalPlay: PropTypes.bool,
  tienLenPlay: PropTypes.func,
};
