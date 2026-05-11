(function () {
  'use strict';

  // 📚 Ordem canônica dos 66 livros
  const BOOK_ORDER = {
    'Gênesis':1, 'Êxodo':2, 'Levítico':3, 'Números':4, 'Deuteronômio':5,
    'Josué':6, 'Juízes':7, 'Rute':8, '1 Samuel':9, '2 Samuel':10,
    '1 Reis':11, '2 Reis':12, '1 Crônicas':13, '2 Crônicas':14, 'Esdras':15,
    'Neemias':16, 'Ester':17, 'Jó':18, 'Salmos':19, 'Provérbios':20,
    'Eclesiastes':21, 'Cânticos':22, 'Isaías':23, 'Jeremias':24, 'Lamentações':25,
    'Ezequiel':26, 'Daniel':27, 'Oséias':28, 'Joel':29, 'Amós':30,
    'Obadias':31, 'Jonas':32, 'Miquéias':33, 'Naum':34, 'Habacuque':35,
    'Sofonias':36, 'Ageu':37, 'Zacarias':38, 'Malaquias':39,
    'Mateus':40, 'Marcos':41, 'Lucas':42, 'João':43, 'Atos':44,
    'Romanos':45, '1 Coríntios':46, '2 Coríntios':47, 'Gálatas':48,
    'Efésios':49, 'Filipenses':50, 'Colossenses':51, '1 Tessalonicenses':52,
    '2 Tessalonicenses':53, '1 Timóteo':54, '2 Timóteo':55, 'Tito':56,
    'Filemom':57, 'Hebreus':58, 'Tiago':59, '1 Pedro':60, '2 Pedro':61,
    '1 João':62, '2 João':63, '3 João':64, 'Judas':65, 'Apocalipse':66
  };

  // 🔢 Ordenação bíblica robusta
  function sortBibleRefs(refs) {
    return refs.slice().sort((a, b) => {
      const mA = a.match(/^(.+?)\s+(\d+):(\d+)$/);
      const mB = b.match(/^(.+?)\s+(\d+):(\d+)$/);
      if (!mA || !mB) return 0;
      const [, bA, cA, vA] = mA;
      const [, bB, cB, vB] = mB;
      const oA = BOOK_ORDER[bA] || 99, oB = BOOK_ORDER[bB] || 99;
      if (oA !== oB) return oA - oB;
      if (+cA !== +cB) return +cA - +cB;
      return +vA - +vB;
    });
  }

  // 🌐 Config
  const DATA_URL = `${window.location.origin}/bible-concordance/assets/data/concordance/`;
  const cache = new Map();
  const input = document.getElementById('concordance-input');
  const results = document.getElementById('results');
  const status = document.getElementById('status');
  const clearBtn = document.getElementById('clear-search');
  const suggestions = document.getElementById('suggestions');
  const statsContainer = document.getElementById('stats-container');

  let debounceTimer, loadingStats = false;

  // 🎯 Foco com Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input?.focus();
      input?.select();
    }
    if (e.key === 'Escape') {
      input?.blur();
      clearSearch();
    }
  });

  // 🔍 Handlers
  input?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    clearBtn?.classList.toggle('d-none', !val);
    suggestions?.classList.toggle('d-none', val.length >= 3);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(val.toLowerCase()), 300);
  });

  clearBtn?.addEventListener('click', clearSearch);
  document.querySelectorAll('.suggestion-chip')?.forEach(btn => {
    btn.addEventListener('click', (e) => {
      input.value = e.target.dataset.word;
      input.focus();
      search(e.target.dataset.word);
    });
  });

  function clearSearch() {
    input.value = '';
    results.innerHTML = '';
    status.textContent = '';
    clearBtn?.classList.add('d-none');
    suggestions?.classList.remove('d-none');
    input?.focus();
  }

  async function search(word) {
    if (!input || !results || !status) return;
    results.innerHTML = '';
    results.setAttribute('aria-busy', 'true');
    
    if (!word || word.length < 3) {
      status.textContent = word ? '💡 Digite pelo menos 3 letras.' : '';
      status.className = 'status mt-3';
      results.setAttribute('aria-busy', 'false');
      return;
    }

    const letter = word[0];
    status.textContent = '🔍 Buscando...';
    status.className = 'status mt-3 loading';

    try {
      if (!cache.has(letter)) {
        const res = await fetch(`${DATA_URL}${letter}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cache.set(letter, await res.json());
      }

      const data = cache.get(letter);
      const entry = data[word];
      
      if (!entry) {
        status.textContent = `❌ Nenhum resultado para "${word}". Tente o lema base.`;
        status.className = 'status mt-3 text-warning';
        results.setAttribute('aria-busy', 'false');
        return;
      }

      status.textContent = '';
      renderResult(word, entry);
      loadStats(); // Carrega estatísticas na primeira busca
    } catch (err) {
      status.textContent = '⚠️ Erro ao carregar. Verifique sua conexão.';
      status.className = 'status mt-3 text-danger';
      console.error('Concordance error:', err);
    } finally {
      results.setAttribute('aria-busy', 'false');
    }
  }

  function renderResult(lemma, entry) {
    const maxShow = 20;
    const sorted = sortBibleRefs(entry.refs);
    const refsHtml = sorted.slice(0, maxShow)
      .map(r => `<a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link" title="${r}">${r}</a>`)
      .join(', ');
    const more = sorted.length > maxShow 
      ? `<button class="load-more" data-lemma="${lemma}" data-count="${sorted.length}">Carregar mais (${sorted.length - maxShow})</button>` 
      : '';

    results.innerHTML = `
      <article class="result-card" aria-label="Resultados para ${lemma}">
        <h3 class="h4 mb-1">${lemma} <small class="text-muted fs-6">(${entry.freq}x)</small></h3>
        <p class="mb-2 fst-italic text-muted">Formas encontradas: ${entry.forms.join(', ')}</p>
        <div class="refs" role="list">${refsHtml}${more}</div>
      </article>
    `;
    document.querySelector('.load-more')?.addEventListener('click', loadMoreRefs);
  }

  function loadMoreRefs(e) {
    const lemma = e.target.dataset.lemma;
    const total = +e.target.dataset.count;
    const entry = cache.get(lemma[0])[lemma];
    const current = results.querySelectorAll('.ref-link').length;
    const sorted = sortBibleRefs(entry.refs);
    const next = sorted.slice(current, current + 20);
    
    const html = next.map(r => `<a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link" title="${r}">${r}</a>`).join(', ');
    results.querySelector('.refs').insertAdjacentHTML('beforeend', `, ${html}`);
    
    if (sorted.length <= current + 20) {
      e.target.remove();
    } else {
      e.target.textContent = `Carregar mais (${sorted.length - (current + 20)})`;
      e.target.dataset.count = total;
    }
  }

  // 📊 Carregar estatísticas do meta.json
  async function loadStats() {
    if (loadingStats || !statsContainer) return;
    loadingStats = true;
    try {
      const res = await fetch(`${DATA_URL}meta.json`);
      if (!res.ok) return;
      const meta = await res.json();
      document.getElementById('stat-verses').textContent = meta.total_verses?.toLocaleString('pt-BR') || '–';
      document.getElementById('stat-lemmas').textContent = meta.unique_lemmas?.toLocaleString('pt-BR') || '–';
    } catch (e) {
      console.warn('Stats load failed:', e);
    }
  }

  // 🚀 Inicialização
  document.addEventListener('DOMContentLoaded', () => {
    suggestions?.classList.remove('d-none');
    input?.focus();
    loadStats();
  });
})();
