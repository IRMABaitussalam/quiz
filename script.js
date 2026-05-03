const firebaseConfig = {
  apiKey: "AIzaSyAhJNw0GIs1lPxOHMws-C9M3ot8SO-2dJE",
  authDomain: "irma-baitussalam.firebaseapp.com",
  projectId: "irma-baitussalam",
  storageBucket: "irma-baitussalam.firebasestorage.app",
  messagingSenderId: "26944525766",
  appId: "1:26944525766:web:54fc572b8a841a7bc20ec7",
  measurementId: "G-F2NJTHQ7CT"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---------- STATE ----------
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userResponses = [];          // { answerIndex, timeElapsed }
let questionAnswered = [];       // boolean per soal
let timerSeconds = 0;
let timerInterval = null;
let sampleQuizzes = [];
let pendingQuizId = null;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const mainNavbar = $('mainNavbar');
const profileTrigger = $('profileTrigger');
const profileDropdown = $('profileDropdown');
const hamburgerBtn = $('hamburgerBtn');
const hamburgerDropdown = $('hamburgerDropdown');
const navAvatar = $('navAvatar');
const profileName = $('profileName');
const logoutBtn = $('logoutBtnFromDropdown');
const navHomeDesktop = $('navHomeDesktop');
const navHomeMobile = $('navHomeMobile');
const googleLoginBtn = $('googleLoginBtn');
const searchInput = $('searchInput');
const quizContainer = $('quizContainer');
const leaderboardList = $('leaderboardList');
const leaderboardEmpty = $('leaderboardEmpty');
const quizTitle = $('quizTitle');
const progressFill = $('progressFill');
const questionNumber = $('questionNumber');
const questionText = $('questionText');
const optionsContainer = $('optionsContainer');
const prevBtn = $('prevQuestionBtn');
const nextBtn = $('nextQuestionBtn');
const submitBtn = $('submitQuizBtn');
const resultScore = $('resultScore');
const reviewContainer = $('reviewContainer');
const backToHomeBtn = $('backToHomeBtn');
const timerText = $('timerText');
const statModal = $('statModal');
const statContent = $('statContent');
const closeStatModal = $('closeStatModal');

// Modal konfirmasi & countdown
const confirmModal = $('confirmModal');
const confirmQuizName = $('confirmQuizName');
const confirmQuestionCount = $('confirmQuestionCount');
const confirmScoreRange = $('confirmScoreRange');
const confirmTimeRange = $('confirmTimeRange');
const confirmStepRange = $('confirmStepRange');
const startQuizConfirmBtn = $('startQuizConfirmBtn');
const cancelQuizConfirmBtn = $('cancelQuizConfirmBtn');
const countdownModal = $('countdownModal');
const countdownTimerText = $('countdownTimerText');

// Footer tahun
if ($('currentYear')) $('currentYear').textContent = new Date().getFullYear();

// Sembunyikan semua screen, tampilkan loading
['loginScreen','dashboardScreen','quizScreen','resultScreen'].forEach(id => {
  const el = $(id);
  if (el) el.classList.remove('active');
});
if ($('loadingScreen')) $('loadingScreen').style.display = 'flex';

// ---------- SCREEN ----------
function showScreen(id) {
  ['loginScreen','dashboardScreen','quizScreen','resultScreen'].forEach(s => {
    const el = $(s);
    if (el) el.classList.remove('active');
  });
  const el = $(id);
  if (el) el.classList.add('active');
  if (mainNavbar) mainNavbar.style.display = (id === 'loginScreen') ? 'none' : 'flex';
}

// ---------- AUTH ----------
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert('Login gagal: ' + e.message));
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => auth.signOut());
}

