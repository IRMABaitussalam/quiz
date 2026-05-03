// Auto-load semua quiz-*.js dari folder data/
// Cukup tambah file baru, tidak perlu edit apa pun

window.IRMA_QUIZZES = [];

(async function loadAllQuizzes() {
  for (let i = 1; i <= 100; i++) {
    try {
      const response = await fetch(`data/quiz-${i}.js`, { cache: 'no-cache' });
      if (!response.ok) break;
      const scriptText = await response.text();
      const scriptEl = document.createElement('script');
      scriptEl.textContent = scriptText;
      document.head.appendChild(scriptEl);
    } catch (e) {
      break;
    }
  }
  window.dispatchEvent(new CustomEvent('quizzesLoaded', { detail: window.IRMA_QUIZZES }));
})();
