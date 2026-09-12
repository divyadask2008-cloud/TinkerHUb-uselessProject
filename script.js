/* =============================
   THE USELESS COMPUTER EXAM
   Behavior + Logic
   ============================= */

// ---------- STATE ----------
let bank = [];
let examQuestions = [];
let currentQuestion = 0;
let answers = [];
let examLocked = false;
let mysteryTriggered = false;
let isStarting = false;
let isSubmitting = false;
let isTransitioning = false;
let showCertLock = false;
let doneNavLock = false;
let lastQuestionIds = null;
let mysteryIndex = -1;
let bankReady = false;

const REQUIRED_QUESTIONS = 8;
const FALLBACK_REACTION = 'ഇതിന് എന്ത് പറയണം എന്ന് ഞങ്ങൾക്കും അറിയില്ല 😂';

// ---------- TIMER MANAGEMENT ----------
let timers = [];

function trackTimeout(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
}

function trackInterval(fn, ms) {
    const id = setInterval(fn, ms);
    timers.push(id);
    return id;
}

function clearAllTimers() {
    timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    timers = [];
}

// ---------- DOM ----------
const screens = {
    welcome: document.getElementById('welcome-screen'),
    exam: document.getElementById('exam-screen'),
    processing: document.getElementById('submission-screen'),
    error: document.getElementById('error-screen'),
    passed: document.getElementById('passed-screen'),
    certificate: document.getElementById('certificate-screen')
};

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const errorContinueBtn = document.getElementById('error-continue-btn');
const certificateBtn = document.getElementById('certificate-btn');
const retakeBtn = document.getElementById('retake-btn');

const questionCounter = document.getElementById('question-counter');
const questionPercent = document.getElementById('question-percent');
const progressFill = document.getElementById('progress-fill');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const reactionCard = document.getElementById('reaction-card');
const reactionEmoji = document.getElementById('reaction-emoji');
const reactionText = document.getElementById('reaction-text');
const examCard = document.getElementById('exam-card');

// Bank status messages
const bankErrorBox = document.getElementById('bank-error');
const bankShortBox = document.getElementById('bank-short');

// Mystery overlay
const mysteryOverlay = document.getElementById('mystery-overlay');
const mysteryOpenBtn = document.getElementById('mystery-open-btn');
const mysterySkipBtn = document.getElementById('mystery-skip-btn');
const mysteryContinueBtn = document.getElementById('mystery-continue-btn');

// Processing
const processingCard = document.getElementById('processing-card');
const processingTitle = document.getElementById('processing-title');
const processingMessage = document.getElementById('processing-message');
const processingFill = document.getElementById('processing-fill');

// Error
const errorCard = document.querySelector('.error-card');
const errorDetails = document.querySelector('.error-details');
const errorPunchline = document.querySelector('.error-punchline');
const certificateEl = document.getElementById('certificate');

// ---------- QUESTION BANK (fetch) ----------
async function loadQuestionBank() {
    try {
        const res = await fetch('questions.json');
        if (!res.ok) {
            throw new Error('HTTP ' + res.status);
        }
        const text = await res.text();
        const parsed = JSON.parse(text);
        const raw = Array.isArray(parsed) ? parsed : parsed.questions;
        bank = validateBank(raw);
        if (bank.length >= REQUIRED_QUESTIONS) {
            bankReady = true;
        } else {
            bankReady = false;
            console.warn('Question bank has only ' + bank.length + ' valid questions (required ' + REQUIRED_QUESTIONS + ').');
            showBankNotice(bankShortBox);
        }
    } catch (err) {
        console.error('Question bank could not load:', err);
        bank = [];
        bankReady = false;
        showBankNotice(bankErrorBox);
    }
}

function showBankNotice(box) {
    if (!box) return;
    box.classList.remove('hidden');
    if (startBtn) startBtn.disabled = true;
}

