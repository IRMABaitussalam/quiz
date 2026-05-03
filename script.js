// Konfigurasi Firebase (ganti dengan punya Anda)
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

// Gabungan data kuis
const sampleQuizzes = [quizFiqih, quizAqidah, quizSejarah];

// State
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];

// Element caching
const mainNavbar = document.getElementById('mainNavbar');
const profileTrigger = document.getElementById('profileTrigger');
const profileDropdown = document.getElementById('profileDropdown');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const hamburgerDropdown = document.getElementById('hamburgerDropdown');
const navAvatar = document.getElementById('navAvatar');
const profileName = document.getElementById('profileName');
const logoutBtn = document.getElementById('logoutBtnFromDropdown');
const navHomeDesktop = document.getElementById('navHomeDesktop');
const navHomeMobile = document.getElementById('navHomeMobile');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const searchInput = document.getElementById('searchInput');
const quizContainer = document.getElementById('quizContainer');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardEmpty = document.getElementById('leaderboardEmpty');
const quizTitle = document.getElementById('quizTitle');
const progressFill = document.getElementById('progressFill');
const questionNumber = document.getElementById('questionNumber');
const questionText = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const prevBtn = document.getElementById('prevQuestionBtn');
const nextBtn = document.getElementById('nextQuestionBtn');
const submitBtn = document.getElementById('submitQuizBtn');
const resultScore = document.getElementById('resultScore');
const reviewContainer = document.getElementById('reviewContainer');
const backToHomeBtn = document.getElementById('backToHomeBtn');

document.getElementById('currentYear').textContent = new Date().getFullYear();

// ==================== SCREEN ====================
function showScreen(id) {
  ['loginScreen','dashboardScreen','contactScreen','quizScreen','resultScreen'].forEach(s => {
    document.getElementById(s).classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  mainNavbar.style.display = (id === 'loginScreen') ? 'none' : 'flex';
}

// ==================== AUTH ====================
googleLoginBtn.addEventListener('click', () => {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
});
logoutBtn.addEventListener('click', () => auth.signOut());

const redirect = sessionStorage.redirect;
delete sessionStorage.redirect;
if (redirect && redirect !== '/') {
  history.replaceState(null, null, redirect);
}

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL };
    profileName.textContent = user.displayName || 'Peserta';
    if (user.photoURL) {
      navAvatar.src = user.photoURL;
      navAvatar.style.display = 'inline-block';
    } else {
      navAvatar.style.display = 'none';
    }
    showScreen('dashboardScreen');
    renderSkeletonQuizzes();
    renderSkeletonLeaderboard();
    loadQuizzes();
    loadLeaderboard();
    handlePath(); // proses URL non-hash
  } else {
    currentUser = null;
    showScreen('loginScreen');
    profileDropdown.style.display = 'none';
    hamburgerDropdown.style.display = 'none';
    hamburgerBtn.classList.remove('open');
  }
});

// ==================== DROPDOWN & HAMBURGER ====================
profileTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = profileDropdown.style.display === 'flex';
  profileDropdown.style.display = isOpen ? 'none' : 'flex';
  hamburgerDropdown.style.display = 'none';
  hamburgerBtn.classList.remove('open');
});
hamburgerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = hamburgerDropdown.style.display === 'flex';
  if (isOpen) {
    hamburgerDropdown.style.display = 'none';
    hamburgerBtn.classList.remove('open');
  } else {
    hamburgerDropdown.style.display = 'flex';
    hamburgerBtn.classList.add('open');
    profileDropdown.style.display = 'none';
  }
});
document.addEventListener('click', () => {
  profileDropdown.style.display = 'none';
  hamburgerDropdown.style.display = 'none';
  hamburgerBtn.classList.remove('open');
});

// ==================== NAVIGASI ====================
function goToDashboard() {
  showScreen('dashboardScreen');
  hamburgerDropdown.style.display = 'none';
  hamburgerBtn.classList.remove('open');
  history.pushState(null, null, '/');
}
navHomeDesktop.addEventListener('click', goToDashboard);
navHomeMobile.addEventListener('click', goToDashboard);

// ==================== ROUTING TANPA HASH ====================
function slugify(text) {
  return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}
