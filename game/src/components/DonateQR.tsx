import { QRCodeSVG } from 'qrcode.react';

const BTC_ADDRESS = 'BC1QTWG29V69H0M7H346UK6X5WP7VMWZ63HZV9KUYK';
const BTC_URI = `bitcoin:${BTC_ADDRESS}`;

export function DonateQR() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded border"
      style={{ borderColor: '#F7931A44', background: '#07000f' }}>
      {/* QR code — ~100px / ~1in */}
      <div className="flex-shrink-0 p-1.5 rounded-md" style={{ background: '#fff' }}>
        <QRCodeSVG
          value={BTC_URI}
          size={96}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
          imageSettings={{
            src: '',
            excavate: false,
            width: 0,
            height: 0,
          }}
        />
      </div>
      {/* Label */}
      <div>
        <div className="text-bitcoin text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
          <span className="text-base glow-text-bitcoin">₿</span>
          <span>TIP JAR</span>
        </div>
        <div className="text-slate-400 text-xs leading-snug mb-1.5" style={{ maxWidth: 110 }}>
          Enjoying the sim?<br />Send a little BTC ↗
        </div>
        <div className="text-[#3a1070] font-mono" style={{ fontSize: '0.58rem', wordBreak: 'break-all', maxWidth: 110 }}>
          {BTC_ADDRESS.slice(0, 16)}…
        </div>
      </div>
    </div>
  );
}
