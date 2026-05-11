(function () {
  'use strict';
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
    try {
      if (!cache.has(letter)) {
        const res = await fetch(`${DATA_URL}${letter}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        cache.set(letter, await res.json());
      }
      const data = cache.get(letter);
      const entry = data[word];
      if (!entry) { status.textContent = `❌ Nenhum resultado para "${word}". Tente o lema base.`; return; }
      status.textContent = '';
      const refs = entry.refs.slice(0, 20).map(r => `<a href="#${r.replace(/[^a-zA-Z0-9]/g,'-')}" class="ref-link">${r}</a>`).join(', ');
      results.innerHTML = `<article class="result-card"><h3>${word} <small class="text-muted">(${entry.freq}x)</small></h3><p class="fst-italic text-muted">Formas: ${entry.forms.join(', ')}</p><div>${refs}</div></article>`;
    } catch (err) { status.textContent = '⚠️ Erro ao carregar.'; console.error(err); }
  }
})();