// ---------- VALIDATION ----------
function validateBank(raw) {
    if (!Array.isArray(raw)) {
        console.warn('Question bank is not an array.');
        return [];
    }
    const seen = new Set();
    const valid = [];
    raw.forEach((q, idx) => {
        if (!q || typeof q !== 'object') {
            console.warn('Skipping invalid question at index ' + idx + ': not an object.');
            return;
        }
        let id = q.id;
        if (id === undefined || id === null || String(id).trim() === '') {
            id = 'q' + idx;
            console.warn('Question at index ' + idx + ' has no ID; assigned fallback "' + id + '".');
        }
        id = String(id);
        if (seen.has(id)) {
            console.warn('Skipping duplicate question ID "' + id + '".');
            return;
        }
        if (!(q.text || '').trim()) {
            console.warn('Skipping question "' + id + '": missing text.');
            return;
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
            console.warn('Skipping question "' + id + '": needs at least 2 options.');
            return;
        }
        const cleanedOptions = [];
        q.options.forEach((opt, oi) => {
            if (!opt || !String(opt.o || '').trim()) {
                console.warn('Question "' + id + '": option ' + oi + ' has no option text; skipped.');
                return;
            }
            const reaction = String(opt.r || '').trim() || FALLBACK_REACTION;
            if (!String(opt.r || '').trim()) {
                console.warn('Question "' + id + '": option ' + oi + ' has no reaction; using fallback.');
            }
            cleanedOptions.push({
                o: String(opt.o).trim(),
                r: reaction,
                e: String(opt.e || '').trim() || null
            });
        });
        if (cleanedOptions.length < 2) {
            console.warn('Skipping question "' + id + '": fewer than 2 usable options remain.');
            return;
        }
        seen.add(id);
        valid.push({ id: id, text: String(q.text).trim(), options: cleanedOptions });
    });
    return valid;
}

// ---------- RANDOM SELECTION (Fisher–Yates) ----------
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function sameQuestionSet(questions, previousIds) {
    if (!previousIds || previousIds.length === 0) return false;
    const ids = questions.map(q => q.id);
    if (ids.length !== previousIds.length) return false;
    const idSet = new Set(ids);
    return previousIds.every(id => idSet.has(id));
}

function pickQuestions(count) {
    let picked = shuffle(bank).slice(0, count);
    let guard = 0;
    while (sameQuestionSet(picked, lastQuestionIds) && guard < 3) {
        picked = shuffle(bank).slice(0, count);
        guard++;
    }
    lastQuestionIds = picked.map(q => q.id);
    return picked;
}

// ---------- SCREEN HELPERS ----------
function showScreen(name) {
    Object.values(screens).forEach(s => {
        if (s) s.classList.remove('active', 'fade-out');
    });
    screens[name].classList.add('active');
}

function fadeTo(name, afterMs) {
    const activeScreens = Object.values(screens).filter(s => s && s.classList.contains('active'));
    activeScreens.forEach(s => s.classList.add('fade-out'));
    trackTimeout(() => {
        showScreen(name);
    }, afterMs || 420);
}

// ---------- INIT ----------
function init() {
    startBtn.addEventListener('click', startExam);
    nextBtn.addEventListener('click', onNext);
    errorContinueBtn.addEventListener('click', showPassedScreen);
    certificateBtn.addEventListener('click', showCertificate);
    retakeBtn.addEventListener('click', retakeExam);

    mysteryOpenBtn.addEventListener('click', openMysteryFile);
    mysterySkipBtn.addEventListener('click', closeMystery);
    mysteryContinueBtn.addEventListener('click', closeMystery);

    loadQuestionBank();
}

// ---------- RESET ----------
function resetEverything() {
    clearAllTimers();
    currentQuestion = 0;
    answers = [];
    examLocked = false;
    mysteryTriggered = false;
    isSubmitting = false;
    isTransitioning = false;
    showCertLock = false;
    doneNavLock = false;
    mysteryIndex = -1;

    // DOM state back to neutral
    optionsContainer.innerHTML = '';
    optionsContainer.classList.remove('has-selection');
    reactionCard.classList.remove('show');
    reactionCard.classList.add('hidden');
    reactionEmoji.textContent = '';
    reactionText.textContent = '';

    nextBtn.classList.remove('hidden', 'submitting');
    nextBtn.disabled = false;
    resetSubmitButton();

    progressFill.style.width = '0%';

    errorCard.classList.remove('stirred');
    errorDetails.classList.add('hidden');
    errorPunchline.classList.add('hidden');
    errorContinueBtn.classList.add('hidden');

    processingFill.style.width = '0%';

    certificateEl.classList.remove('show');
    document.getElementById('exam-id').textContent = '';
    document.getElementById('certificate-date').textContent = '';

    mysteryOverlay.classList.remove('active');
    document.getElementById('mystery-detected').classList.remove('hidden');
    document.getElementById('mystery-content').classList.add('hidden');

    bankErrorBox.classList.add('hidden');
    bankShortBox.classList.add('hidden');
}

