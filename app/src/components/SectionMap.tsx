'use client';

// Transparent placeholder — the single fixed map (in page.tsx) shows through here.
// No map instance, no chrome. When this section is snapped to, the overlays
// are already at opacity 0 so the map appears cleanly.
export default function SectionMap() {
  return <section id="section-map" className="h-screen snap-start shrink-0" />;
}
