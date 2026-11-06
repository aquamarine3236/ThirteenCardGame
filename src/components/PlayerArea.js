// src/components/PlayerArea.js
import PropTypes from "prop-types";
import React, { Component } from "react";
import Buttons from "./Buttons";
import { getClassName } from "./_helperFunctions";
import CardArea from "./CardArea";
import PlayerStatus from "./PlayerStatus";
import { DragDropContext } from "react-beautiful-dnd";
const _ = require("lodash");

export default class PlayerArea extends Component {
  render() {
    let playerArea = [];
    const playerID = this.props.playerID;

    if (playerID) {
      const winner = this.props.G.winners.findIndex(x => x === playerID);
      const matchData = this.props.matchData || this.props.gameMetadata;
      const player = _.find(matchData, {
        id: parseInt(playerID),
      });
      const playerName = player ? player.name : playerID;
      playerArea.push(
        <div className="center-container" key="winScreen">
          <PlayerStatus
            playerName={playerName}
            cardsLeft={this.props.G.cardsLeft[playerID]}
            balance={this.props.G.netBalances[playerID]}
            className={
              getClassName(this.props, playerID, "player-status") + " no-shadow"
            }
            winner={winner}
          />
        </div>
      );
      if (!this.props.G.started) {
        playerArea.push(
          <div className="center-container" key="waiting">
            Đang chờ chủ phòng bắt đầu ván.
          </div>
        );
      } else if (winner === -1 && !this.props.G.handComplete) {
        const choosingLead =
          this.props.G.pendingThreePairLeadPlayer === playerID;
        if (choosingLead) {
          playerArea.push(
            <div className="center-container" key="leadChoice">
              <button
                type="button"
                onClick={() => this.props.moves.acceptThreePairLead()}
              >
                Mở ván bằng 3 đôi thông
              </button>
              <button
                type="button"
                onClick={() => this.props.moves.declineThreePairLead()}
              >
                Nhường quyền mở ván
              </button>
            </div>
          );
        } else if (!this.props.G.pendingThreePairLeadPlayer) {
          playerArea.push(
            <div className="center-container" key="stagingArea">
              <CardArea
                className={getClassName(
                  this.props,
                  this.props.playerID,
                  "staging-area"
                )}
                listName="stagingArea"
                reorderable={true}
                cards={this.props.G.players[playerID].stagingArea}
                onCardClick={card =>
                  this.props.moves.relocateCards([card], "hand")
                }
              />
            </div>
          );
          playerArea.push(
            <div key="buttons">
              <Buttons {...this.props} />
            </div>
          );
        }
        playerArea.push(
          <div className="center-container" key="hand">
            <CardArea
              className={getClassName(this.props, playerID, "hand")}
              listName="hand"
              reorderable={true}
              cards={this.props.G.players[playerID].hand}
              onCardClick={card =>
                this.props.moves.relocateCards([card], "stagingArea")
              }
            />
          </div>
        );
      } else {
        playerArea.push(
          <div key="congratulations" className="center-container">
            {this.props.G.handComplete ? "Ván đã kết thúc." : "Congratulations!"}
          </div>
        );
      }
    }
    return (
      <DragDropContext
        onDragEnd={result => this.props.moves.relocateCards(result)}
      >
        <div className={getClassName(this.props, playerID, "player-area")}>
          {playerArea}
        </div>
      </DragDropContext>
    );
  }
}

PlayerArea.propTypes = {
  G: PropTypes.object,
  ctx: PropTypes.object,
  moves: PropTypes.object,
  playerID: PropTypes.string,
  matchData: PropTypes.array,
  gameMetadata: PropTypes.array,
};
