import { useState, useEffect, useCallback, useRef } from "react";
import bgImage from "./bg1.png";

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS_LIGHT = ["red", "blue", "green", "yellow"];
const COLORS_DARK = ["pink", "teal", "orange", "purple"];

const COLOR_HEX = {
  red: "#ff5555", blue: "#5555ff", green: "#55aa55", yellow: "#ffaa00",
  pink: "#ff1493", teal: "#008080", orange: "#ff8c00", purple: "#9400d3",
  wild: "#000",
};

const COLOR_LABEL = {
  red: "Red", blue: "Blue", green: "Green", yellow: "Yellow",
  pink: "Pink", teal: "Teal", orange: "Orange", purple: "Purple",
};

function actionDisplay(type) {
  const m = {
    skip: "⊘", reverse: "⇄", draw_one: "+1", flip: "↻",
    skip_everyone: "⊘", draw_five: "+5",
    wild: "W", wild_draw_two: "+2",
    wild_draw_color: "🎨",
  };
  return m[type] || type;
}

let _id = 0;
function mkCard(side, type, color, value) {
  return {
    id: _id++,
    side,
    type,
    color,
    value: value ?? null,
    display: type === "number" ? String(value) : actionDisplay(type)
  };
}

const TYPE_MAP = {
  light: {
    skip: "skip_everyone",
    draw_one: "draw_five",
    wild_draw_two: "wild_draw_color",
  },
  dark: {
    skip_everyone: "skip",
    draw_five: "draw_one",
    wild_draw_color: "wild_draw_two",
  }
};

function flipCard(card, newSide) {
  const oppColors = newSide === "light" ? COLORS_LIGHT : COLORS_DARK;
  const srcColors = newSide === "light" ? COLORS_DARK : COLORS_LIGHT;
  const idx = srcColors.indexOf(card.color);
  const newColor = idx >= 0 ? oppColors[idx] : card.color;

  let newType = card.type;
  if (TYPE_MAP[card.side]?.[card.type]) {
    newType = TYPE_MAP[card.side][card.type];
  }

  return {
    ...card,
    side: newSide,
    color: newColor,
    type: newType,
    display: newType === "number" ? String(card.value) : actionDisplay(newType)
  };
}

function buildDeck(side) {
  const colors = side === "light" ? COLORS_LIGHT : COLORS_DARK;
  const actions = side === "light"
    ? ["skip", "reverse", "draw_one", "flip"]
    : ["skip_everyone", "reverse", "draw_five", "flip"];
  const deck = [];
  colors.forEach(c => {
    for (let n = 0; n <= 9; n++) {
      deck.push(mkCard(side, "number", c, n));
      if (n > 0) deck.push(mkCard(side, "number", c, n));
    }
    actions.forEach(a => {
      deck.push(mkCard(side, a, c, null));
      deck.push(mkCard(side, a, c, null));
    });
  });
  // Wild cards — light side: wild + wild_draw_two; dark side: wild + wild_draw_color
  for (let i = 0; i < 4; i++) {
    deck.push(mkCard(side, "wild", "wild", null));
    if (side === "light") {
      deck.push(mkCard(side, "wild_draw_two", "wild", null));
    } else {
      deck.push(mkCard(side, "wild_draw_color", "wild", null));
    }
  }
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlay(card, top, chosenColor) {
  if (!top) return true;
  if (card.type === "wild" || card.type === "wild_draw_two" || card.type === "wild_draw_color") return true;
  const eff = chosenColor || top.color;
  if (card.color === eff) return true;
  if (card.type === "number" && top.type === "number" && card.value === top.value) return true;
  if (card.type !== "number" && top.type !== "number" && card.type === top.type) return true;
  return false;
}

function calcPoints(hand) {
  return hand.reduce((s, c) => {
    if (c.type === "number") return s + c.value;
    if (c.type === "draw_one") return s + 10;
    if (c.type === "draw_five") return s + 20;
    if (c.type === "reverse") return s + 20;
    if (c.type === "skip") return s + 20;
    if (c.type === "skip_everyone") return s + 30;
    if (c.type === "flip") return s + 20;
    if (c.type === "wild") return s + 40;
    if (c.type === "wild_draw_two") return s + 50;
    if (c.type === "wild_draw_color") return s + 60;
    return s + 20;
  }, 0);
}

// ─── Game Engine ──────────────────────────────────────────────────────────────
function initGame(prevScores, totalPlayers = 2) {
  _id = 0;
  const lightDeck = shuffle(buildDeck("light"));

  const players = [
    { id: 0, name: "You", isAI: false, hand: [], score: prevScores?.[0] ?? 0, saidUno: false }
  ];
  for (let i = 1; i < totalPlayers; i++) {
    players.push({ id: i, name: `AI ${i}`, isAI: true, hand: [], score: prevScores?.[i] ?? 0, saidUno: false });
  }

  const state = {
    side: "light",
    drawPile: [...lightDeck],
    discardPile: [],
    players,
    currentPlayer: 0,
    direction: 1,
    chosenColor: null,
    needColor: false,
    pendingDraw: 0,
    needDrawColor: false,   // dark wild: victim must draw until matching color
    drawColorTarget: null,  // the color victim must draw until
    message: "Game started! Your turn. 🃏",
    roundOver: false,
    roundWinner: null,
    gameWinner: null,
    animFlip: false,
    turnCounter: 0,
    pendingUno: null,
  };

  for (let i = 0; i < 7; i++) {
    state.players.forEach(p => p.hand.push(state.drawPile.pop()));
  }

  let starter = state.drawPile.pop();
  while (starter.type === "wild_draw_two" || starter.type === "wild_draw_color") {
    state.drawPile.unshift(starter);
    starter = state.drawPile.pop();
  }
  state.discardPile = [starter];

  if (starter.type === "wild") {
    state.needColor = true;
    state.message = "Wild starter! Choose a color. 🎨";
    state.chosenColor = null;
  } else {
    state.chosenColor = starter.color;

    // Apply starter card effects
    if (starter.type === "skip" || starter.type === "skip_everyone") {
      state.currentPlayer = (state.currentPlayer + state.direction + totalPlayers) % totalPlayers;
      state.message = `Started with a Skip! ${players[0].name}'s turn is skipped. ⏭️`;
    } else if (starter.type === "reverse") {
      state.direction = -1;
      if (totalPlayers === 2) {
        state.currentPlayer = 1;
        state.message = `Started with Reverse! ${players[0].name}'s turn is skipped. 🔄`;
      } else {
        state.currentPlayer = totalPlayers - 1;
        state.message = "Started with Reverse! Direction changed. 🔄";
      }
    }
  }

  return state;
}

function drawCards(state, n) {
  const cards = [];
  const s = { ...state, drawPile: [...state.drawPile], discardPile: [...state.discardPile] };
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      const top = s.discardPile.pop();
      s.drawPile = shuffle(s.discardPile);
      s.discardPile = [top];
    }
    if (s.drawPile.length > 0) cards.push(s.drawPile.pop());
  }
  return { cards, state: s };
}

function advanceTurn(state, skip = 1) {
  let cp = state.currentPlayer;
  const np = state.players.length;
  for (let i = 0; i < skip; i++) {
    cp = (cp + state.direction + np) % np;
  }
  // Increment turnCounter by the number of turns advanced to signal UI/AI correctly
  return { ...state, currentPlayer: cp, turnCounter: (state.turnCounter || 0) + skip };
}

function doFlip(state) {
  const newSide = state.side === "light" ? "dark" : "light";

  const flipCollection = (arr) => arr.map(c => flipCard(c, newSide));

  const newPlayers = state.players.map(p => ({ ...p, hand: flipCollection(p.hand) }));
  const newDrawPile = flipCollection(state.drawPile);
  const newDiscardPile = flipCollection(state.discardPile);

  const topCard = newDiscardPile[newDiscardPile.length - 1];

  return {
    ...state,
    side: newSide,
    players: newPlayers,
    drawPile: newDrawPile,
    discardPile: newDiscardPile,
    chosenColor: topCard && topCard.color !== "wild" ? topCard.color : null,
    animFlip: true,
  };
}

function applyCardEffect(state, card, playerIdx) {
  const np = state.players.length;
  const next = (state.currentPlayer + state.direction + np) % np;

  if (card.type === "number") {
    // Number cards (including 7) are plain — just advance the turn, no draws
    return { ...advanceTurn(state), message: "" };
  }
  if (card.type === "skip") {
    const nm = state.players[next].name;
    return { ...advanceTurn(state, 2), message: `${nm} was skipped! ⏭️` };
  }
  if (card.type === "skip_everyone") {
    return { ...advanceTurn(state, np), message: "Everyone else was skipped! Your turn again! 💀" };
  }
  if (card.type === "reverse") {
    const newDir = state.direction * -1;
    const s2 = { ...state, direction: newDir };
    // In 2-player, reverse acts like a skip — current player goes again
    if (np === 2) {
      return { ...advanceTurn(s2, 2), message: "Direction reversed! It's your turn again! ⇄" };
    }
    return { ...advanceTurn(s2, 1), message: "Direction reversed! ⇄" };
  }
  if (card.type === "draw_one") {
    const s_victim = advanceTurn(state, 1);
    const { cards, state: s_drawn } = drawCards(s_victim, 1);
    const players = s_drawn.players.map((p, i) => i === s_drawn.currentPlayer ? { ...p, hand: [...p.hand, ...cards], saidUno: false } : p);
    const nm = state.players[next].name;
    // Move to the player AFTER the victim
    return { ...advanceTurn({ ...s_drawn, players }, 1), message: `${nm} drew 1 and was skipped! 😬` };
  }
  if (card.type === "draw_five") {
    const s_victim = advanceTurn(state, 1);
    const { cards, state: s_drawn } = drawCards(s_victim, 5);
    const players = s_drawn.players.map((p, i) => i === s_drawn.currentPlayer ? { ...p, hand: [...p.hand, ...cards], saidUno: false } : p);
    const nm = state.players[next].name;
    // Move to the player AFTER the victim
    return { ...advanceTurn({ ...s_drawn, players }, 1), message: `${nm} drew 5 and was skipped! 🔥` };
  }
  if (card.type === "flip") {
    const flipped = doFlip(state);
    return { ...advanceTurn(flipped), message: "🌗 FLIP! The world turns dark..." };
  }
  if (card.type === "wild") {
    return { ...state, needColor: true, pendingDraw: 0, message: "Choose a color! 🎨" };
  }
  if (card.type === "wild_draw_two") {
    return { ...state, needColor: true, pendingDraw: 2, message: "Choose color — next player draws 2! 😈" };
  }
  // Dark side wild: next player draws until they get the chosen color (dare to stop is optional)
  if (card.type === "wild_draw_color") {
    return { ...state, needColor: true, pendingDraw: -1, message: "🌑 Wild Draw Color! Choose a color — next player draws until they match!" };
  }
  return advanceTurn(state);
}

