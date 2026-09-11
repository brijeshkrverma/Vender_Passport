/**
 * DASHBOARD BASELINE — sourcing/VCP dashboard ke derived values ka snapshot.
 *
 * KYA KARTA HAI
 *   Har applicant ke liye `linking-dashboard-data.service.ts` ka
 *   `filterQuestionaireMarksForAssessor` chalata hai aur uske `clonedData` me
 *   bane saare derived values ek JSON fixture me likh deta hai.
 *
 * YE ALAG SE KYUN CHAHIYE
 *   Wo function naam se scoring function lagta hai, par actually poora
 *   dashboard banata hai — ~567 lines, `this.clonedData` par 113 assignments
 *   (certificate marks, scope1/2/3 emissions, compare charts, VCP names,
 *   women percentage). Uska caller return value phenk deta hai aur
 *   `this.clonedData` return karta hai.
 *
 *   Ye values DB me KAHIN STORE NAHI HOTI — runtime pe banti hain. Isliye koi
 *   bhi score-baseline (jo DB ya engine ka score dekhti hai) inhe capture nahi
 *   karti. Agar koi is function ko "consolidate" ya "pure" kare to dashboard
 *   bina error diye galat numbers dikhane lagega, aur score-baseline ka diff
 *   khali hi rahega. Ye script wahi gap bharti hai.
 *
 * SAFE HAI
 *   Sirf find(). Koi DB write nahi. Sirf ek JSON file likhta hai.
 *
 * ISTEMAAL (Backend/ se)
 *   node scripts/capture-dashboard-baseline.js
 *   node scripts/capture-dashboard-baseline.js --applicant=<id> --fy=2025
 *   MONGO_URL="mongodb://host:27017/db" node scripts/capture-dashboard-baseline.js
 *
 * OPTIONS
 *   --applicant=<id>   sirf ek applicant
 *   --fy=<year>        financial year (default: config/financial-year.js ka
 *                      ACTIVE_FINANCIAL_YEAR). Pehle yahan '2025' hardcoded tha,
 *                      kyunki getDashboardData me bhi wahi hardcoded tha — wo
 *                      hata diya gaya hai, ab dono ek hi jagah se aate hain.
 *                      `--fy=` (khali) do to filter hat jaata hai (saare saal).
 *   --out=<path>       default: fixtures/dashboard-baseline-<date>.json
 *   --full             poora clonedData rakho (default: sirf flattened values)
 *   --mongo-url=<url>
 *
 * OUTPUT PADHNA
 *   "changedFromDefault" batata hai ki kitne values actually compute hue.
 *   Agar ye 0 hai to baseline bekaar hai — matlab input data me wo cheezein
 *   hain hi nahi jinse dashboard banta hai.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { loadDashboardBuilder } = require('./lib/dashboard-loader');
const { buildApplicantFilter } = require('./lib/id-filter');
const { ACTIVE_FINANCIAL_YEAR } = require('../config/financial-year');

const DEFAULT_MONGO_URL =
  process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE';

function parseArgs(argv) {
  const o = { fy: ACTIVE_FINANCIAL_YEAR };
  for (const a of argv) {
    if (a === '--full') o.full = true;
    else if (a.startsWith('--applicant=')) o.applicant = a.split('=')[1];
    else if (a.startsWith('--fy=')) o.fy = a.split('=')[1];
    else if (a.startsWith('--out=')) o.out = a.split('=')[1];
    else if (a.startsWith('--mongo-url=')) o.mongoUrl = a.split('=')[1];
  }
  return o;
}

/** Nested object ko `a.b.c = value` ki flat list me badalta hai — diff ke liye. */
function flatten(obj, prefix = '', out = {}) {
  if (obj === null || typeof obj !== 'object') { out[prefix] = obj; return out; }
  if (Array.isArray(obj)) {
    if (!obj.length) out[prefix] = '[]';
    obj.forEach((v, i) => flatten(v, prefix ? `${prefix}[${i}]` : `[${i}]`, out));
    return out;
  }
  const keys = Object.keys(obj);
  if (!keys.length) { out[prefix] = '{}'; return out; }
  keys.forEach((k) => flatten(obj[k], prefix ? `${prefix}.${k}` : k, out));
  return out;
}

