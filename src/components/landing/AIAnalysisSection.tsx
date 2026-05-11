// Server Component — radar SVG statik, Reveal/LazyVideo client leaf.
import { Reveal } from '@/components/motion/Reveal';
import { LazyVideo } from './LazyVideo';

const RADAR_AXES = [
  { label: 'DİKEY', value: 86, code: 'CMJ' },
  { label: 'YATAY', value: 74, code: 'BRD' },
  { label: 'DENGE', value: 91, code: 'BAL' },
  { label: 'REAKSİYON', value: 82, code: 'RXN' },
  { label: 'ÇEVİKLİK', value: 76, code: 'AGL' },
  { label: 'KOORD.', value: 79, code: 'CRD' },
  { label: 'DAYAN.', value: 80, code: 'END' },
];

const MATCH_SCORES = [
  { sport: 'Jimnastik', score: 92, signal: 'Denge + esneklik', rank: '01' },
  { sport: 'Atletizm', score: 86, signal: 'Patlayıcı güç', rank: '02' },
  { sport: 'Tenis', score: 79, signal: 'Reaksiyon hızı', rank: '03' },
];

const RADAR_CENTER = 100;
const RADAR_RADIUS = 66;
const RADAR_RINGS = [0.25, 0.5, 0.75, 1];

function radarPoint(index: number, scale: number) {
  const angle = (index * (360 / RADAR_AXES.length) - 90) * (Math.PI / 180);
  return {
    x: RADAR_CENTER + RADAR_RADIUS * scale * Math.cos(angle),
    y: RADAR_CENTER + RADAR_RADIUS * scale * Math.sin(angle),
  };
}

function radarPolygon(scale: number) {
  return RADAR_AXES.map((_, index) => {
    const point = radarPoint(index, scale);
    return `${point.x},${point.y}`;
  }).join(' ');
}

const radarShape = RADAR_AXES.map((axis, index) => {
  const point = radarPoint(index, axis.value / 100);
  return `${point.x},${point.y}`;
}).join(' ');

