import { useState } from 'react';

export default function Stepper({ steps, children, onFinish, finishLabel = 'Finish' }) {
  const [step, setStep] = useState(0);

  return (
    <div>
      <div className="flex" style={{ gap: '6px', marginBottom: '22px' }}>
        {steps.map((s, i) => (
          <div key={s} className="flex-1 text-center">
            <div className="h-1" style={{ borderRadius: '3px', marginBottom: '7px', background: i <= step ? '#B8863B' : '#DAD5C4' }} />
            <div className="font-semibold" style={{ fontSize: '10.5px', color: i <= step ? '#1C2430' : '#9CA0A8' }}>{s}</div>
          </div>
        ))}
      </div>
      {children[step]}
      <div className="flex justify-between mt-6 pt-4 border-t border-border">
        <button onClick={() => step > 0 ? setStep(step - 1) : onFinish?.(-1)}
          className="border border-border px-4 py-2 rounded text-sm text-gray-500 hover:bg-paper">
          {step === 0 ? 'Cancel' : '\u2190 Back'}
        </button>
        <button onClick={() => step < steps.length - 1 ? setStep(step + 1) : onFinish?.()}
          className="bg-seal text-white px-5 py-2 rounded text-sm font-semibold hover:bg-seal-dark">
          {step === steps.length - 1 ? finishLabel : 'Next \u2192'}
        </button>
      </div>
    </div>
  );
}
