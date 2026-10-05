import { useId } from 'react';

/** The same reference image before and after an edit, and inside shared image context. */
export function Landscape({ warm = false, className = '', style, ...props }) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 540 135" preserveAspectRatio="xMidYMid slice" className={className} style={style} role="img" aria-label={warm ? 'Alpine landscape edited to sunrise' : 'Alpine landscape reference image'} {...props}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop stopColor={warm ? '#4e597b' : '#40556f'} />
        {warm && <stop offset=".62" stopColor="#dfb48e" />}
        <stop offset="1" stopColor={warm ? '#e5c3a3' : '#8999a9'} />
      </linearGradient></defs>
      <rect width="540" height="135" fill={`url(#${gradientId})`} />
      <circle cx="393" cy="35" r="15" fill={warm ? '#ffe0aa' : '#cad4de'} opacity={warm ? 0.95 : 0.7} />
      <path d="M0 135L83 47 124 77 213 19 296 100 379 40 475 135Z" fill={warm ? '#8c838f' : '#546a7a'} />
      <path d="M166 70L213 19 261 69 230 59 213 39 193 65Z" fill={warm ? '#efc7b1' : '#b6c2cc'} />
      <path d="M0 112L92 78 174 135ZM249 135L384 65 460 121 540 69V135Z" fill={warm ? '#535b72' : '#354c5e'} />
      <path d="M0 135L156 109 251 135ZM341 135L472 104 540 121V135Z" fill={warm ? '#303c51' : '#253b4d'} />
    </svg>
  );
}