async function run() {
  const opts = parseArgs(process.argv.slice(2));
  const url = opts.mongoUrl || DEFAULT_MONGO_URL;

  console.log('Dashboard builder load ho raha hai (TypeScript transpile)...');
  const builder = loadDashboardBuilder();
  console.log(`  clonedData : lines ${builder._meta.clonedData.startLine}-${builder._meta.clonedData.endLine}`);
  console.log(`  function   : lines ${builder._meta.fn.startLine}-${builder._meta.fn.endLine} (${builder._meta.fn.lines} lines)`);

  // Pristine reference — khali input pe kya banta hai. Isse pata chalta hai
  // ki kaunsi values ASLI me compute hui aur kaunsi default hi reh gayi.
  const pristine = flatten(builder.build([{ answers: [] }]));

  await mongoose.connect(url);
  const db = mongoose.connection.db;
  console.log(`\nConnected to ${db.databaseName}`);

  const filter = buildApplicantFilter({ applicant: opts.applicant, fy: opts.fy });

  let docs = await db.collection('applicantquestionnaires').find(filter)
    .sort({ applicant_id: 1 }).toArray();

  // FY filter se kuch nahi mila to bata do — chup mat raho
  let fyNote = null;
  if (!docs.length && opts.fy) {
    const anyDocs = await db.collection('applicantquestionnaires').countDocuments({});
    const years = await db.collection('applicantquestionnaires').distinct('financialYear');
    fyNote = `financialYear="${opts.fy}" pe koi document nahi mila. ` +
             `Collection me ${anyDocs} docs hain, financialYear values: ${JSON.stringify(years)}`;
    console.log(`\n  ⚠ ${fyNote}`);
    console.log('    --fy=<year> se sahi year do, ya --fy= (khali) se filter hata do.');
  }

  const applicants = [];
  const errors = [];
  let totalChanged = 0;

  for (const d of docs) {
    const entry = { applicantId: String(d.applicant_id), financialYear: d.financialYear || '' };
    try {
      const built = builder.build([JSON.parse(JSON.stringify(d))]);
      const flat = flatten(built);

      // Sirf wahi values jo default se alag hain — yahi asli derived data hai
      const changed = {};
      for (const [k, v] of Object.entries(flat)) {
        if (JSON.stringify(pristine[k]) !== JSON.stringify(v)) changed[k] = v;
      }

      entry.valueCount = Object.keys(flat).length;
      entry.changedFromDefault = Object.keys(changed).length;
      entry.changed = changed;
      if (opts.full) entry.full = built;
      totalChanged += entry.changedFromDefault;
    } catch (err) {
      entry.error = err.message;
      errors.push({ applicantId: entry.applicantId, error: err.message });
    }
    applicants.push(entry);
  }

  const capturedAt = new Date().toISOString();
  const outPath = path.resolve(
    opts.out || path.join(__dirname, '..', '..', 'fixtures', `dashboard-baseline-${capturedAt.slice(0, 10)}.json`)
  );

  const payload = {
    meta: {
      script: 'capture-dashboard-baseline',
      version: 1,
      capturedAt,
      database: db.databaseName,
      scope: { applicant: opts.applicant || null, financialYear: opts.fy || null },
      applicantCount: applicants.length,
      errorCount: errors.length,
      source: builder._meta,
      note: fyNote,
    },
    pristineValueCount: Object.keys(pristine).length,
    errors,
    applicants,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');

  const line = (k, v) => console.log(`  ${String(k).padEnd(34)} ${v}`);
  console.log('');
  console.log('Dashboard baseline captured');
  console.log('');
  line('Applicants', applicants.length);
  line('Values per applicant (flattened)', Object.keys(pristine).length);
  line('Derived values captured (total)', totalChanged);
  line('Errors', errors.length);
  console.log('');
  line('Output', outPath);

  if (applicants.length && totalChanged === 0) {
    console.log('');
    console.log('  ⚠ WARNING: kisi bhi applicant ke liye ek bhi value default se alag nahi hui.');
    console.log('    Matlab is data pe dashboard kuch compute nahi kar raha. Ye baseline');
    console.log('    diff ke liye bekaar hai. Sahi --fy do, ya check karo ki us FY ka');
    console.log('    data DB me hai ya nahi.');
  }
  console.log('');

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