auth.onAuthStateChanged(user => {
  const loader = $('loadingScreen');
  if (loader) {
    loader.classList.add('fade-out');
    setTimeout(() => { loader.style.display = 'none'; }, 300);
  }
  if (user) {
    currentUser = { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
    if (profileName) profileName.textContent = user.displayName || 'Peserta';
    if (navAvatar) {
      if (user.photoURL) { navAvatar.src = user.photoURL; navAvatar.style.display = 'inline-block'; }
      else navAvatar.style.display = 'none';
    }
    showScreen('dashboardScreen');
    renderSkeletonQuizzes(); renderSkeletonLeaderboard();
    loadQuizzes(); loadLeaderboard(); checkHash();
  } else {
    currentUser = null;
    showScreen('loginScreen');
    if (profileDropdown) profileDropdown.style.display = 'none';
    if (hamburgerDropdown) hamburgerDropdown.style.display = 'none';
    if (hamburgerBtn) hamburgerBtn.classList.remove('open');
  }
});

// ---------- DROPDOWN & HAMBURGER ----------
if (profileTrigger) {
  profileTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (profileDropdown) profileDropdown.style.display = profileDropdown.style.display === 'flex' ? 'none' : 'flex';
    if (hamburgerDropdown) hamburgerDropdown.style.display = 'none';
    if (hamburgerBtn) hamburgerBtn.classList.remove('open');
  });
}
if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = hamburgerDropdown && hamburgerDropdown.style.display === 'flex';
    if (hamburgerDropdown) hamburgerDropdown.style.display = isOpen ? 'none' : 'flex';
    if (hamburgerBtn) hamburgerBtn.classList.toggle('open', !isOpen);
    if (profileDropdown) profileDropdown.style.display = 'none';
  });
}
document.addEventListener('click', () => {
  if (profileDropdown) profileDropdown.style.display = 'none';
  if (hamburgerDropdown) hamburgerDropdown.style.display = 'none';
  if (hamburgerBtn) hamburgerBtn.classList.remove('open');
});

function goHome() {
  showScreen('dashboardScreen');
  window.location.hash = '';
  if (hamburgerDropdown) hamburgerDropdown.style.display = 'none';
  if (hamburgerBtn) hamburgerBtn.classList.remove('open');
}
if (navHomeDesktop) navHomeDesktop.addEventListener('click', goHome);
if (navHomeMobile) navHomeMobile.addEventListener('click', goHome);

// ---------- HASH ROUTING ----------
function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/^-+|-+$/g,'');
}
function checkHash() {
  const hash = window.location.hash.replace('#/','');
  if (hash && sampleQuizzes.length) {
    const quiz = sampleQuizzes.find(q => slugify(q.title) === hash);
    if (quiz && currentUser) handleQuizClick(quiz);
  }
}
window.addEventListener('hashchange', checkHash);
function navigateToQuiz(quiz) { window.location.hash = '#/' + slugify(quiz.title); }

// ---------- SKELETON ----------
function renderSkeletonQuizzes() {
  if (!quizContainer) return;
  quizContainer.innerHTML = '';
  for (let i=0;i<6;i++) {
    const c = document.createElement('div');
    c.className = 'quiz-card skeleton';
    c.innerHTML = '<div class="skeleton-title"></div><div class="skeleton-meta"></div><div class="skeleton-badges"></div>';
    quizContainer.appendChild(c);
  }
}
function renderSkeletonLeaderboard() {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '';
  if (leaderboardEmpty) leaderboardEmpty.style.display = 'none';
  for (let i=0;i<5;i++) {
    const li = document.createElement('li');
    li.innerHTML = '<div class="skeleton-leaderboard"></div>';
    leaderboardList.appendChild(li);
  }
}

// ---------- QUIZ LIST ----------
function renderQuizzes(quizzes) {
  if (!quizContainer) return;
  quizContainer.innerHTML = '';
  if (!quizzes.length) {
    quizContainer.innerHTML = '<p class="empty-message">Belum ada kuis</p>';
    return;
  }
  quizzes.forEach(q => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    let html = `<h3>${q.title}</h3>`;
    html += `<div class="date"><i class="ti ti-calendar"></i> ${new Date(q.date).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div>`;
    html += `<span class="badge">${q.questions.length} soal</span><span class="badge">${q.category}</span>`;
    if (q.description) html += `<p class="description">${q.description}</p>`;
    card.innerHTML = html;
    card.addEventListener('click', () => navigateToQuiz(q));
    quizContainer.appendChild(card);
  });
}
function loadQuizzes(filter='') {
  let list = sampleQuizzes;
  if (filter.trim()) {
    const kw = filter.trim().toLowerCase();
    list = sampleQuizzes.filter(q =>
      q.title.toLowerCase().includes(kw) ||
      q.category.toLowerCase().includes(kw) ||
      (q.description && q.description.toLowerCase().includes(kw))
    );
  }
  renderQuizzes(list);
}
if (searchInput) searchInput.addEventListener('input', e => loadQuizzes(e.target.value));

// ---------- FIRESTORE & LOCAL ----------
const ATTEMPTS_KEY = 'irmaQuizAttempts_local';
const LEADERBOARD_KEY = 'irmaQuizLeaderboard_local';

