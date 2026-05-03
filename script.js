// script.js
// ==================== KONFIGURASI FIREBASE ====================
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

// Gabungkan data kuis
const sampleQuizzes = [quizFiqih, quizAqidah, quizSejarah];

// ==================== GLOBAL STATE ====================
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];

// ==================== UI ELEMENTS ====================
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

// ==================== SCREEN MANAGEMENT ====================
function showScreen(id) {
  ['loginScreen','dashboardScreen','contactScreen','quizScreen','resultScreen'].forEach(s => {
    document.getElementById(s).classList.remove('active');
  });
  document.getElementById(id).classList.add('active');
  mainNavbar.style.display = (id === 'loginScreen') ? 'none' : 'flex';
}

// ==================== AUTH ====================
googleLoginBtn.addEventListener('click', () => {
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert('Login gagal: ' + e.message));
});
logoutBtn.addEventListener('click', () => auth.signOut());

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
    handleHashChange(); // jika ada hash kuis, langsung buka
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

// ==================== NAVIGATION ====================
function goToDashboard() {
  showScreen('dashboardScreen');
  hamburgerDropdown.style.display = 'none';
  hamburgerBtn.classList.remove('open');
  window.location.hash = '';
}
navHomeDesktop.addEventListener('click', goToDashboard);
navHomeMobile.addEventListener('click', goToDashboard);

// ==================== ROUTING HASH ====================
function slugify(text) {
  return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
}
function handleHashChange() {
  const hash = window.location.hash;
  if (hash.startsWith('#/quiz/')) {
    const slug = hash.replace('#/quiz/', '');
    const quiz = sampleQuizzes.find(q => slugify(q.title) === slug);
    if (quiz && currentUser) {
      handleQuizClick(quiz);
    }
  }
}
window.addEventListener('hashchange', handleHashChange);

// ==================== SKELETON ====================
function renderSkeletonQuizzes() {
  quizContainer.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const card = document.createElement('div');
    card.className = 'quiz-card skeleton';
    card.innerHTML = `<div class="skeleton-title"></div><div class="skeleton-meta"></div><div class="skeleton-badges"></div>`;
    quizContainer.appendChild(card);
  }
}
function renderSkeletonLeaderboard() {
  leaderboardList.innerHTML = '';
  leaderboardEmpty.style.display = 'none';
  for (let i = 0; i < 5; i++) {
    const li = document.createElement('li');
    li.innerHTML = '<div class="skeleton-leaderboard"></div>';
    leaderboardList.appendChild(li);
  }
}