function playCardAction(state, playerIdx, cardId) {
  if (state.roundOver || state.needColor || playerIdx !== state.currentPlayer) return state;
  const player = state.players[playerIdx];
  const card = player.hand.find(c => c.id === cardId);
  if (!card) return state;
  const top = state.discardPile[state.discardPile.length - 1];
  if (!canPlay(card, top, state.chosenColor)) return state;

  let newHand = player.hand.filter(c => c.id !== cardId);
  let players = state.players.map((p, i) => i === playerIdx ? { ...p, hand: newHand, saidUno: p.saidUno } : p);

  const newDiscard = [...state.discardPile, card];
  let s = { ...state, players, discardPile: newDiscard, chosenColor: card.color !== "wild" ? card.color : null };

  // Set pending UNO if player has 1 card left and hasn't said it
  if (newHand.length === 1 && !player.saidUno) {
    s.pendingUno = playerIdx;
  }

  if (newHand.length === 0) {
    let pts = 0;
    players.forEach((p, i) => { if (i !== playerIdx) pts += calcPoints(p.hand); });
    const updPlayers = players.map((p, i) => i === playerIdx ? { ...p, score: p.score + pts } : p);
    const gameWinner = updPlayers[playerIdx].score >= 500 ? playerIdx : null;
    return {
      ...s, players: updPlayers, roundOver: true, roundWinner: playerIdx, gameWinner,
      message: `${updPlayers[playerIdx].name} wins! +${pts} pts 🏆`,
    };
  }

  return applyCardEffect(s, card, playerIdx);
}

function chooseColorAction(state, color) {
  const np = state.players.length;
  const next = (state.currentPlayer + state.direction + np) % np;
  let s = { ...state, chosenColor: color, needColor: false };

  if (state.pendingDraw === 2) {
    s = advanceTurn(s);
    const { cards, state: s2 } = drawCards(s, 2);
    const players = s2.players.map((p, i) => i === s2.currentPlayer ? { ...p, hand: [...p.hand, ...cards], saidUno: false } : p);
    const nm = state.players[next].name;
    return { ...advanceTurn({ ...s2, players }), pendingDraw: 0, message: `${nm} drew 2! 😈` };
  }

  // wild_draw_color: next player must draw until they get the chosen color
  if (state.pendingDraw === -1) {
    // Move to the next player who will be forced to draw
    const s2 = advanceTurn(s);
    const nm = state.players[next].name;
    return { ...s2, pendingDraw: 0, drawColorTarget: color, needDrawColor: true, message: `🌑 ${nm} must draw until they get ${COLOR_LABEL[color]}!` };
  }

  return { ...advanceTurn(s), pendingDraw: 0, message: `Color set to ${COLOR_LABEL[color]}!` };
}

// Draw a card for any player (human or AI)
function drawCardAction(state, playerIdx) {
  const idx = playerIdx ?? state.currentPlayer;
  const isAI = state.players[idx]?.isAI;
  // For AI players, skip the pendingUno guard — a stale pendingUno must never freeze an AI turn
  if (state.roundOver || state.needColor || (!isAI && state.pendingUno !== null)) return { state, drew: null };
  const { cards, state: s2 } = drawCards(state, 1);
  const players = s2.players.map((p, i) => i === idx ? { ...p, hand: [...p.hand, ...cards], saidUno: false } : p);
  const top = state.discardPile[state.discardPile.length - 1];
  const drew = cards[0] || null;
  const canPlayIt = drew && canPlay(drew, top, state.chosenColor);
  const name = state.players[idx].name;
  const isHuman = !state.players[idx].isAI;
  return {
    state: {
      ...s2, players, message: canPlayIt
        ? (isHuman ? `You drew ${drew.display} — play it!` : `${name} drew ${drew.display}`)
        : (isHuman ? "You drew a card." : `${name} drew a card.`)
    },
    drew: canPlayIt ? drew : null,
  };
}

// ─── SVG Icons Component ───────────────────────────────────────────────────
const UnoIcon = ({ type, value, size, cardColor, isWild, flipColorHex }) => {
  const shadowColor = "rgba(0,0,0,0.4)";
  const colorMap = flipColorHex || COLOR_HEX;
  const iconColor = isWild ? "#fff" : (colorMap[cardColor] || COLOR_HEX[cardColor] || "#333");
  const blockShadow = `2px 2px 0 ${shadowColor}`;

  if (type === "number") {
    return (
      <span style={{ fontSize: size, fontWeight: 900, color: iconColor, textShadow: blockShadow }}>
        {value}
      </span>
    );
  }

  if (type === "reverse") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(4px 5px 0 ${shadowColor})` }}>
        <path d="M25,30 L45,10 L45,25 Q65,25 65,45 L65,55 L55,55 L55,45 Q55,35 45,35 L45,50 Z" fill={iconColor} transform="rotate(0, 50, 50)" />
        <path d="M25,30 L45,10 L45,25 Q65,25 65,45 L65,55 L55,55 L55,45 Q55,35 45,35 L45,50 Z" fill={iconColor} transform="rotate(180, 50, 50)" />
      </svg>
    );
  }

  if (type === "skip" || type === "skip_everyone") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(4px 5px 0 ${shadowColor})` }}>
        <circle cx="50" cy="50" r="35" fill="none" stroke={iconColor} strokeWidth="12" />
        <line x1="25" y1="25" x2="75" y2="75" stroke={iconColor} strokeWidth="12" />
      </svg>
    );
  }

  if (type && type.includes("draw") && !type.includes("wild")) {
    const amount = type === "draw_one" ? "+1" : type === "draw_five" ? "+5" : "+2";
    return <span style={{ fontSize: size * 0.8, fontWeight: 900, color: iconColor, textShadow: blockShadow }}>{amount}</span>;
  }

  if (type === "flip") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(3px 4px 0 ${shadowColor})` }}>
        <path d="M 50 15 A 35 35 0 0 1 85 50 L 95 50 L 77.5 75 L 60 50 L 70 50 A 20 20 0 0 0 50 30 Z" fill={iconColor} />
        <path d="M 50 15 A 35 35 0 0 1 85 50 L 95 50 L 77.5 75 L 60 50 L 70 50 A 20 20 0 0 0 50 30 Z" fill={iconColor} transform="rotate(180, 50, 50)" />
      </svg>
    );
  }

  if (type === "wild_draw_two") {
    const fanColors = ["#ff5555", "#ffaa00", "#55aa55", "#5555ff"];
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(3px 4px 0 #000)`, overflow: "visible" }}>
        <g transform="translate(8, 5) rotate(-18, 42, 55)">
          <rect x="22" y="18" width="34" height="52" rx="5" fill={fanColors[0]} stroke="#fff" strokeWidth="2.5" />
        </g>
        <g transform="translate(4, 2) rotate(-8, 42, 55)">
          <rect x="22" y="18" width="34" height="52" rx="5" fill={fanColors[1]} stroke="#fff" strokeWidth="2.5" />
        </g>
        <g transform="translate(-4, 2) rotate(8, 42, 55)">
          <rect x="22" y="18" width="34" height="52" rx="5" fill={fanColors[2]} stroke="#fff" strokeWidth="2.5" />
        </g>
        <g transform="translate(-8, 5) rotate(18, 42, 55)">
          <rect x="22" y="18" width="34" height="52" rx="5" fill={fanColors[3]} stroke="#fff" strokeWidth="2.5" />
        </g>
        <defs>
          <linearGradient id="wdt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={fanColors[0]} />
            <stop offset="33%" stopColor={fanColors[1]} />
            <stop offset="66%" stopColor={fanColors[2]} />
            <stop offset="100%" stopColor={fanColors[3]} />
          </linearGradient>
        </defs>
        <g transform="translate(50, 50) rotate(0)">
          <rect x="-17" y="-27" width="34" height="52" rx="5" fill="url(#wdt-grad)" stroke="#fff" strokeWidth="2.5" />
          <text x="0" y="12" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff"
            fontFamily="Arial Black, Impact, sans-serif">+2</text>
        </g>
      </svg>
    );
  }

  // Dark-side Wild Draw Color — draws until color match
  if (type === "wild_draw_color") {
    const darkFanColors = ["#ff1493", "#008080", "#ff8c00", "#9400d3"];
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ filter: `drop-shadow(3px 4px 0 #000)`, overflow: "visible" }}>
        {/* Dark fan cards */}
        {darkFanColors.map((c, i) => {
          const rot = (i - 1.5) * 14;
          return (
            <g key={i} transform={`rotate(${rot}, 50, 60)`}>
              <rect x="33" y="15" width="28" height="44" rx="4" fill={c} stroke="#fff" strokeWidth="2" opacity="0.9" />
            </g>
          );
        })}
        {/* Infinity / loop symbol in center */}
        <circle cx="50" cy="50" r="20" fill="#1a001e" stroke="#9400d3" strokeWidth="3" />
        <text x="50" y="56" textAnchor="middle" fontSize="16" fontWeight="900" fill="#FFD700"
          fontFamily="Arial Black, Impact, sans-serif">∞</text>
      </svg>
    );
  }

  if (type === "wild") {
    const q = ["#ff5555", "#ffaa00", "#55aa55", "#5555ff"];
    return (
      <svg width={size} height={size} viewBox="0 0 100 100"
        style={{ filter: `drop-shadow(2px 3px 0 #000)`, overflow: "visible" }}>
        {/* 4-quadrant pie */}
        <path d="M50,50 L50,5 A45,45 0 0,1 95,50 Z" fill={q[0]} />
        <path d="M50,50 L95,50 A45,45 0 0,1 50,95 Z" fill={q[1]} />
        <path d="M50,50 L50,95 A45,45 0 0,1 5,50 Z" fill={q[2]} />
        <path d="M50,50 L5,50 A45,45 0 0,1 50,5 Z" fill={q[3]} />
        {/* Black divider lines */}
        <line x1="50" y1="5" x2="50" y2="95" stroke="#111" strokeWidth="2" />
        <line x1="5" y1="50" x2="95" y2="50" stroke="#111" strokeWidth="2" />
        {/* White oval center */}
        <ellipse cx="50" cy="50" rx="30" ry="20" fill="#111" stroke="#fff" strokeWidth="2" transform="rotate(-25,50,50)" />
        {/* WILD text */}
        <text x="50" y="55" textAnchor="middle"
          fontSize={size > 28 ? "16" : "20"} fontWeight="900" fill="#fff"
          fontFamily="Arial Black, Impact, sans-serif"
          fontStyle="italic"
          style={{ textShadow: "1px 1px 0 #000" }}>WILD</text>
      </svg>
    );
  }

  return <span style={{ fontSize: size * 0.4, fontWeight: 900, color: iconColor, textShadow: blockShadow }}>{type ? type.toUpperCase() : ""}</span>;
};

