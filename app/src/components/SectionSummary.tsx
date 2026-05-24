'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

const CARDS = [
  { id: 'card-1', title: 'CARD1', body: 'Placeholder body text for card 1.' },
  { id: 'card-2', title: 'CARD2', body: 'Placeholder body text for card 2.' },
  { id: 'card-3', title: 'CARD3', body: 'Placeholder body text for card 3.' },
  { id: 'card-4', title: 'CARD4', body: 'Placeholder body text for card 4.' },
];

export default function SectionSummary() {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Separate mounted flag so the CSS transition plays on open, not just on mount.
  const [visible, setVisible] = useState(false);

  // When a card is selected, let it mount first (opacity:0) then transition in.
  useEffect(() => {
    if (expanded) {
      // Next tick: flip to visible so the transition runs
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    } else {
      setVisible(false);
    }
  }, [expanded]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const expandedCard = CARDS.find((c) => c.id === expanded);

  return (
    <section className="h-screen bg-[#111111] flex flex-col items-center justify-center px-8 snap-start shrink-0">
      <p className="text-xs tracking-[0.3em] text-neutral-500 uppercase mb-3">
        SUMMARY_SUBTITLE
      </p>
      <h2 className="text-5xl font-bold text-white text-center mb-12 max-w-2xl leading-tight">
        SUMMARY_TITLE
      </h2>

      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl">
        {CARDS.map((card) => (
          <Card
            key={card.id}
            onClick={() => setExpanded(card.id)}
            className="bg-[#1a1a1a] border-white/10 text-white cursor-pointer h-40
                       hover:border-[#C97432] hover:scale-[1.02]
                       transition-all duration-200 ease-out"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-neutral-200 text-base">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-500 text-sm">{card.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Expanded card overlay ─────────────────────────────────────── */}
      {expanded && (
        // Backdrop — click to close
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={() => setExpanded(null)}
        >
          {/* Dark backdrop fades in */}
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300 ease-out"
            style={{ opacity: visible ? 0.8 : 0 }}
          />

          {/* Card panel — scales + fades in from slightly smaller */}
          <div
            className="relative z-10 w-[85vw] h-[80vh] bg-[#1a1a1a] border border-white/10
                       rounded-2xl p-10 shadow-2xl
                       transition-all duration-300 ease-out"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.92)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setExpanded(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-4">{expandedCard?.title}</h2>
            <p className="text-neutral-400 leading-relaxed">{expandedCard?.body}</p>
          </div>
        </div>
      )}
    </section>
  );
}
