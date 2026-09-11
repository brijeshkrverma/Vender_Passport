/**
 * BASELINE DIFF — "kuch toota to nahi" ka jawab.
 *
 * KYA KARTA HAI
 *   Do baseline files compare karta hai (before vs after) aur batata hai ki
 *   kis applicant ke kis question ka score badla. Score baseline aur dashboard
 *   baseline — dono format samajhta hai, apne aap detect kar leta hai.
 *
 * KAISE ISTEMAAL KARNA (har code change ke baad)
 *   node scripts/capture-score-baseline.js --out=fixtures/before.json
 *   ... apna change karo ...
 *   node scripts/capture-score-baseline.js --out=fixtures/after.json
 *   node scripts/diff-baseline.js fixtures/before.json fixtures/after.json
 *
 *   Exit code 0 = koi farq nahi (change score-neutral tha)
 *   Exit code 1 = farq hai — rollback karo ya samjho kyun aaya
 *
 * SAFE HAI
 *   DB se koi lena-dena nahi. Sirf do JSON files padhta hai.
 */

const fs = require('fs');
const path = require('path');

function load(p) {
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) {
    console.error(`File nahi mili: ${abs}`);
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

const num = (v) => (typeof v === 'number' ? v : Number(v) || 0);

/** Score baseline ka diff. */
function diffScore(before, after) {
  const beforeMap = new Map(before.applicants.map((a) => [`${a.applicantId}|${a.financialYear}`, a]));
  const afterMap = new Map(after.applicants.map((a) => [`${a.applicantId}|${a.financialYear}`, a]));

  const changes = [];
  const addedApplicants = [];
  const removedApplicants = [];

  for (const k of afterMap.keys()) if (!beforeMap.has(k)) addedApplicants.push(k);
  for (const k of beforeMap.keys()) if (!afterMap.has(k)) removedApplicants.push(k);

  for (const [key, b] of beforeMap) {
    const a = afterMap.get(key);
    if (!a) continue;
    const [applicantId, fy] = key.split('|');

    for (const mode of Object.keys(b.modes || {})) {
      const bm = b.modes[mode];
      const am = (a.modes || {})[mode];
      if (!bm || !am) continue;

      if (num(bm.total) !== num(am.total)) {
        changes.push({
          kind: 'total', applicantId, financialYear: fy, mode,
          before: num(bm.total), after: num(am.total),
          delta: Number((num(am.total) - num(bm.total)).toFixed(4)),
        });
      }

      const bq = new Map((bm.perQuestion || []).map((q) => [q.questionId, q]));
      const aq = new Map((am.perQuestion || []).map((q) => [q.questionId, q]));
      for (const [qid, q1] of bq) {
        const q2 = aq.get(qid);
        if (!q2) {
          changes.push({ kind: 'question-removed', applicantId, financialYear: fy, mode, questionId: qid });
          continue;
        }
        if (num(q1.obtainedMark) !== num(q2.obtainedMark)) {
          changes.push({
            kind: 'question', applicantId, financialYear: fy, mode, questionId: qid,
            before: num(q1.obtainedMark), after: num(q2.obtainedMark),
            delta: Number((num(q2.obtainedMark) - num(q1.obtainedMark)).toFixed(4)),
          });
        }
        if (num(q1.maxMark) !== num(q2.maxMark)) {
          changes.push({
            kind: 'maxMark', applicantId, financialYear: fy, mode, questionId: qid,
            before: num(q1.maxMark), after: num(q2.maxMark),
            delta: Number((num(q2.maxMark) - num(q1.maxMark)).toFixed(4)),
          });
        }
      }
      for (const qid of aq.keys()) {
        if (!bq.has(qid)) changes.push({ kind: 'question-added', applicantId, financialYear: fy, mode, questionId: qid });
      }
    }
  }
  return { changes, addedApplicants, removedApplicants };
}

/** Dashboard baseline ka diff. */
function diffDashboard(before, after) {
  const bMap = new Map(before.applicants.map((a) => [a.applicantId, a]));
  const aMap = new Map(after.applicants.map((a) => [a.applicantId, a]));
  const changes = [];

  for (const [id, b] of bMap) {
    const a = aMap.get(id);
    if (!a) { changes.push({ kind: 'applicant-removed', applicantId: id }); continue; }
    const bc = b.changed || {};
    const ac = a.changed || {};
    const keys = new Set([...Object.keys(bc), ...Object.keys(ac)]);
    for (const k of keys) {
      const v1 = JSON.stringify(bc[k]);
      const v2 = JSON.stringify(ac[k]);
      if (v1 !== v2) {
        changes.push({ kind: 'dashboard-value', applicantId: id, key: k, before: bc[k], after: ac[k] });
      }
    }
  }
  for (const id of aMap.keys()) if (!bMap.has(id)) changes.push({ kind: 'applicant-added', applicantId: id });
  return { changes, addedApplicants: [], removedApplicants: [] };
}

function main() {
  const [p1, p2, ...rest] = process.argv.slice(2);
  const verbose = rest.includes('--verbose');
  const limit = verbose ? Infinity : 40;

  if (!p1 || !p2) {
    console.error('Usage: node scripts/diff-baseline.js <before.json> <after.json> [--verbose]');
    process.exit(2);
  }

  const before = load(p1);
  const after = load(p2);

  const kind = before.meta?.script || 'unknown';
  if (after.meta?.script !== kind) {
    console.error(`Dono files ka type alag hai: "${kind}" vs "${after.meta?.script}". Same type ki files do.`);
    process.exit(2);
  }

  const result = kind === 'capture-dashboard-baseline'
    ? diffDashboard(before, after)
    : diffScore(before, after);

  const { changes, addedApplicants, removedApplicants } = result;

  console.log('');
  console.log(`Baseline diff  —  ${kind}`);
  console.log(`  before : ${path.resolve(p1)}  (${before.meta?.capturedAt || '?'})`);
  console.log(`  after  : ${path.resolve(p2)}  (${after.meta?.capturedAt || '?'})`);
  console.log('');

  if (!changes.length && !addedApplicants.length && !removedApplicants.length) {
    console.log('  ✅ DIFF EMPTY — kuch nahi badla. Change score-neutral tha.');
    console.log('');
    process.exit(0);
  }

  console.log(`  ⚠ ${changes.length} farq mile.`);
  if (addedApplicants.length) console.log(`    naye applicants   : ${addedApplicants.length}`);
  if (removedApplicants.length) console.log(`    gayab applicants  : ${removedApplicants.length}`);
  console.log('');

  const byKind = {};
  changes.forEach((c) => { byKind[c.kind] = (byKind[c.kind] || 0) + 1; });
  Object.entries(byKind).forEach(([k, n]) => console.log(`    ${k.padEnd(20)} ${n}`));

  console.log('');
  changes.slice(0, limit).forEach((c) => {
    if (c.kind === 'dashboard-value') {
      console.log(`    ${c.applicantId}  ${c.key}\n        ${JSON.stringify(c.before)} -> ${JSON.stringify(c.after)}`);
    } else if (c.questionId) {
      console.log(`    ${c.applicantId} [${c.mode}] ${c.questionId}  ${c.kind}: ${c.before} -> ${c.after} (${c.delta > 0 ? '+' : ''}${c.delta})`);
    } else {
      console.log(`    ${c.applicantId} [${c.mode}] TOTAL: ${c.before} -> ${c.after} (${c.delta > 0 ? '+' : ''}${c.delta})`);
    }
  });
  if (changes.length > limit) console.log(`    ...aur ${changes.length - limit} (--verbose se sab dekho)`);

  console.log('');
  console.log('  Agar ye farq EXPECTED nahi tha to change ko rollback karo.');
  console.log('');
  process.exit(1);
}

main();
