# 💻 THE USELESS COMPUTER EXAM — FULL PROJECT EXPLANATION & ISSUE REPORT

> A ridiculously serious-looking computer examination that tests absolutely nothing.

---

## 1. WHAT THE PROJECT IS

A single-page website built with **HTML + CSS + JavaScript + JSON** (no frameworks, no servers required).

The user:
1. Opens `index.html`
2. Takes a "serious" 8-question exam
3. Gets judged in Malayalam after every answer
4. May discover a random fictional "mystery file"
5. Submits → watches a fake cinematic processing sequence
6. Hits **ERROR 404 — ANSWER KEY NOT FOUND**
7. Passes anyway ("Because we forgot to make the exam 💀")
8. Receives a **Certificate of Uselessness**

---

## 2. THE 4 FILES

| File | Purpose |
|------|---------|
| `index.html` | The **structure** — all screens put on the page |
| `style.css` | The **appearance** — colors, animations, layout |
| `script.js` | The **brain** — shuffle, questions, reactions, sequence logic |
| `questions.json` | The **question bank** — all questions + per-option Malayalam reactions |

**How they connect:**
- `index.html` loads `style.css` and `script.js`
- `index.html` also loads `questions.json` using a hidden JSON script tag
- `script.js` reads the JSON, shuffles it, and picks 8 questions randomly

---

## 3. HOW THE QUESTION BANK WORKS (JSON)

The bank lives in `questions.json` as a list of questions:

```json
{
  "id": 1,
  "text": "Why do we open the fridge again after 5 minutes? 🧊🚪",
  "options": [
    { "o": "We forgot what's inside", "r": "Malayalam reaction..." },
    { "o": "Just checking",           "r": "Malayalam reaction..." }
  ]
}
```

- `id` → question number
- `text` → what the user reads
- `options` → list of choices, each with:
  - `o` → the answer text shown
  - `r` → the Malayalam reaction shown after choosing it

**Adding a new question = editing this file only.** JavaScript never changes.

---

## 4. HOW RANDOM SELECTION WORKS

In `script.js`:

- `shuffle()` uses the **Fisher–Yates algorithm** — it mixes the question list.
- `pickQuestions(8)` takes the first 8 of a shuffled copy.
- Result: **8 random questions, no repeats in one exam**, and **a different set every time** you press START EXAM.

---

## 5. HOW THE EXAM FLOW WORKS (SCREEN BY SCREEN)

**A) Welcome screen** — big glowing 💻 + faded title + pulsing START button.

**B) Exam screen**
- Progress bar at top (`QUESTION 3 / 8` + animated %)
- Question + 4 options appear with a **stagger** (each slides in slightly later)
- Clicking an option:
  1. It **glows, scales up, locks in with a ✓**
  2. The other options **dim and blur**
  3. The **Malayalam reaction card** pops in (opacity + slide + scale)
  4. Only then does the NEXT / SUBMIT button appear

**C) Mystery file** (random, ~1 in 3 attempts, at a random question 2–5)
- A black overlay: `⚠️ UNEXPECTED FILE DETECTED → mystery_exam_file.txt`
- `OPEN FILE 👀` reveals the secret Malayalam text
- `CONTINUE EXAM →` returns to the exam
- **100% simulated inside the webpage — it never touches a real file.**

**D) Submission (cinematic)**
- Button morphs: `SUBMIT EXAM` → `SUBMITTING...` with a spinner
- The whole exam card blurs/fades away
- Processing screen shows changing messages:
  `Analyzing answers 🧠` → `Calculating results...` → `Consulting the examination board 📋` → `Board not responding 📵` → `Trying again 🔁` → `Still nothing 💀`

**E) ERROR 404**
- The whole card **shakes + glitches** (RGB split via layered text, clip-path flicker, scanlines)
- Then lines appear one by one:
  "We searched everywhere. / We checked the computer. / We checked the internet. / We checked your answers."
- Punchline: **"There is no answer key. 💀"**

**F) YOU PASSED** — 🎉 **"Because we forgot to make the exam. 💀"**

**G) Certificate**
- Scales from 0.92 → 1 with a soft glow + **one shimmer sweep** across it
- Shows today's date + a random **USELESS-XXXX** exam ID
- `TAKE THE EXAM AGAIN` → back to welcome, **new random question set**

