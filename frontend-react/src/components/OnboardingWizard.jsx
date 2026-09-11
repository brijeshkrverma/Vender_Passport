import { useState, useRef } from 'react';
import Modal from './Modal';
import Stepper from './Stepper';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

export default function OnboardingWizard() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(() => {
    if (!isAuthenticated) return false;
    return !sessionStorage.getItem('vp_onboarding_done');
  });

  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState('GlobalTech Solutions');
  const [industry, setIndustry] = useState('Information Technology');
  const [fileSelected, setFileSelected] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const fileInputRef = useRef(null);

  const STEPS = ['Add your company', 'Upload a certificate', 'Invite a vendor'];

  const skip = () => {
    sessionStorage.setItem('vp_onboarding_done', '1');
    setOpen(false);
    setStep(0);
    setFileSelected(false);
    setVendorName('');
    setVendorEmail('');
    toast('Setup skipped', 'You can complete it anytime from Settings.', 'info');
  };

  const finish = () => {
    sessionStorage.setItem('vp_onboarding_done', '1');
    setOpen(false);
    setStep(0);
    setFileSelected(false);
    setVendorName('');
    setVendorEmail('');
    toast("You're all set");
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFileSelected(true);
  };

  if (!open) return null;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '13.5px',
    border: '1px solid #DAD5C4',
    borderRadius: '6px',
    background: '#FCFBF8',
    color: '#1C2430',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12.5px',
    fontWeight: 600,
    color: '#1C2430',
    marginBottom: '5px',
  };

  const stepContent = [
    <div key="step1">
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Organization Name</label>
        <input
          type="text"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Industry</label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
    </div>,

    <div key="step2">
      <div
        onClick={handleFileClick}
        style={{
          border: '1.5px dashed #DAD5C4',
          borderRadius: '10px',
          padding: '26px',
          textAlign: 'center',
          cursor: 'pointer',
          background: '#FCFBF8',
          transition: 'border-color .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#B8863B'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#DAD5C4'; }}
      >
        {fileSelected ? (
          <div style={{ fontSize: '13.5px', color: '#1F7A4D', fontWeight: 500 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F7A4D" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: '-5px' }}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            ISO_27001_Certificate.pdf selected &#10003;
          </div>
        ) : (
          <div style={{ fontSize: '13.5px', color: '#6C7280' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA0A8" strokeWidth="1.8" style={{ marginBottom: '6px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6M12 18v-6M9 15h6" />
            </svg>
            <div>Click to upload a certificate</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>PDF, up to 25MB</div>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>,

    <div key="step3">
      <div style={{ marginBottom: '14px' }}>
        <label style={labelStyle}>Vendor Name</label>
        <input
          type="text"
          value={vendorName}
          onChange={(e) => setVendorName(e.target.value)}
          style={inputStyle}
          placeholder="Acme Corp"
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label style={labelStyle}>Contact Email</label>
        <input
          type="email"
          value={vendorEmail}
          onChange={(e) => setVendorEmail(e.target.value)}
          style={inputStyle}
          placeholder="contact@acme.com"
          onFocus={(e) => { e.target.style.borderColor = '#B8863B'; e.target.style.boxShadow = '0 0 0 3px rgba(184,134,59,.12)'; }}
          onBlur={(e) => { e.target.style.borderColor = '#DAD5C4'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      <div style={{ fontSize: '12px', color: '#6C7280', marginTop: '6px' }}>
        They&rsquo;ll get a free sign-up link &mdash; no cost on their side, ever.
      </div>
    </div>,
  ];

  return (
    <Modal
      open={open}
      onClose={skip}
      title={'Welcome to Vendor Passport \uD83D\uDC4B'}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <button
            onClick={skip}
            className="border border-border px-4 py-2 rounded text-sm text-gray-500 hover:bg-paper"
            style={{ fontSize: '13px' }}
          >
            Skip setup
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button
                onClick={handleBack}
                className="border border-border px-4 py-2 rounded text-sm text-gray-500 hover:bg-paper"
                style={{ fontSize: '13px' }}
              >
                &larr; Back
              </button>
            )}
            <button
              onClick={step === STEPS.length - 1 ? finish : handleNext}
              className="bg-seal text-white px-5 py-2 rounded text-sm font-semibold hover:bg-seal-dark"
              style={{ fontSize: '13px' }}
            >
              {step === STEPS.length - 1 ? 'Finish' : 'Next \u2192'}
            </button>
          </div>
        </div>
      }
    >
      <div>
        <div className="flex" style={{ gap: '6px', marginBottom: '22px' }}>
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 text-center">
              <div className="h-1" style={{ borderRadius: '3px', marginBottom: '7px', background: i <= step ? '#B8863B' : '#DAD5C4' }} />
              <div className="font-semibold" style={{ fontSize: '10.5px', color: i <= step ? '#1C2430' : '#9CA0A8' }}>{s}</div>
            </div>
          ))}
        </div>
        {stepContent[step]}
      </div>
    </Modal>
  );
}
