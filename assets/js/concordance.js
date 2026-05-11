(function () {
  'use strict';

  // 📚 Ordem canônica dos 66 livros da Bíblia (ACF)
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

  // 🔢 Ordena referências bíblicas cronologicamente
  function sortBibleRefs(refs) {
    return refs.slice().sort((a, b) => {
      // Regex robusto: captura "Livro Cap:Vers" com espaços opcionais
      const matchA = a.match(/^(.+?)\s+(\d+):(\d+)$/);
      const matchB = b.match(/^(.+?)\s+(\d+):(\d+)$/);
      if (!matchA || !matchB) return 0; // fallback seguro

      const [, bookA, chapA, versA] = matchA;
      const [, bookB, chapB, versB] = matchB;

      const orderA = BOOK_ORDER[bookA] || 99;
      const orderB = BOOK_ORDER[bookB] || 99;
      if (orderA !== orderB) return orderA - orderB;
      if (parseInt(chapA) !== parseInt(chapB)) return parseInt(chapA) - parseInt(chapB);
      return parseInt(versA) - parseInt(versB);
    });
  }

  // 🌐 Configuração
  const DATA_URL = `${window.location.origin}/bible-concordance/assets/data/concordance/`;
  const cache = new Map();
  const input = document.getElementById('concordance-input');
  const results = document.getElementById('results');
  const status = document.getElementById('status');

  let debounceTimer;
  input?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(e.target.value.trim().toLowerCase()), 300);
  });

  async function search(word) {
    if (!input || !results || !status) return;
    results.innerHTML = '';
    if (word.length < 3) { status.textContent = '💡 Digite pelo menos 3 letras.'; return; }

    const letter = word[0];
    status.textContent = '🔍 Buscando...';
    status.className = 'status mt-2 text-muted';

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
        status.className = 'status mt-2 text-warning';
        return;
      }

      status.textContent = '';
      renderResult(word, entry);
    } catch (err) {
      status.textContent = '⚠️ Erro ao carregar.';
      status.className = 'status mt-2 text-danger';
      console.error('Concordance error:', err);
    }
  }

  function renderResult(lemma, entry) {
    const maxShow = 20;
    // ✅ Ordena + limita + formata as referências
    const sortedRefs = sortBibleRefs(entry.refs);
    const refsHtml = sortedRefs.slice(0, maxShow)
      .map(r => `<a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link">${r}</a>`)
      .join(', ');
    const more = sortedRefs.length > maxShow 
      ? `<button class="btn btn-sm btn-outline-primary mt-2 load-more" data-lemma="${lemma}">Carregar mais (${sortedRefs.length - maxShow})</button>` 
      : '';

    results.innerHTML = `
      <article class="result-card p-3 border rounded bg-light" aria-label="Resultado para ${lemma}">
        <h3 class="h4 mb-1">${lemma} <small class="text-muted fs-6">(${entry.freq}x)</small></h3>
        <p class="mb-2 fst-italic text-muted">Formas: ${entry.forms.join(', ')}</p>
        <div class="refs">${refsHtml}${more}</div>
      </article>
    `;
    document.querySelector('.load-more')?.addEventListener('click', loadMoreRefs);
  }

  function loadMoreRefs(e) {
    const lemma = e.target.dataset.lemma;
    const entry = cache.get(lemma[0])[lemma];
    const currentCount = results.querySelectorAll('.ref-link').length;
    const sortedRefs = sortBibleRefs(entry.refs);
    const nextBatch = sortedRefs.slice(currentCount, currentCount + 20);
    
    const html = nextBatch.map(r => `<a href="#${r.replace(/[^a-zA-Z0-9À-ÿ]/g,'-')}" class="ref-link">${r}</a>`).join(', ');
    results.querySelector('.refs').insertAdjacentHTML('beforeend', `, ${html}`);
    
    if (sortedRefs.length <= currentCount + 20) {
      e.target.remove();
    } else {
      e.target.textContent = `Carregar mais (${sortedRefs.length - (currentCount + 20)})`;
    }
  }
})();
