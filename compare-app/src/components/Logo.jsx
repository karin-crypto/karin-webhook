export default function Logo({ light = false, size = 40 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill={light ? '#ffffff' : '#0B2545'} />
        <path d="M16 44 L28 30 L36 37 L48 20" fill="none" stroke={light ? '#0B2545' : '#5BB0F0'} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="48" cy="20" r="5" fill="#1E9E6A" />
      </svg>
      <span className="leading-none">
        <span className={`block text-lg font-black ${light ? 'text-white' : 'text-navy'}`}>קרין קרן</span>
        <span className={`block text-[11px] font-semibold tracking-[.14em] ${light ? 'text-sky-300' : 'text-blue'}`}>תכנון פיננסי</span>
      </span>
    </span>
  );
}
