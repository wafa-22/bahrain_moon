// "What will this code print?" questions for the Code Output Quiz.
// Topics: Variables, Loops, If / Else. Code is simple pseudo-JavaScript.

export const QUIZ_REWARD = 50;

export const QUIZ = [
  // ---------- Variables ----------
  {
    id: 'var1', topic: 'Variables', emoji: '📦',
    code: 'let stars = 5;\nstars = stars + 3;\nprint(stars);',
    options: ['5', '3', '8', '53'],
    answer: 2,
    explain: 'A variable is like a labelled box. <b>stars</b> starts at 5, then we add 3 and put the result back in the box: 5 + 3 = <b>8</b>.',
  },
  {
    id: 'var2', topic: 'Variables', emoji: '📦',
    code: 'let name = "Amal";\nlet city = "Manama";\nprint(name + " from " + city);',
    options: ['name from city', 'Amal from Manama', 'Amal Manama', 'Error'],
    answer: 1,
    explain: 'Variables can hold words (called <b>strings</b>). Joining them with <b>+</b> sticks the words together: <b>Amal from Manama</b>.',
  },
  {
    id: 'var3', topic: 'Variables', emoji: '📦',
    code: 'let oxygen = 90;\noxygen = oxygen - 20;\noxygen = oxygen - 20;\nprint(oxygen);',
    options: ['90', '70', '50', '40'],
    answer: 2,
    explain: 'The code takes 20 away <b>two times</b>: 90 → 70 → <b>50</b>. Each line runs in order (that\'s a sequence!).',
  },
  // ---------- Loops ----------
  {
    id: 'loop1', topic: 'Loops', emoji: '🔁',
    code: 'repeat 3 times {\n  print("🚀");\n}',
    options: ['🚀', '🚀🚀', '🚀🚀🚀', '🚀🚀🚀🚀'],
    answer: 2,
    explain: 'A <b>loop</b> repeats the code inside it. "repeat 3 times" runs print 3 times: <b>🚀🚀🚀</b>.',
  },
  {
    id: 'loop2', topic: 'Loops', emoji: '🔁',
    code: 'let rocks = 0;\nrepeat 4 times {\n  rocks = rocks + 2;\n}\nprint(rocks);',
    options: ['2', '4', '6', '8'],
    answer: 3,
    explain: 'Each time the loop runs, 2 rocks are added. 4 times × 2 rocks = <b>8</b>.',
  },
  {
    id: 'loop3', topic: 'Loops', emoji: '🔁',
    code: 'for (let i = 1; i <= 3; i++) {\n  print(i);\n}',
    options: ['1 2 3', '0 1 2', '3 2 1', '1 2 3 4'],
    answer: 0,
    explain: '<b>i</b> starts at 1 and grows by 1 each time while it is 3 or less, so it prints <b>1 2 3</b>.',
  },
  // ---------- If / Else ----------
  {
    id: 'if1', topic: 'If / Else', emoji: '🔀',
    code: 'let power = 30;\nif (power < 50) {\n  print("Fix the panels!");\n} else {\n  print("All good");\n}',
    options: ['All good', 'Fix the panels!', 'Both', 'Nothing'],
    answer: 1,
    explain: '30 is less than 50, so the condition is <b>TRUE</b> and the IF part runs: <b>Fix the panels!</b>',
  },
  {
    id: 'if2', topic: 'If / Else', emoji: '🔀',
    code: 'let storm = false;\nif (storm) {\n  print("Go to shelter");\n} else {\n  print("Explore!");\n}',
    options: ['Go to shelter', 'Explore!', 'false', 'storm'],
    answer: 1,
    explain: '<b>storm</b> is false, so the IF part is skipped and the ELSE part runs: <b>Explore!</b>',
  },
  {
    id: 'if3', topic: 'If / Else', emoji: '🔀',
    code: 'let stars = 120;\nif (stars >= 120) {\n  print("Plasma Pickaxe unlocked!");\n} else {\n  print("Keep mining");\n}',
    options: ['Keep mining', 'Plasma Pickaxe unlocked!', '120', 'Error'],
    answer: 1,
    explain: '<b>>=</b> means "greater than OR equal to". 120 is equal to 120, so the condition is TRUE: <b>Plasma Pickaxe unlocked!</b>',
  },
];
