window.IRMA_QUIZZES = [];

(async function loadAllQuizzes() {
  for (let i = 1; i <= 100; i++) {
    try {
      const res = await fetch(`data/quiz-${i}.js`, { cache: 'no-cache' });
      if (!res.ok) break;
      const script = document.createElement('script');
      script.textContent = await res.text();
      document.head.appendChild(script);
    } catch (e) { break; }
  }
  window.dispatchEvent(new CustomEvent('quizzesLoaded', { detail: window.IRMA_QUIZZES }));
})();
