// src/Card.js
import React from "react";
import Card from "./Card";
import PropTypes from "prop-types";

export default function CardArea({
  cards,
  className,
  listName,
  disabled,
  onCardClick,
}) {
  return (
    <ul className={className}>
      {cards.map(card => (
        <Card
          rank={card.rank}
          suit={card.suit}
          key={card.rank + card.suit}
          disabled={disabled}
          selected={listName === "stagingArea"}
          onClick={onCardClick ? () => onCardClick(card) : undefined}
        />
      ))}
    </ul>
  );
}

CardArea.propTypes = {
  cards: PropTypes.array,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  listName: PropTypes.string,
  onCardClick: PropTypes.func,
};
