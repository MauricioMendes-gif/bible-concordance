---
layout: default
title: Concordância Bíblica
---

# 📖 Concordância Bíblica Completa

<p class="lead">Busca por lema com agrupamento morfológico, frequência e referências cruzadas. Baseada na Almeida Corrigida Fiel (domínio público).</p>

<div class="search-box mb-4">
  <label for="concordance-input" class="visually-hidden">Buscar palavra na Bíblia</label>
  <input type="text" id="concordance-input" class="form-control form-control-lg" placeholder="Digite uma palavra (ex: criar, fé, graça)..." autocomplete="off">
  <small class="form-text text-muted">Digite pelo menos 3 letras. Busca por lema: "criar" encontra "criou", "criação", etc.</small>
  <div id="status" class="status mt-2" aria-live="polite"></div>
</div>

<section id="results" aria-live="polite"></section>

<footer class="mt-5 pt-3 border-top">
  <small>
    <strong>Fonte:</strong> Texto bíblico em domínio público (Almeida Corrigida Fiel). 
    <a href="https://github.com/MauricioMendes-gif/bible-concordance" target="_blank">Código aberto no GitHub</a>.
  </small>
</footer>

<script src="{{ '/assets/js/concordance.js' | relative_url }}"></script>
