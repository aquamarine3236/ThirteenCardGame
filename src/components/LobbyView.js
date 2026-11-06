import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import GithubCorner from "react-github-corner";
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { getServerUrl } from "../config";
import { default as BoardTienLen } from "../TienLenBoard";
import { default as GameTienLen } from "../TienLen";
import Rules from "./Rules";
import "./lobby.scss";
import { BrowserRouter as Router, Switch, Route, Link } from "react-router-dom";
import {
  DEFAULT_RULES,
  normalizeRules,
} from "../rules";

GameTienLen.minPlayers = GameTienLen.maxPlayers = 4;

const MATCH_STORAGE_KEY = "tien-len-match";
const ROOM_CREDS_KEY = "tien-len-room-creds";
const serverUrl = getServerUrl();
const GAME_NAME = GameTienLen.name;
const GameClient = Client({
  game: GameTienLen,
  numPlayers: 4,
  board: BoardTienLen,
  multiplayer: SocketIO({ server: serverUrl }),
});

const SUIT_SYMBOLS = { S: "♠", C: "♣", D: "♦", H: "♥" };
const RED_SUITS = { D: true, H: true };

function SuitSymbol({ suit }) {
  const symbol = SUIT_SYMBOLS[suit] || suit;
  if (RED_SUITS[suit]) {
    return <span className="red-suit">{symbol}</span>;
  }
  return <span>{symbol}</span>;
}
SuitSymbol.propTypes = {
  suit: PropTypes.string.isRequired,
};

