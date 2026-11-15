// Real program checking for the coding challenges.
// Programs are arrays of block ids, one per slot (null = empty slot).

/**
 * Run a sequence program step by step. Each command can require "facts"
 * that earlier commands produce (e.g. you can't connect panels that aren't active).
 *
 * @param {Array<string|null>} program
 * @param {object} commands  id → { label, requires: string[], gives: string[], failMessage, run?: async () => void }
 * @param {object} api       { highlight(index, status), log(text, type), wait(seconds) }
 * @returns {Promise<{ok: boolean, failedIndex?: number, message?: string}>}
 */
export async function runSequence(program, commands, api) {
  const facts = new Set();
  for (let i = 0; i < program.length; i++) {
    const id = program[i];
    const cmd = commands[id];
    api.highlight(i, 'running');
    api.log(`▶ Step ${i + 1}: ${cmd.label}…`, 'info');
    await api.wait(0.45);
    const missing = (cmd.requires || []).filter((f) => !facts.has(f));
    if (missing.length) {
      api.highlight(i, 'failed');
      api.log(`✖ Step ${i + 1} failed: ${cmd.failShort || 'not ready yet'}`, 'err');
      return { ok: false, failedIndex: i, message: cmd.failMessage };
    }
    if (cmd.run) await cmd.run();
    (cmd.gives || []).forEach((f) => facts.add(f));
    api.highlight(i, 'passed');
    api.log(`✔ ${cmd.doneText || 'Done'}`, 'ok');
  }
  return { ok: true };
}

/**
 * Evaluate an IF / THEN / ELSE program against a reading.
 * @param {{condition: object, then: string, else: string}} program
 * @param {object} reading  e.g. { oxygen: 25, power: 95 }
 */
export function evaluateIfElse(program, reading) {
  const { condition } = program;
  const value = reading[condition.sensor];
  const passes = condition.op === '<' ? value < condition.value
    : condition.op === '>=' ? value >= condition.value
      : condition.op === '>' ? value > condition.value
        : value === condition.value;
  return { passes, action: passes ? program.then : program.else };
}

/**
 * Test an IF/ELSE program on several cases.
 * @returns {Array<{reading, expected, got, ok}>}
 */
export function testIfElse(program, cases) {
  return cases.map(({ reading, expected }) => {
    const { action } = evaluateIfElse(program, reading);
    return { reading, expected, got: action, ok: action === expected };
  });
}

/**
 * Check a plan (an ordered list of actions) against rules.
 * rules: { required: string[], forbidden: {id: message}, before: [[a, b, message]] }
 */
export function checkPlan(program, rules) {
  const steps = program.filter(Boolean);
  for (const id of steps) {
    if (rules.forbidden[id]) return { ok: false, message: rules.forbidden[id], badId: id };
  }
  if (steps.length < program.length) return { ok: false, message: rules.emptyMessage };
  for (const id of rules.required) {
    if (!steps.includes(id)) return { ok: false, message: rules.missingMessage };
  }
  for (const [a, b, message] of rules.before) {
    if (steps.indexOf(a) > steps.indexOf(b)) return { ok: false, message, badId: b };
  }
  return { ok: true };
}
