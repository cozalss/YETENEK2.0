'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LazyVideo } from './LazyVideo';

function FlipDigit({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlipping(true);
      const t = setTimeout(() => {
        setDisplayValue(value);
        setFlipping(false);
      }, 150);
      prevValue.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className={`flip-unit-container ${flipping ? 'flipping' : ''}`}>
      <div className="top-half">
        <span>{displayValue}</span>
      </div>
      <div className="bottom-half">
        <span>{displayValue}</span>
      </div>
    </div>
  );
}

function FlipClock() {
  // SSR ve hydrate öncesi: ready=false → ekrana hiç basılmaz, böylece
  // "00:00:00" sahte hâlini kullanıcı asla görmez.
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime({
        h: now.getHours(),
        m: now.getMinutes(),
        s: now.getSeconds(),
      });
    };
    update();
    setReady(true);
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="flex items-center gap-1"
      style={{
        opacity: ready ? 1 : 0,
        transition: 'opacity 0.35s ease-out',
        // Boyutu SSR'dan beri sabit, layout shift yok.
        minHeight: 90,
      }}
      aria-hidden={!ready}
    >
      <FlipDigit value={parseInt(pad(time.h)[0])} />
      <FlipDigit value={parseInt(pad(time.h)[1])} />
      <span className="mx-1 text-2xl font-bold text-[var(--form-navy)]">:</span>
      <FlipDigit value={parseInt(pad(time.m)[0])} />
      <FlipDigit value={parseInt(pad(time.m)[1])} />
      <span className="mx-1 text-2xl font-bold text-[var(--form-navy)]">:</span>
      <FlipDigit value={parseInt(pad(time.s)[0])} />
      <FlipDigit value={parseInt(pad(time.s)[1])} />
    </div>
  );
}

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [titleAnimated, setTitleAnimated] = useState(false);

  useEffect(() => {
    const titleEl = titleRef.current;
    if (!titleEl) return;

    const text = titleEl.textContent || '';
    titleEl.innerHTML = '';
    const wordSpan = document.createElement('span');
    wordSpan.style.display = 'inline-block';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charSpan = document.createElement('span');
      charSpan.className = 'char';
      charSpan.style.display = 'inline-block';
      charSpan.style.position = 'relative';
      charSpan.style.transformStyle = 'preserve-3d';

      if (char === ' ') {
        charSpan.classList.add('whitespace');
        charSpan.innerHTML = '&nbsp;';
        charSpan.setAttribute('data-char', ' ');
      } else {
        charSpan.textContent = char;
        charSpan.setAttribute('data-char', char);
      }

      wordSpan.appendChild(charSpan);
    }
    titleEl.appendChild(wordSpan);

    const startTimer = setTimeout(() => {
      titleEl.classList.add('content__title--step');
      requestAnimationFrame(() => {
        titleEl.classList.add('animating');
      });
    }, 500);

    const subtitleTimer = setTimeout(() => {
      const sub = subtitleRef.current;
      if (sub) {
        sub.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        sub.style.opacity = '1';
        sub.style.transform = 'translateY(0)';
      }
    }, 1300);

    const taglineTimer = setTimeout(() => setTitleAnimated(true), 1800);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(subtitleTimer);
      clearTimeout(taglineTimer);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let stopped = false;

    const apply = () => {
      raf = 0;
      if (stopped) return;
      const hero = heroRef.current;
      const video = videoRef.current;
      if (!hero || !video) return;

      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      // Hero ekran dışına çıktıysa parallax güncellemeyi tamamen bırak.
      if (scrollY > vh * 1.1) return;

      const progress = Math.min(scrollY / vh, 1);
      video.style.transform = `scale(${1 + progress * 0.1}) translateY(${progress * 30}px)`;
      const overlay = hero.querySelector('.hero-overlay') as HTMLElement | null;
      if (overlay) overlay.style.opacity = String(progress * 0.8);
    };

    const handleScroll = () => {
      if (raf !== 0) return;
      raf = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      stopped = true;
      window.removeEventListener('scroll', handleScroll);
      if (raf !== 0) cancelAnimationFrame(raf);
    };
  }, []);

  const scrollToTests = () => {
    const el = document.querySelector('#tests');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={heroRef}
      className="relative w-full overflow-hidden"
      style={{ height: '100vh', background: 'var(--mindar-pink)' }}
    >
      <LazyVideo
        ref={videoRef}
        eager
        src="/videos/hero-gym.mp4"
        poster="/images/hero-gym-poster.jpg"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transition: 'transform 0.1s linear', willChange: 'transform' }}
      />

      <div
        className="hero-overlay absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(26, 37, 64, 0.4) 0%, rgba(26, 37, 64, 0.6) 100%)',
          opacity: 0,
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
        <div
          className="mb-8 animate-fade-in opacity-0"
          style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          <FlipClock />
        </div>

        <h1
          ref={titleRef}
          className="content__title content__title--center text-center"
          style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            color: '#FFF5E1',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}
        >
          YETENEK
        </h1>

        <div
          ref={subtitleRef}
          className="mt-6 text-center"
          style={{ opacity: 0, transform: 'translateY(30px)' }}
        >
          <p
            className="text-sm tracking-[0.35em] uppercase md:text-base"
            style={{
              color: '#FFF5E1',
              fontFamily: 'var(--font-body)',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            Est. 2026 — Where Symmetry Meets Talent
          </p>
          <div
            className="mx-auto mt-4 h-[2px] w-24"
            style={{ background: 'var(--track-mustard)' }}
          />
        </div>

        <p
          className={`mt-8 max-w-lg text-center text-sm leading-relaxed transition-all duration-1000 md:text-base ${
            titleAnimated
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
          style={{
            color: 'rgba(255, 245, 225, 0.85)',
            fontFamily: 'var(--font-body)',
            textShadow: '0 1px 6px rgba(0,0,0,0.3)',
          }}
        >
          AI tabanlı çocuk spor yetenek keşfi.
          <br />
          Hassasiyetle ölçülür. Zarafetle açığa çıkar.
        </p>

        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-3 transition-all duration-1000 ${
            titleAnimated
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <Link
            href="/test/full"
            className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-xs font-bold tracking-[0.25em] uppercase transition-transform hover:scale-[1.03]"
            style={{
              background: 'var(--track-mustard)',
              color: 'var(--form-navy)',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            Teste Başla
          </Link>
          <Link
            href="/result/demo"
            className="inline-flex h-12 items-center gap-2 rounded-full border-2 px-7 text-xs font-bold tracking-[0.25em] uppercase transition-colors hover:bg-white/10"
            style={{
              borderColor: 'rgba(255,245,225,0.6)',
              color: '#FFF5E1',
              fontFamily: 'var(--font-display)',
            }}
          >
            Örnek Sonuç
          </Link>
        </div>

        <button
          onClick={scrollToTests}
          className="scroll-indicator absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-60 transition-opacity hover:opacity-100"
        >
          <span
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: '#FFF5E1', fontFamily: 'var(--font-display)' }}
          >
            Keşfet
          </span>
          <ChevronDown size={20} style={{ color: '#FFF5E1' }} />
        </button>
      </div>
    </section>
  );
}