function getLocalAttempts() { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); }
function saveLocalAttempt(qid, responses, score, shuffledQuestions) {
  const a = getLocalAttempts();
  if (!a[currentUser.email]) a[currentUser.email] = {};
  const totalQuestions = shuffledQuestions.length;
  const correctCount = responses.filter((r, i) => r && r.answerIndex === shuffledQuestions[i].answer).length;
  const totalTime = responses.reduce((sum, r) => sum + (r?.timeElapsed || 0), 0);
  a[currentUser.email][qid] = {
    shuffledQuestions,
    responses,
    score,
    correctCount,
    totalQuestions,
    totalTime,
    date: new Date().toISOString()
  };
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(a));
}
function getLocalLeaderboard() { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]'); }
function safeNum(v) { const n = parseInt(v,10); return isNaN(n)?0:n; }
function cleanName(name) {
  if (typeof name !== 'string') return 'Tanpa Nama';
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : 'Tanpa Nama';
}
function addToLocalLeaderboard(score) {
  const lb = getLocalLeaderboard();
  const displayName = cleanName(currentUser?.displayName || '');
  const existing = lb.find(e => e.email === currentUser.email);
  if (existing) {
    existing.totalScore = safeNum(existing.totalScore) + score;
    existing.name = displayName;
  } else {
    lb.push({
      email: currentUser.email,
      uid: currentUser.uid,
      name: displayName,
      totalScore: score
    });
  }
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
}

async function getUserAttempt(qid) {
  try {
    const d = await db.collection('attempts').doc(`${currentUser.uid}_${qid}`).get();
    if (d.exists) {
      const data = d.data();
      data.score = safeNum(data.score);
      if (!data.shuffledQuestions) data.shuffledQuestions = [];
      return data;
    }
    return null;
  } catch (e) {
    const l = getLocalAttempts();
    const a = l[currentUser.email]?.[qid];
    if (a) {
      a.score = safeNum(a.score);
      if (!a.shuffledQuestions) a.shuffledQuestions = [];
      return a;
    }
    return null;
  }
}
async function saveAttempt(qid, responses, score, shuffledQuestions) {
  try {
    const totalQuestions = shuffledQuestions.length;
    const correctCount = responses.filter((r, i) => r && r.answerIndex === shuffledQuestions[i].answer).length;
    const totalTime = responses.reduce((sum, r) => sum + (r?.timeElapsed || 0), 0);
    await db.collection('attempts').doc(`${currentUser.uid}_${qid}`).set({
      uid: currentUser.uid,
      email: currentUser.email,
      quizId: qid,
      shuffledQuestions,
      responses,
      score,
      correctCount,
      totalQuestions,
      totalTime,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
    await addToLeaderboard(score);
  } catch (e) {
    saveLocalAttempt(qid, responses, score, shuffledQuestions);
    addToLocalLeaderboard(score);
  }
}
async function addToLeaderboard(score) {
  const displayName = cleanName(currentUser?.displayName || '');
  try {
    const ref = db.collection('leaderboard').doc(currentUser.uid);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.update({ totalScore: firebase.firestore.FieldValue.increment(score) });
    } else {
      await ref.set({ uid: currentUser.uid, name: displayName, totalScore: score });
    }
  } catch (e) { throw e; }
}

async function loadLeaderboard() {
  if (!leaderboardList) return;
  try {
    const snapshot = await db.collection('leaderboard').orderBy('totalScore','desc').limit(20).get();
    const leaderboardArray = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      leaderboardArray.push({ uid: doc.id, name: cleanName(data.name), score: safeNum(data.totalScore) });
    });
    renderLeaderboardArray(leaderboardArray);
  } catch (e) {
    console.warn('Fallback leaderboard lokal');
    const local = getLocalLeaderboard();
    const cleaned = local.map(u => ({ uid: u.uid || u.email, name: cleanName(u.name), score: safeNum(u.totalScore) }));
    cleaned.sort((a,b) => b.score - a.score);
    renderLeaderboardArray(cleaned);
  }
}

