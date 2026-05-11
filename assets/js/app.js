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
  let versesCache = null;

  const input = document.getElementById('concordance-input');
  const results = document.getElementById('results');
  const status = document.getElementById('status');
  const clearBtn = document.getElementById('clear-search');
  const versionSelect = document.getElementById('version-select');
  const preview = document.getElementById('verse-preview');

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
      const oa=BOOK_ORDER[ba]||99, ob=BOOK_ORDER[bb]||99;
      if(oa!==ob) return oa-ob; if(+ca!==+cb) return +ca-+cb; return +va-+vb;
    });
  }

  async function search(query) {
    if (!input || !results || !status) return;
    results.innerHTML = '';
    const q = normalize(query);
    if (q.length < 3) { status.textContent = q ? '💡 Mínimo 3 letras.' : ''; return; }

    const letter = q[0];
    status.textContent = '🔍 Buscando...'; status.className = 'status loading';

    try {
      const vPath = currentVersion === 'ACF' ? 'acf' : currentVersion.toLowerCase();
      const url = `${DATA_BASE}${vPath}/${letter}.json`;
      
      if (!cache.has(url)) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cache.set(url, await res.json());
      }

      const data = cache.get(url);
      if (data[q]) { renderResult(q, data[q]); return; }
      
      const matches = Object.keys(data).filter(k => levenshtein(q, normalize(k)) <= 2)
        .sort((a,b) => levenshtein(q, normalize(a)) - levenshtein(q, normalize(b))).slice(0,3);
      
      if (matches.length) {
        status.textContent = `🔍 Exato não encontrado. Mostrando: ${matches.join(', ')}`;
        renderResult(matches[0], data[matches[0]]);
      } else {
        status.textContent = `❌ Nenhum resultado para "${query}".`;
      }
    } catch (e) {
      if (e.message.includes('404') && currentVersion !== 'ACF') {
        status.textContent = `📖 ${currentVersion} indisponível. Alternando para ACF...`;
        currentVersion = 'ACF'; versionSelect.value = 'ACF';
        setTimeout(() => search(query), 800);
      } else {
        status.textContent = '⚠️ Erro ao carregar dados.';
      }
    } finally { status.className = 'status'; }
  }

  function renderResult(lemma, entry) {
    const sorted = sortRefs(entry.refs);
    const refsHtml = sorted.slice(0,20).map(r => `
      <span class="ref-wrapper" data-ref="${r}">
        <a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link">${r}</a>
        <button class="copy-btn" title="Copiar">📋</button>
      </span>`).join(', ');
      
    results.innerHTML = `
      <article class="result-card">
        <h3 class="h4 mb-1">${lemma} <small class="text-muted">(${entry.freq}x)</small></h3>
        <p class="mb-2 fst-italic text-muted">Formas: ${entry.forms.join(', ')}</p>
        <div class="refs">${refsHtml}</div>
      </article>`;

    document.querySelectorAll('.ref-wrapper').forEach(el => {
      el.addEventListener('mouseenter', e => {
        preview.innerHTML = `<strong>${el.dataset.ref}</strong><br>Carregando texto...`;
        preview.style.display = 'block';
        preview.style.left = `${Math.min(e.pageX+15, window.innerWidth-320)}px`;
        preview.style.top = `${e.pageY+15}px`;
        // Preview só funciona se verses.json existir
        fetch(`${DATA_BASE}${currentVersion==='ACF'?'acf':currentVersion.toLowerCase()}/verses.json`)
          .then(r=>r.json()).then(v=>{ preview.innerHTML=`<strong>${el.dataset.ref}</strong><br>${v[el.dataset.ref]||'Não disponível'}`; })
          .catch(()=>{ preview.innerHTML=`<strong>${el.dataset.ref}</strong>`; });
      });
      el.addEventListener('mouseleave', () => preview.style.display = 'none');
      el.querySelector('.copy-btn').addEventListener('click', async ev => {
        ev.stopPropagation();
        await navigator.clipboard.writeText(el.dataset.ref);
        ev.target.textContent = '✅';
        setTimeout(() => ev.target.textContent = '📋', 1500);
      });
    });
  }

  let timer;
  input?.addEventListener('input', e => {
    clearTimeout(timer);
    clearBtn?.classList.toggle('d-none', !e.target.value.trim());
    timer = setTimeout(() => search(e.target.value), 300);
  });
  clearBtn?.addEventListener('click', () => { input.value=''; clearBtn.classList.add('d-none'); results.innerHTML=''; status.textContent=''; input.focus(); });
  versionSelect?.addEventListener('change', e => {
    currentVersion = e.target.value; cache.clear(); versesCache=null;
    status.textContent = `🔄 Carregando ${currentVersion}...`;
    search(input.value || 'amor');
  });

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/bible-concordance/sw.js'));
})();
