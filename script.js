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

let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let sampleQuizzes = [];

// Helper: ambil elemen
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

$('currentYear').textContent = new Date().getFullYear();

// Layar
function showScreen(id) {
  ['loginScreen','dashboardScreen','quizScreen','resultScreen'].forEach(s => $(s).classList.remove('active'));
  const el = $(id); if (el) el.classList.add('active');
  if (mainNavbar) mainNavbar.style.display = (id === 'loginScreen') ? 'none' : 'flex';
}

// Autentikasi
googleLoginBtn.addEventListener('click', () => {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert('Login gagal: ' + e.message));
});
logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
    profileName.textContent = user.displayName || 'Peserta';
    if (user.photoURL) { navAvatar.src = user.photoURL; navAvatar.style.display = 'inline-block'; }
    else { navAvatar.style.display = 'none'; }
    showScreen('dashboardScreen');
    renderSkeletonQuizzes(); renderSkeletonLeaderboard();
    loadQuizzes(); loadLeaderboard(); checkHash();
  } else {
    currentUser = null;
    showScreen('loginScreen');
    profileDropdown.style.display = 'none';
    hamburgerDropdown.style.display = 'none';
    if (hamburgerBtn) hamburgerBtn.classList.remove('open');
  }
});

// Dropdown & hamburger
profileTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  profileDropdown.style.display = profileDropdown.style.display === 'flex' ? 'none' : 'flex';
  hamburgerDropdown.style.display = 'none';
  if (hamburgerBtn) hamburgerBtn.classList.remove('open');
});
hamburgerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = hamburgerDropdown.style.display === 'flex';
  hamburgerDropdown.style.display = isOpen ? 'none' : 'flex';
  hamburgerBtn.classList.toggle('open', !isOpen);
  profileDropdown.style.display = 'none';
});
document.addEventListener('click', () => {
  profileDropdown.style.display = 'none';
  hamburgerDropdown.style.display = 'none';
  if (hamburgerBtn) hamburgerBtn.classList.remove('open');
});

function goHome() {
  showScreen('dashboardScreen');
  window.location.hash = '';
  if (hamburgerDropdown) hamburgerDropdown.style.display = 'none';
  if (hamburgerBtn) hamburgerBtn.classList.remove('open');
}
navHomeDesktop.addEventListener('click', goHome);
navHomeMobile.addEventListener('click', goHome);

// Hash routing
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

// Skeleton
function renderSkeletonQuizzes() {
  quizContainer.innerHTML = '';
  for (let i=0;i<6;i++) {
    const c = document.createElement('div');
    c.className = 'quiz-card skeleton';
    c.innerHTML = '<div class="skeleton-title"></div><div class="skeleton-meta"></div><div class="skeleton-badges"></div>';
    quizContainer.appendChild(c);
  }
}
function renderSkeletonLeaderboard() {
  leaderboardList.innerHTML = '';
  leaderboardEmpty.style.display = 'none';
  for (let i=0;i<5;i++) {
    const li = document.createElement('li');
    li.innerHTML = '<div class="skeleton-leaderboard"></div>';
    leaderboardList.appendChild(li);
  }
}

// Render quiz list dengan deskripsi
function renderQuizzes(quizzes) {
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
searchInput.addEventListener('input', e => loadQuizzes(e.target.value));

// Firestore + localStorage
const ATTEMPTS_KEY = 'irmaQuizAttempts_local';
const LEADERBOARD_KEY = 'irmaQuizLeaderboard_local';

function getLocalAttempts() {
  return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
}
function saveLocalAttempt(qid, ans, score) {
  const a = getLocalAttempts();
  if (!a[currentUser.email]) a[currentUser.email] = {};
  a[currentUser.email][qid] = { answers: ans, score, date: new Date().toISOString() };
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(a));
}
function getLocalLeaderboard() {
  return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
}
function safeNum(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}
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
      return data;
    }
    return null;
  } catch (e) {
    const l = getLocalAttempts();
    const a = l[currentUser.email]?.[qid];
    if (a) a.score = safeNum(a.score);
    return a || null;
  }
}
async function saveAttempt(qid, ans, score) {
  try {
    await db.collection('attempts').doc(`${currentUser.uid}_${qid}`).set({
      uid: currentUser.uid,
      email: currentUser.email,
      quizId: qid,
      answers: ans,
      score,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
    await addToLeaderboard(score);
  } catch (e) {
    saveLocalAttempt(qid, ans, score);
    addToLocalLeaderboard(score);
  }
}
async function addToLeaderboard(score) {
  const displayName = cleanName(currentUser?.displayName || '');
  try {
    const ref = db.collection('leaderboard').doc(currentUser.uid);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.update({
        totalScore: firebase.firestore.FieldValue.increment(score)
      });
    } else {
      await ref.set({
        uid: currentUser.uid,
        name: displayName,
        totalScore: score
      });
    }
  } catch (e) {
    throw e;
  }
}

// Leaderboard: kumpulkan semua data ke array, lalu render
async function loadLeaderboard() {
  try {
    const snapshot = await db.collection('leaderboard')
      .orderBy('totalScore', 'desc')
      .limit(20)
      .get();

    const leaderboardArray = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      leaderboardArray.push({
        name: cleanName(data.name),
        score: safeNum(data.totalScore)
      });
    });

    renderLeaderboardArray(leaderboardArray);
  } catch (e) {
    console.warn('Gagal memuat leaderboard Firestore, gunakan lokal:', e);
    const local = getLocalLeaderboard();
    const cleaned = local.map(u => ({
      name: cleanName(u.name),
      score: safeNum(u.totalScore)
    }));
    cleaned.sort((a, b) => b.score - a.score);
    renderLeaderboardArray(cleaned);
  }
}

