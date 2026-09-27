// Two-phone sessions: secrets, join codes, and what each phone may see. Used by the client and Convex.
import { match } from "./play.ts";
import type { Limits } from "./tags.ts";

/** Where this phone keeps its player key (localStorage, so a closed tab can rejoin; clear-data removes it). */
export const PAIR_KEY = "maan:pair";
export const INVITE_MS = 10 * 60_000;
export const IDLE_MS = 24 * 60 * 60_000;
export const HEARTBEAT_MS = 10_000;
/** A partner silent this long, by the server's clock, shows as disconnected. */
export const AWAY_MS = 25_000;

// No 0/O or 1/I/L, so a code read off a screen can't be mistyped.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 8;

/**
 * 128 random bits from the platform CSPRNG, base64url: player keys and invite
 * links. Made on the phone, because Convex mutations only get a seeded PRNG.
 */
export function secret() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function joinCode() {
  let code = "";
  while (code.length < CODE_LENGTH) {
    const [byte] = crypto.getRandomValues(new Uint8Array(1));
    // 248 = 8 × 31: dropping the rest keeps every symbol equally likely.
    if (byte < 248) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

export const isSecret = (s: string) => /^[\w-]{22}$/.test(s);
export const isCode = (s: string) =>
  s.length === CODE_LENGTH && [...s].every((c) => CODE_ALPHABET.includes(c));

/** A code as typed: any case, spaces or dashes, Arabic-Indic digits. */
export function readCode(typed: string) {
  return typed
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "");
}

export type Seat = "host" | "guest";
export type Player = {
  key: string;
  seen: number;
  page?: string;
  limits?: Limits;
};
/** One round of secret picks: each seat's list until both answer, then only the overlap. */
export type Round = { host?: string[]; guest?: string[]; matches?: string[] };
export type PairSession = {
  host: Player;
  guest?: Player;
  code?: string;
  invite?: string;
  inviteUntil: number;
  desires?: Round;
  discover?: Round;
  // Shared game state: the same card, spin, challenge and path step on both phones.
  cards?: unknown;
  wheel?: unknown;
  library?: unknown;
  path?: unknown;
};

export function seatOf(s: PairSession, key: string): Seat | null {
  if (s.host.key === key) return "host";
  if (s.guest?.key === key) return "guest";
  return null;
}

const otherSeat = (seat: Seat): Seat => (seat === "host" ? "guest" : "host");

/**
 * Stores one seat's picks (only those in the pool). The moment both have
 * answered, keeps what both picked and forgets both lists.
 */
export function answer(
  round: Round | undefined,
  seat: Seat,
  picks: readonly string[],
  pool: readonly { slug: string }[],
): Round {
  if (round?.matches) return round;
  const mine = pool.filter((i) => picks.includes(i.slug)).map((i) => i.slug);
  const theirs = round?.[otherSeat(seat)];
  if (!theirs) return { [seat]: mine };
  return { matches: match(pool, mine, theirs).map((i) => i.slug) };
}

/**
 * Everything one phone may see of its session, and nothing more: never a key,
 * never the partner's limits or picks (nor this phone's own), only whether each
 * has answered, and then only what both picked. Null for anyone not in it.
 */
export function viewFor<S extends PairSession>(s: S, key: string) {
  const seat = seatOf(s, key);
  if (!seat) return null;
  const me = s[seat] as Player;
  const partner = s[otherSeat(seat)];
  const round = (r: Round | undefined) => ({
    me: Boolean(r?.[seat]),
    partner: Boolean(r?.[otherSeat(seat)]),
    matches: r?.matches ?? null,
  });
  return {
    invite:
      seat === "host" && !partner && s.code && s.invite
        ? { code: s.code, link: s.invite, until: s.inviteUntil }
        : null,
    partner: partner
      ? {
          // Both timestamps are the server's, so phone clocks can't skew this.
          here: me.seen - partner.seen < AWAY_MS,
          page: partner.page ?? null,
        }
      : null,
    limits: { me: Boolean(me.limits), partner: Boolean(partner?.limits) },
    desires: round(s.desires),
    discover: round(s.discover),
    // Shared by both phones as they are; the casts keep the caller's types.
    cards: s.cards as S["cards"],
    wheel: s.wheel as S["wheel"],
    library: s.library as S["library"],
    path: s.path as S["path"],
  };
}
