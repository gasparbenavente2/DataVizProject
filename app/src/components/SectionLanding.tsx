'use client';

const BG = '#00021a';

const STATS = [
  { label: 'Articles analyzed', value: '921,348', since: '2015', negative: false },
  { label: 'Countries covering', value: '157', since: '2015', negative: false },
  { label: 'Most referred to as', value: 'Innovator', since: '2015', negative: false },
  { label: 'Average tone', value: '−1.20', since: '2015', negative: true },
];

export default function SectionLanding() {
  return (
    <section className="relative h-screen snap-start shrink-0 flex flex-col items-center justify-center">
      {/* Center content */}
      <div className="flex flex-col items-center text-center gap-3 pointer-events-none select-none">
        <p className="text-base font-normal text-[#7683a6]">
          Global news &amp; sentiment over time about
        </p>
        <h1
          className="font-light text-[#ecf2ff] leading-none tracking-tight"
          style={{ fontSize: 'clamp(4rem, 11vw, 9rem)' }}
        >
          Elon Musk
        </h1>
      </div>

      {/* Stat cards */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-4 px-8 pointer-events-none select-none">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-2 px-6 py-5 rounded-xl"
            style={{
              border: '2px solid transparent',
              background: `linear-gradient(${BG}, ${BG}) padding-box, linear-gradient(135deg, #24355f, #7683a6) border-box`,
              minWidth: '180px',
            }}
          >
            <span className="text-xs text-[#7683a6]">{s.label}</span>
            <span
              className="text-3xl font-bold"
              style={{ color: s.negative ? '#ef4444' : '#ecf2ff' }}
            >
              {s.value}
            </span>
            <span className="text-xs text-[#7683a6]">Since {s.since}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