function renderLeaderboardArray(arr) {
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '';
  if (!arr.length) {
    if (leaderboardEmpty) leaderboardEmpty.style.display = 'block';
    return;
  }
  if (leaderboardEmpty) leaderboardEmpty.style.display = 'none';
  arr.forEach((item, i) => {
    const rank = i+1;
    let rankDisplay = `<span class="rank-number">${rank}.</span>`;
    if (rank === 1) rankDisplay = `<span class="rank-number">🥇</span>`;
    else if (rank === 2) rankDisplay = `<span class="rank-number">🥈</span>`;
    else if (rank === 3) rankDisplay = `<span class="rank-number">🥉</span>`;
    const li = document.createElement('li');
    li.innerHTML = `
      ${rankDisplay}
      <span class="rank-name-wrapper">
        <span class="rank-name" style="cursor:pointer;" data-uid="${item.uid || ''}">${item.name}</span>
      </span>
      <span class="rank-score"><strong>${item.score} poin</strong></span>
    `;
    const nameSpan = li.querySelector('.rank-name');
    if (nameSpan) {
      nameSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        showUserStats(item.uid);
      });
    }
    leaderboardList.appendChild(li);
  });
}

async function showUserStats(uid) {
  if (!statContent || !statModal) return;
  statContent.innerHTML = 'Memuat...';
  statModal.style.display = 'flex';
  try {
    const attemptsSnap = await db.collection('attempts').where('uid','==',uid).get();
    let totalCorrect=0, totalQuestions=0, totalTime=0, totalScore=0;
    attemptsSnap.forEach(doc => {
      const d = doc.data();
      if (d.correctCount !== undefined) {
        totalCorrect += d.correctCount || 0;
        totalQuestions += d.totalQuestions || 0;
        totalTime += d.totalTime || 0;
      } else if (d.responses) {
        totalTime += (d.responses || []).reduce((s,r) => s + (r?.timeElapsed || 0), 0);
        totalQuestions += (d.responses || []).length;
      }
      totalScore += d.score || 0;
    });
    if (totalQuestions === 0) { statContent.innerHTML = '<p>Tidak ada data kuis.</p>'; return; }
    const totalWrong = totalQuestions - totalCorrect;
    const avgTime = (totalTime / totalQuestions).toFixed(1);
    const correctRate = ((totalCorrect / totalQuestions)*100).toFixed(1);
    const wrongRate = ((totalWrong / totalQuestions)*100).toFixed(1);
    let userRank = '-';
    try {
      const leaderSnap = await db.collection('leaderboard').orderBy('totalScore','desc').get();
      const list = [];
      leaderSnap.forEach(doc => list.push({ uid: doc.id, ...doc.data() }));
      const idx = list.findIndex(u => u.uid === uid);
      if (idx >= 0) userRank = idx+1;
    } catch (e) {}
    statContent.innerHTML = `
      <div class="stat-row"><span class="stat-label">Ranking</span><span class="stat-value">${userRank}</span></div>
      <div class="stat-row"><span class="stat-label">Total Poin</span><span class="stat-value">${totalScore}</span></div>
      <div class="stat-row"><span class="stat-label">Soal Terjawab</span><span class="stat-value">${totalQuestions}</span></div>
      <div class="stat-row"><span class="stat-label">Jawaban Benar</span><span class="stat-value">${totalCorrect}</span></div>
      <div class="stat-row"><span class="stat-label">Jawaban Salah</span><span class="stat-value">${totalWrong}</span></div>
      <div class="stat-row"><span class="stat-label">Rata‑rata Waktu/Soal</span><span class="stat-value">${avgTime} detik</span></div>
      <div class="stat-row"><span class="stat-label">Peluang Benar (mendatang)</span><span class="stat-value">${correctRate}%</span></div>
      <div class="stat-row"><span class="stat-label">Peluang Salah (mendatang)</span><span class="stat-value">${wrongRate}%</span></div>
    `;
  } catch (e) { statContent.innerHTML = '<p>Gagal memuat statistik.</p>'; }
}
if (closeStatModal) closeStatModal.addEventListener('click', () => { if (statModal) statModal.style.display = 'none'; });
if (statModal) window.addEventListener('click', (e) => { if (e.target === statModal) statModal.style.display = 'none'; });

