import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import GithubCorner from "react-github-corner";
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { GAME_SERVER_URL, WEB_SERVER_URL, APP_PRODUCTION } from "../config";
import { default as BoardTienLen } from "../TienLenBoard";
import { default as GameTienLen } from "../TienLen";
import Rules from "./Rules";
import "./lobby.scss";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import {
  DEFAULT_RULES,
  normalizeRules,
  openingCardLabel,
} from "../rules";

GameTienLen.minPlayers = GameTienLen.maxPlayers = 4;

const { protocol, hostname, port } = window.location;
const gameServer = APP_PRODUCTION
  ? `${protocol}//${hostname}:${port}`
  : GAME_SERVER_URL;
const lobbyServer = APP_PRODUCTION
  ? `${protocol}//${hostname}:${port}`
  : WEB_SERVER_URL;
const GAME_NAME = GameTienLen.name;
const GameClient = Client({
  game: GameTienLen,
  numPlayers: 4,
  board: BoardTienLen,
  multiplayer: SocketIO({ server: gameServer }),
});

async function lobbyRequest(path, options) {
  const response = await fetch(`${lobbyServer}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers),
    },
  });
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`Lobby request failed (${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(
      data.error || data.message || `Lobby request failed (${response.status}).`
    );
  }
  return data;
}

function updateNested(value, section, key, nextValue) {
  return {
    ...value,
    [section]: { ...value[section], [key]: nextValue },
  };
}

function LobbyHome({ onJoinMatch }) {
  const [rooms, setRooms] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [rules, setRules] = useState(() =>
    JSON.parse(JSON.stringify(DEFAULT_RULES))
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const suitSymbols = { S: "♠", C: "♣", D: "♦", H: "♥" };

  useEffect(() => {
    let active = true;
    async function refreshRooms() {
      try {
        const response = await lobbyRequest(`/games/${GAME_NAME}`);
        if (active) setRooms(response.rooms || []);
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
      LobbyHome.propTypes = {
        onJoinMatch: PropTypes.func.isRequired,
      };
    }
    refreshRooms();
    const timer = window.setInterval(refreshRooms, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function joinSeat(roomID, playerID) {
    const response = await lobbyRequest(
      `/games/${GAME_NAME}/${encodeURIComponent(roomID)}/join`,
      {
        method: "POST",
        body: JSON.stringify({
          playerID: String(playerID),
          playerName: playerName.trim(),
        }),
      }
    );
    if (!response.playerCredentials) {
      throw new Error("The lobby did not return player credentials.");
    }
    onJoinMatch({
      matchID: roomID,
      playerID: String(playerID),
      credentials: response.playerCredentials,
    });
  }

  async function createRoom(event) {
    event.preventDefault();
    setError("");
    if (!playerName.trim()) {
      setError("Enter your player name before creating a room.");
      return;
    }
    try {
      const validatedRules = normalizeRules(rules);
      setBusy(true);
      const room = await lobbyRequest(`/games/${GAME_NAME}/create`, {
        method: "POST",
        body: JSON.stringify({
          numPlayers: 4,
          setupData: { rules: validatedRules },
        }),
      });
      if (!room.roomID) throw new Error("The lobby did not return a room ID.");
      await joinSeat(room.roomID, "0");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(roomID) {
    setError("");
    if (!playerName.trim()) {
      setError("Enter your player name before joining a room.");
      return;
    }
    try {
      setBusy(true);
      const room = await lobbyRequest(
        `/games/${GAME_NAME}/${encodeURIComponent(roomID)}`
      );
      const playerID = (room.players || []).findIndex(
        player => !player.name
      );
      if (playerID === -1) throw new Error("This room is full.");
      await joinSeat(roomID, playerID);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="custom-lobby">
      <h1>Tiến Lên</h1>
      <label className="player-name">
        Tên người chơi
        <input
          value={playerName}
          maxLength={32}
          onChange={event => setPlayerName(event.target.value)}
        />
      </label>

      <form className="custom-rules" onSubmit={createRoom}>
        <h2>Luật của phòng mới</h2>
        <p>Chủ phòng chọn luật trước khi tạo; luật được khóa trong suốt match.</p>

        <label>
          Lá bắt buộc đánh đầu
          <select
            value={rules.openingCard.suit}
            onChange={event =>
              setRules({
                ...rules,
                openingCard: { rank: "3", suit: event.target.value },
              })
            }
          >
            {["S", "C", "D", "H"].map(suit => (
              <option key={suit} value={suit}>
                {openingCardLabel({ rank: "3", suit })}
              </option>
            ))}
          </select>
        </label>

        <label className="check-rule">
          <input
            type="checkbox"
            checked={rules.threeSpadesFirstPlaceWhiteWin}
            onChange={event =>
              setRules({
                ...rules,
                threeSpadesFirstPlaceWhiteWin: event.target.checked,
              })
            }
          />
          Người cầm 3♠ đi đầu về nhất được tính thắng trắng
        </label>
        {rules.threeSpadesFirstPlaceWhiteWin && (
          <p>Thắng trắng được tính gấp 2 lần tiền cược.</p>
        )}

        <fieldset>
          <legend>3 đôi thông</legend>
          <RuleCheckbox
            checked={rules.chops.threePairSingleTwo}
            label="Chặt được 1 lá 2"
            onChange={checked =>
              setRules(updateNested(rules, "chops", "threePairSingleTwo", checked))
            }
          />
          <RuleCheckbox
            checked={!rules.chops.threePairSingleTwo}
            label="Không được chặt 2"
            onChange={checked =>
              setRules(
                updateNested(rules, "chops", "threePairSingleTwo", !checked)
              )
            }
          />
          <RuleCheckbox
            checked={rules.chops.threePairLead}
            label="Được quyền chọn mở đầu ván kế tiếp"
            onChange={checked =>
              setRules(updateNested(rules, "chops", "threePairLead", checked))
            }
          />
        </fieldset>

        <fieldset>
          <legend>Tứ quý</legend>
          <RuleCheckbox
            checked={
              rules.chops.fourKindSingleTwo || rules.chops.fourKindPairTwo
            }
            disabled={rules.chops.fourKindPairTwo}
            label="Chặt được 1 lá 2"
            onChange={checked =>
              setRules(updateNested(rules, "chops", "fourKindSingleTwo", checked))
            }
          />
          <RuleCheckbox
            checked={rules.chops.fourKindPairTwo}
            label="Chặt được 2 lá 2"
            onChange={checked =>
              setRules({
                ...rules,
                chops: {
                  ...rules.chops,
                  fourKindSingleTwo: true,
                  fourKindPairTwo: checked,
                },
              })
            }
          />
          <RuleCheckbox
            checked={rules.chops.fourKindCutRound}
            label="Cắt vòng"
            onChange={checked =>
              setRules(updateNested(rules, "chops", "fourKindCutRound", checked))
            }
          />
        </fieldset>

        <fieldset>
          <legend>4 đôi thông</legend>
          <RuleCheckbox
            checked={
              rules.chops.fourPairSingleTwo || rules.chops.fourPairPairTwo
            }
            disabled={rules.chops.fourPairPairTwo}
            label="Chặt được 1 lá 2"
            onChange={checked =>
              setRules(updateNested(rules, "chops", "fourPairSingleTwo", checked))
            }
          />
          <RuleCheckbox
            checked={rules.chops.fourPairPairTwo}
            label="Chặt được 2 lá 2"
            onChange={checked =>
              setRules({
                ...rules,
                chops: {
                  ...rules.chops,
                  fourPairSingleTwo: true,
                  fourPairPairTwo: checked,
                },
              })
            }
          />
          <RuleCheckbox
            checked={rules.chops.fourPairCutRound}
            label="Cắt vòng"
            onChange={checked =>
              setRules(updateNested(rules, "chops", "fourPairCutRound", checked))
            }
          />
        </fieldset>

        <fieldset>
          <legend>Kết toán tiền ảo</legend>
          <label>
            Cách tính thứ hạng
            <select
              value={rules.settlement.mode}
              onChange={event =>
                setRules(
                  updateNested(rules, "settlement", "mode", event.target.value)
                )
              }
            >
              <option value="winner-vs-others">Nhất ăn 3 người còn lại</option>
              <option value="ranked">Tùy chỉnh tiền theo hạng 1, 2, 3, 4</option>
            </select>
          </label>
          <label>
            Tiền cược
            <input
              type="number"
              min="0"
              max="1000000"
              value={rules.settlement.baseStake}
              onChange={event =>
                setRules(
                  updateNested(
                    rules,
                    "settlement",
                    "baseStake",
                    Number(event.target.value)
                  )
                )
              }
            />
          </label>
          {rules.settlement.mode === "ranked" && (
            <div className="rank-payouts">
              {rules.settlement.rankPayouts.map((amount, index) => (
                <label key={index}>
                  Hạng {index + 1} (hệ số tiền cược)
                  <input
                    type="number"
                    min="-1000"
                    max="1000"
                    value={amount}
                    onChange={event => {
                      const rankPayouts = rules.settlement.rankPayouts.slice();
                      rankPayouts[index] = Number(event.target.value);
                      setRules(
                        updateNested(
                          rules,
                          "settlement",
                          "rankPayouts",
                          rankPayouts
                        )
                      );
                    }}
                  />
                </label>
              ))}
              <small>
                Tổng hệ số phải bằng 0 (hiện tại:{" "}
                {rules.settlement.rankPayouts.reduce(
                  (sum, value) => sum + value,
                  0
                )}
                ).
              </small>
            </div>
          )}
          {["S", "C", "D", "H"].map(suit => (
            <label key={suit}>
              Giá trị 2{suitSymbols[suit]} (lần tiền cược)
              <input
                type="number"
                min="0"
                max="1000"
                value={rules.settlement.twoCardMultipliers[suit]}
                onChange={event =>
                  setRules(
                    updateNested(
                      rules,
                      "settlement",
                      "twoCardMultipliers",
                      {
                        ...rules.settlement.twoCardMultipliers,
                        [suit]: Number(event.target.value),
                      }
                    )
                  )
                }
              />
            </label>
          ))}
          <p>
            Hạng nhất ăn 3 lần tiền cược. Chặt/thối tính theo giá trị riêng
            từng lá 2; 2 lá 2 cộng giá trị của cả hai. Chỉ ghi tiền ảo, không
            có thanh toán tiền thật.
          </p>
        </fieldset>

        <button type="submit" disabled={busy}>
          {busy ? "Đang tạo..." : "Tạo phòng với luật này"}
        </button>
      </form>

      {error && <p className="error-msg" role="alert">{error}</p>}
      <section className="room-list">
        <h2>Phòng đang chờ</h2>
        {rooms.length === 0 ? (
          <p>Chưa có phòng đang chờ.</p>
        ) : (
          <ul>
            {rooms.map(room => {
              const joined = (room.players || []).filter(player => player.name);
              const openSeats = 4 - joined.length;
              return (
                <li key={room.roomID}>
                  <span>
                    Phòng {room.roomID} — {joined.length}/4 người
                    {room.setupData && room.setupData.rules
                      ? ` — lá đầu ${openingCardLabel(
                          room.setupData.rules.openingCard
                        )}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busy || openSeats === 0}
                    onClick={() => joinRoom(room.roomID)}
                  >
                    {openSeats === 0 ? "Đã đủ người" : "Vào phòng"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function RuleCheckbox({ checked, disabled, label, onChange }) {
  return (
    <label className="check-rule">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
RuleCheckbox.propTypes = {
  checked: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function LobbyView() {
  const [match, setMatch] = useState(null);
  return (
    <div style={{ padding: 50 }}>
      <Router>
        <div className="center-container">
          <button className="tien-len">
            <Link to="/">Tiến Lên</Link>
          </button>
          <button className="tien-len">
            <Link to="/rules">Rules</Link>
          </button>
        </div>
        <Switch>
          <Route exact path="/">
            {match ? (
              <div>
                <button type="button" onClick={() => setMatch(null)}>
                  Về phòng chờ
                </button>
                <GameClient
                  matchID={match.matchID}
                  playerID={match.playerID}
                  credentials={match.credentials}
                />
              </div>
            ) : (
              <LobbyHome onJoinMatch={setMatch} />
            )}
          </Route>
          <Route path="/rules">
            <Rules />
          </Route>
        </Switch>
      </Router>
      <GithubCorner
        href="https://github.com/nguyenank/tien-len"
        octoColor="#f7f3dc"
        bannerColor="#bd4a39"
      />
    </div>
  );
}

export default LobbyView;
