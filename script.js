// Konfigurasi Firebase – GANTI DENGAN PUNYAMU
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

// ==================== STATE ====================
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = [];
let sampleQuizzes = [];

// ==================== DOM ====================
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

// ==================== SCREEN ====================
function showScreen(id) {
  ['loginScreen','dashboardScreen','quizScreen','resultScreen'].forEach(s => $(s).classList.remove('active'));
  const el = $(id); if (el) el.classList.add('active');
  if (mainNavbar) mainNavbar.style.display = (id === 'loginScreen') ? 'none' : 'flex';
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

// ==================== DROPDOWN & HAMBURGER ====================
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

// ==================== NAVIGATION ====================
function goHome() { showScreen('dashboardScreen'); window.location.hash = ''; hamburgerDropdown.style.display='none'; if(hamburgerBtn) hamburgerBtn.classList.remove('open'); }
navHomeDesktop.addEventListener('click', goHome);
navHomeMobile.addEventListener('click', goHome);

// ==================== HASH ROUTING ====================
function slugify(text) { return text.toLowerCase().replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/^-+|-+$/g,''); }
function checkHash() {
  const hash = window.location.hash.replace('#/','');
  if (hash && sampleQuizzes.length) {
    const quiz = sampleQuizzes.find(q => slugify(q.title) === hash);
    if (quiz && currentUser) handleQuizClick(quiz);
  }
}
window.addEventListener('hashchange', checkHash);
function navigateToQuiz(quiz) { window.location.hash = '#/' + slugify(quiz.title); }

// ==================== SKELETON ====================
function renderSkeletonQuizzes() {
  quizContainer.innerHTML = '';
  for (let i=0;i<6;i++) { const c=document.createElement('div'); c.className='quiz-card skeleton'; c.innerHTML='<div class="skeleton-title"></div><div class="skeleton-meta"></div><div class="skeleton-badges"></div>'; quizContainer.appendChild(c); }
}
function renderSkeletonLeaderboard() {
  leaderboardList.innerHTML = ''; leaderboardEmpty.style.display='none';
  for (let i=0;i<5;i++) { const li=document.createElement('li'); li.innerHTML='<div class="skeleton-leaderboard"></div>'; leaderboardList.appendChild(li); }
}

// ==================== QUIZ LIST ====================
function renderQuizzes(quizzes) {
  quizContainer.innerHTML = '';
  if (!quizzes.length) { quizContainer.innerHTML='<p class="empty-message">Belum ada kuis</p>'; return; }
  quizzes.forEach(q => {
    const card = document.createElement('div'); card.className='quiz-card';
    card.innerHTML = `<h3>${q.title}</h3><div class="date"><i class="ti ti-calendar"></i> ${new Date(q.date).toLocaleDateString('id-ID',{year:'numeric',month:'long',day:'numeric'})}</div><span class="badge">${q.questions.length} soal</span><span class="badge">${q.category}</span>`;
    card.addEventListener('click', () => navigateToQuiz(q));
    quizContainer.appendChild(card);
  });
}
function loadQuizzes(filter='') {
  let list = sampleQuizzes;
  if (filter.trim()) { const kw=filter.trim().toLowerCase(); list=sampleQuizzes.filter(q=>q.title.toLowerCase().includes(kw)||q.category.toLowerCase().includes(kw)); }
  renderQuizzes(list);
}
searchInput.addEventListener('input', e => loadQuizzes(e.target.value));

// ==================== FIRESTORE + LOCAL FALLBACK ====================
const ATTEMPTS_KEY='irmaQuizAttempts_local', LEADERBOARD_KEY='irmaQuizLeaderboard_local';
function getLocalAttempts() { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)||'{}'); }
function saveLocalAttempt(qid,ans,score) { const a=getLocalAttempts(); if(!a[currentUser.email]) a[currentUser.email]={}; a[currentUser.email][qid]={answers:ans,score,date:new Date().toISOString()}; localStorage.setItem(ATTEMPTS_KEY,JSON.stringify(a)); }
function getLocalLeaderboard() { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)||'[]'); }
function safeNum(v) { const n=parseInt(v,10); return isNaN(n)?0:n; }
function addToLocalLeaderboard(score) {
  const lb=getLocalLeaderboard(); const ex=lb.find(e=>e.email===currentUser.email);
  if(ex) ex.totalScore=safeNum(ex.totalScore)+score; else lb.push({email:currentUser.email,name:currentUser.displayName,totalScore:score});
  localStorage.setItem(LEADERBOARD_KEY,JSON.stringify(lb));
}

