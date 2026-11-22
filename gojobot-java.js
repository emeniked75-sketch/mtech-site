// Runs the ORIGINAL Java chess + scientific calculator (gojo.jar) inside the page using CheerpJ.
// Opens in a pop-up styled like the rest of the M.TECH site.
window.GojoJava = (function () {
  const LOADER = 'https://cjrtnc.leaningtech.com/5.0/loader.js';
  const JAR = '/app/gojo.jar';            // "/app/" = the root of your Netlify site
  const TITLES = { chess: 'GojoBot Chess', calculator: 'GojoBot Scientific Calculator' };
  let modal, stage, status, title, ready = null, launched = {};

  const css = document.createElement('style');
  css.textContent = `
  #gj-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(3,7,14,.82);backdrop-filter:blur(6px);}
  #gj-modal.on{display:flex;}
  .gj-panel{position:relative;width:min(1000px,100%);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#0e1a2e,#0a1322);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 60px rgba(30,111,217,.15);}
  .gj-panel::before{content:"";position:absolute;inset:0 0 auto 0;height:2px;background:var(--grad);}
  .gj-head{display:flex;align-items:center;gap:.8rem;padding:.85rem 1.1rem;border-bottom:1px solid var(--line);background:radial-gradient(500px 120px at 0% 0%,rgba(30,111,217,.28),transparent 70%),#0b1628;}
  .gj-head b{flex:1;font-size:1rem}
  .gj-head .btn{padding:.4rem .9rem;font-size:.8rem}
  .gj-body{position:relative;overflow:auto;background:#050a14;min-height:200px;flex:1;}
  #gj-stage{position:relative;width:980px;height:800px;margin:0 auto;}
  .gj-status{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8rem;color:var(--muted);text-align:center;padding:1.5rem;background:#050a14;z-index:2;font-size:.92rem;}
  .gj-status.hide{display:none}
  .gj-note{padding:.55rem 1.1rem;border-top:1px solid var(--line);color:var(--muted);font-size:.75rem;background:#0a1424;}`;
  document.head.appendChild(css);

  function build() {
    if (modal) return;
    modal = document.createElement('div'); modal.id = 'gj-modal';
    modal.innerHTML = '<div class="gj-panel"><div class="gj-head"><b id="gj-title"></b>' +
      '<button class="btn ghost" type="button" id="gj-restart">Restart</button><button class="btn ghost" type="button" id="gj-close">Close</button></div>' +
      '<div class="gj-body"><div id="gj-stage"></div><div class="gj-status" id="gj-status"><span class="typing"><i></i><i></i><i></i></span><span id="gj-msg">Loading the Java engine (first time takes a little while)...</span></div></div>' +
      '<div class="gj-note">This is the original GojoBot Java program running in your browser.</div></div>';
    document.body.appendChild(modal);
    stage = modal.querySelector('#gj-stage'); status = modal.querySelector('#gj-status'); title = modal.querySelector('#gj-title');
    modal.querySelector('#gj-close').onclick = () => modal.classList.remove('on');
    modal.addEventListener('mousedown', e => { if (e.target === modal) modal.classList.remove('on'); });
    modal.querySelector('#gj-restart').onclick = () => { launched = {}; run(current); };
    addEventListener('keydown', e