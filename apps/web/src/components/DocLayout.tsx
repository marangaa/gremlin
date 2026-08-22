import React from 'react';
import { Reveal } from './Reveal';

export interface DocSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

interface DocLayoutProps {
  eyebrow: string;
  title: string;
  updated: string;
  sections: DocSection[];
}

/** Legal-doc layout: sticky numbered TOC on the left, prose on the right. */
export const DocLayout: React.FC<DocLayoutProps> = ({ eyebrow, title, updated, sections }) => (
  <main className="container-site py-16 lg:py-24">
    <Reveal>
      <div className="eyebrow -rotate-1">{eyebrow}</div>
      <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 font-mono text-xs text-paper-muted">Last updated {updated}</p>
    </Reveal>

    <div className="mt-12 grid lg:grid-cols-[220px,1fr] gap-10 items-start">
      {/* TOC */}
      <aside className="hidden lg:block sticky top-24">
        <div className="font-mono text-xs font-bold text-coal mb-3">Contents</div>
        <nav className="flex flex-col gap-1">
          {sections.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 px-2 py-1.5 border-2 border-transparent hover:border-coal hover:bg-white transition-all"
            >
              <span className="font-mono text-[10px] font-bold text-[#65A30D] tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm text-paper-muted">{s.title}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Prose */}
      <article className="max-w-2xl space-y-12">
        {sections.map((s, i) => (
          <Reveal key={s.id} delay={Math.min(i * 40, 160)}>
            <section id={s.id} className="scroll-mt-28">
              <h2 className="font-display text-xl font-bold flex items-center gap-3">
                <span className="inline-flex w-8 h-8 shrink-0 items-center justify-center bg-accent border-2 border-coal shadow-[2px_2px_0_0_#12151A] font-mono text-xs font-bold">
                  {i + 1}
                </span>
                {s.title}
              </h2>
              <div className="mt-3.5 text-[15px] text-paper-muted leading-[1.75] space-y-4">{s.body}</div>
            </section>
          </Reveal>
        ))}
      </article>
    </div>
  </main>
);
