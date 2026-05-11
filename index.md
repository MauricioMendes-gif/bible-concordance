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
      <option value="ARC">Almeida Revista e Corrigida (ARC)</option>
    </select>
  </div>

  <div class="search-container mb-4 position-relative">
    <input type="search" id="concordance-input" class="form-control form-control-lg" placeholder="Digite uma palavra (ex: criar, fé, graça)..." autocomplete="off" autocorrect="off" spellcheck="false">
    <button type="button" id="clear-search" class="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3 text-muted d-none" aria-label="Limpar">✕</button>
    <div id="status" class="status mt-2"></div>
  </div>

  <section id="results" aria-live="polite"></section>

  <section id="stats-panel" class="stats-panel mt-5 p-3 border rounded bg-light d-none">
    <h2 class="h5 mb-3">📊 Comparativo de Versões</h2>
    <div class="row g-3">
      <div class="col-6 col-md-3 stat-box"><div class="stat-label">ACF Versículos</div><div class="stat-value" id="stat-acf-verses">–</div></div>
      <div class="col-6 col-md-3 stat-box"><div class="stat-label">ACF Lemas</div><div class="stat-value" id="stat-acf-lemmas">–</div></div>
      <div class="col-6 col-md-3 stat-box"><div class="stat-label">ARC Versículos</div><div class="stat-value" id="stat-arc-verses">–</div></div>
      <div class="col-6 col-md-3 stat-box"><div class="stat-label">ARC Lemas</div><div class="stat-value" id="stat-arc-lemmas">–</div></div>
    </div>
  </section>
</main>

<footer class="mt-5 pt-3 border-top text-center text-muted small">
  <p>Texto em domínio público. <a href="https://github.com/MauricioMendes-gif/bible-concordance" target="_blank">Código aberto</a>.</p>
</footer>

<!-- 📖 Modal de Versículo -->
<div id="verse-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="modal-content">
    <button class="modal-close" aria-label="Fechar modal">✕</button>
    <div id="verse-modal-body"></div>
  </div>
</div>

<!-- 🎈 Tooltip Hover -->
<div id="verse-preview"></div>

<!-- 📱 Banner PWA -->
<div id="install-banner" class="install-banner d-none" role="alert">
  <span>📱 Instale como app para uso offline</span>
  <button id="install-btn" class="btn btn-sm btn-primary ms-2">Instalar</button>
  <button id="dismiss-install" class="btn btn-sm btn-link text-muted ms-1" aria-label="Dispensar">✕</button>
</div>

<script src="{{ '/assets/js/app.js' | relative_url }}"></script>
