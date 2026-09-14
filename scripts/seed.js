require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../backend/modules/auth/auth.model');
const Organization = require('../backend/modules/organizations/org.model');
const Audit = require('../backend/modules/audits/audit.model');
const Finding = require('../backend/modules/findings/finding.model');
const Risk = require('../backend/modules/risks/risk.model');
const Control = require('../backend/modules/controls/control.model');
const Framework = require('../backend/modules/frameworks/framework.model');
const Certificate = require('../backend/modules/certificates/cert.model');
const Document = require('../backend/modules/documents/doc.model');
const Notification = require('../backend/modules/notifications/notification.model');
const CAPA = require('../backend/modules/capa/capa.model');
const Evidence = require('../backend/modules/evidence/evidence.model');
const EvidenceLink = require('../backend/modules/evidence/evidenceLink.model');
const Vendor = require('../backend/modules/vendors/vendor.model');
const QuestionnaireQuestion = require('../backend/modules/questionnaires/questionnaire.model');
const QuestionnaireSubmission = require('../backend/modules/questionnaires/submission.model');
const QuestionnaireResponse = require('../backend/modules/questionnaires/response.model');

const ORG_NAME_TO_ID = {
  'GlobalTech Solutions': 'ORG-101',
  'EcoEdge Industries': 'ORG-102',
  'SecureCore Systems': 'ORG-103',
  'Alpha Manufacturing': 'ORG-104',
  'Zenith Healthcare': 'ORG-105',
  'Nova Retail': 'ORG-106',
  'BrightPath Logistics': 'ORG-107',
};

const HOLDER_TO_ORGID = {
  'GlobalTech Solutions': 'ORG-101',
  'EcoEdge Industries': 'ORG-102',
  'SecureCore Systems': 'ORG-103',
  'Alpha Manufacturing': 'ORG-104',
  'Zenith Healthcare': 'ORG-105',
  'Nova Retail': 'ORG-106',
  'BrightPath Logistics': 'ORG-107',
};

