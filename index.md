---
layout: default
title: ""
---

<header>
  <h1 class="display-5 fw-bold mb-2">📖 Concordância Bíblica</h1>
  <p class="lead text-muted mb-0">Busca inteligente por lemas, frequência e referências ordenadas.</p>
</header>

<main>
  <div class="version-selector">
    <label for="version-select" class="visually-hidden">Versão da Bíblia</label>
    <select id="version-select">
      <option value="ACF" selected>Almeida Corrigida Fiel (ACF)</option>
      <option value="ARC">Almeida Revista e Corrigida (ARC)</option>
      <option value="NVI">Nova Versão Internacional (NVI)</option>
    </select>
  </div>

  <div class="search-container mb-4 position-relative">
    <input type="search" id="concordance-input" placeholder="Digite uma palavra (ex: criar, fé, graça)..." autocomplete="off" autocorrect="off" spellcheck="false">
    <button type="button" id="clear-search" class="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted d-none" aria-label="Limpar busca">✕</button>
    <div id="status" class="status mt-2"></div>
  </div>

  <section id="results" aria-live="polite"></section>

  <footer class="mt-5 pt-3 border-top text-center text-muted small">
    <p>Texto em domínio público. <a href="https://github.com/MauricioMendes-gif/bible-concordance" target="_blank">Código aberto</a>.</p>
  </footer>
</main>

<div id="verse-preview"></div>

<script src="{{ '/assets/js/app.js' | relative_url }}"></script>
