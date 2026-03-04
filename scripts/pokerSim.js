#!/usr/bin/env node
'use strict';

// ─── Deck ─────────────────────────────────────────────────────────────────────

const SUITS  = ['S','H','D','C'];
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function makeNewDeck() {
  const d = [];
  for (const s of SUITS) for (const v of VALUES) d.push(v + s);
  return d;
}
function shuffleDeck(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function deal(deck, n) { return { hand: deck.slice(0, n), deck: deck.slice(n) }; }

// ─── Hand evaluator ───────────────────────────────────────────────────────────

function rankValue(card) {
  const v = card.slice(0, -1);
  if (v === 'A') return 14; if (v === 'K') return 13;
  if (v === 'Q') return 12; if (v === 'J') return 11;
  return parseInt(v, 10);
}
function getSuit(card) { return card[card.length - 1]; }

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  return [...combinations(rest, k - 1).map(c => [first, ...c]), ...combinations(rest, k)];
}

function evaluate5(cards) {
  const ranks = cards.map(rankValue).sort((a, b) => b - a);
  const suits  = cards.map(getSuit);
  const isFlush = suits.every(s => s === suits[0]);
  const uR = new Set(ranks);
  const isNorm  = ranks[0] - ranks[4] === 4 && uR.size === 5;
  const isWheel = [14,2,3,4,5].every(r => uR.has(r));
  const isStraight = isNorm || isWheel;
  const sHigh = isNorm ? ranks[0] : 5;
  if (isStraight && isFlush) return { score: 9, tiebreakers: [sHigh] };
  const freq = {};
  for (const r of ranks) freq[r] = (freq[r] || 0) + 1;
  const byCount = Object.entries(freq).sort((a, b) => b[1] - a[1] || +b[0] - +a[0]);
  const counts = byCount.map(e => e[1]);
  const tb = byCount.map(e => +e[0]);
  if (counts[0] === 4) return { score: 8, tiebreakers: tb };
  if (counts[0] === 3 && counts[1] === 2) return { score: 7, tiebreakers: tb };
  if (isFlush) return { score: 6, tiebreakers: ranks };
  if (isStraight) return { score: 5, tiebreakers: [sHigh] };
  if (counts[0] === 3) return { score: 4, tiebreakers: tb };
  if (counts[0] === 2 && counts[1] === 2) return { score: 3, tiebreakers: tb };
  if (counts[0] === 2) return { score: 2, tiebreakers: tb };
  return { score: 1, tiebreakers: ranks };
}

function cmpResult(a, b) {
  if (a.score !== b.score) return a.score - b.score;
  for (let i = 0; i < Math.min(a.tiebreakers.length, b.tiebreakers.length); i++)
    if (a.tiebreakers[i] !== b.tiebreakers[i]) return a.tiebreakers[i] - b.tiebreakers[i];
  return 0;
}
function evaluateHand(cards) {
  if (cards.length <= 5) return evaluate5(cards);
  let best = null;
  for (const c of combinations(cards, 5)) {
    const r = evaluate5(c);
    if (!best || cmpResult(r, best) > 0) best = r;
  }
  return best;
}
function compareHands(h1, h2) {
  const c = cmpResult(evaluateHand(h1), evaluateHand(h2));
  return c > 0 ? 1 : c < 0 ? -1 : 0;
}

// ─── Draw detectors ───────────────────────────────────────────────────────────

function hasFlushDraw(hole, comm) {
  const all = [...hole, ...comm], cnt = {};
  for (const c of all) cnt[getSuit(c)] = (cnt[getSuit(c)] || 0) + 1;
  return Object.values(cnt).some(n => n === 4);
}
function hasStraightDraw(hole, comm) {
  const all = [...hole, ...comm];
  const ranks = [...new Set(all.map(rankValue))].sort((a, b) => a - b);
  if (ranks.includes(14)) ranks.unshift(1);
  for (let i = 0; i <= ranks.length - 4; i++)
    if (ranks[i + 3] - ranks[i] <= 4) return true;
  return false;
}

// ─── Strength evaluation ──────────────────────────────────────────────────────

const STRENGTH_ORDER = ['weak','weak_medium','medium','medium_strong','strong','very_strong'];
function loosenStrength(s) {
  const i = STRENGTH_ORDER.indexOf(s);
  return STRENGTH_ORDER[Math.min(i + 1, STRENGTH_ORDER.length - 1)];
}

