// src/PlayerStatus.js
import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import Emoji from "a11y-react-emoji";

export default class PlayerStatus extends PureComponent {
  render() {
    return (
      <div className={this.props.className}>
        {this.props.playerName}
        {winners(this.props.winner, this.props.cardsLeft)}
        {this.props.balance !== undefined && (
          <div className="player-balance">Chip: {this.props.balance}</div>
        )}
      </div>
    );
  }
}

function winners(winner, cardsLeft) {
  switch (winner) {
    case 0:
      return (
        <div>
          <Emoji symbol="🥇" label="1st place" />
        </div>
      );
    case 1:
      return (
        <div>
          <Emoji symbol="🥈" label="2nd place" />
        </div>
      );
    case 2:
      return (
        <div>
          <Emoji symbol="🥉" label="3rd place" />
        </div>
      );
    default:
      return (
        <div>
          <Emoji symbol="🂠" label="cards left" />: {cardsLeft}
        </div>
      );
  }
}

PlayerStatus.propTypes = {
  playerName: PropTypes.string,
  cardsLeft: PropTypes.number,
  balance: PropTypes.number,
  className: PropTypes.string,
  winner: PropTypes.number,
};
