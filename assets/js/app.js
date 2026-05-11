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
  let currentQuery = '';
  let currentResults = [];
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
  const modal = document.getElementById('verse-modal');
  const modalBody = document.getElementById('verse-modal-body');
  const modalClose = document.querySelector('.modal-close');
  const installBanner = document.getElementById('install-banner');
  const installBtn = document.getElementById('install-btn');
  const dismissInstall = document.getElementById('dismiss-install');
  const actionButtons = document.getElementById('action-buttons');
  const viewSequenceBtn = document.getElementById('view-sequence-btn');
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const sequenceView = document.getElementById('sequence-view');
  const sequenceContent = document.getElementById('sequence-content');
  const closeSequence = document.getElementById('close-sequence');

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
  function escapeHtml(str) { return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function highlightWord(text, word) {
    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  async function loadStats() {
    if (statsPanel?.classList.contains('d-none')) statsPanel.classList.remove('d-none');
    const fetchMeta = async (v) => { try { const r = await fetch(`${DATA_BASE}${v.toLowerCase()}/meta.json`); return r.ok ? await res.json() : null; } catch { return null; } };
    const acf = await fetchMeta('ACF'), arc = await fetchMeta('ARC');
    if (document.getElementById('stat-acf-verses')) {
      document.getElementById('stat-acf-verses').textContent = acf?.total_verses?.toLocaleString('pt-BR') || '–';
      document.getElementById('stat-acf-lemmas').textContent = acf?.unique_lemmas?.toLocaleString('pt-BR') || '–';
      document.getElementById('stat-arc-verses').textContent = arc?.total_verses?.toLocaleString('pt-BR') || '–';
      document.getElementById('stat-arc-lemmas').textContent = arc?.unique_lemmas?.toLocaleString('pt-BR') || '–';
    }
  }
  async function loadStrongs() {
    if (strongsData) return;
    try { const r = await fetch(`${DATA_BASE}strongs.json`); strongsData = r.ok ? await res.json() : {}; } catch { strongsData = {}; }
  }
  function getStrongsInfo(lemma) { return strongsData?.[normalize(lemma)] || null; }
  async function getVerseText(ref) {
    const vPath = currentVersion.toLowerCase();
    if (!versesCache[vPath]) {
      try { const res = await fetch(`${DATA_BASE}${vPath}/verses.json`); versesCache[vPath] = res.ok ? await res.json() : {}; }
      catch { versesCache[vPath] = {}; }
    }
    return versesCache[vPath][ref] || 'Texto não disponível.';
  }

  // 📖 Modal
  function openModal(ref) {
    getVerseText(ref).then(text => {
      modalBody.innerHTML = `<h3 class="modal-title">${ref}</h3><p class="modal-text">${text}</p>`;
      modal.classList.add('active'); modal.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden'; modalClose?.focus();
    });
  }
  function closeModal() {
    modal.classList.remove('active'); modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = ''; input?.focus();
  }
  modalClose?.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) { e.preventDefault(); closeModal(); } });

  // 📋 View Sequencial
  function showSequenceView(verses, query) {
    sequenceContent.innerHTML = verses.map(({ref, text}) => `
      <div class="sequence-verse">
        <div class="sequence-ref">${ref}</div>
        <div class="sequence-text">${highlightWord(escapeHtml(text), query)}</div>
      </div>
    `).join('');
    sequenceView.classList.remove('d-none');
    sequenceView.scrollIntoView({behavior:'smooth'});
  }
  function hideSequenceView() { sequenceView.classList.add('d-none'); }
  closeSequence?.addEventListener('click', hideSequenceView);

  // 📄 Exportar PDF (jsPDF)
  async function exportToPdf(verses, query, version) {
    if (!window.jspdf) { alert('⚠️ Carregando biblioteca PDF... tente em instantes.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt', format:'a4'});
    const margin = 50, maxWidth = 500, lineHeight = 18;
    let y = 70;

    // Cabeçalho
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text(`Concordância Bíblica - "${query}"`, margin, y); y += 25;
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(`Versão: ${version} | Total: ${verses.length} versículos`, margin, y); y += 30;
    doc.setDrawColor(200); doc.line(margin, y-10, margin+maxWidth, y-10); y += 15;

    // Versículos
    doc.setFontSize(11);
    for (const {ref, text} of verses) {
      if (y > 750) { doc.addPage(); y = 50; }
      doc.setFont('helvetica','bold'); doc.text(ref, margin, y); y += lineHeight;
      doc.setFont('helvetica','normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (y > 750) { doc.addPage(); y = 50; }
        doc.text(line, margin, y); y += lineHeight;
      }
      y += 5;
    }

    // Rodapé
    doc.setFontSize(8); doc.setTextColor(100);
    const pageCount = doc.internal.getNumberOfPages();
    for (let i=1; i<=pageCount; i++) {
      doc.setPage(i);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} • bible-concordance`, margin, 830);
    }
    doc.save(`concordancia-${query.toLowerCase().replace(/\s+/g,'-')}-${version.toLowerCase()}.pdf`);
  }

  // Delegação de Eventos
  results.addEventListener('mouseover', async (e) => {
    const wrapper = e.target.closest('.ref-wrapper'); if (!wrapper) return;
    const text = await getVerseText(wrapper.dataset.ref);
    preview.innerHTML = `<strong>${wrapper.dataset.ref}</strong><br>${text}`;
    preview.style.display = 'block';
    const rect = wrapper.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 10, left = rect.left + window.scrollX;
    if (left + 360 > window.innerWidth) left = window.innerWidth - 370 + window.scrollX;
    if (top + 150 > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - 150;
    preview.style.top = `${top}px`; preview.style.left = `${left}px`;
  });
  results.addEventListener('mouseout', (e) => {
    const wrapper = e.target.closest('.ref-wrapper');
    if (!wrapper || !wrapper.contains(e.relatedTarget)) preview.style.display = 'none';
  });
  results.addEventListener('click', (e) => {
    const link = e.target.closest('.ref-link');
    if (link) { e.preventDefault(); e.stopPropagation(); openModal(link.dataset.ref); return; }
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      e.stopPropagation();
      const ref = copyBtn.closest('.ref-wrapper').dataset.ref;
      navigator.clipboard.writeText(ref).then(() => {
        copyBtn.textContent = '✅'; setTimeout(() => copyBtn.textContent = '📋', 1500);
      }); return;
    }
    if (e.target.matches('.load-more-btn')) loadMoreRefs(e);
  });

  async function search(query) {
    if (!input || !results || !status) return;
    results.innerHTML = ''; currentQuery = ''; currentResults = [];
    actionButtons?.classList.add('d-none'); hideSequenceView();
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
      currentQuery = query; currentSortedRefs = sortRefs(match.refs);
      currentResults = await Promise.all(currentSortedRefs.map(async ref => ({ ref, text: await getVerseText(ref) })));
      renderResult(query, match);
      actionButtons?.classList.remove('d-none');
    } catch (e) { status.textContent = e.message.includes('404') ? `📖 ${currentVersion} indisponível.` : '⚠️ Erro ao carregar.'; }
    finally { status.className = 'status'; }
  }

  function renderResult(lemma, entry) {
    const strongs = getStrongsInfo(lemma);
    const strongsBadge = strongs ? `<span class="strongs-badge ms-2" title="Strong's ${strongs.s}">📜 ${strongs.o} (${strongs.t})</span>` : '';
    const refsHtml = currentSortedRefs.slice(0, 20).map(r => `
      <span class="ref-wrapper" data-ref="${r}">
        <span class="ref-link" data-ref="${r}">${r}</span>
        <button class="copy-btn" title="Copiar">📋</button>
      </span>`).join(', ');
    const moreBtn = currentSortedRefs.length > 20 ? `<button class="load-more-btn" data-shown="20">Carregar mais (${currentSortedRefs.length - 20})</button>` : '';
    results.innerHTML = `<article class="result-card"><h3 class="h4 mb-1">${lemma}${strongsBadge} <small class="text-muted">(${entry.freq}x)</small></h3><p class="mb-2 fst-italic text-muted">Formas: ${entry.forms.join(', ')}</p><div class="refs">${refsHtml}</div>${moreBtn}</article>`;
  }

  function loadMoreRefs(e) {
    const btn = e.target, shown = parseInt(btn.dataset.shown);
    const next = currentSortedRefs.slice(shown, shown + 20);
    const html = next.map(r => `<span class="ref-wrapper" data-ref="${r}"><span class="ref-link" data-ref="${r}">${r}</span><button class="copy-btn" title="Copiar">📋</button></span>`).join(', ');
    results.querySelector('.refs').insertAdjacentHTML('beforeend', `, ${html}`);
    const newShown = shown + 20; btn.dataset.shown = newShown;
    if (newShown >= currentSortedRefs.length) btn.remove();
    else btn.textContent = `Carregar mais (${currentSortedRefs.length - newShown})`;
  }

  // ⌨️ Eventos
  let timer;
  input?.addEventListener('input', e => { clearTimeout(timer); clearBtn?.classList.toggle('d-none', !e.target.value.trim()); timer = setTimeout(() => search(e.target.value), 300); });
  clearBtn?.addEventListener('click', () => { input.value=''; clearBtn.classList.add('d-none'); results.innerHTML=''; status.textContent=''; actionButtons?.classList.add('d-none'); hideSequenceView(); input.focus(); });
  versionSelect?.addEventListener('change', e => { currentVersion = e.target.value; cache.clear(); versesCache[currentVersion.toLowerCase()] = null; search(input.value || 'amor'); });

  // 🎯 Botões de Ação
  viewSequenceBtn?.addEventListener('click', () => { if (currentResults.length) showSequenceView(currentResults, currentQuery); });
  exportPdfBtn?.addEventListener('click', () => { if (currentResults.length) exportToPdf(currentResults, currentQuery, currentVersion); });

  // 📱 PWA
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (!pwaDismissed && installBanner) installBanner.classList.remove('d-none'); });
  window.addEventListener('load', () => {
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isMobile && isHTTPS && !isStandalone && !pwaDismissed && !deferredPrompt && installBanner) {
      setTimeout(() => installBanner.classList.remove('d-none'), 3000);
    }
  });
  installBtn?.addEventListener('click', async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') installBanner?.classList.add('d-none'); deferredPrompt = null; }
    else { alert('📱 Para instalar: no menu do navegador, clique em "Adicionar à tela inicial".'); installBanner?.classList.add('d-none'); localStorage.setItem('pwa_install_dismissed', 'true'); }
  });
  dismissInstall?.addEventListener('click', () => { installBanner?.classList.add('d-none'); localStorage.setItem('pwa_install_dismissed', 'true'); });

  // 🚀 Init
  document.addEventListener('DOMContentLoaded', () => { loadStats(); loadStrongs(); if ('serviceWorker' in navigator) navigator.serviceWorker.register('/bible-concordance/sw.js').catch(()=>{}); });
})();