function renderLeaderboardArray(arr) {
  leaderboardList.innerHTML = '';
  if (!arr.length) {
    leaderboardEmpty.style.display = 'block';
    return;
  }
  leaderboardEmpty.style.display = 'none';
  arr.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span><i class="ti ti-medal"></i> ${i + 1}. ${item.name}</span> <strong>${item.score} poin</strong>`;
    leaderboardList.appendChild(li);
  });
}

// Quiz engine
async function handleQuizClick(quiz) {
  if (!currentUser) return;
  const att = await getUserAttempt(quiz.id);
  att ? showReviewScreen(quiz, att.answers, att.score) : startQuiz(quiz);
}

function startQuiz(quiz) {
  currentQuiz = quiz;
  currentQuestionIndex = 0;
  userAnswers = new Array(quiz.questions.length).fill(null);
  showScreen('quizScreen');
  renderQuestion();
}

function prevAction() {
  if (currentQuestionIndex === 0) {
    goHome();
  } else {
    currentQuestionIndex--;
    renderQuestion();
  }
}
function nextAction() {
  if (currentQuestionIndex < currentQuiz.questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  }
}

function renderQuestion() {
  if (!currentQuiz) return;
  const q = currentQuiz.questions[currentQuestionIndex];
  quizTitle.textContent = currentQuiz.title;
  questionNumber.textContent = `Soal ${currentQuestionIndex + 1} dari ${currentQuiz.questions.length}`;
  questionText.innerHTML = q.question;
  progressFill.style.width = ((currentQuestionIndex + 1) / currentQuiz.questions.length * 100) + '%';

  optionsContainer.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    if (userAnswers[currentQuestionIndex] === idx) btn.classList.add('selected');
    btn.innerHTML = opt;
    btn.addEventListener('click', () => {
      userAnswers[currentQuestionIndex] = idx;
      renderQuestion();
    });
    optionsContainer.appendChild(btn);
  });

  // Tombol navigasi
  prevBtn.onclick = prevAction;
  prevBtn.style.display = 'flex';
  if (currentQuestionIndex === currentQuiz.questions.length - 1) {
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'block';
  } else {
    nextBtn.onclick = nextAction;
    nextBtn.style.display = 'flex';
    submitBtn.style.display = 'none';
  }
}

submitBtn.addEventListener('click', async () => {
  if (!currentQuiz) return;
  let score = 0;
  currentQuiz.questions.forEach((q, i) => {
    if (userAnswers[i] === q.answer) score++;
  });
  await saveAttempt(currentQuiz.id, [...userAnswers], score);
  showReviewScreen(currentQuiz, userAnswers, score);
  loadLeaderboard();
});

function showReviewScreen(quiz, answers, score) {
  currentQuiz = quiz;
  resultScore.textContent = `${score} / ${quiz.questions.length}`;
  let html = '';
  quiz.questions.forEach((q, i) => {
    const ua = answers[i];
    const ok = ua === q.answer;
    html += `<div class="review-item">
      <p><strong>Soal ${i + 1}:</strong> ${q.question} ${ok ? '<i class="ti ti-check correct"></i>' : '<i class="ti ti-x wrong"></i>'}</p>
      <p>Jawaban kamu: <span class="${ok ? 'correct' : 'wrong'}">${ua != null ? q.options[ua] : 'Tidak dijawab'}</span></p>
      ${!ok ? `<p>Jawaban benar: <span class="correct">${q.options[q.answer]}</span></p>` : ''}
      <p style="font-style:italic; margin-top:6px;">📘 ${q.explanation}</p>
    </div>`;
  });
  reviewContainer.innerHTML = html;
  showScreen('resultScreen');
}

backToHomeBtn.addEventListener('click', () => {
  showScreen('dashboardScreen');
  loadLeaderboard();
  window.location.hash = '';
});

// Inisialisasi (auto-detect quizzes)
function initApp() {
  sampleQuizzes = window.IRMA_QUIZZES || [];
  if (!sampleQuizzes.length) {
    setTimeout(initApp, 300);
    return;
  }
  if (currentUser) {
    loadQuizzes();
    loadLeaderboard();
    checkHash();
  }
}
if (window.IRMA_QUIZZES?.length) initApp();
else window.addEventListener('quizzesLoaded', initApp);