// ---------- PENGACAKAN ----------
function shuffleArray(arr) {
  for (let i = arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- KONFIRMASI & MULAI KUIS ----------
async function handleQuizClick(quiz) {
  if (!currentUser) return;
  const att = await getUserAttempt(quiz.id);
  if (att) {
    // Review dari attempt tersimpan
    const questions = att.shuffledQuestions?.length ? att.shuffledQuestions : quiz.questions;
    showReviewScreen(questions, att.responses, att.score);
    return;
  }
  // Tampilkan modal konfirmasi dengan rentang
  if (!confirmModal || !quiz) return;
  pendingQuizId = quiz.id;
  confirmQuizName.textContent = quiz.title;
  confirmQuestionCount.textContent = quiz.questions.length;

  const maxScores = quiz.questions.map(q => q.maxScore || 10);
  const minScores = quiz.questions.map(q => q.minScore || 1);
  const steps = quiz.questions.map(q => q.deductionStep || 2);
  const timeLimits = quiz.questions.map(q => q.timeLimit || 30);

  const minScore = Math.min(...minScores);
  const maxScore = Math.max(...maxScores);
  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps);
  const minTime = Math.min(...timeLimits);
  const maxTime = Math.max(...timeLimits);

  let scoreRangeText = `${minScore}–${maxScore} poin`;
  let stepRangeText = (minStep === maxStep) ? `${minStep} detik` : `${minStep}–${maxStep} detik`;
  let timeRangeText = (minTime === maxTime) ? `${minTime} detik` : `${minTime}–${maxTime} detik`;

  if (confirmScoreRange) confirmScoreRange.textContent = scoreRangeText;
  if (confirmTimeRange) confirmTimeRange.textContent = timeRangeText;
  if (confirmStepRange) confirmStepRange.textContent = stepRangeText;

  confirmModal.style.display = 'flex';
}

if (startQuizConfirmBtn) {
  startQuizConfirmBtn.addEventListener('click', () => {
    if (confirmModal) confirmModal.style.display = 'none';
    if (countdownModal) countdownModal.style.display = 'flex';
    let count = 5;
    if (countdownTimerText) countdownTimerText.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (countdownTimerText) countdownTimerText.textContent = count;
      if (count <= 0) {
        clearInterval(interval);
        if (countdownModal) countdownModal.style.display = 'none';
        const quiz = sampleQuizzes.find(q => q.id === pendingQuizId);
        if (quiz) startQuiz(quiz);
      }
    }, 1000);
  });
}
if (cancelQuizConfirmBtn) {
  cancelQuizConfirmBtn.addEventListener('click', () => {
    if (confirmModal) confirmModal.style.display = 'none';
    pendingQuizId = null;
  });
}

function startQuiz(quiz) {
  const shuffledQuestions = shuffleArray([...quiz.questions]).map(q => {
    const correctText = q.options[q.answer];
    const shuffledOptions = shuffleArray([...q.options]);
    const newAnswerIndex = shuffledOptions.indexOf(correctText);
    return { ...q, options: shuffledOptions, answer: newAnswerIndex };
  });
  currentQuiz = { ...quiz, questions: shuffledQuestions, originalId: quiz.id };
  currentQuestionIndex = 0;
  userResponses = new Array(shuffledQuestions.length).fill(null);
  questionAnswered = new Array(shuffledQuestions.length).fill(false);
  showScreen('quizScreen');
  renderQuestion();
}

// ---------- TIMER ----------
function clearTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function startTimer() {
  clearTimer();
  timerSeconds = 0;
  updateTimerDisplay(timerSeconds);
  timerInterval = setInterval(() => { timerSeconds++; updateTimerDisplay(timerSeconds); }, 1000);
}
function updateTimerDisplay(sec) {
  if (!timerText) return;
  const m = Math.floor(sec/60), s = sec%60;
  timerText.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function selectAnswer(idx) {
  if (!currentQuiz || questionAnswered[currentQuestionIndex]) return;
  clearTimer();
  const timeElapsed = timerSeconds;
  userResponses[currentQuestionIndex] = { answerIndex: idx, timeElapsed };
  questionAnswered[currentQuestionIndex] = true;
  renderQuestion(true);
}

function calculateScore(question, timeElapsed) {
  if (timeElapsed >= question.timeLimit) return question.minScore;
  const step = question.deductionStep || 2;
  const steps = Math.floor(timeElapsed / step);
  const totalSteps = Math.floor(question.timeLimit / step);
  const reduction = totalSteps > 0 ? ((question.maxScore - question.minScore) / totalSteps) : 0;
  return Math.max(question.minScore, Math.round(question.maxScore - steps * reduction));
}

function prevAction() {
  if (currentQuestionIndex === 0) { goHome(); }
  else { clearTimer(); currentQuestionIndex--; renderQuestion(); }
}
function nextAction() {
  if (currentQuestionIndex < currentQuiz.questions.length-1) { clearTimer(); currentQuestionIndex++; renderQuestion(); }
}

function renderQuestion(skipTimer = false) {
  if (!currentQuiz) return;
  clearTimer();
  const qi = currentQuestionIndex;
  const q = currentQuiz.questions[qi];
  if (quizTitle) quizTitle.textContent = currentQuiz.title;
  if (questionNumber) questionNumber.textContent = `Soal ${qi+1} dari ${currentQuiz.questions.length}`;
  if (questionText) questionText.innerHTML = q.question;
  if (progressFill) progressFill.style.width = ((qi+1)/currentQuiz.questions.length*100)+'%';

  if (!questionAnswered[qi] && !skipTimer) { startTimer(); }
  else { updateTimerDisplay(userResponses[qi]?.timeElapsed || 0); }

  if (optionsContainer) {
    optionsContainer.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      if (userResponses[qi]?.answerIndex === idx) btn.classList.add('selected');
      btn.innerHTML = opt;
      btn.disabled = questionAnswered[qi];
      btn.addEventListener('click', () => { if (!questionAnswered[qi]) selectAnswer(idx); });
      optionsContainer.appendChild(btn);
    });
  }

  // Navigasi
  if (qi === 0) {
    if (prevBtn) {
      prevBtn.className = 'quiz-nav-btn-text';
      prevBtn.innerHTML = '<i class="ti ti-home"></i> Kembali';
      prevBtn.onclick = () => goHome();
      prevBtn.style.display = 'flex';
    }
  } else {
    if (prevBtn) {
      prevBtn.className = 'icon-btn quiz-nav-btn';
      prevBtn.innerHTML = '<i class="ti ti-arrow-left"></i>';
      prevBtn.onclick = prevAction;
      prevBtn.style.display = 'flex';
    }
  }

  if (qi === currentQuiz.questions.length-1) {
    if (nextBtn) nextBtn.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'block';
  } else {
    if (nextBtn) {
      nextBtn.className = 'icon-btn quiz-nav-btn';
      nextBtn.innerHTML = '<i class="ti ti-arrow-right"></i>';
      nextBtn.onclick = nextAction;
      nextBtn.style.display = 'flex';
    }
    if (submitBtn) submitBtn.style.display = 'none';
  }
}