async function getUserAttempt(qid) {
  try { const d=await db.collection('attempts').doc(`${currentUser.uid}_${qid}`).get(); if(d.exists){const data=d.data();data.score=safeNum(data.score);return data;} return null; }
  catch(e){ const l=getLocalAttempts(); const a=l[currentUser.email]?.[qid]; if(a)a.score=safeNum(a.score); return a||null; }
}
async function saveAttempt(qid,ans,score) {
  try { await db.collection('attempts').doc(`${currentUser.uid}_${qid}`).set({uid:currentUser.uid,email:currentUser.email,quizId:qid,answers:ans,score,date:firebase.firestore.FieldValue.serverTimestamp()}); await addToLeaderboard(score); }
  catch(e){ saveLocalAttempt(qid,ans,score); addToLocalLeaderboard(score); }
}
async function addToLeaderboard(score) {
  try { const r=db.collection('leaderboard').doc(currentUser.uid); const d=await r.get(); if(d.exists) await r.update({totalScore:firebase.firestore.FieldValue.increment(score)}); else await r.set({uid:currentUser.uid,name:currentUser.displayName,totalScore:score}); }
  catch(e){ throw e; }
}
async function loadLeaderboard() {
  try {
    const snap=await db.collection('leaderboard').orderBy('totalScore','desc').limit(20).get(); leaderboardList.innerHTML='';
    if(snap.empty){leaderboardEmpty.style.display='block';return;} leaderboardEmpty.style.display='none';
    snap.forEach((d,i)=>{const data=d.data();const li=document.createElement('li');li.innerHTML=`<span><i class="ti ti-medal"></i> ${i+1}. ${data.name}</span> <strong>${safeNum(data.totalScore)} poin</strong>`;leaderboardList.appendChild(li);});
  } catch(e){
    const l=getLocalLeaderboard(); leaderboardList.innerHTML=''; if(!l.length){leaderboardEmpty.style.display='block';return;} leaderboardEmpty.style.display='none';
    l.sort((a,b)=>safeNum(b.totalScore)-safeNum(a.totalScore));
    l.forEach((u,i)=>{const li=document.createElement('li');li.innerHTML=`<span><i class="ti ti-medal"></i> ${i+1}. ${u.name}</span> <strong>${safeNum(u.totalScore)} poin</strong>`;leaderboardList.appendChild(li);});
  }
}

// ==================== QUIZ ENGINE ====================
async function handleQuizClick(quiz) {
  if(!currentUser)return;
  const att=await getUserAttempt(quiz.id);
  att ? showReviewScreen(quiz,att.answers,att.score) : startQuiz(quiz);
}
function startQuiz(quiz) { currentQuiz=quiz; currentQuestionIndex=0; userAnswers=new Array(quiz.questions.length).fill(null); showScreen('quizScreen'); renderQuestion(); }
function renderQuestion() {
  if(!currentQuiz)return; const q=currentQuiz.questions[currentQuestionIndex];
  quizTitle.textContent=currentQuiz.title; questionNumber.textContent=`Soal ${currentQuestionIndex+1} dari ${currentQuiz.questions.length}`;
  questionText.innerHTML=q.question; progressFill.style.width=((currentQuestionIndex+1)/currentQuiz.questions.length*100)+'%';
  optionsContainer.innerHTML='';
  q.options.forEach((opt,idx)=>{
    const btn=document.createElement('button'); btn.className='quiz-option'; if(userAnswers[currentQuestionIndex]===idx) btn.classList.add('selected');
    btn.innerHTML=opt; btn.addEventListener('click',()=>{userAnswers[currentQuestionIndex]=idx; renderQuestion();}); optionsContainer.appendChild(btn);
  });
  prevBtn.style.display=currentQuestionIndex===0?'none':'inline-flex';
  if(currentQuestionIndex===currentQuiz.questions.length-1){nextBtn.style.display='none';submitBtn.style.display='block';}
  else{nextBtn.style.display='inline-flex';submitBtn.style.display='none';}
}
prevBtn.addEventListener('click',()=>{if(currentQuestionIndex>0){currentQuestionIndex--;renderQuestion();}});
nextBtn.addEventListener('click',()=>{if(currentQuestionIndex<currentQuiz.questions.length-1){currentQuestionIndex++;renderQuestion();}});
submitBtn.addEventListener('click',async()=>{
  if(!currentQuiz)return; let score=0;
  currentQuiz.questions.forEach((q,i)=>{if(userAnswers[i]===q.answer)score++;});
  await saveAttempt(currentQuiz.id,[...userAnswers],score);
  showReviewScreen(currentQuiz,userAnswers,score); loadLeaderboard();
});
function showReviewScreen(quiz,answers,score) {
  currentQuiz=quiz; resultScore.textContent=`${score} / ${quiz.questions.length}`; let html='';
  quiz.questions.forEach((q,i)=>{
    const ua=answers[i]; const ok=ua===q.answer;
    html+=`<div class="review-item"><p><strong>Soal ${i+1}:</strong> ${q.question} ${ok?'<i class="ti ti-check correct"></i>':'<i class="ti ti-x wrong"></i>'}</p>
    <p>Jawaban kamu: <span class="${ok?'correct':'wrong'}">${ua!=null?q.options[ua]:'Tidak dijawab'}</span></p>
    ${ok?'':`<p>Jawaban benar: <span class="correct">${q.options[q.answer]}</span></p>`}
    <p style="font-style:italic;margin-top:6px;">📘 ${q.explanation}</p></div>`;
  });
  reviewContainer.innerHTML=html; showScreen('resultScreen');
}
backToHomeBtn.addEventListener('click',()=>{showScreen('dashboardScreen');loadLeaderboard();window.location.hash='';});

// ==================== INIT ====================
function initApp() {
  sampleQuizzes = window.IRMA_QUIZZES || [];
  if (!sampleQuizzes.length) { setTimeout(initApp,300); return; }
  if (currentUser) { loadQuizzes(); loadLeaderboard(); checkHash(); }
}
if (window.IRMA_QUIZZES?.length) initApp(); else window.addEventListener('quizzesLoaded', initApp);
