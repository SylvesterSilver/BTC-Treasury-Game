import type { Notification } from '../engine/gameEngine';

interface Props {
  notifications: Notification[];
}

const typeStyles: Record<Notification['type'], { color: string; bg: string; icon: string }> = {
  success: { color: '#22c55e', bg: '#052e16', icon: '✓' },
  error:   { color: '#ef4444', bg: '#2d0000', icon: '✕' },
  warning: { color: '#f59e0b', bg: '#1c0d00', icon: '⚠' },
  info:    { color: '#60a5fa', bg: '#0a1628', icon: '◆' },
};

export function NotificationFeed({ notifications }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {notifications.slice(0, 6).map((n, i) => {
        const style = typeStyles[n.type];
        return (
          <div
            key={n.id}
            className="flex items-start gap-2 text-xs rounded px-3 py-2 font-mono"
            style={{
              background: style.bg,
              border: `1px solid ${style.color}33`,
              opacity: 1 - i * 0.12,
            }}
          >
            <span className="font-bold flex-shrink-0" style={{ color: style.color }}>
              {style.icon}
            </span>
            <span className="text-slate-300 leading-relaxed">{n.message}</span>
          </div>
        );
      })}
    </div>
  );
}
