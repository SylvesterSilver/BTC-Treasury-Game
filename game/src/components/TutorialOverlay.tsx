import { useState } from 'react';
import { markTutorialSeen } from '../engine/saveGame';

const STEPS = [
  {
    title: 'You are the CFO',
    body: 'This is a Bitcoin treasury company. Your job is to stack BTC, keep the lights on, and make the stock price go up. Survive 730 days without insolvency to win.',
  },
  {
    title: 'Stock price is the score',
    body: 'The hero number is stock price. It tracks NAV × mNAV. Issue equity when you trade at a premium, buy BTC with the proceeds, and BTC-per-share rises.',
  },
  {
    title: 'ATM, preferred, convertibles',
    body: 'ATM (common) dilutes but raises cash. Preferred (STRC) is perpetual 11.5% paper — cheap until coverage slips. Convertibles add leverage. Buybacks at a discount grow BTC/share.',
  },
  {
    title: 'Watch the gauges',
    body: 'Runway, leverage, and preferred coverage kill you faster than a bear market. If cash goes negative the engine force-sells BTC. That crushes mNAV.',
  },
  {
    title: 'Clock and keys',
    body: 'Space pauses. 1/2/3 set speed. M mutes. H opens help. The game autosaves — you can continue from the era menu.',
  },
];

interface Props {
  onClose: () => void;
}

export function TutorialOverlay({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const finish = () => {
    markTutorialSeen();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 80 }}>
      <div className="bg-[#07000f] border border-[#2d0060] rounded-xl mx-4 p-5 w-full" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between mb-3">
          <span className="section-label">TUTORIAL {step + 1}/{STEPS.length}</span>
          <button className="text-[#6a3090] hover:text-white text-xs uppercase tracking-wider" onClick={finish}>Skip</button>
        </div>
        <div className="text-bitcoin text-xs font-bold uppercase tracking-wider mb-1">₿ {current.title}</div>
        <p className="text-slate-300 text-sm leading-relaxed mb-5">{current.body}</p>
        <div className="flex gap-1 mb-4">
          {STEPS.map((_, i) => (
            <div key={i} className="h-1 flex-1 rounded"
              style={{ background: i <= step ? '#F7931A' : '#2d0060' }} />
          ))}
        </div>
        <div className="flex gap-3">
          {step > 0 && (
            <button className="btn-outline flex-1" onClick={() => setStep(s => s - 1)}>← BACK</button>
          )}
          <button className="btn-bitcoin flex-1" onClick={() => last ? finish() : setStep(s => s + 1)}>
            {last ? 'TAKE THE DESK' : 'NEXT →'}
          </button>
        </div>
      </div>
    </div>
  );
}
