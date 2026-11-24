export default function CarArt({ tone = 'light' }) {
  const stroke = tone === 'light' ? '#ffffff' : '#0b1b3a';
  const gold = '#f5b544';
  return (
    <div className="car-art" aria-hidden="true">
      <svg viewBox="0 0 420 170" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="210" cy="150" rx="150" ry="10" fill="rgba(0,0,0,0.22)" />
        <path
          d="M40 118c-4-12 2-22 14-26l38-10 30-26c8-7 17-10 28-10h66c12 0 22 4 30 13l24 25 60 12c12 3 18 11 18 22v8c0 6-5 10-11 10h-24"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
        <path
          d="M124 82h172c10 0 18 3 25 10l14 13H96l28-23Z"
          stroke={gold}
          strokeWidth="2.4"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <path d="M212 50v44" stroke={gold} strokeWidth="2" opacity="0.55" />
        <path d="M50 118h40M330 118h44" stroke={stroke} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <circle cx="118" cy="120" r="24" stroke={stroke} strokeWidth="3.4" />
        <circle cx="118" cy="120" r="10" stroke={gold} strokeWidth="2.4" />
        <circle cx="302" cy="120" r="24" stroke={stroke} strokeWidth="3.4" />
        <circle cx="302" cy="120" r="10" stroke={gold} strokeWidth="2.4" />
        <path d="M64 104h16" stroke={gold} strokeWidth="3" strokeLinecap="round" />
        <path d="M352 104h12" stroke={gold} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