async function lobbyRequest(path, options) {
  const response = await fetch(`${serverUrl}${path}`, {
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

function loadStoredMatch() {
  try {
    const raw = window.sessionStorage.getItem(MATCH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.matchID &&
      parsed.playerID != null &&
      parsed.credentials
    ) {
      return parsed;
    }
  } catch (error) {
    // Ignore corrupt storage.
  }
  return null;
}

function saveStoredMatch(match) {
  if (!match) {
    window.sessionStorage.removeItem(MATCH_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(match));
}

function loadRoomCreds() {
  try {
    const raw = window.sessionStorage.getItem(ROOM_CREDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveRoomCred(matchID, playerID, credentials) {
  const all = loadRoomCreds();
  all[matchID] = { playerID: String(playerID), credentials };
  window.sessionStorage.setItem(ROOM_CREDS_KEY, JSON.stringify(all));
}

function clearRoomCred(matchID) {
  const all = loadRoomCreds();
  delete all[matchID];
  window.sessionStorage.setItem(ROOM_CREDS_KEY, JSON.stringify(all));
}

function updateNested(value, section, key, nextValue) {
  return {
    ...value,
    [section]: { ...value[section], [key]: nextValue },
  };
}

function LobbyHome({
  onJoinMatch,
  initialPlayerName,
  roomCreds,
  onDeleteRoom,
}) {
  const [rooms, setRooms] = useState([]);
  const [playerName, setPlayerName] = useState(initialPlayerName || "");
  const [rules, setRules] = useState(() =>
    JSON.parse(JSON.stringify(DEFAULT_RULES))
  );
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function refreshRooms() {
      try {
        const response = await lobbyRequest(`/games/${GAME_NAME}`);
        if (active) {
          setRooms((response.matches || []).filter(room => !room.started));
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }
    refreshRooms();
    const timer = window.setInterval(refreshRooms, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  async function joinSeat(matchID, playerID) {
    const response = await lobbyRequest(
      `/games/${GAME_NAME}/${encodeURIComponent(matchID)}/join`,
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
      matchID,
      playerID: String(playerID),
      credentials: response.playerCredentials,
      playerName: playerName.trim(),
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
          setupData: { rules: validatedRules, roomMode: true },
        }),
      });
      if (!room.matchID) throw new Error("The lobby did not return a match ID.");
      await joinSeat(room.matchID, "0");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(matchID) {
    setError("");
    if (!playerName.trim()) {
      setError("Enter your player name before joining a room.");
      return;
    }
    try {
      setBusy(true);
      const room = await lobbyRequest(
        `/games/${GAME_NAME}/${encodeURIComponent(matchID)}`
      );
      const playerID = (room.players || []).findIndex(player => !player.name);
      if (playerID === -1) throw new Error("This room is full.");
      await joinSeat(matchID, playerID);
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

      {!creatingRoom ? (
        <button
          type="button"
          className="create-room-button"
          disabled={busy}
          onClick={() => {
            if (!playerName.trim()) {
              setError("Enter your player name before creating a room.");
              return;
            }
            setError("");
            setCreatingRoom(true);
          }}
        >
          Tạo phòng
        </button>
      ) : (
        <form className="custom-rules" onSubmit={createRoom}>
          <h2>Luật của phòng mới</h2>
          <p>Chủ phòng chọn luật trước khi tạo; luật được khóa trong suốt ván.</p>

        <fieldset className="opening-card-picker">
          <legend>Lá bắt buộc đánh đầu</legend>
          <div className="opening-card-options">
            {["S", "C", "D", "H"].map(suit => (
              <button
                type="button"
                key={suit}
                className={
                  rules.openingCard.suit === suit ? "selected" : ""
                }
                aria-pressed={rules.openingCard.suit === suit}
                onClick={() =>
                  setRules({
                    ...rules,
                    openingCard: { rank: "3", suit },
                  })
                }
              >
                3<SuitSymbol suit={suit} />
              </button>
            ))}
          </div>
        </fieldset>

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
          3♠ phải là lá cuối cùng người chơi đánh ra để được tính thắng trắng
        </label>
        {rules.threeSpadesFirstPlaceWhiteWin && (
          <p>Thắng trắng được tính gấp 2 lần tiền cược.</p>
        )}

        <fieldset>
          <legend>Đánh 2 khi hết bài</legend>
          <RuleCheckbox
            checked={rules.allowTwoAsLastCard}
            label="Cho phép dùng 2 ở nước đánh hết bài"
            onChange={checked =>
              setRules({ ...rules, allowTwoAsLastCard: checked })
            }
          />
        </fieldset>

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
              <option value="winner-vs-others">
                Nhất ăn những người còn lại
              </option>
              <option value="ranked">Tùy chỉnh tiền theo hạng 1, 2, 3, 4</option>
            </select>
          </label>
          <label>
            Tiền cược
            <input
              type="number"
              min="1"
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
              <span>
                Giá trị 2
                <SuitSymbol suit={suit} /> (lần tiền cược)
              </span>
              <input
                type="number"
                min="0"
                max="1000"
                value={rules.settlement.twoCardMultipliers[suit]}
                onChange={event =>
                  setRules(
                    updateNested(rules, "settlement", "twoCardMultipliers", {
                      ...rules.settlement.twoCardMultipliers,
                      [suit]: Number(event.target.value),
                    })
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
          <p>
            Mỗi người bắt đầu với {rules.settlement.baseStake * 100} chip (100
            lần tiền cược cơ sở).
          </p>
        </fieldset>

          <div className="room-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Đang tạo..." : "Tạo phòng với luật này"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreatingRoom(false)}
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {error && <p className="error-msg" role="alert">{error}</p>}
      <section className="room-list">
        <h2>Phòng đang chờ</h2>
        {rooms.length === 0 ? (
          <p>Chưa có phòng đang chờ.</p>
        ) : (
          <ul>
            {rooms.map(room => {
              const matchID = room.matchID;
              const joined = (room.players || []).filter(player => player.name);
              const openSeats = 4 - joined.length;
              const canDelete =
                Boolean(roomCreds[matchID]) &&
                roomCreds[matchID].playerID === "0";
              const opening = room.setupData && room.setupData.rules
                ? room.setupData.rules.openingCard
                : null;
              return (
                <li key={matchID}>
                  <button
                    className="room-card"
                    type="button"
                    disabled={busy || openSeats === 0}
                    onClick={() => joinRoom(matchID)}
                  >
                    Phòng {matchID} — {joined.length}/4 người
                    {opening ? (
                      <>
                        {" "}
                        — lá đầu {opening.rank}
                        <SuitSymbol suit={opening.suit} />
                      </>
                    ) : (
                      ""
                    )}
                    <span className="room-card-action">
                      {openSeats === 0 ? "Đã đủ người" : "Nhấn để vào phòng"}
                    </span>
                  </button>
                  <span className="room-actions">
                    {canDelete && (
                      <button
                        type="button"
                        className="danger"
                        disabled={busy}
                        onClick={async () => {
                          try {
                            setBusy(true);
                            setError("");
                            await onDeleteRoom(matchID, roomCreds[matchID]);
                            const response = await lobbyRequest(
                              `/games/${GAME_NAME}`
                            );
                            setRooms(
                              (response.matches || []).filter(
                                listedRoom => !listedRoom.started
                              )
                            );
                          } catch (requestError) {
                            setError(requestError.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Xóa phòng
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

LobbyHome.propTypes = {
  onJoinMatch: PropTypes.func.isRequired,
  initialPlayerName: PropTypes.string,
  roomCreds: PropTypes.object,
  onDeleteRoom: PropTypes.func.isRequired,
};

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

function MatchRoom({
  match,
  onLeaveMatch,
  onDeleteRoom,
  leaving,
  deleting,
  leaveError,
}) {
  const [room, setRoom] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function refreshRoom() {
      try {
        const response = await lobbyRequest(
          `/games/${GAME_NAME}/${encodeURIComponent(match.matchID)}`
        );
        if (active) {
          setRoom(response);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    }

    refreshRoom();
    const timer = window.setInterval(refreshRoom, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [match.matchID]);

  const players = (room && room.players) || [];
  const joined = players.filter(player => player.name);
  const isHost = match.playerID === "0";
  const waiting = !room || !room.started;

  async function startGame() {
    setStarting(true);
    setError("");
    try {
      await lobbyRequest(
        `/games/${GAME_NAME}/${encodeURIComponent(match.matchID)}/start`,
        {
          method: "POST",
          body: JSON.stringify({
            playerID: match.playerID,
            credentials: match.credentials,
          }),
        }
      );
      setRoom(previous => ({ ...previous, started: true }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="match-shell">
      <div className="match-toolbar">
        <button
          type="button"
          onClick={onLeaveMatch}
          disabled={
            leaving ||
            deleting ||
            (waiting && isHost)
          }
          title={
            waiting && isHost
              ? "Chủ phòng cần ở lại phòng cho đến khi bắt đầu ván."
              : ""
          }
        >
          {leaving ? "Đang thoát..." : "Về phòng chờ"}
        </button>
        {waiting && isHost && (
          <>
            <button
              type="button"
              onClick={startGame}
              disabled={starting || joined.length < 2}
            >
              {starting
                ? "Đang bắt đầu..."
                : joined.length < 2
                  ? `Cần thêm người chơi (${joined.length}/2)`
                  : `Bắt đầu ván (${joined.length}/4)`}
            </button>
            <button
              type="button"
              className="danger"
              onClick={onDeleteRoom}
              disabled={leaving || deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa phòng"}
            </button>
          </>
        )}
      </div>
      {waiting && (
        <section className="room-waiting">
          <h2>Đang chờ người chơi</h2>
          <p>
            {joined.length}/4 người đã vào. Cần ít nhất 2 người để bắt đầu.
          </p>
          <ul>
            {players.map(player => (
              <li key={player.id}>
                {player.name || "Đang chờ người chơi"}{" "}
                {String(player.id) === "0" ? "(chủ phòng)" : ""}
              </li>
            ))}
          </ul>
          {!isHost && <p>Chủ phòng sẽ bắt đầu ván khi mọi người sẵn sàng.</p>}
        </section>
      )}
      {(leaveError || error) && (
        <p className="error-msg" role="alert">
          {leaveError || error}
        </p>
      )}
      <GameClient
        key={room && room.started ? "started" : "waiting"}
        matchID={match.matchID}
        playerID={match.playerID}
        credentials={match.credentials}
      />
    </div>
  );
}

MatchRoom.propTypes = {
  match: PropTypes.object.isRequired,
  onLeaveMatch: PropTypes.func.isRequired,
  onDeleteRoom: PropTypes.func.isRequired,
  leaving: PropTypes.bool,
  deleting: PropTypes.bool,
  leaveError: PropTypes.string,
};

function LobbyView() {
  const [match, setMatch] = useState(() => loadStoredMatch());
  const [roomCreds, setRoomCreds] = useState(() => loadRoomCreds());
  const [savedPlayerName, setSavedPlayerName] = useState(() => {
    const stored = loadStoredMatch();
    return (stored && stored.playerName) || "";
  });
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const handleJoinMatch = useCallback(nextMatch => {
    saveStoredMatch(nextMatch);
    saveRoomCred(nextMatch.matchID, nextMatch.playerID, nextMatch.credentials);
    setRoomCreds(loadRoomCreds());
    setSavedPlayerName(nextMatch.playerName || "");
    setMatch(nextMatch);
    setLeaveError("");
  }, []);

  const deleteRoom = useCallback(async (matchID, cred) => {
    await lobbyRequest(
      `/games/${GAME_NAME}/${encodeURIComponent(matchID)}/delete`,
      {
        method: "POST",
        body: JSON.stringify({
          playerID: cred.playerID,
          credentials: cred.credentials,
        }),
      }
    );
    clearRoomCred(matchID);
    setRoomCreds(loadRoomCreds());
    const stored = loadStoredMatch();
    if (stored && stored.matchID === matchID) {
      saveStoredMatch(null);
      setMatch(null);
    }
  }, []);

  async function leaveMatch() {
    if (!match || leaving) return;
    setLeaving(true);
    setLeaveError("");
    try {
      await lobbyRequest(
        `/games/${GAME_NAME}/${encodeURIComponent(match.matchID)}/leave`,
        {
          method: "POST",
          body: JSON.stringify({
            playerID: match.playerID,
            credentials: match.credentials,
          }),
        }
      );
    } catch (error) {
      // Still clear local session so the player can rejoin; show error briefly.
      setLeaveError(error.message);
    } finally {
      setSavedPlayerName(match.playerName || savedPlayerName);
      saveStoredMatch(null);
      setMatch(null);
      setLeaving(false);
    }
  }

  async function deleteCurrentRoom() {
    if (!match || deleting) return;
    setDeleting(true);
    setLeaveError("");
    try {
      await deleteRoom(match.matchID, {
        playerID: match.playerID,
        credentials: match.credentials,
      });
      setSavedPlayerName(match.playerName || savedPlayerName);
    } catch (error) {
      setLeaveError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-shell">
      <Router>
        <div className="lobby-nav">
          <button className="tien-len" type="button">
            <Link to="/">Tiến Lên</Link>
          </button>
          <button className="tien-len" type="button">
            <Link to="/rules">Rules</Link>
          </button>
        </div>
        <Switch>
          <Route exact path="/">
            {match ? (
              <MatchRoom
                match={match}
                onLeaveMatch={leaveMatch}
                onDeleteRoom={deleteCurrentRoom}
                leaving={leaving}
                deleting={deleting}
                leaveError={leaveError}
              />
            ) : (
              <LobbyHome
                onJoinMatch={handleJoinMatch}
                initialPlayerName={savedPlayerName}
                roomCreds={roomCreds}
                onDeleteRoom={deleteRoom}
              />
            )}
          </Route>
          <Route path="/rules">
            <Rules />
          </Route>
        </Switch>
      </Router>
      <GithubCorner
        href="https://github.com/nguyenank/tien-len"
        octoColor="#e9e4d8"
        bannerColor="#a84830"
      />
    </div>
  );
}

export default LobbyView;
