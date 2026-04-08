import { useEffect } from 'react';

export default function InlineAlert({ alert, onDismiss, className = '' }) {
  useEffect(() => {
    if (!alert?.message || !onDismiss) return undefined;
    const timeout = setTimeout(() => onDismiss(), 5000);
    return () => clearTimeout(timeout);
  }, [alert, onDismiss]);

  if (!alert?.message) return null;

  const tone = alert.type === 'error'
    ? 'border-red-200 bg-red-50/90 text-red-700'
    : 'border-[#dbe1ff] bg-[#eef2ff] text-[#003aa0]';

  return (
    <div
      className={`rounded-[24px] border px-4 py-3 shadow-[0px_12px_32px_rgba(19,27,46,0.04)] backdrop-blur-sm animate-[alertIn_220ms_cubic-bezier(0.22,1,0.36,1)] ${tone} ${className}`}
    >
      <p className="text-sm font-semibold leading-6">{alert.message}</p>
    </div>
  );
}