function handlePath() {
  const path = window.location.pathname;
  const quizMatch = path.match(/^\/quiz\/(.+)/);
  if (quizMatch) {
    const slug = quizMatch[1];
    const quiz = sampleQuizzes.find(q => slugify(q.title) === slug);
    if (quiz && currentUser) {
      handleQuizClick(quiz);
    } else {
      // jika tidak ditemukan, kembali ke dashboard
      history.replaceState(null, null, '/');
      showScreen('dashboardScreen');
    }
  }
}
window.addEventListener('popstate', handlePath);

// Saat kartu kuis diklik
function navigateToQuiz(quiz) {
  const url = '/quiz/' + slugify(quiz.title);
  history.pushState(null, null, url);
  handleQuizClick(quiz);
}

// ==================== SKELETON ====================
function renderSkeletonQuizzes() {
  quizContainer.innerHTML = '';
  for (let i=0;i<6;i++) {
    const c = document.createElement('div');
    c.className = 'quiz-card skeleton';
    c.innerHTML = `<div class="skeleton-title"></div><div class="skeleton-meta"></div><div class="skeleton-badges"></div>`;
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

// ==================== QUIZ LIST ====================
function renderQuizzes(quizzes) {
  quizContainer.innerHTML = '';
  if (!quizzes.length) {
    quizContainer.innerHTML = '<p class="empty-message">Belum ada kuis</p>';
    return;
  }
  quizzes.forEach(q => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `<h3>${q.title}</h3><div class="date"><i class="ti ti-calendar"></i> ${new Date(q.date).toLocaleDateString('id')}</div><span class="badge">${q.questions.length} soal</span><span class="badge">${q.category}</span>`;
    card.addEventListener('click', () => navigateToQuiz(q));
    quizContainer.appendChild(card);
  });
}
function loadQuizzes(filter='') {
  let list = sampleQuizzes;
  if (filter.trim()) {
    const kw = filter.trim().toLowerCase();
    list = sampleQuizzes.filter(q => q.title.toLowerCase().includes(kw) || q.category.toLowerCase().includes(kw));
  }
  renderQuizzes(list);
}
searchInput.addEventListener('input', e => loadQuizzes(e.target.value));

// ==================== FIRESTORE + LOCAL FALLBACK ====================
const ATTEMPTS_KEY = 'irmaQuizAttempts_local';
const LEADERBOARD_KEY = 'irmaQuizLeaderboard_local';

function localAttempts() { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}'); }
function saveLocalAttempt(quizId, answers, score) {
  const att = localAttempts();
  if (!att[currentUser.email]) att[currentUser.email] = {};
  att[currentUser.email][quizId] = { answers, score, date: new Date().toISOString() };
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(att));
}
function localLeaderboard() { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]'); }
function safeNum(val) { const n = parseInt(val, 10); return isNaN(n) ? 0 : n; }
function addToLocalLeaderboard(score) {
  const lb = localLeaderboard();
  const existing = lb.find(e => e.email === currentUser.email);
  if (existing) {
    existing.totalScore = safeNum(existing.totalScore) + score;
  } else {
    lb.push({ email: currentUser.email, name: currentUser.displayName, totalScore: score });
  }
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb));
}