// ─── Card Component ───────────────────────────────────────────────────────────
function UnoCard({ card, onClick, playable = true, size = "normal", faceDown = false, side = "light", chosenColor }) {
  const w = size === "small" ? 50 : size === "normal" ? 68 : size === "large" ? 90 : size === "xlarge" ? 115 : size === "xxlarge" ? 145 : 84;
  const h = size === "small" ? 75 : size === "normal" ? 102 : size === "large" ? 135 : size === "xlarge" ? 172 : size === "xxlarge" ? 218 : 126;
  const fs = size === "small" ? 22 : size === "normal" ? 30 : size === "large" ? 42 : size === "xlarge" ? 54 : size === "xxlarge" ? 68 : 40;
  const br = size === "small" ? 7 : size === "normal" ? 9 : size === "large" ? 12 : size === "xlarge" ? 14 : 17;

  const cardStyle = {
    width: w, height: h, flexShrink: 0,
    borderRadius: br,
    boxSizing: "border-box",
    cursor: playable && onClick ? "pointer" : "not-allowed",
    opacity: 1,
    transform: "translateY(0px)",
    transition: "transform 0.15s, box-shadow 0.15s",
    position: "relative", userSelect: "none",
    boxShadow: playable && onClick ? "0 4px 14px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)" : "0 2px 6px rgba(0,0,0,0.3)",
    fontFamily: "'Arial Black', 'Impact', sans-serif",
    overflow: "visible",
  };

  if (faceDown) {
    const isDark = side === "dark";
    const outerPad = size === "small" ? 2 : 3;
    const innerBr = br - 1;
    return (
      <div
        onClick={playable && onClick ? onClick : undefined}
        style={{
          ...cardStyle,
          background: isDark ? "#1a001e" : "#c0392b",
          border: `2px solid ${isDark ? "#555" : "#e8e8e8"}`,
          overflow: "hidden",
        }}
        onMouseEnter={e => { if (playable && onClick) { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.6)"; } }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = playable && onClick ? "0 4px 14px rgba(0,0,0,0.5)" : "0 2px 6px rgba(0,0,0,0.3)"; }}
      >
        {/* White inner border */}
        <div style={{
          position: "absolute", top: outerPad, left: outerPad, right: outerPad, bottom: outerPad,
          border: `${size === "small" ? 1.5 : 2}px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.9)"}`,
          borderRadius: innerBr, pointerEvents: "none", zIndex: 2,
        }} />
        {/* Central Logo Ellipse */}
        <div style={{
          position: "absolute", top: "10%", left: "10%", right: "10%", bottom: "12%",
          background: isDark ? "#000" : "#f1c40f", borderRadius: "50%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          transform: "rotate(-20deg)",
          boxShadow: isDark ? "0 4px 10px rgba(0,0,0,0.8)" : "0 4px 10px rgba(0,0,0,0.3)",
          lineHeight: 0.9, zIndex: 1,
        }}>
          <span style={{
            fontSize: fs * 0.55, fontWeight: 900,
            color: isDark ? "#FFD700" : "#c0392b",
            textShadow: isDark ? "2px 2px 0 #000" : "1px 1px 0 rgba(0,0,0,0.3)",
            letterSpacing: -1, transform: "skewX(-8deg)",
          }}>UNO</span>
          <span style={{
            fontSize: fs * 0.26, fontWeight: 900, color: "#fff",
            background: isDark ? "#c0392b" : "#1a1a1a",
            padding: "1px 5px", borderRadius: 3,
            transform: "rotate(-5deg)", marginTop: 2,
          }}>FLIP!</span>
        </div>
      </div>
    );
  }

  const isWild = card.color === "wild";
  const sideColors = side === "light" ? COLORS_LIGHT : COLORS_DARK;
  const isDark = side === "dark";

  // True UNO Flip colors: vivid, saturated
  const FLIP_COLOR_HEX = {
    red: "#e8201a", blue: "#1a6dcc", green: "#1daa2c", yellow: "#f5c500",
    pink: "#e8145e", teal: "#007a7a", orange: "#e85a00", purple: "#7b1fa2",
    wild: "#111",
  };

  // Wild: conic gradient — 4 quadrant sectors matching the reference
  const wildGradient = `conic-gradient(
    ${FLIP_COLOR_HEX[sideColors[0]]} 0deg 90deg,
    ${FLIP_COLOR_HEX[sideColors[1]]} 90deg 180deg,
    ${FLIP_COLOR_HEX[sideColors[2]]} 180deg 270deg,
    ${FLIP_COLOR_HEX[sideColors[3]]} 270deg 360deg
  )`;

  const cardBgColor = isWild ? wildGradient : (FLIP_COLOR_HEX[card.color] || COLOR_HEX[card.color] || "#333");

  const isMultiChar = String(card.display).length > 1;
  const cornerFs = isMultiChar ? fs * 0.32 : fs * 0.38;
  const outerPad = size === "small" ? 2 : size === "large" ? 4 : 3;
  const innerBr = br - 1;

  // Corner label text color: white on dark cards, dark on bright yellow/green
  const cornerTextColor = "#fff";

  return (
    <div
      onClick={playable && onClick ? onClick : undefined}
      style={{
        ...cardStyle,
        // Gray outer frame — matches the reference image perfectly
        background: isDark ? "#555" : "#d0d0d0",
        border: isDark ? "1.5px solid #333" : "1.5px solid #aaa",
        overflow: "hidden",
      }}
      onMouseEnter={e => { if (playable && onClick) { e.currentTarget.style.transform = "translateY(-10px) scale(1.04)"; e.currentTarget.style.boxShadow = "0 16px 32px rgba(0,0,0,0.6), 0 0 0 2px #fff"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = playable && onClick ? "0 4px 14px rgba(0,0,0,0.5)" : "0 2px 6px rgba(0,0,0,0.3)"; }}
    >
      {/* Colored inner card — inset within the gray border */}
      <div style={{
        position: "absolute",
        top: outerPad, left: outerPad, right: outerPad, bottom: outerPad,
        background: cardBgColor,
        borderRadius: innerBr,
        overflow: "hidden",
      }}>
        {/* White inner border line — key UNO Flip design detail */}
        <div style={{
          position: "absolute", top: 3, left: 3, right: 3, bottom: 3,
          border: `${size === "small" ? 1.5 : 2}px solid rgba(255,255,255,0.85)`,
          borderRadius: innerBr - 2,
          pointerEvents: "none", zIndex: 3,
        }} />

        {/* Top-left corner label */}
        <span style={{
          position: "absolute",
          top: size === "small" ? 5 : 7,
          left: size === "small" ? 5 : 8,
          fontSize: cornerFs, fontWeight: 900, zIndex: 10,
          color: cornerTextColor,
          textShadow: "1px 1px 0 rgba(0,0,0,0.6), 2px 2px 0 rgba(0,0,0,0.3)",
          fontStyle: "italic", lineHeight: 1,
          letterSpacing: isMultiChar ? "-0.5px" : "normal",
          textDecoration: (card.type === "number" && (card.value === 6 || card.value === 9)) ? "underline" : "none",
        }}>
          {card.display}
        </span>

        {/* Central rotated ellipse with icon — the signature UNO Flip design */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5,
        }}>
          <div style={{
            width: "82%", height: "70%",
            background: isWild ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.95)",
            borderRadius: "50%",
            transform: "rotate(-20deg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isWild ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "rotate(20deg)", // counter-rotate icon to keep it upright
              width: "100%", height: "100%",
            }}>
              <UnoIcon
                type={card.type}
                value={card.value}
                size={isMultiChar ? fs * 1.0 : fs * 1.2}
                cardColor={card.color}
                isWild={isWild}
                flipColorHex={FLIP_COLOR_HEX}
              />
            </div>
          </div>
        </div>

        {/* Bottom-right corner label (rotated 180°) */}
        <span style={{
          position: "absolute",
          bottom: size === "small" ? 5 : 7,
          right: size === "small" ? 5 : 8,
          fontSize: cornerFs, fontWeight: 900, zIndex: 10,
          transform: "rotate(180deg)",
          color: cornerTextColor,
          textShadow: "1px 1px 0 rgba(0,0,0,0.6), 2px 2px 0 rgba(0,0,0,0.3)",
          fontStyle: "italic", lineHeight: 1,
          letterSpacing: isMultiChar ? "-0.5px" : "normal",
          textDecoration: (card.type === "number" && (card.value === 6 || card.value === 9)) ? "underline" : "none",
        }}>
          {card.display}
        </span>

        {/* UNO logo top-right for wild cards */}
        {isWild && (
          <span style={{
            position: "absolute", top: size === "small" ? 3 : 5, right: size === "small" ? 4 : 6,
            fontSize: fs * 0.22, fontWeight: 900, color: "#FFD700",
            textShadow: "1px 1px 0 #000", fontStyle: "italic", zIndex: 10, letterSpacing: -0.5,
          }}>UNO</span>
        )}
      </div>

      {/* Playable highlight glow — green rim when card is playable & interactive */}
      {playable && onClick && (
        <div style={{
          position: "absolute", inset: -2,
          borderRadius: br + 1,
          border: "2px solid rgba(100,255,100,0.7)",
          boxShadow: "0 0 8px rgba(80,255,80,0.5)",
          pointerEvents: "none", zIndex: 20,
        }} />
      )}

      {/* Disabled overlay */}
      {!playable && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.45)", zIndex: 15,
          borderRadius: br,
        }} />
      )}
    </div>
  );
}

