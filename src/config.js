export const GAME_SERVER_PORT = 8000;
export const GAME_SERVER_URL = `http://localhost:${GAME_SERVER_PORT}`;
export const WEB_SERVER_URL = `http://localhost:${GAME_SERVER_PORT}`;
export const APP_PRODUCTION = process.env.NODE_ENV === "production";
export const LOBBY = true;

/**
 * Resolve the boardgame.io server origin for lobby HTTP and Socket.IO.
 * Production defaults to same-origin (window.location.origin) so HTTPS
 * hosts without an explicit port do not produce broken URLs like "https://host:".
 * Override with REACT_APP_SERVER_URL when the API is on a different host.
 */
export function getServerUrl() {
  if (typeof process !== "undefined" && process.env.REACT_APP_SERVER_URL) {
    return process.env.REACT_APP_SERVER_URL.replace(/\/$/, "");
  }
  if (APP_PRODUCTION && typeof window !== "undefined") {
    return window.location.origin;
  }
  return GAME_SERVER_URL;
}