const AUDIT_STATUS_MAP = {
  'In Progress': 'Execution',
  'Scheduled': 'Planning',
  'Findings Open': 'Findings',
  'Closed': 'Closed',
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Submissions and responses are cleared alongside the questions: a submission
  // that outlives the questions it answers scores against nothing.
  const models = [User, Organization, Framework, Audit, Finding, Risk, Control, Certificate, Document, Notification, CAPA, Evidence, EvidenceLink, Vendor,
    QuestionnaireQuestion, QuestionnaireSubmission, QuestionnaireResponse];
  for (const Model of models) {
    await Model.deleteMany({});
  }
  console.log('All collections cleared');

  // ── 1. Seed Organizations ──
  const orgsData = [
    { orgId: 'ORG-101', name: 'GlobalTech Solutions', industry: 'Information Technology', country: 'India', type: 'Own Organization', compliance: 92, risk: 18, activeAudits: 4, certs: 6, docs: 41, contact: 'Priya Sharma' },
    { orgId: 'ORG-102', name: 'EcoEdge Industries', industry: 'Manufacturing', country: 'Germany', type: 'Supplier', compliance: 78, risk: 34, activeAudits: 1, certs: 3, docs: 19, contact: 'Lukas Vogel' },
    { orgId: 'ORG-103', name: 'SecureCore Systems', industry: 'Cybersecurity', country: 'United States', type: 'Vendor', compliance: 95, risk: 9, activeAudits: 2, certs: 8, docs: 27, contact: 'Amanda Reyes' },
    { orgId: 'ORG-104', name: 'Alpha Manufacturing', industry: 'Industrial Manufacturing', country: 'India', type: 'Supplier', compliance: 64, risk: 57, activeAudits: 2, certs: 2, docs: 14, contact: 'Ravi Menon' },
    { orgId: 'ORG-105', name: 'Zenith Healthcare', industry: 'Healthcare', country: 'United Kingdom', type: 'Partner', compliance: 88, risk: 21, activeAudits: 1, certs: 5, docs: 33, contact: 'Dr. Helen Ford' },
    { orgId: 'ORG-106', name: 'Nova Retail', industry: 'Retail & E-commerce', country: 'Singapore', type: 'Client', compliance: 71, risk: 40, activeAudits: 0, certs: 2, docs: 9, contact: 'Wei Ling Tan' },
    { orgId: 'ORG-107', name: 'BrightPath Logistics', industry: 'Logistics', country: 'India', type: 'Vendor', compliance: 59, risk: 66, activeAudits: 1, certs: 1, docs: 7, contact: 'Suresh Iyer' },
  ];
  const orgs = await Organization.insertMany(orgsData);
  console.log(`  ✔ Organizations: ${orgs.length}`);

  // ── 2. Seed Frameworks ──
  const frameworksData = [
    { name: 'ISO/IEC 27001:2022', category: 'Standard', domain: 'Information Security', certifiable: true, currentVersion: '2022', jurisdiction: 'International', description: 'International standard for information security management systems (ISMS).', status: 'Active', orgId: 'ORG-101' },
    { name: 'ISO 9001:2015', category: 'Standard', domain: 'Quality Management', certifiable: true, currentVersion: '2015', jurisdiction: 'International', description: 'Quality management systems standard focused on customer satisfaction and continuous improvement.', status: 'Active', orgId: 'ORG-101' },
    { name: 'ISO 14001:2015', category: 'Standard', domain: 'Environmental Management', certifiable: true, currentVersion: '2015', jurisdiction: 'International', description: 'Environmental management systems standard for reducing environmental impact.', status: 'Active', orgId: 'ORG-101' },
    { name: 'ISO 45001:2018', category: 'Standard', domain: 'Health & Safety', certifiable: true, currentVersion: '2018', jurisdiction: 'International', description: 'Occupational health and safety management systems standard.', status: 'Active', orgId: 'ORG-101' },
    { name: 'AICPA SOC 2', category: 'Standard', domain: 'Cybersecurity', certifiable: true, currentVersion: '2024', jurisdiction: 'United States', description: 'Trust service criteria for security, availability, processing integrity, confidentiality, and privacy.', status: 'Active', orgId: 'ORG-101' },
    { name: 'GDPR', category: 'Regulation', domain: 'Data Privacy', certifiable: false, currentVersion: '2018', jurisdiction: 'European Union', description: 'General Data Protection Regulation for data privacy and protection.', status: 'Active', orgId: 'ORG-101' },
    { name: 'PCI DSS v4.0', category: 'Framework', domain: 'Payment Security', certifiable: true, currentVersion: '4.0', jurisdiction: 'International', description: 'Payment Card Industry Data Security Standard for protecting cardholder data.', status: 'Active', orgId: 'ORG-101' },
    { name: 'SOX 404', category: 'Regulation', domain: 'Financial Reporting', certifiable: false, currentVersion: '2002', jurisdiction: 'United States', description: 'Sarbanes-Oxley Act — internal controls over financial reporting compliance.', status: 'Active', orgId: 'ORG-101' },
    { name: 'GRI Standards', category: 'Reporting', domain: 'Sustainability', certifiable: false, currentVersion: '2021', jurisdiction: 'International', description: 'Global Reporting Initiative standards for sustainability reporting.', status: 'Active', orgId: 'ORG-101' },
    { name: 'NIST CSF', category: 'Framework', domain: 'Cybersecurity', certifiable: false, currentVersion: '2.0', jurisdiction: 'United States', description: 'National Institute of Standards and Technology Cybersecurity Framework.', status: 'Active', orgId: 'ORG-101' },
    { name: 'COBIT 2019', category: 'Framework', domain: 'IT Governance', certifiable: false, currentVersion: '2019', jurisdiction: 'International', description: 'Control Objectives for Information and Related Technologies — IT governance framework.', status: 'Active', orgId: 'ORG-101' },
    { name: 'HIPAA', category: 'Regulation', domain: 'Healthcare', certifiable: false, currentVersion: '1996', jurisdiction: 'United States', description: 'Health Insurance Portability and Accountability Act for healthcare data privacy.', status: 'Active', orgId: 'ORG-101' },
    { name: 'Custom Framework', category: 'Framework', domain: 'General', certifiable: false, currentVersion: '1.0', jurisdiction: 'Internal', description: 'Custom internal compliance framework.', status: 'Draft', orgId: 'ORG-101' },
  ];
  const frameworks = await Framework.insertMany(frameworksData);
  console.log(`  ✔ Frameworks: ${frameworks.length}`);

  // ── 3. Seed Users (all password = "password123") ──
  const hashedPassword = await bcrypt.hash('password123', 12);
  const usersData = [
    { name: 'Priya Sharma', role: 'Compliance Manager', email: 'priya.sharma@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Rohit Kapoor', role: 'Auditor', email: 'rohit.kapoor@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Meera Nair', role: 'Audit Manager', email: 'meera.nair@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Ananya Desai', role: 'Auditor', email: 'ananya.desai@globaltech.com', status: 'On Leave', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Arjun Verma', role: 'Risk Manager', email: 'arjun.verma@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Kritika Bose', role: 'Document Manager', email: 'kritika.bose@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'James Whitfield', role: 'External Company User', email: 'jwhitfield@securecore.com', status: 'Active', orgId: 'ORG-103', orgName: 'SecureCore Systems', password: hashedPassword },
    { name: 'Admin User', role: 'Super Admin', email: 'super.admin@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Org Admin', role: 'Organization Admin', email: 'org.admin@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Reviewer User', role: 'Reviewer', email: 'reviewer@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Vendor Manager', role: 'Vendor Manager', email: 'vendor.mgr@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'Employee User', role: 'Employee', email: 'employee@globaltech.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
    { name: 'CA Consultant', role: 'CA / Consultant', email: 'ca@consulting.com', status: 'Active', orgId: 'ORG-101', orgName: 'GlobalTech Solutions', password: hashedPassword },
  ];
  // Use insertMany with lean to bypass pre-save hook (passwords already hashed)
  const users = await User.insertMany(usersData);
  const userMap = {};
  users.forEach((u, i) => { userMap[usersData[i].email] = u._id; });
  console.log(`  ✔ Users: ${users.length}`);

  // ── 4. Seed Audits ──
  const auditsData = [
    { mockId: 'AUD-2026-014', title: 'ISO 27001 Surveillance Audit', type: 'Information Security Audit', frameworkId: 'ISO/IEC 27001:2022', orgId: 'ORG-101', status: AUDIT_STATUS_MAP['In Progress'], stageIdx: 11, lead: 'Rohit Kapoor', start: new Date('2026-06-15'), due: new Date('2026-08-05'), scope: 'Corporate IT infrastructure, data centers, and access management controls across the Bangalore and Pune facilities.' },
    { mockId: 'AUD-2026-015', title: 'SOC 2 Type II Readiness Audit', type: 'Cybersecurity Audit', frameworkId: 'AICPA SOC 2', orgId: 'ORG-103', status: AUDIT_STATUS_MAP['In Progress'], stageIdx: 6, lead: 'James Whitfield', start: new Date('2026-07-01'), due: new Date('2026-09-10'), scope: 'Trust service criteria: Security, Availability and Confidentiality for the core SaaS platform.' },
    { mockId: 'AUD-2026-016', title: 'Supplier Quality Audit — Q3', type: 'Quality Audit', frameworkId: 'ISO 9001:2015', orgId: 'ORG-104', status: AUDIT_STATUS_MAP['Findings Open'], stageIdx: 11, lead: 'Ananya Desai', start: new Date('2026-06-01'), due: new Date('2026-07-25'), scope: 'Production line quality controls, incoming material inspection, and supplier corrective action history.' },
    { mockId: 'AUD-2026-017', title: 'GDPR Data Privacy Compliance Review', type: 'Compliance Audit', frameworkId: 'GDPR', orgId: 'ORG-105', status: AUDIT_STATUS_MAP['In Progress'], stageIdx: 2, lead: 'Meera Nair', start: new Date('2026-07-10'), due: new Date('2026-09-01'), scope: 'Patient data handling, consent management and cross-border data transfer processes.' },
    { mockId: 'AUD-2026-018', title: 'ESG Sustainability Audit', type: 'Environmental Audit', frameworkId: 'GRI Standards', orgId: 'ORG-102', status: AUDIT_STATUS_MAP['Scheduled'], stageIdx: 0, lead: 'Carlos Mendes', start: new Date('2026-08-01'), due: new Date('2026-09-30'), scope: 'Environmental impact, labor practices and governance disclosures for FY26.' },
    { mockId: 'AUD-2026-019', title: 'Vendor Onboarding Compliance Audit', type: 'Compliance Audit', orgId: 'ORG-107', status: AUDIT_STATUS_MAP['In Progress'], stageIdx: 10, lead: 'Fatima Al-Sayed', start: new Date('2026-07-05'), due: new Date('2026-08-15'), scope: 'Onboarding documentation, insurance validity, and regulatory license verification.' },
    { mockId: 'AUD-2026-011', title: 'Internal Financial Controls Audit', type: 'Financial Audit', frameworkId: 'SOX 404', orgId: 'ORG-101', status: AUDIT_STATUS_MAP['Closed'], stageIdx: 11, lead: 'Meera Nair', start: new Date('2026-04-01'), due: new Date('2026-05-30'), scope: 'Revenue recognition controls and quarterly close process.' },
    { mockId: 'AUD-2026-012', title: 'PCI DSS Compliance Audit', type: 'IT Audit', frameworkId: 'PCI DSS v4.0', orgId: 'ORG-106', status: AUDIT_STATUS_MAP['Closed'], stageIdx: 11, lead: 'James Whitfield', start: new Date('2026-03-10'), due: new Date('2026-04-28'), scope: 'Payment card data environment and cardholder data storage controls.' },
  ];
  const audits = await Audit.insertMany(auditsData);
  const auditMap = {};
  audits.forEach((a, i) => { auditMap[auditsData[i].mockId] = a._id; });
  console.log(`  ✔ Audits: ${audits.length}`);

  // ── 5. Seed Controls ──
  const controlsData = [
    { mockId: 'CTL-001', name: 'Privileged Access Management', family: 'Access Control', frameworkId: 'ISO/IEC 27001:2022', owner: 'Rohit Kapoor', effectiveness: 'Effective', mappedRisks: ['RSK-001'], standard: 'ISO 27001 A.8.2', orgId: 'ORG-101' },
    { mockId: 'CTL-002', name: 'Dual Approval for Payments >₹5L', family: 'Financial Controls', frameworkId: 'SOX 404', owner: 'Meera Nair', effectiveness: 'Partially Effective', mappedRisks: ['RSK-004'], standard: 'SOX 404', orgId: 'ORG-101' },
    { mockId: 'CTL-004', name: 'Quarterly Access Recertification', family: 'Access Control', frameworkId: 'ISO/IEC 27001:2022', owner: 'Rohit Kapoor', effectiveness: 'Effective', mappedRisks: ['RSK-001'], standard: 'ISO 27001 A.8.2', orgId: 'ORG-101' },
    { mockId: 'CTL-005', name: '24x7 Security Incident Response Team', family: 'Cybersecurity', frameworkId: 'AICPA SOC 2', owner: 'James Whitfield', effectiveness: 'Effective', mappedRisks: ['RSK-006'], standard: 'SOC 2 CC7', orgId: 'ORG-103' },
    { mockId: 'CTL-006', name: 'Cross-Border Data Transfer Approval Workflow', family: 'Data Privacy', frameworkId: 'GDPR', owner: 'Meera Nair', effectiveness: 'Needs Improvement', mappedRisks: ['RSK-003'], standard: 'GDPR Art. 46', orgId: 'ORG-101' },
    { mockId: 'CTL-008', name: 'Supplier Material Certification Check', family: 'Quality', frameworkId: 'ISO 9001:2015', owner: 'Ananya Desai', effectiveness: 'Partially Effective', mappedRisks: ['RSK-005'], standard: 'ISO 9001 8.4', orgId: 'ORG-101' },
    { mockId: 'CTL-009', name: 'Automated Certificate Expiry Monitoring', family: 'Vendor Management', owner: 'Fatima Al-Sayed', effectiveness: 'Effective', mappedRisks: ['RSK-002'], standard: 'Internal Framework', orgId: 'ORG-101' },
  ];
  const controls = await Control.insertMany(controlsData);
  const controlMap = {};
  controls.forEach((c, i) => { controlMap[controlsData[i].mockId] = c._id; });
  console.log(`  ✔ Controls: ${controls.length}`);

  // ── 6. Seed Findings ──
  const findingsData = [
    { mockId: 'FND-2026-041', title: 'Penetration test overdue by 4 months', severity: 'High', risk: 'High', auditId: auditMap['AUD-2026-014'], controlId: controlMap['CTL-004'], owner: 'Rohit Kapoor', due: new Date('2026-08-01'), status: 'In Progress', cause: 'Annual pen-test vendor contract lapsed and was not renewed before expiry.', action: 'Engage certified pen-test vendor and complete testing within 30 days.', verification: 'Pending — awaiting test report.', criteria: 'ISO 27001 A.8.2', consequence: 'Potential data breach due to unpatched vulnerabilities and regulatory non-compliance with fines up to 4% of annual turnover.', orgId: 'ORG-101' },
    { mockId: 'FND-2026-042', title: 'Incoming material inspection log incomplete for June batch', severity: 'Medium', risk: 'Medium', auditId: auditMap['AUD-2026-016'], controlId: controlMap['CTL-008'], owner: 'Ananya Desai', due: new Date('2026-07-28'), status: 'Open', cause: 'Manual logging process skipped during peak production week.', action: 'Digitize inspection log and add mandatory sign-off step.', verification: 'Not started.', criteria: 'ISO 9001 8.4', consequence: 'Defective products may reach customers leading to recalls, warranty claims, and reputational damage to the brand.', orgId: 'ORG-104' },
    { mockId: 'FND-2026-043', title: 'Cross-border transfer approvals missing for 3 vendor records', severity: 'Critical', risk: 'High', auditId: auditMap['AUD-2026-017'], controlId: controlMap['CTL-006'], owner: 'Meera Nair', due: new Date('2026-07-30'), status: 'Open', cause: 'Legal review step in workflow was bypassed for legacy vendor records.', action: 'Backfill legal review and enforce workflow gate for all new transfers.', verification: 'Not started.', criteria: 'GDPR Art. 46', consequence: 'Regulatory fines of up to €20 million or 4% of global annual turnover under GDPR, plus potential data subject litigation and reputational damage.', orgId: 'ORG-105' },
    { mockId: 'FND-2026-039', title: 'Badge access not revoked for 2 offboarded contractors', severity: 'Medium', risk: 'Medium', auditId: auditMap['AUD-2026-011'], controlId: controlMap['CTL-001'], owner: 'Rohit Kapoor', due: new Date('2026-06-20'), status: 'Resolved', cause: 'Offboarding checklist did not include facilities badge deactivation.', action: 'Added badge deactivation step to HR offboarding checklist.', verification: 'Verified 2026-06-18 — access confirmed revoked.', criteria: 'SOX 404', consequence: 'Unauthorized physical access to secure areas could result in data theft, equipment tampering, or safety incidents with potential legal liability.', orgId: 'ORG-101' },
    { mockId: 'FND-2026-035', title: 'Payment approval dual sign-off bypassed twice in Q2', severity: 'High', risk: 'Medium', auditId: auditMap['AUD-2026-011'], controlId: controlMap['CTL-002'], owner: 'Meera Nair', due: new Date('2026-06-10'), status: 'Closed', cause: 'Emergency payment path allowed single-approver override without audit trail flag.', action: 'Removed override path; all emergency payments now require CFO co-sign.', verification: 'Verified 2026-06-05 — control tested effective.', criteria: 'SOX 404', consequence: 'Unauthorized payments could lead to financial loss, fraud, and breach of fiduciary duties with potential legal and regulatory consequences.', orgId: 'ORG-101' },
    { mockId: 'FND-2026-044', title: 'Vendor insurance certificate expired, shipment not held', severity: 'High', risk: 'High', auditId: auditMap['AUD-2026-019'], controlId: controlMap['CTL-009'], owner: 'Fatima Al-Sayed', due: new Date('2026-08-10'), status: 'Overdue', cause: 'Expiry alert threshold set too short to allow procurement action.', action: 'Reduce alert threshold to 60 days and add auto-hold on shipment release.', verification: 'Not started.', criteria: 'Internal Framework v3', consequence: 'Uninsured shipments expose the organization to full liability for loss or damage, with financial impact potentially exceeding $500K per incident.', orgId: 'ORG-107' },
  ];
  const findings = await Finding.insertMany(findingsData);
  const findingMap = {};
  findings.forEach((f, i) => { findingMap[findingsData[i].mockId] = f._id; });
  console.log(`  ✔ Findings: ${findings.length}`);

  // ── 7. Seed Risks ──
  const risksData = [
    { mockId: 'RSK-001', title: 'Unauthorized access to production data', category: 'Information Security', inherent: 'High', residual: 'Medium', owner: 'Rohit Kapoor', linkedControls: [controlMap['CTL-001'], controlMap['CTL-004']], orgId: 'ORG-101' },
    { mockId: 'RSK-002', title: 'Vendor certificate expiry causing supply disruption', category: 'Vendor Risk', inherent: 'Medium', residual: 'Low', owner: 'Fatima Al-Sayed', linkedControls: [controlMap['CTL-009']], orgId: 'ORG-107' },
    { mockId: 'RSK-003', title: 'Non-compliance with GDPR cross-border transfer rules', category: 'Regulatory', inherent: 'High', residual: 'High', owner: 'Meera Nair', linkedControls: [controlMap['CTL-006']], orgId: 'ORG-105' },
    { mockId: 'RSK-004', title: 'Inadequate segregation of duties in payment approval', category: 'Financial', inherent: 'High', residual: 'Medium', owner: 'Meera Nair', linkedControls: [controlMap['CTL-002']], orgId: 'ORG-101' },
    { mockId: 'RSK-005', title: 'Substandard raw material from uncertified supplier', category: 'Operational', inherent: 'Medium', residual: 'Medium', owner: 'Ananya Desai', linkedControls: [controlMap['CTL-008']], orgId: 'ORG-104' },
    { mockId: 'RSK-006', title: 'Insufficient incident response readiness', category: 'Cybersecurity', inherent: 'High', residual: 'Medium', owner: 'James Whitfield', linkedControls: [controlMap['CTL-005']], orgId: 'ORG-103' },
  ];
  const risks = await Risk.insertMany(risksData);
  console.log(`  ✔ Risks: ${risks.length}`);

  // ── 8. Seed Certificates ──
  const certsData = [
    { mockId: 'CRT-1001', name: 'ISO/IEC 27001:2022', number: 'IS-27001-88291', issuer: 'BSI Group', holder: 'GlobalTech Solutions', type: 'Information Security', issue: new Date('2024-08-10'), expiry: new Date('2027-08-09'), status: 'Active', verified: true, orgId: 'ORG-101' },
    { mockId: 'CRT-1002', name: 'SOC 2 Type II', number: 'SOC2-4471-A', issuer: 'Deloitte Assurance', holder: 'SecureCore Systems', type: 'Cybersecurity', issue: new Date('2025-09-01'), expiry: new Date('2026-08-15'), status: 'Expiring Soon', verified: true, orgId: 'ORG-103' },
    { mockId: 'CRT-1003', name: 'ISO 9001:2015', number: 'QMS-9001-33210', issuer: 'TÜV SÜD', holder: 'Alpha Manufacturing', type: 'Quality', issue: new Date('2023-05-20'), expiry: new Date('2026-07-24'), status: 'Expiring Soon', verified: true, orgId: 'ORG-104' },
    { mockId: 'CRT-1004', name: 'PCI DSS v4.0', number: 'PCI-4408-N', issuer: 'Trustwave', holder: 'Nova Retail', type: 'Payment Security', issue: new Date('2025-04-28'), expiry: new Date('2026-04-27'), status: 'Expired', verified: false, orgId: 'ORG-106' },
    { mockId: 'CRT-1005', name: 'GDPR Compliance Attestation', number: 'GDPR-ATT-7712', issuer: 'DataGuard EU', holder: 'Zenith Healthcare', type: 'Data Privacy', issue: new Date('2025-11-12'), expiry: new Date('2027-11-11'), status: 'Active', verified: true, orgId: 'ORG-105' },
    { mockId: 'CRT-1006', name: 'ISO 14001:2015 Environmental', number: 'ENV-14001-2290', issuer: 'SGS', holder: 'EcoEdge Industries', type: 'Environmental', issue: new Date('2024-02-15'), expiry: new Date('2026-07-27'), status: 'Expiring Soon', verified: true, orgId: 'ORG-102' },
    { mockId: 'CRT-1007', name: 'Business Liability Insurance', number: 'INS-LIB-5502', issuer: 'Marsh McLennan', holder: 'BrightPath Logistics', type: 'Insurance', issue: new Date('2025-06-01'), expiry: new Date('2026-06-01'), status: 'Expired', verified: false, orgId: 'ORG-107' },
    { mockId: 'CRT-1008', name: 'ISO 45001 Health & Safety', number: 'OHS-45001-1187', issuer: 'Bureau Veritas', holder: 'Alpha Manufacturing', type: 'Health & Safety', issue: new Date('2024-09-10'), expiry: new Date('2027-09-09'), status: 'Active', verified: true, orgId: 'ORG-104' },
    { mockId: 'CRT-1009', name: 'CMMI Level 3 Appraisal', number: 'CMMI-L3-3390', issuer: 'ISACA', holder: 'GlobalTech Solutions', type: 'Process Maturity', issue: new Date('2025-01-15'), expiry: new Date('2028-01-14'), status: 'Active', verified: true, orgId: 'ORG-101' },
    { mockId: 'CRT-1010', name: 'Vendor Trade License', number: 'TL-2026-88410', issuer: 'Govt. of Singapore', holder: 'Nova Retail', type: 'Business License', issue: new Date('2025-12-01'), expiry: new Date('2026-08-05'), status: 'Expiring Soon', verified: true, orgId: 'ORG-106' },
  ];
  const certs = await Certificate.insertMany(certsData);
  const certMap = {};
  certs.forEach((c, i) => { certMap[certsData[i].mockId] = c._id; });
  console.log(`  ✔ Certificates: ${certs.length}`);

  // ── 9. Seed Documents ──
  const docsData = [
    { mockId: 'DOC-501', name: 'Information Security Policy v4.2', type: 'Policy', version: '4.2', uploadedBy: 'Rohit Kapoor', expiry: new Date('2027-05-02'), status: 'Approved', orgId: 'ORG-101', relatedAuditId: auditMap['AUD-2026-014'] },
    { mockId: 'DOC-502', name: 'ISO 27001 Certificate — Scanned Copy', type: 'Certificate', version: '1.0', uploadedBy: 'Priya Sharma', expiry: new Date('2027-08-09'), status: 'Verified', orgId: 'ORG-101', relatedAuditId: auditMap['AUD-2026-014'] },
    { mockId: 'DOC-503', name: 'SOC 2 Type II Report — 2025', type: 'Audit Evidence', version: '1.0', uploadedBy: 'James Whitfield', expiry: new Date('2026-08-15'), status: 'Verified', orgId: 'ORG-103', relatedAuditId: auditMap['AUD-2026-015'] },
    { mockId: 'DOC-504', name: 'Vendor Master Service Agreement', type: 'Contract', version: '2.1', uploadedBy: 'Fatima Al-Sayed', expiry: new Date('2027-01-19'), status: 'Approved', orgId: 'ORG-107', relatedAuditId: auditMap['AUD-2026-019'] },
    { mockId: 'DOC-505', name: 'Employee Security Awareness Training Records — Q2', type: 'Training Record', version: '1.0', uploadedBy: 'Meera Nair', expiry: null, status: 'Approved', orgId: 'ORG-101', relatedAuditId: null },
    { mockId: 'DOC-506', name: 'Business Insurance Certificate', type: 'Certificate', version: '1.0', uploadedBy: 'Suresh Iyer', expiry: new Date('2026-06-01'), status: 'Expired', orgId: 'ORG-107', relatedAuditId: auditMap['AUD-2026-019'] },
    { mockId: 'DOC-507', name: 'Data Processing Agreement — EU Annex', type: 'Compliance Document', version: '1.3', uploadedBy: 'Meera Nair', expiry: new Date('2028-07-10'), status: 'Under Review', orgId: 'ORG-105', relatedAuditId: auditMap['AUD-2026-017'] },
    { mockId: 'DOC-508', name: 'Supplier Quality Manual', type: 'Procedure', version: '3.0', uploadedBy: 'Ananya Desai', expiry: null, status: 'Approved', orgId: 'ORG-104', relatedAuditId: auditMap['AUD-2026-016'] },
  ];
  const docs = await Document.insertMany(docsData);
  console.log(`  ✔ Documents: ${docs.length}`);

  // ── 9b. Seed Vendors (GlobalTech's supply chain) ──
  const vendorsData = [
    { name: 'EcoEdge Industries', contact: 'Lukas Vogel', email: 'lukas@ecoedge.de', riskTier: 'Medium', complianceScore: 78, onboardingStatus: 'Active', certIds: [certMap['CRT-1006']], contractRef: 'CT-2025-118', performanceScore: 82, lastAssessment: new Date('2026-06-20'), orgId: 'ORG-101', vendorOrgId: 'ORG-102' },
    { name: 'SecureCore Systems', contact: 'Amanda Reyes', email: 'amanda@securecore.com', riskTier: 'Low', complianceScore: 95, onboardingStatus: 'Active', certIds: [certMap['CRT-1002']], contractRef: 'CT-2024-077', performanceScore: 94, lastAssessment: new Date('2026-07-02'), orgId: 'ORG-101', vendorOrgId: 'ORG-103' },
    { name: 'Alpha Manufacturing', contact: 'Ravi Menon', email: 'ravi@alphamfg.in', riskTier: 'High', complianceScore: 64, onboardingStatus: 'Active', certIds: [certMap['CRT-1003'], certMap['CRT-1008']], contractRef: 'CT-2023-203', performanceScore: 71, lastAssessment: new Date('2026-05-18'), orgId: 'ORG-101', vendorOrgId: 'ORG-104' },
    { name: 'Zenith Healthcare', contact: 'Dr. Helen Ford', email: 'h.ford@zenithhealth.uk', riskTier: 'Medium', complianceScore: 88, onboardingStatus: 'Active', certIds: [certMap['CRT-1005']], contractRef: 'CT-2024-311', performanceScore: 89, lastAssessment: new Date('2026-06-30'), orgId: 'ORG-101', vendorOrgId: 'ORG-105' },
    { name: 'Nova Retail', contact: 'Wei Ling Tan', email: 'wl.tan@novaretail.sg', riskTier: 'High', complianceScore: 71, onboardingStatus: 'Onboarding', certIds: [certMap['CRT-1004'], certMap['CRT-1010']], contractRef: null, performanceScore: null, lastAssessment: null, orgId: 'ORG-101', vendorOrgId: 'ORG-106' },
    { name: 'BrightPath Logistics', contact: 'Suresh Iyer', email: 'suresh@brightpath.in', riskTier: 'Critical', complianceScore: 59, onboardingStatus: 'Suspended', certIds: [certMap['CRT-1007']], contractRef: 'CT-2022-090', performanceScore: 55, lastAssessment: new Date('2026-04-12'), orgId: 'ORG-101', vendorOrgId: 'ORG-107' },
    { name: 'Phoenix Cloud Services', contact: 'Maya Rao', email: 'maya@phoenixcloud.io', riskTier: 'Medium', complianceScore: 81, onboardingStatus: 'Active', certIds: [], contractRef: 'CT-2026-014', performanceScore: 87, lastAssessment: new Date('2026-07-10'), orgId: 'ORG-101', vendorOrgId: null },
    { name: 'Vertex Legal LLP', contact: 'Kabir Mehta', email: 'kabir@vertexlegal.in', riskTier: 'Low', complianceScore: 90, onboardingStatus: 'Invited', certIds: [], contractRef: null, performanceScore: null, lastAssessment: null, orgId: 'ORG-101', vendorOrgId: null },
  ];
  const vendors = await Vendor.insertMany(vendorsData);
  console.log(`  ✔ Vendors: ${vendors.length}`);

  // ── 10. Seed Notifications (4) — real user _ids so the bell actually shows data ──
  const notifData = [
    { userId: userMap['priya.sharma@globaltech.com'], orgId: 'ORG-101', type: 'cert_expiry', title: 'ISO 9001 certificate expires in 3 days', body: 'Alpha Manufacturing — QMS-9001-33210 expires 24 Jul 2026.', unread: true, metadata: { entityType: 'Certificate', entityId: 'CRT-1003' } },
    { userId: userMap['meera.nair@globaltech.com'], orgId: 'ORG-101', type: 'finding_overdue', title: 'Critical finding overdue', body: 'FND-2026-044 — Vendor insurance certificate expired, shipment not held.', unread: true, metadata: { entityType: 'Finding', entityId: 'FND-2026-044' } },
    { userId: userMap['priya.sharma@globaltech.com'], orgId: 'ORG-101', type: 'doc_shared', title: 'Document shared with you', body: 'EcoEdge Industries shared "ISO 14001 Certificate" with GlobalTech Solutions.', unread: true, metadata: { entityType: 'Document', entityId: 'DOC-506' } },
    { userId: userMap['rohit.kapoor@globaltech.com'], orgId: 'ORG-101', type: 'audit_due', title: 'New audit assigned', body: 'You were assigned as lead auditor for AUD-2026-017 — GDPR Data Privacy Compliance Review.', unread: false, metadata: { entityType: 'Audit', entityId: 'AUD-2026-017' } },
  ];
  const notifs = await Notification.insertMany(notifData);
  console.log(`  ✔ Notifications: ${notifs.length}`);

  // ── 11. Seed CAPA items (4) ──
  const capaData = [
    { title: 'CAPA for Penetration Test Overdue', findingId: findingMap['FND-2026-041'], rootCause: 'Annual pen-test vendor contract lapsed and was not renewed before expiry.', actionPlan: 'Engage certified pen-test vendor and complete testing within 30 days.', verificationCriteria: 'Test report received and vulnerabilities addressed', owner: 'Rohit Kapoor', due: new Date('2026-08-01'), severity: 'High', status: 'In Progress', orgId: 'ORG-101' },
    { title: 'CAPA for Incomplete Material Inspection Log', findingId: findingMap['FND-2026-042'], rootCause: 'Manual logging process skipped during peak production week.', actionPlan: 'Digitize inspection log and add mandatory sign-off step.', verificationCriteria: 'Digital log operational with mandatory sign-off', owner: 'Ananya Desai', due: new Date('2026-07-28'), severity: 'Medium', status: 'Open', orgId: 'ORG-104' },
    { title: 'CAPA for Cross-Border Transfer Approval Gaps', findingId: findingMap['FND-2026-043'], rootCause: 'Legal review step in workflow was bypassed for legacy vendor records.', actionPlan: 'Backfill legal review and enforce workflow gate for all new transfers.', verificationCriteria: 'All transfers have legal review approval', owner: 'Meera Nair', due: new Date('2026-07-30'), severity: 'Critical', status: 'Open', orgId: 'ORG-105' },
    { title: 'CAPA for Vendor Insurance Certificate Expiry', findingId: findingMap['FND-2026-044'], rootCause: 'Expiry alert threshold set too short to allow procurement action.', actionPlan: 'Reduce alert threshold to 60 days and add auto-hold on shipment release.', verificationCriteria: 'Auto-hold functioning; 60-day alerts active', owner: 'Fatima Al-Sayed', due: new Date('2026-08-10'), severity: 'High', status: 'Open', orgId: 'ORG-107' },
  ];
  const capaItems = await CAPA.insertMany(capaData);
  console.log(`  ✔ CAPA Items: ${capaItems.length}`);

  // ── 12. Seed Evidence ──
  const evidenceData = [
    { mockId: 'EVD-001', name: 'Penetration Test Report Q2 2026', type: 'Document', filePath: '/uploads/pentest-q2-2026.pdf', version: '1.0', uploadedBy: 'Rohit Kapoor', expiry: new Date('2027-06-30'), confidentiality: 'confidential', verificationStatus: 'Verified', status: 'Approved', orgId: 'ORG-101', relatedAuditId: auditMap['AUD-2026-014'] },
    { mockId: 'EVD-002', name: 'Access Recertification Log — June 2026', type: 'System Record', filePath: '/uploads/access-recert-jun2026.xlsx', version: '2.0', uploadedBy: 'Rohit Kapoor', expiry: null, confidentiality: 'internal', verificationStatus: 'Verified', status: 'Approved', orgId: 'ORG-101', relatedAuditId: auditMap['AUD-2026-014'] },
    { mockId: 'EVD-003', name: 'Payment Approval Exception Report', type: 'Screenshot', filePath: '/uploads/payment-exceptions-q2.png', version: '1.0', uploadedBy: 'Meera Nair', expiry: null, confidentiality: 'restricted', verificationStatus: 'Pending', status: 'Under Review', orgId: 'ORG-101', relatedAuditId: auditMap['AUD-2026-011'] },
    { mockId: 'EVD-004', name: 'SOC 2 Type II Evidence Package', type: 'Document', filePath: '/uploads/soc2-evidence-2025.pdf', version: '1.0', uploadedBy: 'James Whitfield', expiry: new Date('2026-08-15'), confidentiality: 'confidential', verificationStatus: 'Verified', status: 'Approved', orgId: 'ORG-103', relatedAuditId: auditMap['AUD-2026-015'] },
    { mockId: 'EVD-005', name: 'Material Inspection Log — June Batch', type: 'Excel', filePath: '/uploads/inspection-log-jun2026.xlsx', version: '1.0', uploadedBy: 'Ananya Desai', expiry: null, confidentiality: 'internal', verificationStatus: 'Rejected', status: 'Draft', orgId: 'ORG-104', relatedAuditId: auditMap['AUD-2026-016'] },
    { mockId: 'EVD-006', name: 'GDPR Consent Management Screenshots', type: 'Screenshot', filePath: '/uploads/gdpr-consent-flow.png', version: '1.0', uploadedBy: 'Meera Nair', expiry: null, confidentiality: 'confidential', verificationStatus: 'Pending', status: 'Submitted', orgId: 'ORG-105', relatedAuditId: auditMap['AUD-2026-017'] },
  ];
  const evidenceItems = await Evidence.insertMany(evidenceData);
  const evidenceMap = {};
  evidenceItems.forEach((e, i) => { evidenceMap[evidenceData[i].mockId] = e._id; });
  console.log(`  ✔ Evidence: ${evidenceItems.length}`);

  // ── 13. Seed Evidence Links ──
  const linkData = [
    { evidenceId: evidenceMap['EVD-001'], targetType: 'finding', targetId: findingMap['FND-2026-041'].toString(), targetTitle: 'Penetration test overdue by 4 months', orgId: 'ORG-101', linkedBy: 'Rohit Kapoor', notes: 'Proof of overdue pen-test' },
    { evidenceId: evidenceMap['EVD-002'], targetType: 'finding', targetId: findingMap['FND-2026-041'].toString(), targetTitle: 'Penetration test overdue by 4 months', orgId: 'ORG-101', linkedBy: 'Rohit Kapoor', notes: 'Access recertification control evidence' },
    { evidenceId: evidenceMap['EVD-002'], targetType: 'control', targetId: controlMap['CTL-004'].toString(), targetTitle: 'Quarterly Access Recertification', orgId: 'ORG-101', linkedBy: 'Rohit Kapoor', notes: 'Control effectiveness evidence' },
    { evidenceId: evidenceMap['EVD-003'], targetType: 'finding', targetId: findingMap['FND-2026-035'].toString(), targetTitle: 'Payment approval dual sign-off bypassed twice in Q2', orgId: 'ORG-101', linkedBy: 'Meera Nair', notes: 'Screenshot of exception report' },
  ];
  const links = await EvidenceLink.insertMany(linkData);
  console.log(`  ✔ Evidence Links: ${links.length}`);

  /*
   * ── 14. Seed Questionnaire questions ──────────────────────────────────────
   *
   * Published, not Draft: a Draft question is not answerable, so seeding drafts
   * would leave the answering screen as empty as seeding nothing at all — the
   * failure this section exists to remove.
   *
   * The year is the current one because the answering screen defaults to it.
   * A fixed year would silently stop matching, and the symptom of that is a
   * blank questionnaire with no error, which is the hardest kind to diagnose.
   */
  const fy = String(new Date().getFullYear());

  /** Options, keyed stably — rules address a `key`, never a position. */
  const opts = (rows) => rows.map(([key, label, score], i) => ({
    key, answerLabel: label, displayLabel: label, sortOrder: i + 1, score,
    subAnswer: 'no', subAnswers: [],
  }));

  const questionData = [
    {
      section: 'Environment', questionOrderNo: 1, position: 1, maxMark: 10,
      question: 'Does the organisation hold a valid ISO 14001 environmental management certificate?',
      description: 'Attach the certificate in the evidence section if available.',
      answerType: 'RadioButton',
      answers: opts([['a', 'Yes — currently valid', 10], ['b', 'Applied for / in progress', 5], ['c', 'No', 0]]),
    },
    {
      section: 'Environment', questionOrderNo: 2, position: 2, maxMark: 15,
      question: 'Which of the following emission-reduction measures are in place?',
      description: 'Select every measure that is operational today.',
      answerType: 'CheckBox',
      answers: opts([
        ['a', 'Renewable energy sourcing', 5],
        ['b', 'Energy efficiency programme', 5],
        ['c', 'Scope 1 & 2 emissions measured annually', 5],
        ['d', 'None of the above', 0],
      ]),
    },
    {
      section: 'Governance', questionOrderNo: 3, position: 3, maxMark: 10,
      question: 'Is there a board-approved code of conduct covering anti-bribery and corruption?',
      answerType: 'RadioButton',
      answers: opts([['a', 'Yes — board approved and published', 10], ['b', 'Drafted but not approved', 4], ['c', 'No', 0]]),
    },
    {
      section: 'Governance', questionOrderNo: 4, position: 4, maxMark: 10,
      question: 'How frequently is the supplier risk register reviewed?',
      answerType: 'RadioButton',
      answers: opts([['a', 'Quarterly or more often', 10], ['b', 'Annually', 6], ['c', 'Ad hoc', 2], ['d', 'Not maintained', 0]]),
    },
    {
      section: 'Social', questionOrderNo: 5, position: 5, maxMark: 5,
      question: 'Describe the grievance redressal mechanism available to workers.',
      description: 'A short free-text answer is enough; the assessor awards the marks.',
      answerType: 'Text',
      answers: [],
    },
  ].map((q) => ({
    ...q,
    orgId: 'ORG-101',
    financialYear: fy,
    assessmentYear: fy,
    category: 'Supplier Assessment',
    type: ['OEM'],
    // Explicit rather than left to the default, so the authoring screen shows
    // the same engine the scoring pass will actually run.
    scoringRule: { engine: 'optionSum', config: {} },
    isMarks: true,
    status: 'Published',
    version: 1,
    createdBy: 'seed',
  }));

  const questions = await QuestionnaireQuestion.insertMany(questionData);
  console.log(`  ✔ Questionnaire Questions: ${questions.length} (FY ${fy}, all Published)`);

  // ── Summary ──
  console.log('\n═══════════════════════════════════');
  console.log('  SEEDING COMPLETE');
  console.log('═══════════════════════════════════');
  console.log(`  Organizations : ${orgs.length}`);
  console.log(`  Users         : ${users.length}`);
  console.log(`  Frameworks    : ${frameworks.length}`);
  console.log(`  Audits        : ${audits.length}`);
  console.log(`  Findings      : ${findings.length}`);
  console.log(`  Risks         : ${risks.length}`);
  console.log(`  Controls      : ${controls.length}`);
  console.log(`  Certificates  : ${certs.length}`);
  console.log(`  Documents     : ${docs.length}`);
  console.log(`  Notifications : ${notifs.length}`);
  console.log(`  Vendors       : ${vendors.length}`);
  console.log(`  CAPA Items    : ${capaItems.length}`);
  console.log(`  Evidence      : ${evidenceItems.length}`);
  console.log(`  Evidence Links: ${links.length}`);
  console.log(`  Questions     : ${questions.length}  (FY ${fy}, Published)`);
  console.log('═══════════════════════════════════\n');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