// ---------- START ----------
function startExam() {
    if (isStarting) return;
    if (!bankReady || bank.length < REQUIRED_QUESTIONS) {
        showBankNotice(bank.length < REQUIRED_QUESTIONS ? bankShortBox : bankErrorBox);
        return;
    }

    isStarting = true;
    startBtn.disabled = true;

    resetEverything();

    examLocked = false;
    examQuestions = pickQuestions(REQUIRED_QUESTIONS);

    const willMystery = Math.random() < 0.33;

    fadeTo('exam', 360);
    trackTimeout(() => {
        loadQuestion();
        mysteryIndex = willMystery ? (1 + Math.floor(Math.random() * 4)) : -1;
        isStarting = false;
        startBtn.disabled = false;
    }, 450);
}

// ---------- LOAD QUESTION ----------
function loadQuestion() {
    const q = examQuestions[currentQuestion];
    const total = examQuestions.length;

    questionCounter.textContent = 'QUESTION ' + (currentQuestion + 1) + ' / ' + total;
    const percent = Math.round((currentQuestion / total) * 100);
    progressFill.style.width = percent + '%';
    questionPercent.textContent = percent + '%';

    questionNumber.textContent = 'Q' + (currentQuestion + 1);
    questionText.textContent = q.text;

    optionsContainer.innerHTML = '';
    optionsContainer.classList.remove('has-selection');
    reactionCard.classList.remove('show');
    reactionCard.classList.add('hidden');
    nextBtn.classList.add('hidden');
    nextBtn.disabled = false;
    resetSubmitButton();

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.dataset.index = i;
        btn.style.animationDelay = (0.08 + i * 0.08) + 's';
        btn.innerHTML =
            '<span class="option-letter">' + (letters[i] || i + 1) + '</span>' +
            '<span class="option-text">' + escapeHTML(opt.o) + '</span>' +
            '<span class="option-check">✓</span>';
        btn.addEventListener('click', () => selectOption(i, btn));
        optionsContainer.appendChild(btn);
    });
}

// ---------- SELECT OPTION ----------
function selectOption(index, btn) {
    if (examLocked) return;
    examLocked = true;

    optionsContainer.classList.add('has-selection');
    btn.classList.add('selected');

    const q = examQuestions[currentQuestion];
    answers[currentQuestion] = {
        question: q,
        option: q.options[index]
    };

    reactionEmoji.textContent = pickEmoji(q.options[index], index);
    reactionText.textContent = q.options[index].r;
    reactionCard.classList.remove('hidden');
    trackTimeout(() => reactionCard.classList.add('show'), 60);

    trackTimeout(() => {
        const isLast = currentQuestion === examQuestions.length - 1;
        setBtnLabel(isLast ? 'SUBMIT EXAM →' : 'NEXT QUESTION →');
        if (!isTransitioning) nextBtn.classList.remove('hidden');
    }, 600);
}

function pickEmoji(option, index) {
    if (option && option.e) return option.e;
    const emojis = ['😂', '😭', '💀', '🤡', '👀', '🧊', '🫡', '🔥', '🐌', '🧠'];
    return emojis[(index || 0) % emojis.length];
}

function setBtnLabel(text) {
    nextBtn.querySelector('.btn-label').textContent = text;
}

function resetSubmitButton() {
    nextBtn.classList.remove('submitting');
    nextBtn.querySelector('.btn-label').classList.remove('hidden');
    nextBtn.querySelector('.btn-spinner').classList.add('hidden');
}

// ---------- NEXT / SUBMIT ----------
function onNext() {
    if (isTransitioning || isSubmitting) return;

    if (mysteryIndex === currentQuestion && !mysteryTriggered) {
        mysteryTriggered = true;
        showMystery();
        return;
    }

    isTransitioning = true;
    if (currentQuestion < examQuestions.length - 1) {
        currentQuestion++;
        examLocked = false;
        const qc = document.getElementById('question-container');
        qc.style.animation = 'none';
        void qc.offsetWidth;
        qc.style.animation = '';
        loadQuestion();
    } else {
        submitExam();
    }
    trackTimeout(() => { isTransitioning = false; }, 300);
}

// ---------- MYSTERY FILE ----------
function showMystery() {
    document.getElementById('mystery-detected').classList.remove('hidden');
    document.getElementById('mystery-content').classList.add('hidden');
    mysteryOverlay.classList.add('active');
}

