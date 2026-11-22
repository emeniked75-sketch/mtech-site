// Gojobot website commands (run in the browser, no AI key needed).
// Owner-only commands (/teach /train /learn /learned /code) live ONLY in the Java app on your laptop.
window.GojoLocal = (function () {
  const OWNER_ONLY = ['teach', 'train', 'learn', 'learned', 'code'];
  const HELP = "**M.TECH AI GOJOBOT**\nJust ask me anything. Coding questions switch me into coding mode.\n" +
    "`/chess` - play chess against GojoBot (opens the full chess board)\n" +
    "`/calculator` - scientific calculator (or `/calculator 2+3*4` for a quick answer)\n" +
    "`/search question` - search Wikipedia\n`/coding` - coding mode on\n`/exit` - back to general mode\n`/status` - show status";

  // ---------- SEARCH (Wikipedia) ----------
  async function wiki(q, add) {
    try {
      const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=3&format=json&origin=*&srsearch=' + encodeURIComponent(q));
      const d = await r.json(); const hits = (d.query && d.query.search) || [];
      if (!hits.length) return add('bot', 'I found nothing on Wikipedia for that.');
      add('bot', '**Wikipedia results for "' + q + '"**\n\n' + hits.map(h => '**' + h.title + '**: ' + h.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&') + '... (en.wikipedia.org/wiki/' + encodeURIComponent(h.title.replace(/ /g, '_')) + ')').join('\n\n'));
    } catch (e) { add('bot', 'Search failed. Check your internet and try again.', true); }
  }

  // ---------- ROUTER ----------
  function handle(text, add, log, setMode) {
    const m = /^\/(\w+)\s*([\s\S]*)$/.exec(text.trim()); if (!m) return false;
    const cmd = m[1].toLowerCase(), arg = m[2].trim();
    if (OWNER_ONLY.includes(cmd)) { add('bot', 'That command is owner-only. Teaching and editing Gojobot can only be done from the owner\'s laptop.'); return true; }
    switch (cmd) {
      case 'help': add('bot', HELP); return true;
      case 'status': add('bot', '**Gojobot status**\nWebsite version: online\nCommands: chess, calculator, search'); return true;
      case 'coding': setMode('coding'); add('bot', 'Coding mode is on. Ask me a Java or IntelliJ question.'); return true;
      case 'exit': setMode('general'); add('bot', 'Back to general mode.'); return true;
      case 'chess': GojoJava.open('chess'); add('bot', 'Opening the GojoBot chess board...'); return true;
      case 'calculator': case 'calc':
        if (!arg) { GojoJava.open('calculator'); add('bot', 'Opening the scientific calculator...'); return true; }
        add('bot', GojoCalc.calculator(arg)); return true;
      case 'search': if (!arg) add('bot', 'Type what to search, e.g. `/search Albert Einstein`.'); else wiki(arg, add); return true;
      case 'open': case 'image': add('bot', '`/' + cmd + '` only works in the desktop version of Gojobot.'); return true;
      default: return false;
    }
  }
  return { handle };
})();