function preflopStrength(hole) {
  const r1 = rankValue(hole[0]), r2 = rankValue(hole[1]);
  const low = Math.min(r1,r2), high = Math.max(r1,r2);
  const suited = getSuit(hole[0]) === getSuit(hole[1]);
  const conn   = high - low === 1;
  if (low === high) {
    if (low >= 12) return 'very_strong';
    if (low >= 10) return 'strong';
    if (low >= 7)  return 'medium_strong';
    return 'medium';
  }
  if (high === 14) {
    if (suited) return 'very_strong';
    if (low >= 10) return 'strong';
    return 'medium';
  }
  if (high === 13 && low >= 12) return suited ? 'strong' : 'medium_strong';
  if (high === 13 && low >= 11) return suited ? 'medium_strong' : 'medium';
  if (high === 12 && low >= 11) return suited ? 'medium_strong' : 'medium';
  if (high >= 11 && suited && conn) return 'medium_strong';
  if (suited && conn && high >= 8) return 'medium';
  if (suited && low >= 7 && high >= 9) return 'medium';
  return 'weak';
}

function postflopStrength(hole, comm) {
  const r = evaluateHand([...hole, ...comm]);
  if (r.score >= 8) return 'very_strong';
  if (r.score >= 7) return 'very_strong';
  if (r.score >= 6) return 'strong';
  if (r.score >= 5) return 'medium_strong';
  if (r.score >= 4) return 'medium_strong';
  if (r.score >= 3) return 'medium';
  if (r.score >= 2) return 'weak_medium';
  if (comm.length < 5) {
    if (hasFlushDraw(hole, comm)) return 'medium_strong';
    if (hasStraightDraw(hole, comm)) return 'medium';
  }
  return 'weak';
}

function evalStrength(hole, comm) {
  return comm.length === 0 ? preflopStrength(hole) : postflopStrength(hole, comm);
}

// ─── AI decision (parameterized) ─────────────────────────────────────────────
// params: { bluffChance, slowPlayChance, strongRaise, medStrongCall, medCall, weakMedCall }

const BB = 20;

function getDecision(hole, comm, pot, toCall, stack, seatId, params, actions) {
  let strength = evalStrength(hole, comm);
  if (comm.length === 0 && seatId >= 3) strength = loosenStrength(strength);
  const facingBet = toCall > 0;

  if (!facingBet) {
    if (strength === 'very_strong' && Math.random() < params.slowPlayChance) {
      actions.check++; return 'check';
    }
    if (['very_strong','strong','medium_strong'].includes(strength)) {
      actions.raise++; return stack > 0 ? 'raise' : 'check';
    }
    if (Math.random() < params.bluffChance) { actions.bluff++; return 'raise'; }
    actions.check++; return 'check';
  }

  const callRatio = toCall / (pot + toCall);
  switch (strength) {
    case 'very_strong':
      actions.raise++; return stack >= toCall + BB ? 'raise' : 'call';
    case 'strong':
      if (callRatio <= params.strongRaise && stack >= toCall + BB) { actions.raise++; return 'raise'; }
      actions.call++; return 'call';
    case 'medium_strong':
      if (callRatio <= params.medStrongCall) { actions.call++; return 'call'; }
      actions.fold++; return 'fold';
    case 'medium':
      if (callRatio <= params.medCall) { actions.call++; return 'call'; }
      actions.fold++; return 'fold';
    case 'weak_medium':
      if (callRatio <= params.weakMedCall) { actions.call++; return 'call'; }
      actions.fold++; return 'fold';
    default:
      actions.fold++; return 'fold';
  }
}

// ─── Betting street ───────────────────────────────────────────────────────────

