import React from "react";
import PropTypes from "prop-types";

const requestImageFile = require.context("../assets/cards", false, /\.svg$/);

function resolveCardSrc(rank, suit) {
  const asset = requestImageFile(`./${rank}${suit}.svg`);
  if (typeof asset === "string") return asset;
  if (asset && typeof asset.default === "string") return asset.default;
  if (asset && asset.default == null && asset) return asset;
  return asset && asset.default;
}

export default function Card({
  rank,
  suit,
  disabled,
  selected,
  onClick,
  dragProvided,
}) {
  const id = rank + suit;
  return (
    <li
      ref={dragProvided ? dragProvided.innerRef : undefined}
      {...(dragProvided ? dragProvided.draggableProps : {})}
      className={selected ? "selected-card" : ""}
    >
      <button
        type="button"
        className="card-button"
        {...(dragProvided ? dragProvided.dragHandleProps : {})}
        onClick={onClick}
        disabled={disabled || !onClick}
        aria-label={`${selected ? "Bỏ chọn" : "Chọn"} lá ${id}`}
        aria-pressed={Boolean(selected)}
      >
        <img
          className="card"
          src={resolveCardSrc(rank, suit)}
          alt={id}
          draggable={false}
        />
      </button>
    </li>
  );
}

Card.propTypes = {
  rank: PropTypes.string.isRequired,
  suit: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  dragProvided: PropTypes.object,
};
