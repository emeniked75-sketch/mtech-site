// GojoBot chess + scientific calculator in plain JavaScript (no CheerpJ, no Java engine, no gojo.jar).
// Same GojoJava.open('chess' | 'calculator') that gojobot-local.js already calls. Needs gojobot-calc.js loaded.
window.GojoJava = (function () {
  const TITLES = { chess: 'GojoBot Chess', calculator: 'GojoBot Scientific Calculator' };
  let modal, stage, title, current = 'chess';

  const css = document.createElement('style');
  css.textContent = `
  #gj-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(3,7,14,.82);backdrop-filter:blur(6px);}
  #gj-modal.on{display:flex;}
  .gj-panel{position:relative;width:min(980px,100%);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#0e1a2e,#0a1322);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 60px rgba(30,111,217,.15);}
  .gj-panel::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--grad);}
  .gj-head{display:flex;align-items:center;gap:.8rem;padding:.85rem 1.1rem;border-bottom:1px solid var(--line);background:radial-gradient(500px 120px at 0% 0%,rgba(30,111,217,.28),transparent 70%),#0b1628;}
  .gj-head b{flex:1;font-size:1rem}
  .gj-head .btn{padding:.4rem .9rem;font-size:.8rem}
  .gj-body{position:relative;overflow:auto;background:#050a14;min-height:200px;flex:1;}
  #gj-stage{width:100%;}
  .gj-note,.gj-hint{padding:.55rem 1.1rem;color:var(--muted);font-size:.75rem;}
  .gj-note{border-top:1px solid var(--line);background:#0a1424;}
  .gj-hint{padding:.7rem 0 0;text-align:center;}
  .cx-wrap{display:flex;gap:1.1rem;flex-wrap:wrap;justify-content:center;padding:1rem;background:#262522;}
  .cc-wrap{max-width:520px;margin:0 auto;padding:1rem;}
  .cx-main{flex:1 1 360px;max-width:520px;}
  .cx-side{flex:1 1 240px;max-width:340px;color:#e1e1dc;font-size:.85rem;}
  .cx-side h3{margin:0 0 .5rem;font-size:1.1rem;}
  .cx-lab{min-height:2rem;font-weight:700;font-size:.9rem;color:#e1e1dc;padding:.35rem .1rem;}
  .cx-board{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:repeat(8,minmax(0,1fr));aspect-ratio:1/1;width:100%;user-select:none;border-radius:4px;overflow:hidden;}
  .cx-sq{min-width:0;min-height:0;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:clamp(1.7rem,7.2vw,3rem);line-height:1;cursor:pointer;position:relative;}
  .cx-sq.last{box-shadow:inset 0 0 0 100px rgba(255,214,10,.3)}
  .cx-sq.sel{box-shadow:inset 0 0 0 100px rgba(20,160,200,.35)}
  .cx-sq.chk{box-shadow:inset 0 0 0 100px rgba(220,50,50,.55)}
  .cx-sq.mv::after{content:"";width:28%;height:28%;border-radius:50%;background:rgba(10,19,34,.4);position:absolute;}
  .cx-sq.mv.cap::after{width:84%;height:84%;background:none;border:3px solid rgba(10,19,34,.5);}
  .cx-sq span{position:relative;z-index:1}
  .cx-row{display:flex;gap:.3rem;margin:.3rem 0 .5rem;flex-wrap:wrap;}
  .cx-opt{flex:1;padding:.4rem .5rem;border-radius:6px;border:1px solid #4a4945;background:#33322f;color:#e1e1dc;font:inherit;font-size:.78rem;cursor:pointer;}
  .cx-opt.on{background:#769656;border-color:#769656;color:#fff;}
  .cx-lbl{color:#96948f;font-size:.74rem;margin-top:.4rem;}
  .cx-status{min-height:2.6rem;margin:.5rem 0;font-weight:700;}
  .cx-moves{background:#1e1d1b;border-radius:6px;padding:.5rem .6rem;height:110px;overflow:auto;font-family:monospace;font-size:.8rem;color:#e1e1dc;white-space:pre-wrap;}
  .cc-in{width:100%;padding:.8rem 1rem;border-radius:10px;border:1px solid var(--line);background:#0b1628;color:#fff;font:inherit;font-size:1.1rem;}
  .cc-out{min-height:2.4rem;text-align:right;font-size:1.5rem;font-weight:700;padding:.6rem .2rem;word-break:break-all;}
  .cc-out.err{font-size:.95rem;color:#ff7b7b;font-weight:600}
  .cc-keys{display:grid;grid-template-columns:repeat(6,1fr);gap:.4rem;}
  .cc-keys button{padding:.7rem 0;border-radius:9px;border:1px solid var(--line);background:#0e1a2e;color:#fff;font:inherit;font-size:.9rem;cursor:pointer;}
  .cc-keys button:hover{background:#16284a}
  .cc-keys button.op{background:#13315e}.cc-keys button.eq{background:var(--grad);color:#04101f;font-weight:800;border:0}`;
  document.head.appendChild(css);

  function build() {
    if (modal) return;
    modal = document.createElement('div'); modal.id = 'gj-modal';
    modal.innerHTML = '<div class="gj-panel"><div class="gj-head"><b id="gj-title"></b>' +
      '<button class="btn ghost" type="button" id="gj-restart">Restart</button><button class="btn ghost" type="button" id="gj-close">Close</button></div>' +
      '<div class="gj-body"><div id="gj-stage"></div></div>' +
      '<div class="gj-note">GojoBot chess and calculator run right here in your browser.</div></div>';
    document.body.appendChild(modal);
    stage = modal.querySelector('#gj-stage'); title = modal.querySelector('#gj-title');
    modal.querySelector('#gj-close').onclick = () => modal.classList.remove('on');
    modal.addEventListener('mousedown', e => { if (e.target === modal) modal.classList.remove('on'); });
    modal.querySelector('#gj-restart').onclick = () => run(current);
    addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('on') && !e.target.closest('#gj-stage')) modal.classList.remove('on'); });
  }

  // ======================= CHESS ENGINE =======================
  // Board = array of 64 chars (index 0 = a8, 63 = h1). Uppercase = white, lowercase = black, '.' = empty.
  const START = 'rnbqkbnrpppppppp' + '.'.repeat(32) + 'PPPPPPPPRNBQKBNR';
  const GLYPH = { k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F' };
  const N = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]], R = [[1,0],[-1,0],[0,1],[0,-1]], B = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const V = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const isW = p => p >= 'A' && p <= 'Z';
  const col = p => p === '.' ? null : (isW(p) ? 'w' : 'b');
  const newGame = () => ({ b: START.split(''), t: 'w', c: 'KQkq', ep: -1, h: 0 });
  const kingSq = (b, c) => b.indexOf(c === 'w' ? 'K' : 'k');

  function attacked(b, sq, by) {
    const r = sq >> 3, f = sq & 7, w = by === 'w';
    const at = (rr, ff, chs) => rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && chs.includes(b[rr * 8 + ff]);
    const pr = w ? r + 1 : r - 1, P = w ? 'P' : 'p';
    if (at(pr, f - 1, P) || at(pr, f + 1, P)) return true;
    for (const [d, e] of N) if (at(r + d, f + e, w ? 'N' : 'n')) return true;
    for (const [d, e] of R.concat(B)) if (at(r + d, f + e, w ? 'K' : 'k')) return true;
    for (const [dirs, chs] of [[R, w ? 'RQ' : 'rq'], [B, w ? 'BQ' : 'bq']])
      for (const [d, e] of dirs) {
        let rr = r + d, ff = f + e;
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const p = b[rr * 8 + ff];
          if (p !== '.') { if (chs.includes(p)) return true; break; }
          rr += d; ff += e;
        }
      }
    return false;
  }

  function pseudo(g) {
    const { b, t, c, ep } = g, o = [], opp = t === 'w' ? 'b' : 'w';
    const add = (f, to, x) => o.push(Object.assign({ f, to }, x));
    for (let s = 0; s < 64; s++) {
      const p = b[s]; if (p === '.' || col(p) !== t) continue;
      const r = s >> 3, f = s & 7, k = p.toLowerCase();
      if (k === 'p') {
        const d = t === 'w' ? -1 : 1, r1 = r + d; if (r1 < 0 || r1 > 7) continue;
        if (b[r1 * 8 + f] === '.') {
          add(s, r1 * 8 + f);
          if (r === (t === 'w' ? 6 : 1) && b[(r + 2 * d) * 8 + f] === '.') add(s, (r + 2 * d) * 8 + f, { dbl: 1 });
        }
        for (const e of [-1, 1]) {
          const ff = f + e; if (ff < 0 || ff > 7) continue;
          const to = r1 * 8 + ff;
          if (b[to] !== '.' && col(b[to]) === opp) add(s, to); else if (to === ep) add(s, to, { ep: 1 });
        }
      } else if (k === 'n' || k === 'k') {
        for (const [d, e] of (k === 'n' ? N : R.concat(B))) {
          const rr = r + d, ff = f + e; if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
          if (col(b[rr * 8 + ff]) !== t) add(s, rr * 8 + ff);
        }
        if (k === 'k') {
          const em = q => b[q] === '.', ok = (...q) => q.every(x => !attacked(b, x, opp));
          if (t === 'w' && s === 60) {
            if (c.includes('K') && em(61) && em(62) && ok(60, 61, 62)) add(60, 62, { cs: 1 });
            if (c.includes('Q') && em(59) && em(58) && em(57) && ok(60, 59, 58)) add(60, 58, { cs: 1 });
          }
          if (t === 'b' && s === 4) {
            if (c.includes('k') && em(5) && em(6) && ok(4, 5, 6)) add(4, 6, { cs: 1 });
            if (c.includes('q') && em(3) && em(2) && em(1) && ok(4, 3, 2)) add(4, 2, { cs: 1 });
          }
        }
      } else {
        for (const [d, e] of (k === 'r' ? R : k === 'b' ? B : R.concat(B))) {
          let rr = r + d, ff = f + e;
          while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
            const q = b[rr * 8 + ff];
            if (q === '.') add(s, rr * 8 + ff); else { if (col(q) !== t) add(s, rr * 8 + ff); break; }
            rr += d; ff += e;
          }
        }
      }
    }
    return o.flatMap(m => (b[m.f].toLowerCase() === 'p' && ((m.to >> 3) === 0 || (m.to >> 3) === 7)) ? ['q', 'r', 'b', 'n'].map(pr => Object.assign({}, m, { pr })) : [m]);
  }

  function make(g, m) {
    const b = g.b.slice(), p = b[m.f], cap = b[m.to] !== '.' || !!m.ep; let c = g.c, ep = -1;
    b[m.to] = p; b[m.f] = '.';
    if (m.ep) b[m.to + (g.t === 'w' ? 8 : -8)] = '.';
    if (m.cs) {
      if (m.to === 62) { b[61] = b[63]; b[63] = '.'; } else if (m.to === 58) { b[59] = b[56]; b[56] = '.'; }
      else if (m.to === 6) { b[5] = b[7]; b[7] = '.'; } else { b[3] = b[0]; b[0] = '.'; }
    }
    if (m.dbl) ep = (m.f + m.to) / 2;
    if (p.toLowerCase() === 'p' && ((m.to >> 3) === 0 || (m.to >> 3) === 7)) { const pr = m.pr || 'q'; b[m.to] = g.t === 'w' ? pr.toUpperCase() : pr; }
    const strip = (sq, chars) => { if (m.f === sq || m.to === sq) c = c.replace(new RegExp('[' + chars + ']', 'g'), ''); };
    strip(60, 'KQ'); strip(4, 'kq'); strip(63, 'K'); strip(56, 'Q'); strip(7, 'k'); strip(0, 'q');
    return { b, t: g.t === 'w' ? 'b' : 'w', c, ep, h: (p.toLowerCase() === 'p' || cap) ? 0 : (g.h || 0) + 1 };
  }

  function legal(g) {
    const me = g.t, opp = me === 'w' ? 'b' : 'w';
    return pseudo(g).filter(m => { const n = make(g, m); return !attacked(n.b, kingSq(n.b, me), opp); });
  }
  const inCheck = g => attacked(g.b, kingSq(g.b, g.t), g.t === 'w' ? 'b' : 'w');

  const MATE = 100000, INF = 1000000, PV = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20]
  };
  const LV = [{ n: 'Easy', r: 500, noise: 40, depth: 1 }, { n: 'Medium', r: 1250, noise: 15, depth: 2 },
    { n: 'Hard', r: 2000, depth: 3, ms: 5000, deep: 1 }, { n: 'Daniel', r: 2500, depth: 8, ms: 3000, deep: 1 }];
  const THEMES = [['Green', '#eeeed2', '#769656'], ['Wood', '#f0d9b5', '#b58863'], ['Ocean', '#dee3e6', '#8ca2ad'], ['Purple', '#e9dff0', '#7d64a0']];
  const SETS = [['Classic', '#ffffff', '#2d2d2d'], ['Royal', '#d6c330', '#343a70'], ['Fire & Ice', '#aae1ff', '#c83c32']];

  // Material + piece-square score from the side to move's point of view (same as the Java bot).
  function evalPos(g) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = g.b[i]; if (p === '.') continue;
      const k = p.toLowerCase();
      if (isW(p)) s += PV[k] + PST[k][i]; else s -= PV[k] + PST[k][i ^ 56];
    }
    return g.t === 'w' ? s : -s;
  }
  function order(g, ms, shuffle) {   // captures and promotions first
    return ms.map(m => {
      let k = shuffle ? Math.random() * 8 : 0;
      const v = g.b[m.to] !== '.' ? g.b[m.to] : (m.ep ? 'p' : null);
      if (v) k += 10000 + 10 * PV[v.toLowerCase()] - PV[g.b[m.f].toLowerCase()] / 10;
      if (m.pr) k += 9000;
      return [k, m];
    }).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  }
  function think(g0, lv) {
    let ms = order(g0, legal(g0), true); if (!ms.length) return null;
    const L = LV[lv]; let nodes = 0, dead = L.ms ? performance.now() + L.ms : Infinity, up = false;
    const tick = () => { if ((++nodes & 511) === 0 && performance.now() > dead) up = true; return up; };
    function quiesce(g, a, b, qd) {
      if (tick()) return 0;
      const st = evalPos(g); if (qd === 0 || st >= b) return st; if (st > a) a = st;
      const me = g.t, opp = me === 'w' ? 'b' : 'w';
      for (const m of order(g, pseudo(g).filter(x => g.b[x.to] !== '.' || x.ep || x.pr), false)) {
        const n = make(g, m); if (attacked(n.b, kingSq(n.b, me), opp)) continue;
        const s = -quiesce(n, -b, -a, qd - 1); if (up) return 0;
        if (s >= b) return s; if (s > a) a = s;
      }
      return a;
    }
    function nega(g, d, a, b, ply) {
      if (tick()) return 0; if (d <= 0) return quiesce(g, a, b, 4);
      const mv = legal(g); if (!mv.length) return inCheck(g) ? -MATE + ply : 0;
      let best = -INF;
      for (const m of order(g, mv, false)) {
        const s = -nega(make(g, m), d - 1, -b, -a, ply + 1); if (up) return 0;
        if (s > best) best = s; if (best > a) a = best; if (a >= b) break;
      }
      return best;
    }
    function root(list, d) {
      let best = list[0], bs = -INF, a = -INF;
      for (const m of list) {
        const w = L.noise ? -INF : a;
        let s = -nega(make(g0, m), d - 1, -INF, -w, 1); if (up) return null;
        if (L.noise) s += Math.floor(Math.random() * (L.noise + 1));
        if (s > bs) { bs = s; best = m; } if (s > a) a = s;
      }
      return { m: best, s: bs };
    }
    if (lv === 0) { if (Math.random() < 0.55) return ms[Math.floor(Math.random() * ms.length)]; return root(ms, 1).m; }
    if (!L.deep) return root(ms, L.depth).m;
    let best = ms[0];
    for (let d = 1; d <= L.depth; d++) {   // looks deeper until the depth or time limit
      const r = root(ms, d); if (!r) break;
      best = r.m; if (r.s > MATE - 100) break;
      ms = [r.m].concat(ms.filter(x => x !== r.m));
    }
    return best;
  }

  const pkey = g => g.b.join('') + g.t + g.c + g.ep;
  function insuff(g) {
    let kn = 0, bl = 0, bd = 0;
    for (let i = 0; i < 64; i++) {
      const t = g.b[i].toLowerCase(); if (t === '.') continue;
      if (t === 'p' || t === 'r' || t === 'q') return false;
      if (t === 'n') kn++; else if (t === 'b') { if (((i >> 3) + (i & 7)) % 2 === 0) bl++; else bd++; }
    }
    return kn + bl + bd <= 1 || (kn === 0 && (bl === 0 || bd === 0));
  }
  function endMsg(g, keys) {
    if (!legal(g).length) return inCheck(g) ? (g.t === 'w' ? 'CHECKMATE! Black wins.' : 'CHECKMATE! White wins.') : 'STALEMATE - draw.';
    if (insuff(g)) return 'Draw: insufficient material.';
    if ((g.h || 0) >= 100) return 'Draw: 50-move rule.';
    if (keys.filter(k => k === keys[keys.length - 1]).length >= 3) return 'Draw: threefold repetition.';
    return null;
  }
  function san(g, m) {
    const p = g.b[m.f], k = p.toLowerCase(), cap = g.b[m.to] !== '.' || !!m.ep, fl = 'abcdefgh'[m.f & 7]; let s = '';
    if (m.cs) s = (m.to === 62 || m.to === 6) ? 'O-O' : 'O-O-O';
    else {
      if (k === 'p') { if (cap) s += fl; }
      else {
        s += k.toUpperCase();
        const o = legal(g).filter(x => g.b[x.f] === p && x.to === m.to && x.f !== m.f);
        if (o.length) { if (!o.some(x => (x.f & 7) === (m.f & 7))) s += fl; else if (!o.some(x => (x.f >> 3) === (m.f >> 3))) s += 8 - (m.f >> 3); else s += fl + (8 - (m.f >> 3)); }
      }
      if (cap) s += 'x';
      s += 'abcdefgh'[m.to & 7] + (8 - (m.to >> 3)); if (m.pr) s += '=' + m.pr.toUpperCase();
    }
    const n = make(g, m); if (inCheck(n)) s += legal(n).length ? '+' : '#';
    return s;
  }

  // ======================= CHESS UI =======================
  function chess() {
    const P = chess.pref || (chess.pref = { mode: 0, lv: 1, col: 0, th: 0, ps: 0 });
    let g = newGame(), keys = [pkey(g)], sans = [], hist = [], last = null, sel = -1, targets = [];
    let active = false, over = '', busy = false, flip = false, pcol = 'w', promo = null, gm = 0;
    stage.innerHTML = '<div class="cx-wrap"><div class="cx-main"><div class="cx-lab" id="cx-top"></div><div class="cx-board" id="cx-bd"></div><div class="cx-lab" id="cx-bot"></div></div><div class="cx-side" id="cx-side"></div></div>';
    const bd = stage.querySelector('#cx-bd'), side = stage.querySelector('#cx-side'), lt = stage.querySelector('#cx-top'), lb = stage.querySelector('#cx-bot');
    const label = c => gm === 0 ? (c === pcol ? 'You (' + (c === 'w' ? 'White' : 'Black') + ')' : 'GojoBot \u2022 ' + LV[P.lv].n + ' (' + LV[P.lv].r + ')') : (c === 'w' ? 'White' : 'Black');
    const row = (arr, on, id) => '<div class="cx-row">' + arr.map((t, i) => '<button type="button" class="cx-opt' + (i === on ? ' on' : '') + '" data-a="' + id + '" data-i="' + i + '">' + t + '</button>').join('') + '</div>';

    function draw() {
      const th = THEMES[P.th], ps = SETS[P.ps], chk = active && inCheck(g), ks = chk ? kingSq(g.b, g.t) : -1;
      bd.innerHTML = '';
      for (let n = 0; n < 64; n++) {
        const s = flip ? 63 - n : n, p = g.b[s], d = document.createElement('div');
        d.className = 'cx-sq' + (s === sel ? ' sel' : '') + (last && (s === last.f || s === last.to) ? ' last' : '') + (s === ks ? ' chk' : '') + (targets.includes(s) ? ' mv' + (p !== '.' ? ' cap' : '') : '');
        d.style.background = ((s >> 3) + (s & 7)) % 2 ? th[2] : th[1];
        if (p !== '.') {
          const sp = document.createElement('span'), w = isW(p);
          sp.textContent = GLYPH[p.toLowerCase()] + '\uFE0E'; sp.style.color = w ? ps[1] : ps[2];
          sp.style.textShadow = w ? '0 0 2px #000,0 0 3px #000' : '0 0 1px rgba(255,255,255,.45)'; d.appendChild(sp);
        }
        d.onclick = () => click(s); bd.appendChild(d);
      }
      lt.textContent = label(flip ? 'w' : 'b'); lb.textContent = label(flip ? 'b' : 'w');
      const stt = !active ? 'Pick your options, then press Play.' : over ? over : promo ? 'Choose the promotion piece:' : busy ? 'GojoBot is thinking...' : (chk ? 'Check! ' : '') + (g.t === 'w' ? 'White' : 'Black') + ' to move';
      let mv = ''; for (let i = 0; i < sans.length; i += 2) mv += (i / 2 + 1) + '. ' + sans[i] + (sans[i + 1] ? ' ' + sans[i + 1] : '') + '\n';
      side.innerHTML = '<h3>Play Chess</h3><div class="cx-lbl">Mode</div>' + row(['Computer', 'Friend'], P.mode, 'mode') +
        (P.mode === 0 ? '<div class="cx-lbl">Level</div>' + row(LV.map(l => l.n + ' (' + l.r + ')'), P.lv, 'lv') + '<div class="cx-lbl">You play</div>' + row(['White', 'Black', 'Random'], P.col, 'col') : '') +
        '<button type="button" class="btn primary" data-a="play" style="width:100%;margin:.5rem 0">' + (active ? 'New game' : 'Play') + '</button>' +
        row(['Flip', 'Undo', 'Resign'], -1, 'act') + '<div class="cx-lbl">Board</div>' + row(THEMES.map(t => t[0]), P.th, 'th') +
        '<div class="cx-lbl">Pieces</div>' + row(SETS.map(t => t[0]), P.ps, 'ps') + '<div class="cx-status">' + stt + '</div>' +
        (promo ? row(['Queen', 'Rook', 'Bishop', 'Knight'], -1, 'pr') : '') + '<div class="cx-moves">' + (mv || 'Moves appear here.') + '</div>';
      const me = side.querySelector('.cx-moves'); me.scrollTop = me.scrollHeight;
    }
    function start() {
      g = newGame(); keys = [pkey(g)]; sans = []; hist = []; last = null; sel = -1; targets = []; over = ''; busy = false; promo = null; active = true; gm = P.mode;
      pcol = P.col === 2 ? (Math.random() < 0.5 ? 'w' : 'b') : (P.col === 1 ? 'b' : 'w'); flip = gm === 0 && pcol === 'b';
      if (gm === 0 && pcol === 'b') botMove();
    }
    function click(s) {
      if (!active || over || busy || promo || (gm === 0 && g.t !== pcol)) return;
      const c = sel >= 0 ? legal(g).filter(m => m.f === sel && m.to === s) : [];
      if (c.length) { if (c.length > 1) { promo = c; draw(); } else play(c[0]); return; }
      if (g.b[s] !== '.' && col(g.b[s]) === g.t) { sel = s; targets = legal(g).filter(m => m.f === s).map(m => m.to); } else { sel = -1; targets = []; }
      draw();
    }
    function play(m) {
      hist.push({ g, keys: keys.slice(), sans: sans.slice(), last });
      sans.push(san(g, m)); g = make(g, m); keys.push(pkey(g)); last = m; sel = -1; targets = []; promo = null;
      over = endMsg(g, keys) || ''; draw();
      if (!over && gm === 0 && g.t !== pcol) botMove();
    }
    function botMove() { busy = true; draw(); setTimeout(() => { const m = think(g, P.lv); busy = false; if (m) play(m); else draw(); }, 60); }
    function undo() {
      if (busy || !hist.length) return;
      let h = hist.pop(); if (gm === 0 && h.g.t !== pcol && hist.length) h = hist.pop();
      g = h.g; keys = h.keys; sans = h.sans; last = h.last; sel = -1; targets = []; over = ''; promo = null; draw();
      if (active && gm === 0 && g.t !== pcol) botMove();
    }
    function resign() {
      if (!active || over) return;
      const loser = gm === 0 ? pcol : g.t, name = loser === 'w' ? 'White' : 'Black';
      over = (gm === 0 ? 'You resigned. ' : name + ' resigned. ') + (loser === 'w' ? 'Black' : 'White') + ' wins!'; draw();
    }
    side.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, i = +b.dataset.i;
      if (a === 'mode') P.mode = i; else if (a === 'lv') P.lv = i; else if (a === 'col') P.col = i;
      else if (a === 'th') P.th = i; else if (a === 'ps') P.ps = i; else if (a === 'play') start();
      else if (a === 'act') { if (i === 0) { flip = !flip; draw(); } else if (i === 1) undo(); else resign(); return; }
      else if (a === 'pr') { const m = promo && promo.find(x => x.pr === 'qrbn'[i]); if (m) play(m); return; }
      draw();
    });
    draw();
  }

  // ======================= CALCULATOR =======================
  function calc() {
    const G = window.GojoCalc;
    if (!G) { stage.innerHTML = '<div class="cc-wrap">The calculator engine (gojobot-calc.js) did not load.</div>'; return; }
    let deg = true, ans = 0;
    const KEYS = ['sin(','cos(','tan(','(',')','AC', 'asin(','acos(','atan(','\u03c0','e','\u232b', 'ln(','log(','\u221a(','x\u00b2','^','!',
      '7','8','9','\u00f7','mod','%', '4','5','6','\u00d7','abs(','ans', '1','2','3','\u2212','+','=', '0','.','cbrt(','exp(','fact(','Deg'];
    stage.innerHTML = '<div class="cc-wrap"><input class="cc-in" id="cc-in" placeholder="Type or tap: 2+3*4, sin(30), 1/2+1/3" autocomplete="off" spellcheck="false">' +
      '<div class="cc-out" id="cc-out">&nbsp;</div><div class="cc-keys" id="cc-keys"></div></div>';
    const inp = stage.querySelector('#cc-in'), out = stage.querySelector('#cc-out'), keys = stage.querySelector('#cc-keys');
    function equals() {
      const expr = inp.value; out.className = 'cc-out';
      try {
        const v = G.evaluate(expr, deg, ans), f = G.exact(expr);
        out.textContent = f && !f.isInt() ? f.toString() + '  (\u2248 ' + G.format(v) + ')' : G.format(v);
        ans = v;
      } catch (e) { out.className = 'cc-out err'; out.textContent = e instanceof G.CalcError ? e.message : 'Invalid input'; }
    }
    for (const k of KEYS) {
      const bt = document.createElement('button'); bt.type = 'button'; bt.textContent = k;
      if (k === '=') bt.className = 'eq'; else if ('\u00f7\u00d7\u2212+^'.includes(k)) bt.className = 'op';
      bt.onclick = () => {
        if (k === 'AC') { inp.value = ''; out.className = 'cc-out'; out.innerHTML = '&nbsp;'; }
        else if (k === '\u232b') inp.value = inp.value.slice(0, -1);
        else if (k === '=') equals();
        else if (k === 'Deg') { deg = !deg; bt.textContent = deg ? 'Deg' : 'Rad'; }
        else inp.setRangeText(k === 'x\u00b2' ? '^2' : k, inp.selectionStart, inp.selectionEnd, 'end');
        inp.focus();
      };
      keys.appendChild(bt);
    }
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); equals(); } });
    inp.focus();
  }

  function run(which) { current = which; if (which === 'calculator') calc(); else chess(); }
  function open(which) { build(); title.textContent = TITLES[which]; modal.classList.add('on'); run(which); }
  return { open };
})();