function runStreet(players, community, pot, initMax, orderIds, params, actions) {
  let ps = players.map(p => ({...p}));
  let currentPot = pot, currentMax = initMax;
  let queue = [...orderIds.filter(id => !ps[id].folded && ps[id].stack > 0)];
  let iters = 0;

  while (queue.length > 0 && iters++ < 60) {
    if (ps.filter(p => !p.folded).length <= 1) break;
    const id = queue.shift();
    const actor = ps[id];
    if (actor.folded || actor.stack <= 0) continue;

    const toCall  = Math.max(0, currentMax - actor.streetBet);
    const decision = getDecision(actor.hand, community, currentPot, toCall, actor.stack, id, params, actions);

    if (decision === 'fold') {
      ps[id] = {...actor, folded: true};

    } else if (decision === 'check') {
      // no chips move

    } else if (decision === 'call') {
      const amt = Math.min(toCall, actor.stack);
      currentPot += amt;
      ps[id] = {...actor, stack: actor.stack - amt, streetBet: actor.streetBet + amt};

    } else { // raise
      const target   = Math.max(currentMax + BB, BB * 3);
      const pays     = Math.min(target - actor.streetBet, actor.stack);
      const newSB    = actor.streetBet + pays;
      const prevMax  = currentMax;
      currentMax     = Math.max(currentMax, newSB);
      currentPot    += pays;
      ps[id]         = {...actor, stack: actor.stack - pays, streetBet: newSB};

      if (currentMax > prevMax) {
        // re-open action for everyone who hasn't matched the new bet
        for (const p of ps) {
          if (!p.folded && p.stack > 0 && p.id !== id && p.streetBet < currentMax && !queue.includes(p.id))
            queue.push(p.id);
        }
      }
    }
  }
  return { players: ps, pot: currentPot };
}

// ─── Single hand ──────────────────────────────────────────────────────────────

const STARTING_STACK = 1000;
const SB = 10;
const PREFLOP_ORDER = [2, 3, 4, 0, 1];
const POSTFLOP_ORDER = [0, 1, 2, 3, 4];

function runHand(players, params, actions) {
  let d = shuffleDeck(makeNewDeck());
  let ps = players.map(p => ({
    ...p, hand: [], streetBet: 0, folded: false,
    stack: p.stack > 0 ? p.stack : STARTING_STACK,
  }));

  // Deal hole cards
  ps = ps.map(p => { const r = deal(d, 2); d = r.deck; return {...p, hand: r.hand}; });

  // Blinds
  const sbAmt = Math.min(SB, ps[0].stack);
  const bbAmt = Math.min(BB, ps[1].stack);
  ps[0] = {...ps[0], stack: ps[0].stack - sbAmt, streetBet: sbAmt};
  ps[1] = {...ps[1], stack: ps[1].stack - bbAmt, streetBet: bbAmt};
  let pot = sbAmt + bbAmt;

  // Preflop
  let res = runStreet(ps, [], pot, bbAmt, PREFLOP_ORDER, params, actions);
  ps = res.players; pot = res.pot;

  let active = ps.filter(p => !p.folded);
  if (active.length === 1) {
    ps[active[0].id] = {...ps[active[0].id], stack: ps[active[0].id].stack + pot};
    return ps;
  }

  // Flop
  const {hand: flop, deck: d2} = deal(d, 3); d = d2;
  ps = ps.map(p => ({...p, streetBet: 0}));
  res = runStreet(ps, flop, pot, 0, POSTFLOP_ORDER, params, actions);
  ps = res.players; pot = res.pot;
  active = ps.filter(p => !p.folded);
  if (active.length === 1) {
    ps[active[0].id] = {...ps[active[0].id], stack: ps[active[0].id].stack + pot};
    return ps;
  }

  // Turn
  const {hand: [turnCard], deck: d3} = deal(d, 1); d = d3;
  const comm2 = [...flop, turnCard];
  ps = ps.map(p => ({...p, streetBet: 0}));
  res = runStreet(ps, comm2, pot, 0, POSTFLOP_ORDER, params, actions);
  ps = res.players; pot = res.pot;
  active = ps.filter(p => !p.folded);
  if (active.length === 1) {
    ps[active[0].id] = {...ps[active[0].id], stack: ps[active[0].id].stack + pot};
    return ps;
  }

  // River
  const {hand: [riverCard], deck: d4} = deal(d, 1); d = d4;
  const comm3 = [...comm2, riverCard];
  ps = ps.map(p => ({...p, streetBet: 0}));
  res = runStreet(ps, comm3, pot, 0, POSTFLOP_ORDER, params, actions);
  ps = res.players; pot = res.pot;
  active = ps.filter(p => !p.folded);

  if (active.length === 1) {
    ps[active[0].id] = {...ps[active[0].id], stack: ps[active[0].id].stack + pot};
    return ps;
  }

  // Showdown
  let best = null;
  for (const p of active) {
    if (!best || compareHands([...p.hand, ...comm3], [...best.hand, ...comm3]) > 0) best = p;
  }
  const winners = active.filter(p => compareHands([...p.hand, ...comm3], [...best.hand, ...comm3]) === 0);
  const share = Math.floor(pot / winners.length);
  for (const w of winners) ps[w.id] = {...ps[w.id], stack: ps[w.id].stack + share};
  return ps;
}