// Submit
if (submitBtn) {
  submitBtn.addEventListener('click', async () => {
    if (!currentQuiz) return;
    clearTimer();
    const responses = [...userResponses];
    let totalScore = 0;
    currentQuiz.questions.forEach((q,i) => {
      const resp = responses[i];
      if (resp && resp.answerIndex === q.answer) totalScore += calculateScore(q, resp.timeElapsed);
    });
    await saveAttempt(currentQuiz.originalId || currentQuiz.id, responses, totalScore, currentQuiz.questions);
    showReviewScreen(currentQuiz.questions, responses, totalScore);
    loadLeaderboard();
  });
}

function showReviewScreen(questions, responses, score) {
  if (!resultScore || !reviewContainer) return;
  resultScore.textContent = `${score} poin`;
  let html = '';
  questions.forEach((q,i) => {
    const resp = responses[i];
    const ok = resp && resp.answerIndex === q.answer;
    const userAns = resp ? q.options[resp.answerIndex] : 'Tidak dijawab';
    const timeInfo = resp ? `${resp.timeElapsed} detik` : '—';
    const scoreInfo = resp ? (ok ? `Skor: ${calculateScore(q, resp.timeElapsed)}` : 'Skor: 0') : 'Skor: 0';
    html += `
      <div class="review-item">
        <p><strong>Soal ${i+1}:</strong> ${q.question} ${ok?'<i class="ti ti-check correct"></i>':'<i class="ti ti-x wrong"></i>'}</p>
        <p>Jawaban kamu: <span class="${ok?'correct':'wrong'}">${userAns}</span> <span style="color:var(--subtext1);font-size:0.8rem;">(${timeInfo})</span></p>
        ${!ok ? `<p>Jawaban benar: <span class="correct">${q.options[q.answer]}</span></p>` : ''}
        <p style="font-style:italic;">📘 ${q.explanation}</p>
        <p style="font-weight:600;">${scoreInfo}</p>
      </div>
    `;
  });
  reviewContainer.innerHTML = html;
  showScreen('resultScreen');
}

if (backToHomeBtn) {
  backToHomeBtn.addEventListener('click', () => {
    showScreen('dashboardScreen');
    loadLeaderboard();
    window.location.hash = '';
  });
}

// Inisialisasi auto-detect
function initApp() {
  sampleQuizzes = window.IRMA_QUIZZES || [];
  if (!sampleQuizzes.length) { setTimeout(initApp,300); return; }
  if (currentUser) { loadQuizzes(); loadLeaderboard(); checkHash(); }
}
if (window.IRMA_QUIZZES?.length) initApp();
else window.addEventListener('quizzesLoaded', initApp);