// ─── Fireworks Component ──────────────────────────────────────────────────────
function Fireworks() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationId;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#ff0000", "#ffa500", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#ee82ee"];

    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = {
          x: (Math.random() - 0.5) * 8,
          y: (Math.random() - 0.5) * 8,
        };
        this.alpha = 1;
        this.friction = 0.95;
      }

      draw() {
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.01;
      }
    }

    const createFirework = (x, y) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 40; i++) {
        particles.push(new Particle(x, y, color));
      }
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (Math.random() < 0.05) {
        createFirework(Math.random() * canvas.width, Math.random() * canvas.height);
      }

      particles.forEach((particle, index) => {
        if (particle.alpha > 0) {
          particle.update();
          particle.draw();
        } else {
          particles.splice(index, 1);
        }
      });
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }} />;
}

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const fn = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return size;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UnoFlip({ config, onHome }) {
  const difficulty = config?.difficulty || "normal";
  const [gs, setGs] = useState(() => initGame(null, config?.players || 2));
  const [drewCard, setDrewCard] = useState(null);
  const [justDrew, setJustDrew] = useState(false);
  const [flipAnim, setFlipAnim] = useState(false);
  const [drawHandAnim, setDrawHandAnim] = useState(false);
  const [animCard, setAnimCard] = useState(null); // card being animated (draw to hand)
  // Play animation: card flies from hand to discard pile
  const [playAnim, setPlayAnim] = useState(null); // { card, fromX, fromY }
  // AI animation: card flies from AI position to discard pile (play) or deck to AI (draw)
  const [aiAnim, setAiAnim] = useState(null); // { type:'play'|'draw', playerIdx, card }
  const [penaltyAnim, setPenaltyAnim] = useState(0); // number of penalty cards to animate (for human)
  const [aiPenaltyAnim, setAiPenaltyAnim] = useState(null); // { playerIdx, count } for AI receiving penalty
  const aiTimerRef = useRef(null);
  const drawPileRef = useRef(null); // ref to get draw pile position
  const handScrollRef = useRef(null); // ref to hand scroll container for auto-scroll
  const prevHumanHandLen = useRef(0); // tracks human hand size to detect penalty draws
  const voluntaryDrawRef = useRef(false); // true when player taps TAP TO DRAW (prevents double anim)
  const prevAllHandLens = useRef([]); // tracks ALL players' hand sizes to detect AI penalty draws

  const { w: vw, h: vh } = useWindowSize();
  // Responsive breakpoints
  const isMobile = vw <= 480;
  const isTablet = vw <= 768;
  const isLaptop = vw <= 1366;
  const isShortScreen = vh < 720;
  const isDesktop = vw > 1366;

  // Card size for player hand — mobile UNCHANGED, tablet/PC increased
  const handCardSize = isMobile ? "small" : isTablet ? "normal" : isLaptop ? "large" : "xlarge";
  // Card overlap — adjusted for larger cards on tablet/PC
  // Positive overlap means cards are spaced out properly, negative means they overlap
  const handOverlap = isMobile ? -10 : isTablet ? -8 : isLaptop ? -12 : -20;
  // AI card size
  const aiCardSize = isMobile ? "small" : (isTablet || isLaptop) ? "large" : "normal";
  // AI card overlap (vertical for left/right AIs)
  const aiOverlap = isMobile ? -20 : (isTablet || isLaptop) ? -27 : -32;
  // UNO button size
  const unoSize = isMobile ? 62 : isTablet ? 80 : isLaptop ? 88 : 104;

  const top = gs.discardPile[gs.discardPile.length - 1] || null;
  const me = gs.players[0];
  const colors = gs.side === "light" ? COLORS_LIGHT : COLORS_DARK;
  const isMyTurn = gs.currentPlayer === 0 && !gs.roundOver && !gs.needColor;
  const isMyDrawColorTurn = gs.needDrawColor && gs.currentPlayer === 0 && !gs.roundOver;

  const scheduleAI = useCallback((delayOverride) => {
    clearTimeout(aiTimerRef.current);

    let delay = 1000;
    if (difficulty === "easy") delay = 1800;
    if (difficulty === "hard") delay = 600;
    if (delayOverride) delay = delayOverride;

    aiTimerRef.current = setTimeout(() => {
      setGs(prev => {
        // Guard: only run for AI turns, skip special states
        if (prev.roundOver || prev.needColor || prev.needDrawColor) return prev;
        if (!prev.players[prev.currentPlayer]?.isAI) return prev;
        // If there's a pendingUno for another player, let that resolve first
        if (prev.pendingUno !== null && prev.pendingUno !== prev.currentPlayer) return prev;
        const cp = prev.currentPlayer;
        const p = prev.players[cp];
        const topC = prev.discardPile[prev.discardPile.length - 1];

        let playable = p.hand.filter(c => canPlay(c, topC, prev.chosenColor));

        if (difficulty === "easy" && playable.length && Math.random() < 0.3) {
          playable = [];
        }

        if (playable.length) {
          let cardToPlay;
          if (difficulty === "hard") {
            const nonWilds = playable.filter(c => c.color !== "wild");
            cardToPlay = nonWilds.length ? nonWilds[Math.floor(Math.random() * nonWilds.length)] : playable[0];
          } else {
            cardToPlay = playable[Math.floor(Math.random() * playable.length)];
          }

          setAiAnim({ type: 'play', playerIdx: cp, card: cardToPlay });
          setTimeout(() => {
            setAiAnim(null);
            setGs(s => {
              if (s.roundOver || s.currentPlayer !== cp) return s;
              return playCardAction(s, cp, cardToPlay.id);
            });
          }, 500);
          return prev;
        } else {
          setAiAnim({ type: 'draw', playerIdx: cp, card: null });
          setTimeout(() => {
            setAiAnim(null);
            setGs(s => {
              if (s.roundOver || s.currentPlayer !== cp) return s;
              const { state: s2, drew } = drawCardAction(s, cp);
              // Safety: if draw was blocked, force-advance to prevent freeze
              if (!s2 || s2 === s) {
                return { ...advanceTurn(s), message: `${s.players[cp].name} passed.` };
              }
              if (drew && canPlay(drew, s.discardPile[s.discardPile.length - 1], s.chosenColor)) {
                setAiAnim({ type: 'play', playerIdx: cp, card: drew });
                setTimeout(() => {
                  setAiAnim(null);
                  setGs(ss => {
                    if (ss.roundOver || ss.currentPlayer !== cp) return ss;
                    return playCardAction(ss, cp, drew.id);
                  });
                }, 500);
                return s2;
              }
              return { ...advanceTurn(s2), message: `${s.players[cp].name} drew and passed.` };
            });
          }, 500);
          return prev;
        }
      });
    }, delay);
  }, [difficulty]);

  useEffect(() => {
    if (gs.roundOver) return;

    // Handle UNO Challenge Timer
    if (gs.pendingUno !== null) {
      const pIdx = gs.pendingUno;
      const isHuman = pIdx === 0;

      // If AI, they always say UNO with a small delay
      if (!isHuman) {
        const timer = setTimeout(() => {
          setGs(s => s.pendingUno === pIdx ? {
            ...s,
            pendingUno: null,
            message: `${s.players[pIdx].name} called UNO! 🚨`,
            players: s.players.map((p, i) => i === pIdx ? { ...p, saidUno: true } : p)
          } : s);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        // Human has 2 seconds
        const timer = setTimeout(() => {
          setGs(s => {
            if (s.pendingUno !== 0) return s;
            const { cards, state: s2 } = drawCards(s, 2);
            return {
              ...s2,
              pendingUno: null,
              message: "You forgot to say UNO! Draw 2 cards. 😤",
              players: s2.players.map((p, i) => i === 0 ? { ...p, hand: [...p.hand, ...cards], saidUno: false } : p)
            };
          });
        }, 2000);
        return () => clearTimeout(timer);
      }
    }

    // AI Turn Logic
    if (gs.players[gs.currentPlayer]?.isAI) {
      if (gs.needDrawColor) {
        // AI draws until it gets the target color (or dares with 20% chance per card after 3 draws)
        const cp = gs.currentPlayer;
        const timer = setTimeout(() => {
          setGs(s => {
            if (!s.needDrawColor || s.currentPlayer !== cp) return s;
            const { cards, state: s2 } = drawCards(s, 1);
            const drew = cards[0];
            if (!drew) return s;
            const players = s2.players.map((p, i) => i === cp ? { ...p, hand: [...p.hand, drew] } : p);
            const matched = drew.color === s.drawColorTarget;
            // Dare: AI stops if it has 4+ cards drawn without match (20% chance)
            const playerCards = players[cp].hand.length;
            const dare = !matched && playerCards > 3 && Math.random() < 0.2;
            if (matched || dare) {
              const nextPlayer = (cp + s.direction + s.players.length) % s.players.length;
              return {
                ...s2, players,
                needDrawColor: false, drawColorTarget: null,
                chosenColor: matched ? drew.color : s.chosenColor,
                message: dare ? `${s.players[cp].name} dared to stop! 😎` : `${s.players[cp].name} drew ${drew.display} — matched!`,
                currentPlayer: nextPlayer,
                turnCounter: (s.turnCounter || 0) + 1,
              };
            }
            // Still drawing — bump turnCounter so useEffect re-fires for next draw
            return { ...s2, players, message: `${s.players[cp].name} drew ${drew.display}...`, turnCounter: (s.turnCounter || 0) + 1 };
          });
        }, 700);
        return () => clearTimeout(timer);
      }
      if (gs.needColor) {
        // AI needs to pick a color
        const cp = gs.currentPlayer;
        const p = gs.players[cp];
        const cts = gs.side === "light" ? COLORS_LIGHT : COLORS_DARK;
        const counts = {};
        cts.forEach(c => counts[c] = 0);
        p.hand.forEach(c => { if (counts[c.color] !== undefined) counts[c.color]++; });
        const best = [...cts].sort((a, b) => counts[b] - counts[a])[0];

        const timer = setTimeout(() => {
          setGs(s => (s.needColor && s.currentPlayer === cp) ? chooseColorAction(s, best) : s);
        }, 800);
        return () => clearTimeout(timer);
      } else {
        // AI needs to play or draw
        scheduleAI();
      }
    }

    if (gs.animFlip && !flipAnim) {
      setFlipAnim(true);
      setTimeout(() => { setFlipAnim(false); setGs(s => ({ ...s, animFlip: false })); }, 800);
    }
    return () => clearTimeout(aiTimerRef.current);
  }, [gs.currentPlayer, gs.turnCounter, gs.roundOver, gs.needColor, gs.needDrawColor, gs.animFlip, gs.pendingUno, scheduleAI]);

  // ── Freeze-breaker: if it's an AI turn and nothing happens in 3s, reschedule ──
  useEffect(() => {
    if (gs.roundOver || !gs.players[gs.currentPlayer]?.isAI) return;
    if (gs.needColor || gs.needDrawColor || gs.pendingUno !== null) return;
    const watchdog = setTimeout(() => {
      setGs(s => {
        if (!s.players[s.currentPlayer]?.isAI || s.roundOver || s.needColor || s.needDrawColor) return s;
        return { ...advanceTurn(s), message: `${s.players[s.currentPlayer].name} timed out.` };
      });
    }, 4000);
    return () => clearTimeout(watchdog);
  }, [gs.currentPlayer, gs.turnCounter, gs.roundOver, gs.needColor, gs.needDrawColor, gs.pendingUno]);

  // ── Freeze-breaker for needDrawColor: if AI stuck drawing for 6s, force stop ──
  useEffect(() => {
    if (gs.roundOver || !gs.needDrawColor) return;
    if (!gs.players[gs.currentPlayer]?.isAI) return;
    const cp = gs.currentPlayer;
    const watchdog = setTimeout(() => {
      setGs(s => {
        if (!s.needDrawColor || s.currentPlayer !== cp) return s;
        const nextPlayer = (cp + s.direction + s.players.length) % s.players.length;
        return {
          ...s,
          needDrawColor: false, drawColorTarget: null,
          currentPlayer: nextPlayer,
          turnCounter: (s.turnCounter || 0) + 1,
          message: `${s.players[cp].name} stopped drawing (timeout).`,
        };
      });
    }, 6000);
    return () => clearTimeout(watchdog);
  }, [gs.currentPlayer, gs.turnCounter, gs.roundOver, gs.needDrawColor]);

  // ── Auto-scroll hand to right when new cards are added (so newest card is visible) ──
  useEffect(() => {
    if (handScrollRef.current) {
      handScrollRef.current.scrollTo({ left: handScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, [gs.players[0]?.hand?.length]);

  // ── Detect penalty cards given to human (draw_one, draw_five, wild_draw_two) ──
  useEffect(() => {
    const curr = gs.players[0]?.hand?.length ?? 0;
    const prev = prevHumanHandLen.current;
    prevHumanHandLen.current = curr;

    // Skip if this hand growth was from the player's own voluntary draw
    if (voluntaryDrawRef.current) {
      voluntaryDrawRef.current = false;
      return;
    }

    // Hand grew and it was NOT the human's turn (penalty from opponent's card)
    if (curr > prev && !gs.roundOver && gs.currentPlayer !== 0) {
      const added = curr - prev;
      setPenaltyAnim(added);
      const totalDur = added * 180 + 700;
      setTimeout(() => setPenaltyAnim(0), totalDur);
    }
  }, [gs.players[0]?.hand?.length]);

  // ── Detect when AI players receive penalty draws (draw_five / wild_draw_two from human) ──
  const handLengthsKey = gs.players.map(p => p.hand?.length ?? 0).join('-');
  useEffect(() => {
    const curr = gs.players.map(p => p.hand?.length ?? 0);
    const prev = prevAllHandLens.current;
    if (prev.length > 0) {
      gs.players.forEach((_, idx) => {
        if (idx === 0) return; // skip human
        const grew = curr[idx] - (prev[idx] ?? curr[idx]);
        if (grew >= 2) { // 2+ cards at once = penalty (not voluntary draw)
          setAiPenaltyAnim({ playerIdx: idx, count: grew });
          setTimeout(() => setAiPenaltyAnim(null), grew * 170 + 700);
        }
      });
    }
    prevAllHandLens.current = curr;
  }, [handLengthsKey]);

  function handlePlay(cardId) {
    if (!isMyTurn && !(drewCard && drewCard.id === cardId)) return;
    const card = me.hand.find(c => c.id === cardId);
    if (!card) return;
    // Trigger play animation before applying state
    setPlayAnim({ card });
    setDrewCard(null);
    setJustDrew(false);
    setTimeout(() => {
      setPlayAnim(null);
      setGs(s => playCardAction(s, 0, cardId));
    }, 420);
  }

  const isDrawingRef = useRef(false); // Prevents double-draw from rapid taps

  function handleDraw() {
    // CRITICAL: Guard against double-fire (6-card bug fix)
    if (!isMyTurn || justDrew || drewCard || drawHandAnim || animCard || isDrawingRef.current) return;
    isDrawingRef.current = true;

    // Always draw from deck directly so we can ALWAYS show the animation
    const { cards, state: s2 } = drawCards(gs, 1);
    const drew = cards[0] || null;
    if (!drew) { isDrawingRef.current = false; return; }

    const top = gs.discardPile[gs.discardPile.length - 1];
    const canPlayIt = canPlay(drew, top, gs.chosenColor);

    // Add card to player hand in the new state
    const players = s2.players.map((p, i) =>
      i === 0 ? { ...p, hand: [...p.hand, drew], saidUno: false } : p
    );
    const newState = {
      ...s2, players,
      message: canPlayIt ? `You drew ${drew.display} — play it!` : "You drew a card.",
    };

    // Mark this as a voluntary draw so penaltyAnim useEffect skips it
    voluntaryDrawRef.current = true;

    // Always show the fly-to-hand animation
    setAnimCard(drew);
    setDrawHandAnim(true);

    setTimeout(() => {
      if (canPlayIt) {
        setGs(newState);
        setDrewCard(drew);        // player can choose to play it
        setJustDrew(false);
        setDrawHandAnim(false);
        setAnimCard(null);
        isDrawingRef.current = false;
      } else {
        // Not playable → advance turn by exactly 1, never trigger drawn card's action effect.
        // Reset all draw-related UI state BEFORE the gs update to avoid stale-state blocking player's next turn.
        setDrewCard(null);
        setJustDrew(false);
        setDrawHandAnim(false);
        setAnimCard(null);
        isDrawingRef.current = false;
        setGs(s => ({
          ...s,
          drawPile: newState.drawPile,
          players: newState.players,
          currentPlayer: (s.currentPlayer + s.direction + s.players.length) % s.players.length,
          turnCounter: (s.turnCounter || 0) + 1,
          message: "No playable card drawn. Turn passed.",
        }));
      }
    }, 750);
  }

  function handlePassAfterDraw() {
    // Only used when player drew a playable card but chooses not to play it
    setDrewCard(null);
    setJustDrew(false);
    setGs(s => ({ ...advanceTurn(s), message: "Turn passed." }));
  }

  // Wild Draw Color: human draws one card at a time
  function handleDrawColorCard() {
    if (!isMyDrawColorTurn || isDrawingRef.current) return;
    isDrawingRef.current = true;

    const { cards, state: s2 } = drawCards(gs, 1);
    const drew = cards[0] || null;
    if (!drew) { isDrawingRef.current = false; return; }

    const players = s2.players.map((p, i) =>
      i === 0 ? { ...p, hand: [...p.hand, drew], saidUno: false } : p
    );

    voluntaryDrawRef.current = true;
    setAnimCard(drew);
    setDrawHandAnim(true);

    setTimeout(() => {
      const matched = drew.color === gs.drawColorTarget;
      if (matched) {
        // Got the color — needDrawColor clears, offer to play it or pass
        setGs({ ...s2, players, needDrawColor: false, drawColorTarget: null, chosenColor: drew.color, message: `You drew ${drew.display} — it matches! Play it or pass.` });
        setDrewCard(drew); // offer to play the matching card
        setJustDrew(true);
      } else {
        // Didn't match — keep drawing
        setGs({ ...s2, players, message: `Drew ${drew.display}, not ${COLOR_LABEL[gs.drawColorTarget]}. Keep drawing!` });
      }
      setDrawHandAnim(false);
      setAnimCard(null);
      isDrawingRef.current = false;
    }, 600);
  }

  // Dare: stop drawing even if you don't have the color (risky!)
  function handleDareDrawColor() {
    setGs(s => ({
      ...advanceTurn(s),
      needDrawColor: false,
      drawColorTarget: null,
      message: "You dared to stop! 😎 Turn passed."
    }));
    setDrewCard(null);
    setJustDrew(false);
  }

  function handleColorPick(color) {
    setGs(s => chooseColorAction(s, color));
  }

  function handleSayUno() {
    setGs(s => {
      const isPending = s.pendingUno === 0;
      const hasTwo = s.players[0].hand.length === 2;
      if (!isPending && !hasTwo) return s;

      return {
        ...s,
        pendingUno: null,
        players: s.players.map((p, i) => i === 0 ? { ...p, saidUno: true } : p),
        message: "You said UNO! 🙌"
      };
    });
  }

  function newRound() {
    const scores = gs.players.map(p => p.score);
    setGs(initGame(scores, gs.players.length));
    setDrewCard(null);
  }

  function newGame() {
    setGs(initGame(null, gs.players.length));
    setDrewCard(null);
  }

  const activeColorHex = COLOR_HEX[gs.chosenColor] || "#00d2ff";

  // Detect landscape on mobile
  const isLandscapeMobile = vw <= 900 && vw > vh;

  if (isLandscapeMobile) {
    return (
      <div style={{
        height: "100dvh", width: "100vw", position: "relative", overflow: "hidden",
        backgroundColor: "#1a0a2e",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 20,
      }}>
        <div style={{ position: "absolute", inset: "-20px", backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(10px)", zIndex: 0, opacity: 0.4 }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 30px", background: "rgba(20,10,40,0.9)", borderRadius: 20, border: "2px solid rgba(243,156,18,0.6)", boxShadow: "0 0 40px rgba(243,156,18,0.2)", maxWidth: "80vw", textAlign: "center" }}>
          <div style={{ fontSize: 56, animation: "rotatePhone 1.5s ease-in-out infinite" }}>📱</div>
          <div style={{ color: "#f39c12", fontSize: 20, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Rotate Your Device</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
            This game is best played in <strong style={{ color: "#fff" }}>portrait mode</strong>.<br />
            Please rotate your phone to continue.
          </div>
        </div>
        <style>{`
          @keyframes rotatePhone {
            0%, 100% { transform: rotate(0deg); }
            30% { transform: rotate(-90deg); }
            60% { transform: rotate(-90deg); }
            80% { transform: rotate(0deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      height: "100dvh", width: "100vw", position: "relative", overflow: "hidden",
      backgroundColor: "#002244", // Fallback color
      color: "#fff", fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Blurred Background Image */}
      <div style={{
        position: "absolute", inset: "-20px",
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "blur(8px)",
        zIndex: 0
      }} />

      {/* Subtle Overlay to dim the background */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1 }} />

      {/* CSS Keyframes for card animations */}
      <style>{`
        @keyframes cardFlyToHand {
          0%   { top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
          60%  { top: 75%; left: 50%; transform: translate(-50%, -50%) scale(0.95) rotate(-5deg); opacity: 1; }
          100% { top: 90%; left: 50%; transform: translate(-50%, -50%) scale(0.7) rotate(-10deg); opacity: 0; }
        }
        @keyframes cardFlyToDiscard {
          0%   { bottom: 18%; left: 50%; transform: translate(-50%, 0%) scale(1) rotate(0deg); opacity: 1; }
          50%  { bottom: 50%; left: 50%; transform: translate(-50%, 50%) scale(1.15) rotate(8deg); opacity: 1; }
          100% { bottom: 50%; left: 50%; transform: translate(-50%, 50%) scale(1) rotate(3deg); opacity: 0; }
        }
        /* AI 1 (top) plays card — flies downward to center */
        @keyframes aiTopPlay {
          0%   { top: 12%; left: 50%; transform: translate(-50%,0) scale(1) rotate(0deg); opacity: 1; }
          50%  { top: 38%; left: 50%; transform: translate(-50%,0) scale(1.1) rotate(-6deg); opacity: 1; }
          100% { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.9) rotate(-3deg); opacity: 0; }
        }
        /* AI 2 (left) plays card — flies rightward to center */
        @keyframes aiLeftPlay {
          0%   { top: 50%; left: 12%; transform: translate(0,-50%) scale(1) rotate(0deg); opacity: 1; }
          50%  { top: 50%; left: 38%; transform: translate(0,-50%) scale(1.1) rotate(6deg); opacity: 1; }
          100% { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.9) rotate(3deg); opacity: 0; }
        }
        /* AI 3 (right) plays card — flies leftward to center */
        @keyframes aiRightPlay {
          0%   { top: 50%; right: 12%; transform: translate(0,-50%) scale(1) rotate(0deg); opacity: 1; }
          50%  { top: 50%; right: 38%; transform: translate(0,-50%) scale(1.1) rotate(-6deg); opacity: 1; }
          100% { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(0.9) rotate(-3deg); opacity: 0; }
        }
        /* AI draw: card flies from center deck to AI position */
        @keyframes aiTopDraw {
          0%   { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { top: 8%;  left: 50%; transform: translate(-50%,0) scale(0.75); opacity: 0; }
        }
        @keyframes aiLeftDraw {
          0%   { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { top: 50%; left: 5%;  transform: translate(0,-50%) scale(0.75); opacity: 0; }
        }
        @keyframes aiRightDraw {
          0%   { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { top: 50%; left: 88%; transform: translate(0,-50%) scale(0.75); opacity: 0; }
        }
        @keyframes cardFlipReveal {
          0%   { transform: rotateY(0deg); }
          40%  { transform: rotateY(90deg); }
          60%  { transform: rotateY(90deg); }
          100% { transform: rotateY(0deg); }
        }
        @keyframes cardBackHide {
          0%   { transform: rotateY(0deg); }
          40%  { transform: rotateY(-90deg); }
          100% { transform: rotateY(-90deg); }
        }
        @keyframes spin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.7; transform:scale(1.05); } }
        @keyframes drawPileGlow {
          0%,100% { box-shadow: 0 0 15px var(--glow-color), inset 0 0 15px var(--glow-color); opacity: 0.8; }
          50%     { box-shadow: 0 0 30px var(--glow-color), inset 0 0 25px var(--glow-color); opacity: 1; }
        }
        @keyframes penaltyCardFly {
          0%   { top: 50%; left: 50%; transform: translate(-50%,-50%) scale(1.1) rotate(0deg);  opacity: 1; }
          50%  { top: 72%; left: 52%; transform: translate(-50%,-50%) scale(0.95) rotate(-8deg); opacity: 1; }
          100% { top: 90%; left: 50%; transform: translate(-50%,-50%) scale(0.7)  rotate(-15deg); opacity: 0; }
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; touch-action: manipulation; }
        .player-hand-scroll {
          display: flex;
          overflow-x: auto;
          overflow-y: visible;
          padding: 6px 4px 10px 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          flex-direction: row;
          justify-content: flex-start;
          scroll-behavior: smooth;
        }
        .player-hand-scroll::-webkit-scrollbar { display: none; }
        /* When cards overflow, first card is at left, last card at right — 
           scrolling right reveals newer cards collected at the right end */
      `}</style>

      {/* ── Penalty card animations (draw_one / draw_five / wild_draw_two / wild_draw_color dealt to human) ── */}
      {penaltyAnim > 0 && Array.from({ length: penaltyAnim }).map((_, i) => (
        <div
          key={`penalty-${i}`}
          style={{
            position: 'absolute',
            width: 60, height: 90,
            zIndex: 299,
            pointerEvents: 'none',
            animation: `penaltyCardFly 0.55s ease-out ${i * 170}ms forwards`,
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
          }}
        >
          <UnoCard card={{}} faceDown side={gs.side} size="normal" />
        </div>
      ))}

      {/* ── AI penalty card animations (human plays +5 / +2 against AI) ── */}
      {aiPenaltyAnim && (() => {
        const { playerIdx, count } = aiPenaltyAnim;
        const is2P = gs.players.length === 2;
        // Pick keyframe matching AI's visual position
        const totalP2 = gs.players.length;
        const animName =
          totalP2 === 2 ? 'aiTopDraw'
            : totalP2 === 3
              ? (playerIdx === 1 ? 'aiLeftDraw' : 'aiTopDraw')
              : (playerIdx === 1 ? 'aiLeftDraw' : playerIdx === 2 ? 'aiTopDraw' : 'aiRightDraw');
        return Array.from({ length: count }).map((_, i) => (
          <div
            key={`ai-penalty-${i}`}
            style={{
              position: 'fixed',
              width: 60, height: 90,
              zIndex: 298,
              pointerEvents: 'none',
              animation: `${animName} 0.5s ease-out ${i * 160}ms forwards`,
              filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
            }}
          >
            <UnoCard card={{}} faceDown side={gs.side} size="normal" />
          </div>
        ));
      })()}

      {/* Flying Card Draw Animation — shows actual drawn card with flip reveal */}
      {drawHandAnim && animCard && (() => {
        const isDark = gs.side === "dark";
        return (
          <div style={{
            position: "absolute",
            width: 70, height: 105,
            zIndex: 300,
            pointerEvents: "none",
            animation: "cardFlyToHand 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
            perspective: "600px",
          }}>
            {/* Card back (rotates away to hide) */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 8,
              background: isDark ? "linear-gradient(135deg, #4a004e, #1a001e)" : "linear-gradient(135deg, #e63946, #900c19)",
              border: `4px solid ${isDark ? "#222" : "#fff"}`,
              backfaceVisibility: "hidden",
              animation: "cardBackHide 0.75s ease-in-out forwards",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}>
              <div style={{ position: "absolute", inset: 5, border: isDark ? "2px solid rgba(255,255,255,0.1)" : "2px solid rgba(255,255,255,0.3)", borderRadius: 6 }} />
              <div style={{ position: "absolute", inset: "15%", background: isDark ? "rgba(0,0,0,0.7)" : "#f1c40f", borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-15deg)" }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: isDark ? "#FFD700" : "#e63946", letterSpacing: -1 }}>UNO</span>
                <span style={{ fontSize: 7, fontWeight: 900, color: "#fff", background: isDark ? "#e63946" : "#222", padding: "1px 4px", borderRadius: 3, marginTop: 1 }}>FLIP!</span>
              </div>
            </div>
            {/* Card face — full UnoCard so the actual drawn card is shown correctly */}
            <div style={{
              position: "absolute", inset: 0,
              backfaceVisibility: "hidden",
              animation: "cardFlipReveal 0.75s ease-in-out forwards",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}>
              <UnoCard
                card={animCard}
                size="large"
                playable={false}
                side={gs.side}
                chosenColor={animCard.color !== "wild" ? animCard.color : gs.chosenColor}
              />
            </div>
          </div>
        );
      })()}

      {/* ── Player PLAY animation: card flies up to discard pile ── */}
      {playAnim && (() => {
        const c = playAnim.card;
        return (
          <div style={{
            position: "absolute",
            width: 70, height: 105,
            zIndex: 300,
            pointerEvents: "none",
            animation: "cardFlyToDiscard 0.42s cubic-bezier(0.22, 0.61, 0.36, 1) forwards",
            filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.7))",
          }}>
            <UnoCard
              card={c}
              size="large"
              playable={false}
              side={gs.side}
              chosenColor={c.color !== "wild" ? c.color : gs.chosenColor}
            />
          </div>
        );
      })()}

      {/* ── AI card animation (play or draw) ── */}
      {aiAnim && (() => {
        const { type, playerIdx, card } = aiAnim;
        const totalP = gs.players.length;

        // Map each AI slot to its visual screen position
        // 2P: AI1=top
        // 3P: AI1=left, AI2=top
        // 4P: AI1=left, AI2=top, AI3=right
        let position = "top";
        if (totalP === 2) {
          position = "top"; // only one AI, always top
        } else if (totalP === 3) {
          if (playerIdx === 1) position = "left";
          if (playerIdx === 2) position = "top";
        } else {
          // 4 players
          if (playerIdx === 1) position = "left";
          if (playerIdx === 2) position = "top";
          if (playerIdx === 3) position = "right";
        }

        const animMap = {
          top: { play: "aiTopPlay", draw: "aiTopDraw" },
          left: { play: "aiLeftPlay", draw: "aiLeftDraw" },
          right: { play: "aiRightPlay", draw: "aiRightDraw" },
        };
        const animName = animMap[position][type];
        const showFace = type === 'play' && card;
        return (
          <div style={{
            position: "fixed",
            width: 60, height: 90,
            zIndex: 300,
            pointerEvents: "none",
            animation: `${animName} 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards`,
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))",
          }}>
            {showFace ? (
              /* AI plays — show the real card face */
              <UnoCard
                card={card}
                size="normal"
                playable={false}
                side={gs.side}
                chosenColor={card.color !== "wild" ? card.color : gs.chosenColor}
              />
            ) : (
              /* AI draws — show card back */
              <UnoCard card={{}} faceDown side={gs.side} size="normal" />
            )}
          </div>
        );
      })()}

      {/* Background texture and Diamonds */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.05, background: "repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)" }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(45deg)",
        width: "300px", height: "300px", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.05)"
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(45deg)",
        width: "150px", height: "150px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)"
      }} />

      {/* Top Player: AI 1 in 2-player mode, AI 2 in 3-4 player mode */}
      {(() => {
        const is2P = gs.players.length === 2;
        const topIdx = is2P ? 1 : 2;
        const topPlayer = gs.players[topIdx];
        if (!topPlayer) return null;
        const backSide = gs.side === "light" ? "dark" : "light";
        const aiOverlapValue = isMobile ? -12 : (isTablet || isLaptop) ? -24 : -22;
        return (
          <div style={{ position: "absolute", top: isMobile ? "5%" : "4%", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 20 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {topPlayer.hand.map((_, i) => (
                <div key={i} style={{ marginLeft: i === 0 ? 0 : aiOverlapValue }}>
                  <UnoCard card={{}} faceDown side={backSide} size={aiCardSize} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, width: "100%", marginTop: 8, color: gs.currentPlayer === topIdx ? "#FFD700" : "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 700 }}>
              {gs.currentPlayer === topIdx && <span style={{ fontSize: 10, background: "#FFD700", color: "#000", padding: "2px 6px", borderRadius: 6 }}>TURN</span>}
              <span>{is2P ? "AI 1" : "AI 2"}</span>
              <span style={{ opacity: 0.7 }}>★ {topPlayer.score}</span>
            </div>
          </div>
        );
      })()}

      {/* Left Player (AI 1) - only for 3+ players */}
      {gs.players[2] && gs.players[1] && (
        <div style={{ position: "absolute", left: isMobile ? "1%" : "5%", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {gs.players[1].hand.map((_, i) => {
              const backSide = gs.side === "light" ? "dark" : "light";
              const aiOverlapValue = isMobile ? -18 - 17 : (isTablet || isLaptop) ? -67 : -57;
              return (
                <div key={i} style={{ marginTop: i === 0 ? 0 : aiOverlapValue }}>
                  <div style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
                    <UnoCard card={{}} faceDown side={backSide} size={aiCardSize} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: 6, color: gs.currentPlayer === 1 ? "#FFD700" : "rgba(255,255,255,0.4)", fontSize: isMobile ? 10 : 13, fontWeight: 700 }}>
            {gs.currentPlayer === 1 && <span style={{ fontSize: isMobile ? 8 : 10, background: "#FFD700", color: "#000", padding: "2px 5px", borderRadius: 6 }}>TURN</span>}
            <span>AI 1</span>
            <span style={{ opacity: 0.7 }}>★ {gs.players[1].score}</span>
          </div>
        </div>
      )}

      {/* Right Player (AI 3 / Player 4) - only for 4 players */}
      {gs.players[3] && (
        <div style={{ position: "absolute", right: isMobile ? "1%" : "5%", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {gs.players[3].hand.map((_, i) => {
              const backSide = gs.side === "light" ? "dark" : "light";
              const aiOverlapValue = isMobile ? -18 - 17 : (isTablet || isLaptop) ? -67 : -57;
              return (
                <div key={i} style={{ marginTop: i === 0 ? 0 : aiOverlapValue }}>
                  <div style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}>
                    <UnoCard card={{}} faceDown side={backSide} size={aiCardSize} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, marginTop: 6, color: gs.currentPlayer === 3 ? "#FFD700" : "rgba(255,255,255,0.4)", fontSize: isMobile ? 10 : 13, fontWeight: 700 }}>
            {gs.currentPlayer === 3 && <span style={{ fontSize: isMobile ? 8 : 10, background: "#FFD700", color: "#000", padding: "2px 5px", borderRadius: 6 }}>TURN</span>}
            <span>AI 3</span>
            <span style={{ opacity: 0.7 }}>★ {gs.players[3].score}</span>
          </div>
        </div>
      )}



      {/* Center Table Area */}
      <div style={{ position: "absolute", top: isMobile ? "46%" : (isTablet || isShortScreen) ? "42%" : "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 10, display: "flex", alignItems: "center", gap: isMobile ? 10 : 20 }}>





        {/* Center Container with dynamic glow */}
        <div style={{
          display: "flex", gap: isMobile ? 6 : 10, padding: isMobile ? "5px 7px" : "8px 10px", borderRadius: 12,
          border: `${isMobile ? 2 : 3}px solid ${activeColorHex}`,
          animation: isMyTurn && !drewCard && !drawHandAnim ? "drawPileGlow 1.5s ease-in-out infinite" : "none",
          boxShadow: `0 0 20px ${activeColorHex}`,
          transition: "all 0.3s",
          '--glow-color': activeColorHex
        }}>
          <div
            ref={drawPileRef}
            style={{ cursor: isMyTurn && !drewCard && !drawHandAnim ? "pointer" : "default", transition: "transform 0.15s", position: "relative" }}
            onClick={isMyTurn && !drewCard && !drawHandAnim ? handleDraw : undefined}
            onMouseEnter={e => { if (isMyTurn && !drewCard && !drawHandAnim) e.currentTarget.style.transform = "scale(1.08) translateY(-4px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) translateY(0)"; }}
          >
            <UnoCard
              card={{ display: gs.drawPile.length }}
              faceDown
              side={gs.side === "light" ? "dark" : "light"}
              size={isMobile ? "normal" : "large"}
            />
            {isMyTurn && !drewCard && !drawHandAnim && (
              <div style={{ position: "absolute", bottom: -22, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, color: "#00d2ff", whiteSpace: "nowrap", textShadow: "0 0 6px #00d2ff" }}>TAP TO DRAW</div>
            )}
            <div style={{ position: "absolute", top: -10, right: -10, background: "#111", border: "2px solid #fff", color: "#fff", padding: "2px 6px", borderRadius: 10, fontSize: 12, fontWeight: 800, zIndex: 10 }}>
              {gs.drawPile.length}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            {top ? (
              <div style={{ transform: flipAnim ? "rotateY(90deg)" : "rotateY(0)", transition: "transform 0.4s" }}>
                <UnoCard card={top} size={isMobile ? "normal" : "large"} chosenColor={gs.chosenColor} />
              </div>
            ) : (
              <div style={{ width: isMobile ? 60 : 80, height: isMobile ? 90 : 120, borderRadius: 8, border: "2px dashed rgba(255,255,255,0.3)" }} />
            )}
            {gs.chosenColor && gs.chosenColor !== "wild" && (
              <div style={{
                position: "absolute", bottom: -10, right: -10, width: 30, height: 30, borderRadius: "50%",
                background: COLOR_HEX[gs.chosenColor], border: "3px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.4)"
              }} title={COLOR_LABEL[gs.chosenColor]} />
            )}
          </div>
        </div>
      </div>

      {/* Color Picker Modal */}
      {gs.needColor && gs.currentPlayer === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(0,0,0,0.92)", borderRadius: 18, padding: isMobile ? 14 : 22, zIndex: 100,
          border: "2px solid rgba(255,255,255,0.25)", display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 10 : 16,
          boxShadow: "0 20px 50px rgba(0,0,0,0.7)",
        }}>
          <span style={{ fontSize: isMobile ? 13 : 16, color: "#fff", fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>
            {gs.pendingDraw === -1 ? "🌑 Choose a Dark Color" : "🎨 Choose a Color"}
          </span>
          <div style={{ display: "flex", gap: isMobile ? 10 : 15 }}>
            {colors.map(c => (
              <div
                key={c} onClick={() => handleColorPick(c)}
                style={{
                  width: isMobile ? 38 : 54, height: isMobile ? 38 : 54,
                  borderRadius: "50%", background: COLOR_HEX[c], cursor: "pointer",
                  border: `${isMobile ? 2 : 3}px solid #fff`,
                  boxShadow: `0 4px 16px ${COLOR_HEX[c]}80`,
                  transition: "transform 0.15s, box-shadow 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 900, fontSize: isMobile ? 10 : 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.boxShadow = `0 6px 24px ${COLOR_HEX[c]}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 16px ${COLOR_HEX[c]}80`; }}
              >
                <span style={{ fontSize: isMobile ? 8 : 10, fontWeight: 900, textShadow: "1px 1px 0 #000" }}>{COLOR_LABEL[c]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wild Draw Color: Human must draw until they get the chosen color */}
      {gs.needDrawColor && gs.currentPlayer === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "rgba(10,0,20,0.95)", borderRadius: 18, padding: isMobile ? 14 : 22, zIndex: 100,
          border: `2px solid ${COLOR_HEX[gs.drawColorTarget] || "#ff1493"}`,
          boxShadow: `0 20px 50px rgba(0,0,0,0.7), 0 0 30px ${COLOR_HEX[gs.drawColorTarget] || "#ff1493"}40`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 8 : 12,
          maxWidth: isMobile ? "86vw" : 340, textAlign: "center",
        }}>
          <div style={{ fontSize: isMobile ? 22 : 30 }}>🌑</div>
          <span style={{ fontSize: isMobile ? 13 : 16, color: "#fff", fontWeight: 900, letterSpacing: 1 }}>
            Draw until you get <span style={{ color: COLOR_HEX[gs.drawColorTarget], textShadow: `0 0 10px ${COLOR_HEX[gs.drawColorTarget]}` }}>{COLOR_LABEL[gs.drawColorTarget]}</span>!
          </span>
          <span style={{ fontSize: isMobile ? 10 : 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
            Draw one card at a time. If you get the color, you can play it or pass. You can also <b style={{ color: "#FFD700" }}>Dare</b> to stop early!
          </span>
          <div style={{ display: "flex", gap: isMobile ? 8 : 14, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={handleDrawColorCard}
              style={{
                padding: isMobile ? "8px 16px" : "10px 22px",
                background: `linear-gradient(135deg, ${COLOR_HEX[gs.drawColorTarget]}, #000)`,
                border: `2px solid ${COLOR_HEX[gs.drawColorTarget]}`,
                color: "#fff", borderRadius: 12, fontWeight: 900, fontSize: isMobile ? 12 : 14,
                cursor: "pointer", boxShadow: `0 4px 12px ${COLOR_HEX[gs.drawColorTarget]}60`,
                transition: "transform 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              DRAW CARD
            </button>
            <button
              onClick={handleDareDrawColor}
              style={{
                padding: isMobile ? "8px 16px" : "10px 22px",
                background: "linear-gradient(135deg, #FFD700, #e67e22)",
                border: "2px solid #fff",
                color: "#000", borderRadius: 12, fontWeight: 900, fontSize: isMobile ? 12 : 14,
                cursor: "pointer", boxShadow: "0 4px 12px rgba(255,215,0,0.4)",
                transition: "transform 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              😎 DARE!
            </button>
          </div>
        </div>
      )}
      {/* Player 1 (User) — hand + UNO button in one bottom bar */}
      <div style={{
        position: "absolute", bottom: isMobile ? 8 : 16, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", zIndex: 30,
        maxWidth: "98vw",
      }}>
        {/* Player Info Row — name, turn badge, score */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", marginBottom: isMobile ? 4 : 8, padding: "0 8px", color: "#fff", fontSize: isMobile ? 11 : 14, fontWeight: 700, letterSpacing: 1, borderBottom: "2px solid rgba(255,255,255,0.4)", paddingBottom: isMobile ? 3 : 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "linear-gradient(135deg, #f39c12, #d35400)", color: "#fff", padding: "2px 10px", borderRadius: 8, fontWeight: 900, fontSize: isMobile ? 11 : 14, letterSpacing: 1, boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>YOU</span>
            {gs.currentPlayer === 0 && <span style={{ fontSize: isMobile ? 8 : 10, background: "#FFD700", color: "#000", padding: "2px 6px", borderRadius: 6, fontWeight: 900 }}>YOUR TURN</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>{me.score} ★</div>
          </div>
        </div>

        {/* Hand row + UNO button side by side */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14 }}>
          {/* Hand — scrollable */}
          <div ref={handScrollRef} className="player-hand-scroll" style={{ justifyContent: "flex-start", maxWidth: isMobile ? "75vw" : isTablet ? "72vw" : isLaptop ? "70vw" : "78vw" }}>
            {me.hand.map((card, i) => {
              const canPlayAny = isMyTurn && !drewCard && !justDrew;
              const isThisDrawn = drewCard && drewCard.id === card.id;
              const playable = (canPlayAny || isThisDrawn) && canPlay(card, top, gs.chosenColor);
              return (
                <div key={card.id} style={{
                  marginLeft: i === 0 ? 0 : handOverlap,
                  transform: "translateY(0)", transition: "transform 0.2s, z-index 0s",
                  flexShrink: 0,
                  position: "relative",
                  zIndex: i,
                }}
                  onMouseEnter={e => { if (playable) { e.currentTarget.style.transform = "translateY(-12px)"; e.currentTarget.style.zIndex = 999; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.zIndex = i; }}>
                  <UnoCard card={card} playable={playable} onClick={playable ? () => handlePlay(card.id) : undefined} size={handCardSize} chosenColor={card.id === top?.id ? gs.chosenColor : null} />
                </div>
              );
            })}
          </div>

          {/* UNO Button + PASS — stacked to the right of the hand */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {(drewCard || justDrew) && isMyTurn && (
              <button onClick={handlePassAfterDraw} style={{
                padding: isMobile ? "5px 10px" : "7px 16px", borderRadius: "14px", background: "#e67e22",
                border: "2px solid #fff", color: "#fff", fontWeight: 900, fontSize: isMobile ? "10px" : "12px",
                cursor: "pointer", boxShadow: "0 4px 0 #a04000", transition: "transform 0.1s", whiteSpace: "nowrap",
              }}
                onMouseDown={e => e.currentTarget.style.transform = "translateY(3px)"}
                onMouseUp={e => e.currentTarget.style.transform = "translateY(0)"}
              >PASS</button>
            )}
            <button
              onClick={handleSayUno}
              style={{
                width: unoSize, height: unoSize, borderRadius: "50%",
                background: gs.pendingUno === 0
                  ? "radial-gradient(circle at 30% 30%, #ff4b2b, #c0392b)"
                  : "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                border: gs.pendingUno === 0
                  ? `${isMobile ? 4 : 6}px solid #ffeb3b`
                  : `${isMobile ? 4 : 6}px solid #fff`,
                boxShadow: gs.pendingUno === 0
                  ? "0 0 30px #ff4b2b, 0 10px 20px rgba(0,0,0,0.5)"
                  : "0 8px 16px rgba(0,0,0,0.3), inset 0 -6px 0 rgba(0,0,0,0.2)",
                color: "#fff", fontWeight: 900,
                cursor: "pointer", transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0, userSelect: "none",
                transformOrigin: "center",
                animation: gs.pendingUno === 0 ? "pulse 0.4s infinite alternate" : "none",
                opacity: ((me.hand.length === 2 || gs.pendingUno === 0) && !me.saidUno) ? 1 : 0.35,
                pointerEvents: ((me.hand.length === 2 || gs.pendingUno === 0) && !me.saidUno) ? "auto" : "none",
                overflow: "hidden",
                position: "relative",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15) rotate(5deg)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}
              onMouseDown={e => e.currentTarget.style.transform = "scale(0.9)"}
            >
              {(me.hand.length <= 2 || gs.pendingUno === 0) && !me.saidUno ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <img
                    src="denger.jpg"
                    alt="UNO"
                    style={{
                      width: unoSize * 0.52, height: unoSize * 0.52,
                      objectFit: "contain",
                      filter: gs.pendingUno === 0
                        ? "brightness(10) drop-shadow(0 0 4px #fff)"
                        : "invert(1) drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
                    }}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                  <span style={{
                    fontSize: unoSize * 0.22, fontWeight: 900,
                    color: "#fff",
                    textShadow: "1px 1px 0 #000, 2px 2px 0 rgba(0,0,0,0.5)",
                    letterSpacing: "1px",
                    transform: "skewX(-5deg)",
                    lineHeight: 1,
                  }}>
                    {gs.pendingUno === 0 ? "UNO!" : "UNO"}
                  </span>
                </div>
              ) : (
                <div style={{
                  fontSize: `clamp(18px, 3vh, 32px)`,
                  textShadow: "2px 2px 0 #000, 4px 4px 0 rgba(0,0,0,0.3)",
                  letterSpacing: "2px",
                  transform: "skewX(-5deg)",
                  color: "#fff",
                }}>
                  UNO
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Round Over Modal */}
      {gs.roundOver && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          backdropFilter: "blur(5px)"
        }}>
          <Fireworks />
          <div style={{
            background: "rgba(20, 10, 40, 0.85)",
            backdropFilter: "blur(20px)",
            borderRadius: isMobile ? 20 : 28,
            padding: isMobile ? "24px 20px" : "40px 50px",
            textAlign: "center",
            border: "2px solid rgba(255, 215, 0, 0.5)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6), inset 0 0 40px rgba(255,215,0,0.1)",
            color: "#fff",
            position: "relative", zIndex: 2,
            width: isMobile ? "90vw" : "auto",
            maxWidth: isMobile ? "340px" : "460px",
            boxSizing: "border-box",
          }}>
            <div style={{
              fontSize: isMobile ? 20 : 30, color: "#FFD700", fontWeight: 900, marginBottom: isMobile ? 10 : 15,
              textShadow: "0 4px 15px rgba(255, 215, 0, 0.4)"
            }}>
              {gs.gameWinner !== null
                ? `🏆 ${gs.players[gs.gameWinner].name.toUpperCase()} WINS THE GAME! 🏆`
                : `🎉 ${gs.players[gs.roundWinner].name} Wins the Round!`}
            </div>

            <div style={{
              background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: isMobile ? "12px" : "18px", marginBottom: isMobile ? 16 : 26,
              border: "1px solid rgba(255,255,255,0.1)"
            }}>
              <div style={{ fontSize: isMobile ? 11 : 13, color: "#aaa", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>Final Scores</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {gs.players.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: isMobile ? 14 : 17, fontWeight: p.id === gs.roundWinner ? 900 : 500, color: p.id === gs.roundWinner ? "#FFD700" : "#fff" }}>
                    <span>{p.name}</span>
                    <span>{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: isMobile ? 8 : 12, justifyContent: "center", flexWrap: "wrap" }}>
              {onHome && (
                <button
                  onClick={onHome}
                  style={{ padding: isMobile ? "9px 16px" : "12px 22px", borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: isMobile ? 13 : 15, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                >
                  🏠 Home
                </button>
              )}
              {gs.gameWinner === null && (
                <button
                  onClick={newRound}
                  style={{ padding: isMobile ? "9px 16px" : "12px 22px", borderRadius: 12, background: "linear-gradient(to bottom, #FFE000, #F39C12)", border: "2px solid #FFF", color: "#000", fontSize: isMobile ? 13 : 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 15px rgba(255, 215, 0, 0.4)", transition: "transform 0.1s" }}
                  onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  Next Round ➔
                </button>
              )}
              <button
                onClick={newGame}
                style={{ padding: isMobile ? "9px 16px" : "12px 22px", borderRadius: 12, background: "linear-gradient(to bottom, #ef5350, #c62828)", border: "2px solid #FFF", color: "#fff", fontSize: isMobile ? 13 : 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 15px rgba(229, 57, 53, 0.4)", transition: "transform 0.1s" }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                ↻ Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    padding: "7px 18px", borderRadius: 8, border: "none",
    background: bg, color, cursor: "pointer",
    fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
    transition: "opacity 0.15s",
    fontFamily: "'Trebuchet MS', sans-serif",
  };
}