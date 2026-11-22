// Exact port of GojoBot.java CalcEngine (decimal engine + exact fractions) and calculator() text answer.
window.GojoCalc = (function () {
  class CalcError extends Error {}
  class NotExact extends Error {}
  const isDigit = c => c >= '0' && c <= '9';
  const isLetter = c => /^\p{L}$/u.test(c);
  const MIXED = /(\d+)_(\d+)\/(\d+)/y;
  const FUNCS = ['asinh','acosh','atanh','sinh','cosh','tanh','asin','acos','atan','log10','log2','sin','cos','tan','sqrt','cbrt','ln','log','exp','abs','floor','ceil','round','fact'];
  const CONSTS = ['pi', 'ans', 'e'];
  const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  const rint = x => { const f = Math.floor(x), d = x - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : (f % 2 === 0 ? f : f + 1); };
  const clean = v => Math.abs(v) < 1e-14 ? 0 : v;
  const invalid = () => new CalcError('Invalid input');

  function normalize(src) {
    let t = src.trim().toLowerCase().replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-').replace(/\u2013/g, '-').replace(/\u2014/g, '-')
      .split('**').join('^').replace(/\u221a/g, 'sqrt').replace(/\u221b/g, 'cbrt').replace(/\u03c0/g, 'pi').replace(/\u00b2/g, '^2').replace(/\u00b3/g, '^3');
    while (t.endsWith('=')) t = t.substring(0, t.length - 1).trim();
    return t;
  }

  function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1; let x = LANCZOS[0]; for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i);
    const t = z + 7.5; return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
  function factorial(x) {
    if (x < 0 && x === Math.floor(x)) throw new CalcError('Factorial of a negative integer is undefined');
    if (x > 170.6) throw new CalcError('Result too large');
    if (x === Math.floor(x)) { let r = 1; for (let i = 2; i <= Math.trunc(x); i++) r *= i; return r; }
    return gamma(x + 1);
  }

  // ---------- decimal engine ----------
  function Engine(src, deg, ans) {
    const s = normalize(src); let pos = 0;
    const skip = () => { while (pos < s.length && /\s/.test(s[pos])) pos++; };
    const peek = () => { skip(); return pos < s.length ? s[pos] : '\0'; };
    const eat = c => { if (peek() === c) { pos++; return true; } return false; };
    const rad = x => deg ? x * Math.PI / 180 : x;
    const fromRad = r => deg ? clean(r * 180 / Math.PI) : r;
    function fn(f, x) {
      switch (f) {
        case 'sin': return clean(Math.sin(rad(x)));
        case 'cos': return clean(Math.cos(rad(x)));
        case 'tan': { const r = rad(x); if (Math.abs(Math.cos(r)) < 1e-12) throw new CalcError('tan is undefined here'); return clean(Math.tan(r)); }
        case 'asin': if (x < -1 || x > 1) throw invalid(); return fromRad(Math.asin(x));
        case 'acos': if (x < -1 || x > 1) throw invalid(); return fromRad(Math.acos(x));
        case 'atan': return fromRad(Math.atan(x));
        case 'sinh': return Math.sinh(x); case 'cosh': return Math.cosh(x); case 'tanh': return Math.tanh(x);
        case 'asinh': return Math.log(x + Math.sqrt(x * x + 1));
        case 'acosh': if (x < 1) throw invalid(); return Math.log(x + Math.sqrt(x * x - 1));
        case 'atanh': if (Math.abs(x) >= 1) throw invalid(); return 0.5 * Math.log((1 + x) / (1 - x));
        case 'ln': if (x <= 0) throw invalid(); return Math.log(x);
        case 'log': case 'log10': if (x <= 0) throw invalid(); return Math.log10(x);
        case 'log2': if (x <= 0) throw invalid(); return Math.log(x) / Math.log(2);
        case 'exp': return Math.exp(x);
        case 'sqrt': if (x < 0) throw new CalcError('Invalid input: square root of a negative number'); return Math.sqrt(x);
        case 'cbrt': return Math.cbrt(x); case 'abs': return Math.abs(x); case 'floor': return Math.floor(x); case 'ceil': return Math.ceil(x);
        case 'round': return rint(x); case 'fact': return factorial(x);
        default: throw new CalcError("Unknown function '" + f + "'");
      }
    }
    function expr() { let v = term(); for (;;) { if (eat('+')) v += term(); else if (eat('-')) v -= term(); else return v; } }
    function term() {
      let v = unary();
      for (;;) {
        const c = peek();
        if (c === '*') { pos++; v *= unary(); }
        else if (c === '/') { pos++; const d = unary(); if (d === 0) throw new CalcError('Cannot divide by zero'); v /= d; }
        else if (s.startsWith('mod', pos)) { pos += 3; const d = unary(); if (d === 0) throw new CalcError('Cannot divide by zero'); v = v % d; }
        else if (isDigit(c) || c === '.' || c === '(' || isLetter(c)) v *= unary();
        else return v;
      }
    }
    function unary() { if (eat('-')) return -unary(); if (eat('+')) return unary(); return power(); }
    function power() {
      const base = postfix();
      if (peek() === '^') { pos++; const ex = unary(); if (base === 0 && ex < 0) throw new CalcError('Cannot divide by zero');
        const r = Math.pow(base, ex); if (Number.isNaN(r)) throw new CalcError('Invalid input: negative number to a fractional power'); return r; }
      return base;
    }
    function postfix() {
      let v = primary();
      for (;;) { const c = peek();
        if (c === '!') { pos++; v = factorial(v); } else if (c === '%') { pos++; v = v / 100; }
        else if (c === '\u00b0') { pos++; v = deg ? v : v * Math.PI / 180; } else return v; }
    }
    function primary() {
      const c = peek();
      if (c === '(') { pos++; const v = expr(); if (!eat(')') && pos < s.length) throw new CalcError("Missing ')'"); return v; }
      if (isDigit(c) || c === '.') return number();
      if (isLetter(c)) return identifier();
      if (c === '\0') throw new CalcError('Incomplete expression');
      throw new CalcError("Unexpected '" + c + "'");
    }
    function number() {
      MIXED.lastIndex = pos; const mm = MIXED.exec(s);
      if (mm) { const den = parseFloat(mm[3]); if (den === 0) throw new CalcError('Cannot divide by zero'); pos = MIXED.lastIndex; return parseFloat(mm[1]) + parseFloat(mm[2]) / den; }
      const st = pos; while (pos < s.length && (isDigit(s[pos]) || s[pos] === '.')) pos++;
      if (pos < s.length && s[pos] === 'e') { let q = pos + 1; if (q < s.length && (s[q] === '+' || s[q] === '-')) q++;
        if (q < s.length && isDigit(s[q])) { while (q < s.length && isDigit(s[q])) q++; pos = q; } }
      const t = s.substring(st, pos);
      if (!/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(t)) throw new CalcError("Bad number '" + t + "'");
      return parseFloat(t);
    }
    function identifier() {
      const st = pos; while (pos < s.length && isLetter(s[pos])) pos++;
      let id = s.substring(st, pos);
      if (!FUNCS.includes(id) && !CONSTS.includes(id)) {
        let best = null;
        for (const f of FUNCS) if (id.startsWith(f) && (best === null || f.length > best.length)) best = f;
        for (const c of CONSTS) if (id.startsWith(c) && (best === null || c.length > best.length)) best = c;
        if (best !== null) { id = best; pos = st + best.length; }
      }
      if (id === 'log') { if (s.startsWith('10(', pos)) { id = 'log10'; pos += 2; } else if (s.startsWith('2(', pos)) { id = 'log2'; pos += 1; } }
      if (id === 'pi') return Math.PI; if (id === 'e') return Math.E; if (id === 'ans') return ans;
      let x; const c = peek();
      if (c === '(') { pos++; x = expr(); if (!eat(')') && pos < s.length) throw new CalcError("Missing ')'"); }
      else if (FUNCS.includes(id) && (isDigit(c) || c === '.' || isLetter(c))) x = primary();
      else if (FUNCS.includes(id)) throw new CalcError("'" + id + "' needs a number, like " + id + '(5)');
      else throw new CalcError("Unknown name '" + id + "'");
      return fn(id, x);
    }
    return { s, run() {
      if (!s.length) throw new CalcError('Nothing to calculate');
      let v;
      try { v = expr(); } catch (e) { if (e instanceof RangeError) throw new CalcError('Expression too complex'); throw e; }
      skip(); if (pos < s.length) throw new CalcError("Unexpected '" + s[pos] + "'");
      if (Number.isNaN(v)) throw new CalcError('Invalid input'); if (!isFinite(v)) throw new CalcError('Result too large');
      return v; } };
  }
  const evaluate = (e, degrees = true, ans = 0) => Engine(e, degrees, ans).run();

  // ---------- exact fractions (BigInt) ----------
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const bits = x => (x < 0n ? -x : x).toString(2).length;
  class Frac {
    constructor(n, d) { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d); if (g !== 0n && g !== 1n) { n /= g; d /= g; } this.n = n; this.d = d; }
    isInt() { return this.d === 1n; } isZero() { return this.n === 0n; }
    add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); } sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Frac(this.n * o.n, this.d * o.d); } div(o) { return new Frac(this.n * o.d, this.d * o.n); } neg() { return new Frac(-this.n, this.d); }
    pow(e) { return e >= 0 ? new Frac(this.n ** BigInt(e), this.d ** BigInt(e)) : new Frac(this.d ** BigInt(-e), this.n ** BigInt(-e)); }
    toString() { return this.isInt() ? this.n.toString() : this.n + '/' + this.d; }
    mixed() { const an = this.n < 0n ? -this.n : this.n; if (this.isInt() || an < this.d) return this.toString(); return (this.n < 0n ? '-' : '') + (an / this.d) + ' ' + (an % this.d) + '/' + this.d; }
  }
  function exact(src) {
    const s = normalize(src); if (!s.length) return null; let pos = 0;
    const chk = f => { if (bits(f.n) > 4096 || bits(f.d) > 4096) throw new NotExact(); return f; };
    const peek = () => { while (pos < s.length && /\s/.test(s[pos])) pos++; return pos < s.length ? s[pos] : '\0'; };
    const eat = c => { if (peek() === c) { pos++; return true; } return false; };
    function ex() { let v = term(); for (;;) { if (eat('+')) v = chk(v.add(term())); else if (eat('-')) v = chk(v.sub(term())); else return v; } }
    function term() {
      let v = unary();
      for (;;) { const c = peek();
        if (c === '*') { pos++; v = chk(v.mul(unary())); }
        else if (c === '/') { pos++; const d = unary(); if (d.isZero()) throw new CalcError('Cannot divide by zero'); v = chk(v.div(d)); }
        else if (isDigit(c) || c === '.' || c === '(') v = chk(v.mul(unary()));
        else if (isLetter(c)) throw new NotExact(); else return v; }
    }
    function unary() { if (eat('-')) return unary().neg(); if (eat('+')) return unary(); return power(); }
    function power() {
      const base = postfix();
      if (peek() === '^') { pos++; const e = unary(); if (!e.isInt() || bits(e.n) > 16) throw new NotExact();
        const k = Number(e.n); if (Math.abs(k) > 2000 || Math.max(bits(base.n), bits(base.d)) * Math.abs(k) > 8192) throw new NotExact();
        if (base.isZero() && k < 0) throw new CalcError('Cannot divide by zero'); return chk(base.pow(k)); }
      return base;
    }
    function postfix() {
      let v = primary();
      for (;;) { const c = peek();
        if (c === '!') { pos++; if (!v.isInt() || v.n < 0n || v.n > 300n) throw new NotExact(); let r = 1n; for (let i = 2n; i <= v.n; i++) r *= i; v = chk(new Frac(r, 1n)); }
        else if (c === '%') { pos++; v = new Frac(v.n, v.d * 100n); } else return v; }
    }
    function primary() {
      const c = peek();
      if (c === '(') { pos++; const v = ex(); if (!eat(')') && pos < s.length) throw new NotExact(); return v; }
      if (isDigit(c) || c === '.') return number(); throw new NotExact();
    }
    function number() {
      MIXED.lastIndex = pos; const m = MIXED.exec(s);
      if (m) { const dd = BigInt(m[3]); if (dd === 0n) throw new CalcError('Cannot divide by zero'); pos = MIXED.lastIndex; return new Frac(BigInt(m[1]) * dd + BigInt(m[2]), dd); }
      const st = pos; while (pos < s.length && (isDigit(s[pos]) || s[pos] === '.')) pos++;
      if (pos < s.length && (s[pos] === 'e' || s[pos] === '_')) throw new NotExact();
      const t = s.substring(st, pos); if (!/^(\d+\.?\d*|\.\d+)$/.test(t)) throw new NotExact();
      const dot = t.indexOf('.'), scale = dot < 0 ? 0 : t.length - dot - 1, un = BigInt(t.replace('.', ''));
      return scale > 0 ? new Frac(un, 10n ** BigInt(scale)) : new Frac(un, 1n);
    }
    try { const v = ex(); if (peek() !== '\0') throw new NotExact(); return v; }
    catch (e) { if (e instanceof NotExact || e instanceof CalcError || e instanceof RangeError) return null; throw e; }
  }

  // Up to 12 significant digits, no trailing zeros, scientific only for huge/tiny values.
  function format(v) {
    if (v === 0 || Math.abs(v) < 1e-300) return '0';
    const abs = Math.abs(v);
    if (abs >= 1e15 || abs < 1e-6) {
      const [man, ex] = abs.toExponential(11).split('e');
      return (v < 0 ? '-' : '') + (man.includes('.') ? man.replace(/0+$/, '').replace(/\.$/, '') : man) + 'e' + parseInt(ex, 10);
    }
    return String(Number(v.toPrecision(12)));
  }

  function calculator(expr) {
    if (!expr.trim()) return 'Calculator: send /calculator followed by a sum, for example /calculator 2+3*4 or /calculator sin(30)+sqrt(16).' +
      '\nFractions work too: /calculator 1/2+1/3 gives 5/6, and 1_1/2 means one and a half.' +
      '\nSupported: + - * / ^ ! % mod ( ) pi e ans sin cos tan asin acos atan sinh cosh tanh ln log sqrt cbrt abs (angles in degrees).' +
      '\nIn the desktop chat window, just type /calculator to open the full scientific calculator.';
    try {
      const v = evaluate(expr, true, 0), f = exact(expr);
      if (f !== null && !f.isInt()) { const m = f.mixed(); return expr + ' = ' + f + (m === f.toString() ? '' : ' = ' + m) + '  (\u2248 ' + format(v) + ')'; }
      return expr + ' = ' + format(v);
    } catch (e) { if (e instanceof CalcError) return 'Calculator: ' + e.message; throw e; }
  }
  return { evaluate, exact, format, calculator, CalcError };
})();