function TalentRadar() {
  return (
    <div
      className="algorithm-radar-panel"
      aria-label="Yedi boyutlu yetenek radarı"
    >
      <div className="algorithm-radar-header">
        <span>Canlı Profil</span>
        <strong>7B</strong>
      </div>
      <svg
        className="algorithm-radar-svg"
        viewBox="0 0 200 200"
        role="img"
        aria-labelledby="talent-radar-title"
      >
        <title id="talent-radar-title">
          Yedi bio-motor test boyutundan oluşan yetenek radarı
        </title>
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#fff0a6" stopOpacity="0.56" />
            <stop offset="58%" stopColor="#f2c94c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f2c94c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="radarFill" x1="36%" y1="18%" x2="72%" y2="86%">
            <stop offset="0%" stopColor="#fff0a6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f2c94c" stopOpacity="0.54" />
          </linearGradient>
          <filter
            id="radarSoftGlow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r="76"
          className="algorithm-radar-orbit"
        />
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r="58"
          className="algorithm-radar-halo"
        />
        {RADAR_RINGS.map((ring) => (
          <polygon
            key={ring}
            points={radarPolygon(ring)}
            className="algorithm-radar-ring"
          />
        ))}
        {RADAR_AXES.map((axis, index) => {
          const edge = radarPoint(index, 1);
          const label = radarPoint(index, 1.18);
          return (
            <g key={axis.label}>
              <line
                x1={RADAR_CENTER}
                y1={RADAR_CENTER}
                x2={edge.x}
                y2={edge.y}
                className="algorithm-radar-axis"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="algorithm-radar-label"
              >
                {axis.label}
              </text>
              <text
                x={label.x}
                y={label.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                className="algorithm-radar-value"
              >
                %{axis.value}
              </text>
            </g>
          );
        })}
        <polygon points={radarShape} className="algorithm-radar-glow" />
        <polygon points={radarShape} className="algorithm-radar-area" />
        {RADAR_AXES.map((axis, index) => {
          const point = radarPoint(index, axis.value / 100);
          return (
            <circle
              key={axis.label}
              cx={point.x}
              cy={point.y}
              r="3.2"
              className="algorithm-radar-dot"
            />
          );
        })}
        <g className="algorithm-radar-scan">
          <line
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={RADAR_CENTER}
            y2={RADAR_CENTER - RADAR_RADIUS}
          />
        </g>
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r="12"
          className="algorithm-radar-core-ring"
        />
        <circle
          cx={RADAR_CENTER}
          cy={RADAR_CENTER}
          r="5"
          className="algorithm-radar-center"
        />
        <text
          x={RADAR_CENTER}
          y={RADAR_CENTER + 24}
          textAnchor="middle"
          className="algorithm-radar-center-label"
        >
          AI MATCH
        </text>
      </svg>
      <div className="algorithm-radar-strip" aria-hidden="true">
        {RADAR_AXES.map((axis) => (
          <span key={axis.code}>
            {axis.code}
            <strong>{axis.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchScorePanel() {
  return (
    <div className="algorithm-match-card">
      <div className="algorithm-match-header">
        <div>
          <span>Optimum Branş</span>
          <small>eşleşme güveni</small>
        </div>
        <strong>%92</strong>
      </div>
      <div className="algorithm-match-list">
        {MATCH_SCORES.map((match) => (
          <div className="algorithm-match-row" key={match.sport}>
            <span className="algorithm-match-rank">{match.rank}</span>
            <div className="algorithm-match-meta">
              <span>{match.sport}</span>
              <small>{match.signal}</small>
            </div>
            <div className="algorithm-match-meter" aria-hidden="true">
              <span style={{ width: `${match.score}%` }} />
            </div>
            <strong>%{match.score}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIAnalysisSection() {
  return (
    <section
      id="analysis"
      className="lp-section section-padding relative"
      style={{ background: 'var(--deep-navy)' }}
    >
      <div
        className="absolute top-0 left-0 h-[2px] w-full"
        style={{ background: 'var(--track-mustard)' }}
      />

      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        <Reveal>
          <div className="mb-16 text-center">
            <p
              className="mb-4 text-xs tracking-[0.4em] uppercase"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.5,
                fontFamily: 'var(--font-body)',
              }}
            >
              02 — Algoritma
            </p>
            <h2
              className="text-4xl font-black tracking-tight md:text-5xl"
              style={{
                color: 'var(--whistle-cream)',
                fontFamily: 'var(--font-display)',
              }}
            >
              YAPAY ZEKA ANALİZİ
            </h2>
            <div
              className="mx-auto mt-4 h-[3px] w-16"
              style={{ background: 'var(--track-mustard)' }}
            />
            <p
              className="mx-auto mt-6 max-w-xl text-sm leading-relaxed"
              style={{
                color: 'var(--whistle-cream)',
                opacity: 0.7,
                fontFamily: 'var(--font-body)',
              }}
            >
              AI motorumuz hareket örüntülerini bilgisayarla görüyle çözümler;
              biyomekanik özetleri 12 sporun ihtiyaç profiliyle karşılaştırır.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal from="left">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ border: '2px solid rgba(255, 245, 225, 0.15)' }}
            >
              <div className="aspect-square">
                <LazyVideo
                  src="/videos/ai-skeleton.mp4"
                  poster="/images/ai-skeleton-poster.jpg"
                  className="h-full w-full object-cover"
                />
              </div>
              <div
                className="absolute right-0 bottom-0 left-0 p-6"
                style={{
                  background:
                    'linear-gradient(to top, rgba(26,37,64,0.95) 0%, transparent 100%)',
                }}
              >
                <p
                  className="mb-1 text-[10px] tracking-[0.3em] uppercase"
                  style={{
                    color: 'var(--track-mustard)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Real-Time Pose Estimation
                </p>
                <h3
                  className="text-xl font-bold"
                  style={{
                    color: 'var(--whistle-cream)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Biyomekanik İskelet
                </h3>
                <p
                  className="mt-2 text-xs leading-relaxed"
                  style={{
                    color: 'var(--whistle-cream)',
                    opacity: 0.6,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  33 keypoint cihazda işlenir. FPS cihaza göre değişir; video
                  sunucuya gitmeden sol-sağ asimetri sinyali çıkarılır.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal from="right">
            <div className="algorithm-stack">
              <TalentRadar />
              <MatchScorePanel />
              <div className="mt-6 text-center">
                <p
                  className="mb-1 text-[10px] tracking-[0.3em] uppercase"
                  style={{
                    color: 'var(--track-mustard)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Yetenek Eşleştirme
                </p>
                <h3
                  className="text-xl font-bold"
                  style={{
                    color: 'var(--whistle-cream)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  Yetenek Radarı
                </h3>
                <p
                  className="mx-auto mt-2 max-w-sm text-xs leading-relaxed"
                  style={{
                    color: 'var(--whistle-cream)',
                    opacity: 0.6,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Yedi boyutlu yetenek profili, çocuğun fiziksel imzasını uygun
                  spor branşlarıyla buluşturur.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
