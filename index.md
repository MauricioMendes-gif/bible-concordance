---
layout: default
title: ""
---

<header class="text-center mb-4">
  <h1 class="display-6 fw-bold mb-2">📖 Concordância Bíblica</h1>
  <p class="lead text-muted mb-0">Busca inteligente por lemas, frequência e referências ordenadas.</p>
</header>

<main>
  <div class="version-selector mb-3 text-center">
    <label for="version-select" class="visually-hidden">Versão</label>
    <select id="version-select" class="form-select form-select-sm d-inline-block w-auto">
      <option value="ACF" selected>Almeida Corrigida Fiel (ACF)</option>
      <option value="ARC" disabled>Almeida Revista e Corrigida (ARC) <small class="text-muted">(em breve)</small></option>
      <option value="NVI" disabled>Nova Versão Internacional (NVI) <small class="text-muted">(em breve)</small></option>
    </select>
  </div>

  <div class="search-container mb-4 position-relative">
    <input type="search" id="concordance-input" class="form-control form-control-lg" placeholder="Digite uma palavra (ex: criar, fé, graça)..." autocomplete="off" autocorrect="off" spellcheck="false">
    <button type="button" id="clear-search" class="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted d-none" aria-label="Limpar">✕</button>
    <div id="status" class="status mt-2"></div>
  </div>

  <section id="results" aria-live="polite"></section>
</main>

<footer class="mt-5 pt-3 border-top text-center text-muted small">
  <p>Texto em domínio público. <a href="https://github.com/MauricioMendes-gif/bible-concordance" target="_blank">Código aberto</a>.</p>
</footer>

<div id="verse-preview" class="d-none"></div>
<script src="{{ '/assets/js/app.js' | relative_url }}"></script>