// ─── Run simulation ───────────────────────────────────────────────────────────

function simulate(params, numHands) {
  let players = Array.from({length: 5}, (_, i) => ({id: i, stack: STARTING_STACK}));
  const wins = Array(5).fill(0);
  const net  = Array(5).fill(0);
  const actions = { fold: 0, call: 0, raise: 0, check: 0, bluff: 0 };
  let totalPot = 0;
  let showdowns = 0;

  for (let h = 0; h < numHands; h++) {
    const before = players.map(p => p.stack);
    players = runHand(players, params, actions);
    for (let i = 0; i < 5; i++) {
      const diff = players[i].stack - before[i];
      net[i] += diff;
      if (diff > 0) wins[i]++;
    }
  }

  return { wins, net, actions };
}

// ─── Parameter sweep ─────────────────────────────────────────────────────────

function stdDev(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SEAT_NAMES = ['SB', 'BB', 'UTG', 'HJ', 'CO'];
const NUM_HANDS  = 50_000;
const SWEEP_HANDS = 10_000;

const BASE_PARAMS = {
  slowPlayChance: 0.20,
  bluffChance:    0.15,
  strongRaise:    0.60,
  medStrongCall:  0.40,
  medCall:        0.25,
  weakMedCall:    0.15,
};

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║       Poker AI Self-Play Simulation          ║');
console.log('╚══════════════════════════════════════════════╝\n');

// ── Phase 1: Baseline ────────────────────────────────────────────────────────
console.log(`Phase 1: Baseline — ${NUM_HANDS.toLocaleString()} hands...`);
const t0 = Date.now();
const base = simulate(BASE_PARAMS, NUM_HANDS);
const t1 = Date.now();
console.log(`Completed in ${((t1 - t0) / 1000).toFixed(1)}s\n`);

console.log('── Results by seat ────────────────────────────');
console.log('Seat  Wins    Win%    Net Chips  BB/100');
for (let i = 0; i < 5; i++) {
  const wr    = (base.wins[i] / NUM_HANDS * 100).toFixed(1);
  const bb100 = (base.net[i] / NUM_HANDS / BB * 100).toFixed(2);
  const netStr = base.net[i] >= 0 ? `+${base.net[i]}` : `${base.net[i]}`;
  console.log(
    `${SEAT_NAMES[i].padEnd(5)} ${String(base.wins[i]).padEnd(7)} ${wr.padStart(5)}%  ` +
    `${netStr.padStart(10)}  ${bb100}`
  );
}

const totalActions = base.actions.fold + base.actions.call + base.actions.raise + base.actions.check + base.actions.bluff;
console.log('\n── Action frequencies ─────────────────────────');
for (const [k, v] of Object.entries(base.actions)) {
  console.log(`  ${k.padEnd(8)} ${v.toLocaleString().padStart(8)}  (${(v/totalActions*100).toFixed(1)}%)`);
}

console.log('\n── Balance score ──────────────────────────────');
const winRates = base.wins.map(w => w / NUM_HANDS * 100);
const sd = stdDev(winRates);
console.log(`  StdDev of win rates: ${sd.toFixed(2)}% (lower = more balanced, target < 2%)`);

// ── Phase 2: Parameter sweep ─────────────────────────────────────────────────
console.log(`\nPhase 2: Parameter sweep — testing ${SWEEP_HANDS.toLocaleString()} hands per combo...`);

const bluffOptions      = [0.05, 0.10, 0.15, 0.20, 0.25];
const medStrongOptions  = [0.30, 0.40, 0.50];
const medCallOptions    = [0.15, 0.25, 0.35];

let bestParams  = {...BASE_PARAMS};
let bestScore   = Infinity; // lower sd = better
let bestBB100   = null;
let results = [];

for (const bluff of bluffOptions) {
  for (const msc of medStrongOptions) {
    for (const mc of medCallOptions) {
      const params = {...BASE_PARAMS, bluffChance: bluff, medStrongCall: msc, medCall: mc};
      const r = simulate(params, SWEEP_HANDS);
      const wr = r.wins.map(w => w / SWEEP_HANDS * 100);
      const sd = stdDev(wr);
      const avgBB100 = r.net.reduce((a, b) => a + b, 0) / 5 / SWEEP_HANDS / BB * 100;
      results.push({ params, sd, avgBB100 });
      if (sd < bestScore) {
        bestScore  = sd;
        bestParams = params;
        bestBB100  = avgBB100;
      }
      process.stdout.write('.');
    }
  }
}
console.log(' done.\n');

// Sort by balance
results.sort((a, b) => a.sd - b.sd);

console.log('── Top 5 parameter combos (most balanced) ─────');
console.log('Rank  BluffChance  MedStrong  MedCall  Balance(sd)');
for (let i = 0; i < Math.min(5, results.length); i++) {
  const r = results[i];
  console.log(
    `#${i+1}   ${String(r.params.bluffChance).padEnd(13)}` +
    `${String(r.params.medStrongCall).padEnd(11)}` +
    `${String(r.params.medCall).padEnd(9)}` +
    `${r.sd.toFixed(3)}%`
  );
}

console.log('\n── Best params found ──────────────────────────');
console.log(JSON.stringify(bestParams, null, 2));

// ── Phase 3: Verify best params ──────────────────────────────────────────────
console.log(`\nPhase 3: Verifying best params — ${NUM_HANDS.toLocaleString()} hands...`);
const verify = simulate(bestParams, NUM_HANDS);
console.log('Seat  Win%    BB/100');
for (let i = 0; i < 5; i++) {
  const wr    = (verify.wins[i] / NUM_HANDS * 100).toFixed(1);
  const bb100 = (verify.net[i] / NUM_HANDS / BB * 100).toFixed(2);
  console.log(`${SEAT_NAMES[i].padEnd(5)} ${wr.padStart(5)}%  ${bb100}`);
}
const finalSD = stdDev(verify.wins.map(w => w / NUM_HANDS * 100));
console.log(`Balance stdDev: ${finalSD.toFixed(2)}%`);

// ── Phase 4: Write best params to pokerAI.js ─────────────────────────────────
const fs   = require('fs');
const path = require('path');
const aiPath = path.join(__dirname, '..', 'components', 'pokerAI.js');
let src = fs.readFileSync(aiPath, 'utf8');

// Replace each tunable constant
const replacements = {
  bluffChance:   bestParams.bluffChance,
  slowPlayChance: bestParams.slowPlayChance,
  medStrongCall: bestParams.medStrongCall,
  medCall:       bestParams.medCall,
  weakMedCall:   bestParams.weakMedCall,
};

// Patch the numeric literals in the if-conditions and switch cases
src = src.replace(/Math\.random\(\) < ([\d.]+)(\s*\).*?\/\/ 15% bluff)/, `Math.random() < ${bestParams.bluffChance}$2`);
src = src.replace(/Math\.random\(\) < ([\d.]+)(\s*\).*?slow-play)/, `Math.random() < ${bestParams.slowPlayChance}$2`);
src = src.replace(/(callRatio <= )([\d.]+)(\s*\? 'call' : 'fold'.*?Three of a Kind)/, `$1${bestParams.medStrongCall}$3`);

// Write a comment block at the top of the file with tuned params
const tuneComment =
`// ── Tuned params (pokerSim.js — ${new Date().toISOString().slice(0,10)}) ─────
// bluffChance=${bestParams.bluffChance}  medStrongCall=${bestParams.medStrongCall}  medCall=${bestParams.medCall}  balance_sd=${finalSD.toFixed(3)}%\n`;

if (!src.includes('Tuned params')) {
  src = src.replace('// ── Draw detectors', tuneComment + '\n// ── Draw detectors');
}

fs.writeFileSync(aiPath, src, 'utf8');
console.log(`\npokerAI.js updated with best params.`);

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════╗');
console.log('║                  Summary                    ║');
console.log('╚══════════════════════════════════════════════╝');
console.log(`  Baseline balance stdDev : ${sd.toFixed(2)}%`);
console.log(`  Best balance stdDev     : ${finalSD.toFixed(2)}%`);
console.log(`  Improvement             : ${(sd - finalSD).toFixed(2)}pp`);
console.log(`  Best bluffChance        : ${bestParams.bluffChance}`);
console.log(`  Best medStrongCall      : ${bestParams.medStrongCall}`);
console.log(`  Best medCall            : ${bestParams.medCall}`);
console.log('');