async function getUserAttempt(quizId) {
  try {
    const ref = db.collection('attempts').doc(`${currentUser.uid}_${quizId}`);
    const doc = await ref.get();
    return doc.exists ? doc.data() : null;
  } catch (e) {
    const local = localAttempts();
    return local[currentUser.email]?.[quizId] || null;
  }
}
async function saveAttempt(quizId, answers, score) {
  try {
    const ref = db.collection('attempts').doc(`${currentUser.uid}_${quizId}`);
    await ref.set({ uid:currentUser.uid, email:currentUser.email, quizId, answers, score, date: firebase.firestore.FieldValue.serverTimestamp() });
    await addToLeaderboard(score);
  } catch {
    saveLocalAttempt(quizId, answers, score);
    addToLocalLeaderboard(score);
  }
}
async function addToLeaderboard(score) {
  try {
    const ref = db.collection('leaderboard').doc(currentUser.uid);
    const doc = await ref.get();
    if (doc.exists) {
      await ref.update({ totalScore: firebase.firestore.FieldValue.increment(score) });
    } else {
      await ref.set({ uid:currentUser.uid, name:currentUser.displayName, totalScore: score });
    }
  } catch (e) { throw e; }
}
async function loadLeaderboard() {
  try {
    const snap = await db.collection('leaderboard').orderBy('totalScore','desc').limit(20).get();
    leaderboardList.innerHTML = '';
    if (snap.empty) { leaderboardEmpty.style.display='block'; return; }
    leaderboardEmpty.style.display='none';
    snap.forEach((doc,i) => {
      const data = doc.data();
      const score = safeNum(data.totalScore);
      const li = document.createElement('li');
      li.innerHTML = `<span><i class="ti ti-medal"></i> ${i+1}. ${data.name}</span> <strong>${score} poin</strong>`;
      leaderboardList.appendChild(li);
    });
  } catch {
    const local = localLeaderboard();
    leaderboardList.innerHTML = '';
    if (!local.length) { leaderboardEmpty.style.display='block'; return; }
    leaderboardEmpty.style.display='none';
    local.sort((a,b) => safeNum(b.totalScore) - safeNum(a.totalScore));
    local.forEach((u,i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span><i class="ti ti-medal"></i> ${i+1}. ${u.name}</span> <strong>${safeNum(u.totalScore)} poin</strong>`;
      leaderboardList.appendChild(li);
    });
  }
}

// ==================== QUIZ ENGINE ====================
async function handleQuizClick(quiz) {
  if (!currentUser) return;
  const attempt = await getUserAttempt(quiz.id);
  if (attempt) {
    showReviewScreen(quiz, attempt.answers, attempt.score);
  } else {
    startQuiz(quiz);
  }
}
function startQuiz(quiz) {
  currentQuiz = quiz;
  currentQuestionIndex = 0;
  userAnswers = new Array(quiz.questions.length).fill(null);
  showScreen('quizScreen');
  renderQuestion();
}
function renderQuestion() {
  if (!currentQuiz) return;
  const q = currentQuiz.questions[currentQuestionIndex];
  quizTitle.textContent = currentQuiz.title;
  questionNumber.textContent = `Soal ${currentQuestionIndex+1} dari ${currentQuiz.questions.length}`;
  questionText.innerHTML = q.question;
  progressFill.style.width = ((currentQuestionIndex+1)/currentQuiz.questions.length*100)+'%';
  optionsContainer.innerHTML = '';
  q.options.forEach((opt,idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    if (userAnswers[currentQuestionIndex] === idx) btn.classList.add('selected');
    btn.innerHTML = opt;
    btn.addEventListener('click', () => { userAnswers[currentQuestionIndex]=idx; renderQuestion(); });
    optionsContainer.appendChild(btn);
  });
  prevBtn.style.display = currentQuestionIndex===0 ? 'none' : 'inline-flex';
  if (currentQuestionIndex === currentQuiz.questions.length-1) {
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'block';
  } else {
    nextBtn.style.display = 'inline-flex';
    submitBtn.style.display = 'none';
  }
}
prevBtn.addEventListener('click', ()=>{ if(currentQuestionIndex>0){ currentQuestionIndex--; renderQuestion(); } });
nextBtn.addEventListener('click', ()=>{ if(currentQuestionIndex<currentQuiz.questions.length-1){ currentQuestionIndex++; renderQuestion(); } });
submitBtn.addEventListener('click', async () => {
  if (!currentQuiz) return;
  let score = 0;
  currentQuiz.questions.forEach((q,i) => { if(userAnswers[i]===q.answer) score++; });
  await saveAttempt(currentQuiz.id, [...userAnswers], score);
  showReviewScreen(currentQuiz, userAnswers, score);
  loadLeaderboard();
});
function showReviewScreen(quiz, answers, score) {
  currentQuiz = quiz;
  resultScore.textContent = `${score} / ${quiz.questions.length}`;
  let html = '';
  quiz.questions.forEach((q,i) => {
    const userAns = answers[i];
    const correct = userAns === q.answer;
    html += `<div class="review-item">
      <p><strong>Soal ${i+1}:</strong> ${q.question} ${correct ? '<i class="ti ti-check correct"></i>' : '<i class="ti ti-x wrong"></i>'}</p>
      <p>Jawaban kamu: <span class="${correct?'correct':'wrong'}">${userAns!=null ? q.options[userAns] : 'Tidak dijawab'}</span></p>
      ${!correct ? `<p>Jawaban benar: <span class="correct">${q.options[q.answer]}</span></p>` : ''}
      <p style="font-style:italic;margin-top:6px;">📘 ${q.explanation}</p>
    </div>`;
  });
  reviewContainer.innerHTML = html;
  showScreen('resultScreen');
}
backToHomeBtn.addEventListener('click', () => {
  showScreen('dashboardScreen');
  loadLeaderboard();
  history.pushState(null, null, '/');
});
