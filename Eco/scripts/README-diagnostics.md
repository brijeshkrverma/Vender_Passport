# Stage 1 diagnostic scripts

Ye 5 scripts **read-only** hain — DB me kuch nahi likhtin, koi behaviour nahi badalti.
Verify kiya gaya: ek bhi `updateOne` / `insertOne` / `deleteOne` / `save` / `bulkWrite`
/ `drop` nahi hai. Sirf `find()` aur JSON file output.

Production (ya uske restore) pe safely chala sakte ho.

---

## Scripts

| Script | Kya karti hai |
| --- | --- |
| `capture-score-baseline.js` | Aaj ke asli scores ka snapshot — teeno modes me, **compute karke** |
| `compare-fe-be-scoring.js` | FE aur BE ka scoring chalakar batati hai kahan-kahan alag jawab aata hai |
| `capture-dashboard-baseline.js` | Sourcing/VCP dashboard ke derived values (jo DB me store nahi hote) |
| `audit-question-score.js` | Ek question ka score kaise bana — step by step |
| `diff-baseline.js` | Do baselines compare — "kuch toota to nahi" |

Support files `lib/` me hain (FE TypeScript loader, dashboard loader, mode helpers).

---

## Chalane ka tareeka

```bash
cd Backend
export MONGO_URL="mongodb://127.0.0.1:27017/CII_CESD_ECO_EDGE"   # apna URL

# 1. Aaj ka score baseline
npm run baseline:score

# 2. FE vs BE — client ki complaint ka pehla jawab
npm run diagnose:fe-be

# 3. Dashboard baseline (FY zaroor do)
npm run baseline:dashboard -- --fy=2025

# 4. Ek question ka pura breakdown
npm run diagnose:question -- <applicantId> <questionId>
npm run diagnose:question -- <applicantId> --list      # saare questions

# 5. Change ke baad diff
npm run baseline:diff -- fixtures/before.json fixtures/after.json
```

`diff-baseline.js` exit code: **0** = koi farq nahi, **1** = farq hai.

---

## Verification loop (har code change ke baad)

```
node scripts/capture-score-baseline.js --out=fixtures/before.json
node scripts/capture-dashboard-baseline.js --fy=2025 --out=fixtures/dash-before.json

   ... apna change karo ...

node scripts/capture-score-baseline.js --out=fixtures/after.json
node scripts/capture-dashboard-baseline.js --fy=2025 --out=fixtures/dash-after.json

node scripts/diff-baseline.js fixtures/before.json fixtures/after.json
node scripts/diff-baseline.js fixtures/dash-before.json fixtures/dash-after.json
```

Dono diff **empty** hone chahiye. Non-empty = ruko, rollback karo.

---

## Purani `capture-baseline.js` kyun kaafi nahi thi

Wo `applicantquestionnaires.answers[].obtendMark` **DB se padhti** hai. Wo field kabhi
likhi hi nahi jaati — assessor save karne par sirf `assessorResp`, `isAssessorChecked`
aur `assessorComment` store hote hain (`ApiController.js:3026-3031`). Poore backend me
`obtendMark` ka koi `$set`/`update`/`save` nahi hai.

Nateeja: DB me uski value `""` hoti hai, aur purani script har question pe
`obtainedMark: 0` deti hai. Wo khud print karti hai `Total marks across sample: 0`.
Yaani uska diff **hamesha khali** rahega — chahe engine poori tarah toot jaye.

`capture-score-baseline.js` score **compute** karti hai, padhti nahi. Isliye uska
baseline asli hai.

Purani script ka `maxMark` aur `selectedOptions` sahi hai — use structural check
(answers gayab to nahi hue) ke liye rakh sakte ho.

---

## Teen modes — inhe ek mat samajhna

```
applicant     -> filterQuestionaireMarks                  (applicant ne khud kya bhara)
assessorOnly  -> filterQuestionaireMarksOnlyForAssessor   (sirf assessor ke marks)
final         -> filterQuestionaireMarksForAssessor       (combined — scorecard pe yahi)
                 (FY 2024 ho to ...ForAssessorYear2024)
```

Measured: 30 me se **26 applicants** pe teeno alag jawab dete hain. Inhe merge karne se
teen screens ke numbers badal jayenge.

---

## FE ka TypeScript kaise chalta hai

`lib/fe-scoring-loader.js` `utility.service.ts` me se scoring wale 5 members naam se
dhoondhta hai (line numbers hardcode nahi), brace-match karke nikaalta hai, TypeScript
compiler se transpile karta hai, aur ek plain class me chala deta hai. Angular load
nahi hota.

Ye isliye kaam karta hai kyunki wo functions sirf `this.calculateOptionMarks` par
depend karte hain — koi injected service use nahi hoti (verify kiya gaya).

`lib/dashboard-loader.js` bilkul aise hi `linking-dashboard-data.service.ts` ka
`clonedData` + `filterQuestionaireMarksForAssessor` nikaalta hai.

Agar in files me function ka naam badla, to script saaf error degi — chup nahi rahegi.