function openMysteryFile() {
    document.getElementById('mystery-detected').classList.add('hidden');
    document.getElementById('mystery-content').classList.remove('hidden');
}

function closeMystery() {
    if (isTransitioning) return;
    mysteryOverlay.classList.remove('active');
    isTransitioning = true;
    if (currentQuestion < examQuestions.length - 1) {
        currentQuestion++;
        examLocked = false;
        loadQuestion();
    } else {
        submitExam();
    }
    trackTimeout(() => { isTransitioning = false; }, 300);
}

// ---------- SUBMIT ----------
function submitExam() {
    if (isSubmitting) return;
    isSubmitting = true;
    examLocked = true;

    nextBtn.classList.add('submitting');
    nextBtn.querySelector('.btn-label').textContent = 'SUBMITTING...';
    nextBtn.querySelector('.btn-label').classList.add('hidden');
    nextBtn.querySelector('.btn-spinner').classList.remove('hidden');
    nextBtn.disabled = true;

    trackTimeout(() => {
        examCard.classList.add('fade-out');
        trackTimeout(() => {
            showScreen('processing');
            runProcessingSequence();
        }, 380);
    }, 900);
}

// ---------- PROCESSING SEQUENCE ----------
const processingSteps = [
    ['Analyzing answers...', 'Analyzing answers... 🧠'],
    ['Calculating results...', 'Calculating extremely important results... 🧮'],
    ['Consulting the examination board...', 'Consulting the examination board... 📋'],
    ['Board not responding...', 'Examination board not responding... 📵'],
    ['Retrying...', 'Trying again... 🔁'],
    ['Still nothing...', 'Still nothing... 💀'],
];

function runProcessingSequence() {
    processingFill.style.width = '0%';
    processingMessage.textContent = processingSteps[0][1];
    processingTitle.textContent = processingSteps[0][0];

    let step = 1;
    const total = processingSteps.length;

    const timer = trackInterval(() => {
        if (step >= total) {
            clearInterval(timer);
            timers = timers.filter(t => t !== timer);
            processingFill.style.width = '100%';
            processingTitle.textContent = 'Checking with absolutely nobody...';
            processingMessage.textContent = 'Checking with absolutely nobody... 🤷';
            trackTimeout(() => {
                processingTitle.textContent = 'PROCESSING FAILED';
                processingMessage.textContent = 'ERROR 404 — ANSWER KEY NOT FOUND';
                trackTimeout(() => {
                    fadeTo('error', 380);
                    runErrorReveal();
                }, 1200);
            }, 800);
            return;
        }
        processingMessage.style.animation = 'none';
        void processingMessage.offsetWidth;
        processingMessage.style.animation = '';
        processingMessage.textContent = processingSteps[step][1];
        processingTitle.textContent = processingSteps[step][0];
        processingFill.style.width = Math.round((step / total) * 100) + '%';
        step++;
    }, 1000);
}

// ---------- ERROR REVEAL ----------
function runErrorReveal() {
    errorCard.classList.remove('stirred');
    errorDetails.classList.add('hidden');
    errorPunchline.classList.add('hidden');
    errorContinueBtn.classList.add('hidden');
    void errorCard.offsetWidth;
    errorCard.classList.add('stirred');

    trackTimeout(() => errorDetails.classList.remove('hidden'), 1800);
    trackTimeout(() => errorPunchline.classList.remove('hidden'), 3600);
    trackTimeout(() => errorContinueBtn.classList.remove('hidden'), 4600);
}

function showPassedScreen() {
    if (doneNavLock) return;
    doneNavLock = true;
    fadeTo('passed', 380);
}

// ---------- CERTIFICATE ----------
function showCertificate() {
    if (showCertLock) return;
    showCertLock = true;
    fadeTo('certificate', 380);

    trackTimeout(() => {
        const now = new Date();
        document.getElementById('certificate-date').textContent =
            now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const examId = Math.random().toString(36).substring(2, 10).toUpperCase();
        document.getElementById('exam-id').textContent = examId;

        certificateEl.classList.remove('show');
        void certificateEl.offsetWidth;
        certificateEl.classList.add('show');
    }, 520);
}

// ---------- RETAKE ----------
function retakeExam() {
    resetEverything();
    showScreen('welcome');
}

// ---------- HELPERS ----------
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------- START ----------
init();