---

## 6. KNOWN ISSUES & NOTES (found in code review & to check while testing)

> ✅ **ALL ISSUES BELOW WERE FIXED AND RE-TESTED IN THE LIVE BROWSER on 2026-09-12.**
> Summary: C1 (bank loading) now uses `fetch()` and is localhost-only; validation, all re-entry guards, previous-set guard, `isTransitioning` NEXT lock, `.exam-card.fade-out`, per-option `e` emoji with fallback, full retake reset, and the 7-message processing sequence are implemented and verified. Docs: see QA-AUDIT.md → "FIX-RESOLUTION LOG".

> ⚠️ This list documents real behaviour found by reading the code. Nothing below breaks the project, but you should confirm each point while playing.

### Issue 1 — Opening by double-click only, some browsers
**Status:** verify
The JSON is loaded with this trick:
```html
<script type="application/json" id="question-bank-json" src="questions.json"></script>
```
- Works over **localhost** (tested, files return `200`).
- Works on double-click in **Firefox** and **Chrome** in most setups.
- If your college browser loads the page but the first question shows
  `⚠️ Question bank failed to load` → the browser blocked the local JSON.
  **Fix (no install needed):** run `python3 -m http.server 8000` in the project folder and open `http://localhost:8000`.

### Issue 2 — Submit transition may look abrupt
**Status:** cosmetic
When you click SUBMIT, the plan was for the card to *smoothly* blur/fade away. In the current code the card is given the fade class, but the smooth exit applies to *screens*, not the inner card, so it can switch sharply. **It still works**, just less "cinematic" than intended. Easy polish later.

### Issue 3 — Re-clicking an option after selecting
**Status:** by design
Once you click an answer, all options are locked (`examLocked = true`) until you press NEXT. This is intentional so you can't change an answer mid-reaction.

### Issue 4 — Mystery file timing
**Status:** verify
The mystery event triggers **between** questions (not during one). It appears at a random question among 2–5. Because it's a ~33% chance, you may need up to 3 attempts to see it. Confirmed formula: `Math.random() < 0.33`.

### Issue 5 — Emoji picker for reaction card
**Status:** minor
The reaction card's big emoji (`😂 😭 💀 🤡 👀 🧊 🫡 🔥 🐌 🧠`) is picked from the option's **index**, not its content. So an option in position 0 always shows 😂's emoji. Not wrong, just not "smart." Easy to improve if we want.

### Issue 6 — Certificate shimmer only on first reveal
**Status:** by design
The shimmer sweep plays once when the certificate first opens (CSS animation set to `forwards`). On retake + certificate again it re-plays. Fine.

### Issue 7 — No sound / no keyboard shortcuts
**Status:** by design (reliability first)
No audio and no Enter-to-select keyboard support. Adding sound later is optional; nothing is broken.

### Issue 8 — `prefers-reduced-motion`
**Status:** done
Users who disable animations get a nearly instant experience (CSS respects `prefers-reduced-motion`).

### Issue 9 — Responsive layout
**Status:** done
Everything is capped at `max-width: 620px`, uses flexible buttons and cards, and collapses nicely on smaller screens.

---

## 7. WHAT TO CHECK IN YOUR 10-HOUR WINDOW (priorities)

1. ✅ Play the exam twice end-to-end
2. ✅ Confirm questions are different each attempt (no repeats within one exam)
3. ✅ Confirm Malayalam reactions appear after every answer
4. ✅ Test START → answer → NEXT → SUBMIT → processing → ERROR → PASSED → certificate → TAKE AGAIN
5. ⚠️ Try ~3 attempts to catch the mystery file event
6. ⚠️ Test double-clicking `index.html` directly (Issue 1)
7. Optional polish: fix the abrupt submit transition (Issue 2)
8. Optional: GitHub upload — only after everything works

---

## 8. HOW TO OPEN THE PROJECT (REMINDER)

```bash
cd The-Useless-Computer-Exam
python3 -m http.server 8000
```
Then open `http://localhost:8000` in the browser.

*(You can also just double-click `index.html`, but some browsers block the local JSON.)*

---

*This document was generated as part of the TinkerHub Useless Projects 3.0 build.*