interface Props {
  onClose: () => void;
}

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Win condition',
    body: 'Survive 730 simulated days without insolvency. Final stock price is the leaderboard score. Growing BTC per share is how serious operators keep score internally.',
  },
  {
    title: 'mNAV',
    body: 'Market-cap mNAV is market cap ÷ BTC treasury value. Issue common (ATM) when mNAV is at a premium. Issuing into a discount dilutes BTC/share and craters the stock. EV mNAV and CEBE mNAV net out senior claims.',
  },
  {
    title: 'ATM & buybacks',
    body: 'ATM raises cash by printing shares. After each print the window closes for 7 days, and four prints overheat the machine. Buybacks spend cash to retire shares — accretive when mNAV is below 1.0x, value-destructive when you buy your own premium.',
  },
  {
    title: 'STRC preferred',
    body: 'Perpetual preferred at 11.5% base, paid monthly. Effective yield explodes as BTC coverage falls below 2x. Halt dividends to stop the cash drain and the preferred market shuts, sentiment dies, and STRC trades at a distressed yield.',
  },
  {
    title: 'Convertibles',
    body: 'Issue notes for dry powder, or retire them to de-lever. Lenders refuse paper above ~2.2x leverage or when mNAV is in the gutter. Interest is the era rate and can reprice on news.',
  },
  {
    title: 'Distress',
    body: 'Negative cash triggers an emergency BTC sale (max 5% of stack per tick). That is a crisis: mNAV and sentiment get crushed. Insolvency ends the run.',
  },
];

export function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" style={{ zIndex: 70 }} onClick={onClose}>
      <div
        className="bg-[#07000f] border border-[#2d0060] rounded-xl mx-4 p-5 w-full overflow-y-auto"
        style={{ maxWidth: 560, maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label mb-1">OPERATOR MANUAL</div>
            <div className="text-white font-bold text-sm">Bitcoin Treasury Strategy Simulator</div>
          </div>
          <button className="btn-outline" onClick={onClose}>CLOSE</button>
        </div>
        <div className="space-y-3 mb-4">
          {SECTIONS.map(s => (
            <div key={s.title} className="game-card p-3">
              <div className="text-bitcoin text-xs font-bold uppercase tracking-wider mb-1">{s.title}</div>
              <p className="text-[#9a7ab8] text-xs leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="game-card p-3">
          <div className="section-label mb-2">KEYBOARD</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono text-[#6a3090]">
            <div><span className="text-white">Space</span> pause / resume</div>
            <div><span className="text-white">1 / 2 / 3</span> day / week / month</div>
            <div><span className="text-white">M</span> mute</div>
            <div><span className="text-white">H or ?</span> this help</div>
            <div><span className="text-white">S</span> save</div>
            <div><span className="text-white">Esc</span> close</div>
          </div>
        </div>
        <div className="text-center mt-4">
          <span className="font-cursive text-lg" style={{ color: '#F7931A66' }}>created by @Benny_Stacks</span>
        </div>
      </div>
    </div>
  );
}
