import { QRCodeSVG } from 'qrcode.react';

const BTC_ADDRESS = 'BC1QTWG29V69H0M7H346UK6X5WP7VMWZ63HZV9KUYK';
const BTC_URI = `bitcoin:${BTC_ADDRESS}`;

export function DonateQR() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#1a2540] bg-[#04070f]"
      style={{ borderColor: '#F7931A33' }}>
      {/* QR code ~80px */}
      <div className="flex-shrink-0 p-1 rounded" style={{ background: '#fff' }}>
        <QRCodeSVG
          value={BTC_URI}
          size={76}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>
      {/* Label */}
      <div className="text-left">
        <div className="text-bitcoin text-xs font-bold uppercase tracking-wider flex items-center gap-1">
          <span>₿</span> TIP JAR
        </div>
        <div className="text-[#3a5070] text-xs mt-0.5 leading-tight" style={{ maxWidth: 100 }}>
          Enjoying the sim? Donate BTC
        </div>
        <div className="text-[#2a3a52] font-mono mt-1" style={{ fontSize: '0.55rem', wordBreak: 'break-all', maxWidth: 100 }}>
          {BTC_ADDRESS.slice(0, 14)}…
        </div>
      </div>
    </div>
  );
}
