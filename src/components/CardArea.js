// src/Card.js
import React from "react";
import Card from "./Card";
import PropTypes from "prop-types";
import { Draggable, Droppable } from "react-beautiful-dnd";

export default function CardArea({
  cards,
  className,
  listName,
  disabled,
  onCardClick,
  reorderable,
}) {
  const renderCard = (card, dragProvided) => (
    <Card
      rank={card.rank}
      suit={card.suit}
      key={card.rank + card.suit}
      disabled={disabled}
      selected={listName === "stagingArea"}
      onClick={onCardClick ? () => onCardClick(card) : undefined}
      dragProvided={dragProvided}
    />
  );

  if (!reorderable) {
    return (
      <ul className={className}>
        {cards.map(card => renderCard(card))}
      </ul>
    );
  }

  return (
    <Droppable droppableId={listName} direction="horizontal">
      {provided => (
        <ul
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={className}
        >
          {cards.map((card, index) => (
            <Draggable
              key={card.rank + card.suit}
              draggableId={card.rank + card.suit}
              index={index}
            >
              {dragProvided => renderCard(card, dragProvided)}
            </Draggable>
          ))}
          {provided.placeholder}
        </ul>
      )}
    </Droppable>
  );
}

CardArea.propTypes = {
  cards: PropTypes.array,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  listName: PropTypes.string,
  onCardClick: PropTypes.func,
  reorderable: PropTypes.bool,
};
