'use client';

// No map here — the single fixed map lives in page.tsx.
// This section is transparent; the blur + dark overlays (also in page.tsx)
// dissolve as the user scrolls toward Section 2.
export default function SectionLanding() {
  return (
    <section className="relative h-screen snap-start shrink-0 flex flex-col items-center justify-center">
      <p className="text-xs tracking-[0.3em] text-neutral-400 uppercase mb-4 pointer-events-none select-none">
        GLOBAL OPINIONS OVER TIME ABOUT
      </p>
      <h1 className="text-6xl md:text-7xl font-bold text-white text-center leading-tight max-w-3xl pointer-events-none select-none">
        ELON MUSK
      </h1>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-neutral-600 pointer-events-none">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-8 bg-neutral-700" />
      </div>
    </section>
  );
}