// ==================== QUIZ LIST & SEARCH ====================
function renderQuizzes(quizzes) {
  quizContainer.innerHTML = '';
  if (quizzes.length === 0) {
    quizContainer.innerHTML = '<p class="empty-message" style="grid-column:1/-1;">Belum ada kuis</p>';
    return;
  }
  quizzes.forEach(q => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <h3>${q.title}</h3>
      <div class="date"><i class="ti ti-calendar"></i> ${new Date(q.date).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div>
      <span class="badge">${q.questions.length} soal</span>
      <span class="badge">${q.category}</span>
    `;
    card.addEventListener('click', () => {
      // update hash
      window.location.hash = '#/quiz/' + slugify(q.title);
      handleQuizClick(q);
    });
    quizContainer.appendChild(card);
  });
}
function loadQuizzes(filter = '') {
  let list = sampleQuizzes;
  if (filter.trim()) {
    const kw = filter.trim().toLowerCase();
    list = sampleQuizzes.filter(q => q.title.toLowerCase().includes(kw) || q.category.toLowerCase().includes(kw));
  }
  renderQuizzes(list);
}
searchInput.addEventListener('input', e => loadQuizzes(e.target.value));

// ==================== FIRESTORE + FALLBACK ====================
const ATTEMPTS_KEY = 'irmaQuizAttempts_local';
const LEADERBOARD_KEY = 'irmaQuizLeaderboard_local';

function getLocalAttempts() {
  const raw = localStorage.getItem(ATTEMPTS_KEY);
  return raw ? JSON.parse(raw) : {};
}
function saveLocalAttempt(quizId, answers, score) {
  const attempts = getLocalAttempts();
  if (!attempts[currentUser.email]) attempts[currentUser.email] = {};
  attempts[currentUser.email][quizId] = { answers, score, date: new Date().toISOString() };
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}
function getLocalLeaderboard() {
  const raw = localStorage.getItem(LEADERBOARD_KEY);
  return raw ? JSON.parse(raw) : [];
}
function safeNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}
function addToLocalLeaderboard(score) {
  const leaderboard = getLocalLeaderboard();
  const existing = leaderboard.find(e => e.email === currentUser.email);
  if (existing) {
    existing.totalScore = safeNumber(existing.totalScore) + score;
  } else {
    leaderboard.push({ email: currentUser.email, name: currentUser.displayName, totalScore: score });
  }
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

async function getUserAttempt(quizId) {
  try {
    const docRef = db.collection('attempts').doc(`${currentUser.uid}_${quizId}`);
    const doc = await docRef.get();
    return doc.exists ? doc.data() : null;
  } catch (error) {
    console.warn('Firestore fallback', error);
    const local = getLocalAttempts();
    return local[currentUser.email]?.[quizId] || null;
  }
}

async function saveAttempt(quizId, answers, score) {
  try {
    const docRef = db.collection('attempts').doc(`${currentUser.uid}_${quizId}`);
    await docRef.set({
      uid: currentUser.uid,
      email: currentUser.email,
      quizId,
      answers,
      score,
      date: firebase.firestore.FieldValue.serverTimestamp()
    });
    await addToLeaderboard(score);
  } catch (error) {
    console.warn('Simpan lokal', error);
    saveLocalAttempt(quizId, answers, score);
    addToLocalLeaderboard(score);
  }
}

async function addToLeaderboard(score) {
  try {
    const leaderDocRef = db.collection('leaderboard').doc(currentUser.uid);
    const doc = await leaderDocRef.get();
    if (doc.exists) {
      await leaderDocRef.update({
        totalScore: firebase.firestore.FieldValue.increment(score)
      });
    } else {
      await leaderDocRef.set({
        uid: currentUser.uid,
        name: currentUser.displayName,
        totalScore: score
      });
    }
  } catch (error) {
    throw error;
  }
}

async function loadLeaderboard() {
  try {
    const snapshot = await db.collection('leaderboard').orderBy('totalScore','desc').limit(20).get();
    leaderboardList.innerHTML = '';
    if (snapshot.empty) {
      leaderboardEmpty.style.display = 'block';
      return;
    }
    leaderboardEmpty.style.display = 'none';
    snapshot.forEach((doc, i) => {
      const data = doc.data();
      const score = safeNumber(data.totalScore);
      const li = document.createElement('li');
      li.innerHTML = `<span><i class="ti ti-medal"></i> ${i+1}. ${data.name}</span> <strong>${score} poin</strong>`;
      leaderboardList.appendChild(li);
    });
  } catch (error) {
    console.warn('Leaderboard lokal', error);
    const local = getLocalLeaderboard();
    leaderboardList.innerHTML = '';
    if (local.length === 0) {
      leaderboardEmpty.style.display = 'block';
      return;
    }
    leaderboardEmpty.style.display = 'none';
    local.sort((a,b) => safeNumber(b.totalScore) - safeNumber(a.totalScore));
    local.forEach((u,i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span><i class="ti ti-medal"></i> ${i+1}. ${u.name}</span> <strong>${safeNumber(u.totalScore)} poin</strong>`;
      leaderboardList.appendChild(li);
    });
  }
}

// ==================== HANDLE QUIZ ====================
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
  prevBtn.style.display = currentQuestionIndex === 0 ? 'none' : 'inline-flex';
  if (currentQuestionIndex === currentQuiz.questions.length - 1) {
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'block';
  } else {
    nextBtn.style.display = 'inline-flex';
    submitBtn.style.display = 'none';
  }
}

prevBtn.addEventListener('click', () => { if(currentQuestionIndex>0){ currentQuestionIndex--; renderQuestion(); } });
nextBtn.addEventListener('click', () => { if(currentQuestionIndex<currentQuiz.questions.length-1){ currentQuestionIndex++; renderQuestion(); } });

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
    const isCorrect = userAns === q.answer;
    const statusIcon = isCorrect ? '<i class="ti ti-check correct"></i>' : '<i class="ti ti-x wrong"></i>';
    html += `
      <div class="review-item">
        <p><strong>Soal ${i+1}:</strong> ${q.question} ${statusIcon}</p>
        <p>Jawaban kamu: <span class="${isCorrect ? 'correct' : 'wrong'}">${userAns!=null ? q.options[userAns] : 'Tidak dijawab'}</span></p>
        ${!isCorrect ? `<p>Jawaban benar: <span class="correct">${q.options[q.answer]}</span></p>` : ''}
        <p style="font-style:italic; margin-top:6px;">📘 ${q.explanation}</p>
      </div>
    `;
  });
  reviewContainer.innerHTML = html;
  showScreen('resultScreen');
}

backToHomeBtn.addEventListener('click', () => {
  showScreen('dashboardScreen');
  loadLeaderboard();
  window.location.hash = '';
});
