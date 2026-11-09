// src/components/GameArea.js
import PropTypes from "prop-types";
import React, { Component } from "react";
import { getClassName } from "./_helperFunctions";
import CardArea from "./CardArea";
import PlayerStatus from "./PlayerStatus";
import TurnTimer from "./TurnTimer";
const _ = require("lodash");

export default class GameArea extends Component {
  render() {
    const playerID = this.props.playerID;
    const pID = playerID ? parseInt(playerID) : 0;
    const matchData = this.props.matchData || this.props.gameMetadata;
    let player;
    let playerName;
    let gameArea = [];
    let centerRow = [];
    const leadCandidate = this.props.G.pendingThreePairLeadPlayer;
    const leadPlayer = leadCandidate
      ? _.find(matchData, {
          id: parseInt(leadCandidate, 10),
        })
      : null;
    for (let i of [2, 3, "center", 1, 0]) {
      if (i === "center") {
        const center = this.props.G.handComplete ? (
          <div key="center" className="round-type game-results">
            <strong>Ván {this.props.G.gameResults.handNumber} kết thúc</strong>
            {this.props.G.gameResults && (
              <ol>
                {this.props.G.gameResults.rankings.map((playerID, rank) => {
                  const metadata = _.find(matchData, {
                    id: parseInt(playerID, 10),
                  });
                  const amount =
                    this.props.G.gameResults.netBalances[playerID];
                  const cumulative =
                    this.props.G.gameResults.cumulativeBalances[playerID];
                  const isLastPlace =
                    this.props.G.gameResults.lastPlacePlayerIDs &&
                    this.props.G.gameResults.lastPlacePlayerIDs.includes(
                      playerID
                    );
                  return (
                    <li key={playerID}>
                      {isLastPlace ? "Về bét: " : `Hạng ${rank + 1}: `}
                      {metadata ? metadata.name : playerID}:{" "}
                      {amount > 0 ? "+" : ""}
                      {amount} (tổng: {cumulative})
                    </li>
                  );
                })}
              </ol>
            )}
            {this.props.G.gameResults &&
              this.props.G.gameResults.whiteWin && <p>Thắng trắng!</p>}
            <details>
              <summary>Lịch sử kết toán các ván</summary>
              <ol>
                {this.props.G.handResults.map(result => (
                  <li key={result.handNumber}>
                    Ván {result.handNumber}:{" "}
                    {result.rankings.map((resultPlayerID, rank) => {
                      const resultPlayer = _.find(matchData, {
                        id: parseInt(resultPlayerID, 10),
                      });
                      const amount = result.netBalances[resultPlayerID];
                      const isLastPlace =
                        result.lastPlacePlayerIDs &&
                        result.lastPlacePlayerIDs.includes(resultPlayerID);
                      return (
                        <span key={resultPlayerID}>
                          {isLastPlace ? "Bét: " : `${rank + 1}. `}
                          {resultPlayer ? resultPlayer.name : resultPlayerID}{" "}
                          {amount > 0 ? "+" : ""}
                          {amount}
                          {rank < result.rankings.length - 1 ? "; " : ""}
                        </span>
                      );
                    })}
                  </li>
                ))}
              </ol>
            </details>
            {String(playerID) === "0" && (
              <button
                type="button"
                onClick={() => this.props.moves.startNextHand()}
              >
                Bắt đầu ván tiếp theo
              </button>
            )}
          </div>
        ) : (
          <div key="center" className="round-type">
            {this.props.G.pendingThreePairLeadPlayer && (
              <p>
                {leadPlayer ? leadPlayer.name : `Người chơi ${leadCandidate}`}{" "}
                có bộ 3 đôi thông nhỏ nhất và được quyền mở ván.
              </p>
            )}
            {this.props.G.roundType}
            {this.props.G.started && (
              <TurnTimer deadlineAt={this.props.G.turnDeadlineAt} />
            )}
            <CardArea
              className="center"
              listName="center"
              cards={this.props.G.center}
              disabled={true}
            />
          </div>
        );
        centerRow.push(center);
      } else {
        const index = (i + pID) % 4;
        const indexString = index.toString();
        const playerStatusClassName = getClassName(
          this.props,
          indexString,
          "player-status"
        );
        if (i === 2 || (i === 0 && !playerID)) {
          player = _.find(matchData, { id: index });
          playerName = player ? player.name : indexString;
          gameArea.push(
            <div className="center-container" key={indexString}>
              <PlayerStatus
                playerName={playerName}
                cardsLeft={this.props.G.cardsLeft[index]}
                balance={this.props.G.netBalances[index]}
                className={playerStatusClassName}
                winner={this.props.G.winners.findIndex(x => x === indexString)}
              />
            </div>
          );
        } else if (i % 2 === 1) {
          player = _.find(matchData, { id: index });
          playerName = player ? player.name : indexString;
          centerRow.push(
            <div key={indexString}>
              <PlayerStatus
                playerName={playerName}
                cardsLeft={this.props.G.cardsLeft[index]}
                balance={this.props.G.netBalances[index]}
                className={playerStatusClassName}
                winner={this.props.G.winners.findIndex(x => x === indexString)}
              />
            </div>
          );
          if (i === 1) {
            gameArea.push(
              <div key="centerRow" className="center-row">
                {centerRow}
              </div>
            );
          }
        }
      }
    }
    return <div className="game-area">{gameArea}</div>;
  }
}

GameArea.propTypes = {
  G: PropTypes.object,
  ctx: PropTypes.object,
  moves: PropTypes.object,
  playerID: PropTypes.string,
  matchData: PropTypes.array,
  gameMetadata: PropTypes.array,
};
