(function () {
  'use strict';
  const BOOK_ORDER = Object.fromEntries([
    'Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel',
    '1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios',
    'Eclesiastes','Cânticos','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oséias','Joel','Amós',
    'Obadias','Jonas','Miquéias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias',
    'Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios',
    'Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito',
    'Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse'
  ].map((b,i)=>[b,i+1]));

  const DATA_BASE = `${window.location.origin}/bible-concordance/assets/data/`;
  let currentVersion = 'ACF';
  const cache = new Map();
  const versesCache = {};
  let strongsData = null;
  let currentSortedRefs = [];

  const input = document.getElementById('concordance-input');
  const results = document.getElementById('results');
  const status = document.getElementById('status');
  const clearBtn = document.getElementById('clear-search');
  const versionSelect = document.getElementById('version-select');
  const preview = document.getElementById('verse-preview');
  const statsPanel = document.getElementById('stats-panel');
  const installBanner = document.getElementById('install-banner');
  const installBtn = document.getElementById('install-btn');
  const dismissInstall = document.getElementById('dismiss-install');

  let deferredPrompt = null;
  let pwaDismissed = localStorage.getItem('pwa_install_dismissed') === 'true';

  function normalize(s) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
  function levenshtein(a, b) {
    const m=a.length, n=b.length; if(Math.abs(m-n)>2) return 99;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++) dp[i][0]=i; for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:Math.min(dp[i-1][j-1],dp[i-1][j],dp[i][j-1])+1;
    return dp[m][n];
  }
  function sortRefs(refs) {
    return refs.slice().sort((a,b)=>{
      const mA=a.match(/^(.+?)\s+(\d+):(\d+)$/), mB=b.match(/^(.+?)\s+(\d+):(\d+)$/);
      if(!mA||!mB) return 0;
      const [,ba,ca,va]=mA, [,bb,cb,vb]=mB;
      return (BOOK_ORDER[ba]||99)-(BOOK_ORDER[bb]||99) || (+ca-+cb) || (+va-+vb);
    });
  }

  async function loadStats() {
    if (statsPanel.classList.contains('d-none')) statsPanel.classList.remove('d-none');
    const fetchMeta = async (v) => { try { const r = await fetch(`${DATA_BASE}${v.toLowerCase()}/meta.json`); return r.ok ? await r.json() : null; } catch { return null; } };
    const acf = await fetchMeta('ACF'), arc = await fetchMeta('ARC');
    document.getElementById('stat-acf-verses').textContent = acf?.total_verses?.toLocaleString('pt-BR') || '–';
    document.getElementById('stat-acf-lemmas').textContent = acf?.unique_lemmas?.toLocaleString('pt-BR') || '–';
    document.getElementById('stat-arc-verses').textContent = arc?.total_verses?.toLocaleString('pt-BR') || '–';
    document.getElementById('stat-arc-lemmas').textContent = arc?.unique_lemmas?.toLocaleString('pt-BR') || '–';
  }

  async function loadStrongs() {
    if (strongsData) return;
    try { const r = await fetch(`${DATA_BASE}strongs.json`); strongsData = r.ok ? await r.json() : {}; } catch { strongsData = {}; }
  }
  function getStrongsInfo(lemma) { return strongsData?.[normalize(lemma)] || null; }

  // 📥 Cache inteligente de versículos
  async function getVerseText(ref) {
    const vPath = currentVersion.toLowerCase();
    if (!versesCache[vPath]) {
      try {
        const res = await fetch(`${DATA_BASE}${vPath}/verses.json`);
        versesCache[vPath] = res.ok ? await res.json() : {};
      } catch { versesCache[vPath] = {}; }
    }
    return versesCache[vPath][ref] || 'Texto não disponível nesta versão.';
  }

  // 🎯 Delegação de Eventos (funciona para elementos iniciais + dinâmicos)
  results.addEventListener('mouseover', async (e) => {
    const wrapper = e.target.closest('.ref-wrapper');
    if (!wrapper) return;
    const ref = wrapper.dataset.ref;
    const text = await getVerseText(ref);
    preview.innerHTML = `<strong>${ref}</strong><br>${text}`;
    preview.style.display = 'block';
    // Posicionamento inteligente
    const rect = wrapper.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX;
    if (left + 360 > window.innerWidth) left = window.innerWidth - 370 + window.scrollX;
    if (top + 150 > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - 150;
    preview.style.top = `${top}px`;
    preview.style.left = `${left}px`;
  });
  results.addEventListener('mouseout', (e) => {
    const wrapper = e.target.closest('.ref-wrapper');
    if (!wrapper || !wrapper.contains(e.relatedTarget)) preview.style.display = 'none';
  });
  results.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (btn) {
      e.stopPropagation();
      const ref = btn.closest('.ref-wrapper').dataset.ref;
      navigator.clipboard.writeText(ref).then(() => {
        btn.textContent = '✅'; setTimeout(() => btn.textContent = '📋', 1500);
      });
    }
    if (e.target.matches('.load-more-btn')) loadMoreRefs(e);
  });

  async function search(query) {
    if (!input || !results || !status) return;
    results.innerHTML = '';
    const q = normalize(query);
    if (q.length < 3) { status.textContent = q ? '💡 Mínimo 3 letras.' : ''; return; }
    status.textContent = '🔍 Buscando...'; status.className = 'status loading';
    const vPath = currentVersion.toLowerCase();
    try {
      if (!cache.has(`${vPath}_idx`)) {
        const res = await fetch(`${DATA_BASE}${vPath}/${q[0]}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cache.set(`${vPath}_idx`, await res.json());
      }
      const data = cache.get(`${vPath}_idx`);
      let match = data[query] || data[normalize(query)];
      if (!match) {
        const matches = Object.keys(data).filter(k => levenshtein(q, normalize(k)) <= 2)
          .sort((a,b) => levenshtein(q, normalize(a)) - levenshtein(q, normalize(b))).slice(0,3);
        if (matches.length) { status.textContent = `🔍 Similar: ${matches[0]}`; match = data[matches[0]]; }
        else { status.textContent = `❌ Nenhum resultado para "${query}".`; return; }
      } else status.textContent = '';
      renderResult(query, match);
    } catch (e) { status.textContent = e.message.includes('404') ? `📖 ${currentVersion} indisponível.` : '⚠️ Erro ao carregar.'; }
    finally { status.className = 'status'; }
  }

  function renderResult(lemma, entry) {
    currentSortedRefs = sortRefs(entry.refs);
    const maxShow = 20;
    const strongs = getStrongsInfo(lemma);
    const strongsBadge = strongs ? `<span class="strongs-badge ms-2" title="Strong's ${strongs.s}">📜 ${strongs.o} (${strongs.t})</span>` : '';
    const refsHtml = currentSortedRefs.slice(0, maxShow).map(r => `
      <span class="ref-wrapper" data-ref="${r}">
        <a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link">${r}</a>
        <button class="copy-btn" title="Copiar">📋</button>
      </span>`).join(', ');
    const moreBtn = currentSortedRefs.length > maxShow ? `<button class="load-more-btn" data-shown="${maxShow}">Carregar mais (${currentSortedRefs.length - maxShow})</button>` : '';
    results.innerHTML = `<article class="result-card"><h3 class="h4 mb-1">${lemma}${strongsBadge} <small class="text-muted">(${entry.freq}x)</small></h3><p class="mb-2 fst-italic text-muted">Formas: ${entry.forms.join(', ')}</p><div class="refs">${refsHtml}</div>${moreBtn}</article>`;
  }

  function loadMoreRefs(e) {
    const btn = e.target;
    const shown = parseInt(btn.dataset.shown);
    const next = currentSortedRefs.slice(shown, shown + 20);
    const html = next.map(r => `<span class="ref-wrapper" data-ref="${r}"><a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link">${r}</a><button class="copy-btn" title="Copiar">📋</button></span>`).join(', ');
    results.querySelector('.refs').insertAdjacentHTML('beforeend', `, ${html}`);
    const newShown = shown + 20;
    btn.dataset.shown = newShown;
    if (newShown >= currentSortedRefs.length) btn.remove();
    else btn.textContent = `Carregar mais (${currentSortedRefs.length - newShown})`;
  }

  let timer;
  input?.addEventListener('input', e => { clearTimeout(timer); clearBtn?.classList.toggle('d-none', !e.target.value.trim()); timer = setTimeout(() => search(e.target.value), 300); });
  clearBtn?.addEventListener('click', () => { input.value=''; clearBtn.classList.add('d-none'); results.innerHTML=''; status.textContent=''; input.focus(); });
  versionSelect?.addEventListener('change', e => { currentVersion = e.target.value; cache.clear(); search(input.value || 'amor'); });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (!pwaDismissed) installBanner.classList.remove('d-none'); });
  installBtn?.addEventListener('click', () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then(r => { if(r.outcome==='accepted') installBanner.classList.add('d-none'); deferredPrompt=null; }); } });
  dismissInstall?.addEventListener('click', () => { installBanner.classList.add('d-none'); localStorage.setItem('pwa_install_dismissed', 'true'); });

  document.addEventListener('DOMContentLoaded', () => { loadStats(); loadStrongs(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('/bible-concordance/sw.js'); });
})();
