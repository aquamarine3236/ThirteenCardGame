import React, { PureComponent } from "react";
import PropTypes from "prop-types";

import StagingAreaButtons from "./buttons/StagingAreaButtons";
import PassButton from "./buttons/PassButton";
import PlayCardsButton from "./buttons/PlayCardsButton";
import TienLenButton from "./buttons/TienLenButton";

export default class Buttons extends PureComponent {
  render() {
    const currentPlayer = this.props.ctx.currentPlayer === this.props.playerID;
    const tienLen =
      this.props.ctx.activePlayers[this.props.ctx.currentPlayer] === "tienLen";
    const player = this.props.G.players[this.props.playerID];
    const requiredOpeningCard = this.props.G.firstMove
      ? this.props.G.rules.openingCard
      : null;
    const isFinalPlay =
      this.props.G.cardsLeft[this.props.playerID] === player.stagingArea.length;
    const playButton =
      currentPlayer && tienLen ? (
        <TienLenButton
          player={player}
          roundType={this.props.G.roundType}
          center={this.props.G.center}
          requiredOpeningCard={requiredOpeningCard}
          rules={this.props.G.rules}
          isFinalPlay={isFinalPlay}
          tienLenPlay={this.props.moves.tienLenPlay}
        />
      ) : (
        <PlayCardsButton
          currentPlayer={this.props.ctx.currentPlayer}
          playerID={this.props.playerID}
          player={player}
          roundType={this.props.G.roundType}
          center={this.props.G.center}
          requiredOpeningCard={requiredOpeningCard}
          rules={this.props.G.rules}
          isFinalPlay={isFinalPlay}
          cardsToCenter={this.props.moves.cardsToCenter}
        />
      );
    const passButton =
      currentPlayer && !tienLen ? (
        <PassButton passTurn={this.props.moves.passTurn} />
      ) : (
        ""
      );
    return (
      <div className="action-bar">
        <div className="sort-play-actions">
          <StagingAreaButtons
            currentPlayer={this.props.ctx.currentPlayer}
            playerID={this.props.playerID}
            sortStagingArea={this.props.moves.sortStagingArea}
          />
          {playButton}
        </div>
        <div className="center-container">{passButton}</div>
      </div>
    );
  }
}

Buttons.propTypes = {
  G: PropTypes.object,
  ctx: PropTypes.object,
  moves: PropTypes.object,
  playerID: PropTypes.string,
};
