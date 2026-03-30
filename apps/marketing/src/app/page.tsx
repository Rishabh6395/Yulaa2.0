'use client';

import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://yulaa2-0.onrender.com/';

// ─── Free-to-use videos (Pexels CC0 licence – swap for higher-res if needed) ─
const VIDEOS = {
  // Dark abstract technology / particle visualisation
  hero:     'https://videos.pexels.com/video-files/3738383/3738383-hd_1920_1080_30fps.mp4',
  // Fallback: dark bokeh / light trails
  // heroFB:   'https://www.pexels.com/download/video/18069862/',
  heroFB:   'https://www.pexels.com/download/video/29718189/',
  // Subtle dark ambient loop for the Yulaa section
  ambient:  'https://videos.pexels.com/video-files/3129671/3129671-hd_1280_720_24fps.mp4',
};

const MARQUEE_TEXT = [
  'INNOVATION', 'EDUCATION', 'TECHNOLOGY', 'YULIX LABS', 'THE FUTURE',
  'LEARNING', 'PRECISION', 'ENGINEERING', 'YULAA', 'EXCELLENCE',
];

const YULAA_STATS = [
  { value: '25+', label: 'Modules' },
  { value: '7',   label: 'Role types' },
  { value: '∞',   label: 'Schools' },
  { value: '100%',label: 'Mobile-ready' },
];

const YULAA_FEATURES = [
  'Smart attendance & leave workflows',
  'Automated fee invoicing & payment tracking',
  'Admissions engine with seat allocation',
  'Visual timetable builder with conflict detection',
  'Exam scheduling, results & analytics',
  'Real-time notifications via Redis',
];

// ─── Utility components ───────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = '', once = true }: {
  children: React.ReactNode; delay?: number; className?: string; once?: boolean;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 1.1, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function SlideIn({ children, delay = 0, from = 'left', className = '' }: {
  children: React.ReactNode; delay?: number; from?: 'left' | 'right'; className?: string;
}) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, x: from === 'left' ? -50 : 50 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 1, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

function HeroVideo() {
  const ref   = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onCanPlay = () => { setLoaded(true); v.play().catch(() => {}); };
    v.addEventListener('canplaythrough', onCanPlay);
    return () => v.removeEventListener('canplaythrough', onCanPlay);
  }, []);

  return (
    <>
      {/* CSS fallback – always visible behind video */}
      <div className="hero-fallback" />
      <video
        ref={ref}
        className={`hero-video ${loaded ? 'loaded' : ''}`}
        muted loop playsInline preload="auto"
        aria-hidden="true"
      >
        <source src={VIDEOS.hero}   type="video/mp4" />
        <source src={VIDEOS.heroFB} type="video/mp4" />
      </video>
    </>
  );
}

function TiltCard({ children, className = '', intensity = 7 }: {
  children: React.ReactNode; className?: string; intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x   = useMotionValue(0);
  const y   = useMotionValue(0);
  const rX  = useSpring(y, { stiffness: 350, damping: 28 });
  const rY  = useSpring(x, { stiffness: 350, damping: 28 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(((e.clientX - r.left - r.width  / 2) / (r.width  / 2)) * intensity);
    y.set(((e.clientY - r.top  - r.height / 2) / (r.height / 2)) * -intensity);
  };

  return (
    <motion.div ref={ref} className={className}
      style={{ rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

function Counter({ value }: { value: string }) {
  // Handles values like '25+', '∞', '100%' – numeric part animates, suffix preserved
  const numeric = parseInt(value, 10);
  const tail    = isNaN(numeric) ? '' : value.replace(String(numeric), '');
  const [displayed, setDisplayed] = useState(isNaN(numeric) ? value : '0' + tail);
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!inView) return;
    if (isNaN(numeric)) { setDisplayed(value); return; }
    const dur = 1800, fps = 60;
    const steps = dur / (1000 / fps);
    const inc = numeric / steps;
    let cur = 0;
    const id = setInterval(() => {
      cur += inc;
      if (cur >= numeric) { setDisplayed(value); clearInterval(id); }
      else setDisplayed(String(Math.floor(cur)) + tail);
    }, 1000 / fps);
    return () => clearInterval(id);
  }, [inView, numeric, value, tail]);

  return <span ref={ref}>{displayed}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function YulixLabsPage() {
  const { scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Parallax layers
  const heroParallaxRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroParallaxRef, offset: ['start start', 'end start'] });
  const heroTextY    = useTransform(heroScroll, [0, 1], [0, 180]);
  const heroTextOp   = useTransform(heroScroll, [0, 0.7], [1, 0]);
  const heroBgY      = useTransform(heroScroll, [0, 1], [0, 100]);

  const marqueeItems = [...MARQUEE_TEXT, ...MARQUEE_TEXT]; // doubled for seamless loop

  return (
    <div className="bg-[#050505] min-h-screen overflow-x-hidden">

      {/* ── Progress bar ─────────────────────────────────────────────────────── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[1px] z-[100] origin-left"
        style={{ scaleX: scrollYProgress, background: 'linear-gradient(90deg, #1A8CA5, #c9a566)' }}
      />

      {/* ── Navbar ───────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-5 flex items-center justify-between"
        style={{
          background: scrolled ? 'rgba(5,5,5,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(240,236,228,0.06)' : 'none',
          transition: 'background 0.5s ease, border-color 0.5s ease',
        }}
      >
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 shrink-0">
            <div className="absolute inset-0 rounded-none" style={{ background: 'linear-gradient(135deg, #c9a566 0%, #9c7d47 100%)' }} />
            <div className="absolute inset-0 blur-md opacity-40" style={{ background: '#c9a566' }} />
            <span className="relative flex items-center justify-center w-full h-full text-[#050505] font-bold text-base font-display">Y</span>
          </div>
          <div>
            <div className="text-[0.65rem] tracking-[0.35em] text-gold uppercase leading-none mb-0.5 font-body">Yulix Labs</div>
            <div className="rule w-full opacity-40" />
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-10 text-[0.72rem] tracking-[0.2em] uppercase text-[rgba(240,236,228,0.4)]">
          {[['Products', '#products'], ['Yulaa', '#yulaa'], ['Vision', '#vision'], ['About', '#manifesto']].map(([label, href]) => (
            <a key={label} href={href} className="hover:text-cream transition-colors duration-300">{label}</a>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
            className="text-[0.72rem] tracking-[0.2em] uppercase text-cream/60 hover:text-cream transition-colors duration-300"
          >
            Enter Platform
          </a>
          <span className="text-cream/20">|</span>
          <a
            href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
            className="px-5 py-2.5 text-[0.7rem] tracking-[0.2em] uppercase font-medium transition-all duration-300"
            style={{
              border: '1px solid rgba(201,165,102,0.4)',
              color: '#c9a566',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,165,102,0.1)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(201,165,102,0.8)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(201,165,102,0.4)';
            }}
          >
            Open Yulaa →
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-cream/60 p-2" onClick={() => setMenuOpen(v => !v)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {menuOpen
              ? <path d="M18 6L6 18M6 6l12 12"/>
              : <><path d="M4 6h16M4 12h16M4 18h16"/></>
            }
          </svg>
        </button>
      </motion.header>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8"
          style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(26px)' }}
        >
          {[['Products', '#products'], ['Yulaa', '#yulaa'], ['Vision', '#vision'], ['About', '#manifesto']].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)}
              className="font-display text-4xl font-light text-cream/80 hover:text-cream transition-colors"
            >{label}</a>
          ))}
          <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
            className="mt-6 px-8 py-3 text-sm tracking-[0.2em] uppercase"
            style={{ border: '1px solid rgba(201,165,102,0.5)', color: '#c9a566' }}
          >
            Open Yulaa →
          </a>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 01 · HERO                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section ref={heroParallaxRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Video + overlays */}
        <motion.div style={{ y: heroBgY }} className="absolute inset-0">
          <HeroVideo />
          <div className="hero-overlay" />
          <div className="noise-overlay" />
        </motion.div>

        {/* Hero content */}
        <motion.div style={{ y: heroTextY, opacity: heroTextOp }}
          className="relative z-10 text-center px-6 w-full max-w-6xl mx-auto"
        >
          {/* Lab label */}
          <motion.div
            initial={{ opacity: 0, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, letterSpacing: '0.5em' }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="text-[0.62rem] font-body tracking-[0.5em] text-gold uppercase mb-10 flex items-center justify-center gap-4"
          >
            <span className="gold-line" />
            Yulix Labs · Est. 2024
            <span className="gold-line" />
          </motion.div>

          {/* Main headline */}
          <div className="font-display font-light leading-[0.88] tracking-tight mb-8 overflow-hidden"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
          >
            {['ENGINEERING', 'THE FUTURE', 'OF LEARNING'].map((line, li) => (
              <div key={line} className="overflow-hidden">
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.1, delay: 0.5 + li * 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line === 'OF LEARNING'
                    ? <span style={{ fontStyle: 'italic', color: 'rgba(240,236,228,0.6)' }}>{line}</span>
                    : <span className="text-cream">{line}</span>
                  }
                </motion.div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="rule-gold mx-auto mb-8 origin-center"
            style={{ width: '280px' }}
          />

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.2 }}
            className="font-body text-[0.85rem] tracking-[0.18em] uppercase text-cream/45 mb-12 max-w-lg mx-auto"
          >
            Building educational technology for the next generation of institutions
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            <a href="#products"
              className="group flex items-center gap-3 px-8 py-4 text-[0.72rem] tracking-[0.25em] uppercase font-medium transition-all duration-300"
              style={{ background: 'rgba(201,165,102,0.1)', border: '1px solid rgba(201,165,102,0.4)', color: '#c9a566' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,165,102,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(201,165,102,0.1)'; }}
            >
              Explore Products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
              className="text-[0.72rem] tracking-[0.25em] uppercase text-cream/45 hover:text-cream transition-colors duration-300"
            >
              Open Yulaa Platform
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(240,236,228,0.3)" strokeWidth="1">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </motion.div>
          <span className="text-[0.55rem] tracking-[0.35em] uppercase text-cream/25">Scroll</span>
        </motion.div>
      </section>

      {/* ── Marquee ───────────────────────────────────────────────────────────── */}
      <div className="relative py-5 border-y border-cream/[0.06] overflow-hidden">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="flex items-center gap-6 px-6 text-[0.65rem] tracking-[0.35em] uppercase font-body whitespace-nowrap"
              style={{ color: i % 2 === 0 ? 'rgba(240,236,228,0.25)' : 'rgba(201,165,102,0.4)' }}
            >
              {item}
              <span className="w-1 h-1 rounded-full bg-gold/30 inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 02 · MANIFESTO                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="manifesto" className="relative py-32 md:py-48 px-6 md:px-20">
        <div className="noise-overlay" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">

          {/* Section label */}
          <SlideIn from="left" className="lg:col-span-3">
            <div className="flex items-center gap-4 mb-6">
              <span className="font-display text-[4rem] font-light text-gold/20 leading-none">01</span>
            </div>
            <div className="rule w-12 mb-4" />
            <p className="text-[0.65rem] tracking-[0.3em] uppercase text-cream/30 font-body">Manifesto</p>
          </SlideIn>

          {/* Quote */}
          <SlideIn from="right" delay={0.15} className="lg:col-span-9">
            <blockquote className="font-display font-light leading-[1.1] text-cream mb-10"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 4rem)' }}
            >
              We don&apos;t build software.{' '}
              <span style={{ fontStyle: 'italic', color: 'rgba(240,236,228,0.45)' }}>
                We engineer the infrastructure of tomorrow&apos;s education.
              </span>
            </blockquote>
            <div className="rule-gold mb-10" style={{ width: '100%' }} />
            <p className="font-body text-cream/45 text-base leading-relaxed max-w-3xl">
              Yulix Labs is a technology laboratory focused exclusively on education. We believe the
              institutions that shape minds deserve tools built with the same precision and care as
              the most advanced technology in the world. Every product we create is engineered to
              the highest standard — fast, reliable, and designed to last.
            </p>
          </SlideIn>
        </div>
      </section>

      <div className="rule mx-6 md:mx-20" />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 03 · PRODUCTS                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="products" className="relative py-32 md:py-48 px-6 md:px-20">
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="flex items-end justify-between mb-20">
            <FadeUp>
              <div className="flex items-center gap-5 mb-4">
                <span className="font-display text-[4rem] font-light text-gold/20 leading-none">02</span>
                <div>
                  <p className="text-[0.62rem] tracking-[0.35em] uppercase text-cream/30 mb-2 font-body">The Ecosystem</p>
                  <h2 className="font-display font-light text-cream leading-none"
                    style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
                  >
                    Our Products
                  </h2>
                </div>
              </div>
            </FadeUp>
            <FadeIn delay={0.3} className="hidden md:block">
              <p className="text-[0.7rem] tracking-[0.15em] uppercase text-cream/25 max-w-xs text-right font-body">
                One live platform.<br />Two in development.
              </p>
            </FadeIn>
          </div>

          {/* Products grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-cream/[0.06]">

            {/* ── Yulaa (featured, 2/3 width) ── */}
            <TiltCard intensity={4} className="lg:col-span-2">
              <div className="product-card h-full min-h-[520px] p-10 md:p-14 flex flex-col justify-between relative overflow-hidden">
                {/* Background ambient video */}
                <video
                  autoPlay muted loop playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-[0.06] pointer-events-none"
                  aria-hidden="true"
                >
                  <source src={VIDEOS.ambient} type="video/mp4" />
                </video>
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse 80% 60% at 10% 90%, rgba(26,140,165,0.12) 0%, transparent 60%)' }}
                />

                <div className="relative z-10">
                  {/* Status */}
                  <div className="flex items-center gap-3 mb-10">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <span className="text-[0.62rem] tracking-[0.35em] uppercase text-brand-400 font-body">Live Now</span>
                    <span className="ml-auto text-[0.62rem] tracking-[0.2em] uppercase text-cream/25 font-body">2024</span>
                  </div>

                  {/* Name */}
                  <h3 className="font-display font-light text-cream mb-3 leading-none"
                    style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)' }}
                  >
                    Yulaa
                  </h3>
                  <p className="text-[0.68rem] tracking-[0.3em] uppercase text-cream/35 mb-8 font-body">
                    School Management Platform
                  </p>
                  <div className="rule mb-8" />
                  <p className="font-body text-cream/50 text-sm leading-relaxed max-w-md mb-10">
                    A complete multi-tenant school management platform. Attendance, fees, admissions,
                    timetables, exams, analytics — 25+ modules unified in one interface,
                    built for institutions of every scale.
                  </p>

                  {/* Stat strip */}
                  <div className="flex gap-10">
                    {YULAA_STATS.map(s => (
                      <div key={s.label}>
                        <div className="stat-num"><Counter value={s.value} /></div>
                        <div className="text-[0.6rem] tracking-[0.2em] uppercase text-cream/30 mt-1 font-body">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="relative z-10 mt-10 flex items-center justify-between">
                  <a
                    href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
                    className="group flex items-center gap-3 text-[0.72rem] tracking-[0.2em] uppercase font-body transition-all duration-300"
                    style={{ color: '#1A8CA5' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#2ba6c0'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#1A8CA5'; }}
                  >
                    Explore Yulaa
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="group-hover:translate-x-1 transition-transform"
                    ><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                  <span className="text-[0.6rem] tracking-[0.2em] uppercase text-cream/15 font-body">Yulix Labs · 01</span>
                </div>
              </div>
            </TiltCard>

            {/* ── Coming soon stack ── */}
            <div className="flex flex-col gap-px">
              {[
                {
                  code: 'YLX-02',
                  year: '2025',
                  hint: 'The next chapter in learning analytics and student outcomes intelligence.',
                  accent: 'rgba(201,165,102,0.5)',
                  accentBg: 'rgba(201,165,102,0.08)',
                },
                {
                  code: 'YLX-03',
                  year: '2026',
                  hint: 'AI-native infrastructure for educational institutions. Built from ground zero.',
                  accent: 'rgba(139,92,246,0.5)',
                  accentBg: 'rgba(139,92,246,0.06)',
                },
              ].map((p, i) => (
                <TiltCard key={p.code} intensity={5} className="flex-1">
                  <div className="product-card h-full min-h-[258px] p-8 md:p-10 flex flex-col justify-between relative">
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse 70% 50% at 80% 20%, ${p.accentBg} 0%, transparent 70%)` }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[0.58rem] tracking-[0.35em] uppercase font-body" style={{ color: p.accent }}>
                          In Development
                        </span>
                        <span className="text-[0.62rem] tracking-[0.2em] text-cream/20 font-body">{p.year}</span>
                      </div>
                      <h3 className="font-display font-light text-cream/90 leading-none mb-3"
                        style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}
                      >
                        <span className="redacted px-3 py-1" style={{ fontSize: '0.75em' }}>CLASSIFIED</span>
                      </h3>
                      <p className="text-[0.62rem] tracking-[0.25em] uppercase mb-5 font-body" style={{ color: p.accent }}>
                        {p.code}
                      </p>
                      <div className="rule mb-5" />
                      <p className="font-body text-[0.78rem] text-cream/35 leading-relaxed">{p.hint}</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: p.accent }} />
                      <span className="text-[0.58rem] tracking-[0.25em] uppercase text-cream/25 font-body">Yulix Labs · 0{i + 2}</span>
                    </div>
                  </div>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="rule mx-6 md:mx-20" />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 04 · YULAA DEEP DIVE                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="yulaa" className="relative py-32 md:py-48 px-6 md:px-20">
        <div className="noise-overlay" />
        <div className="max-w-7xl mx-auto relative z-10">

          {/* Section header */}
          <FadeUp className="mb-20">
            <div className="flex items-center gap-5 mb-2">
              <span className="font-display text-[4rem] font-light text-gold/20 leading-none">03</span>
              <div>
                <p className="text-[0.62rem] tracking-[0.35em] uppercase text-cream/30 mb-2 font-body">Featured Product</p>
                <h2 className="font-display font-light text-cream leading-none"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
                >
                  Yulaa Platform
                </h2>
              </div>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">

            {/* Left: Description */}
            <SlideIn from="left">
              <p className="font-body text-cream/50 text-base leading-relaxed mb-10 max-w-lg">
                A production-grade multi-tenant SaaS platform built with Next.js 14 and PostgreSQL.
                Multi-tenant from the ground up — each institution gets isolated data, custom workflows
                and branding. 7 role types, 25+ modules, real-time notifications.
              </p>

              {/* Feature list */}
              <div className="space-y-0 mb-12">
                {YULAA_FEATURES.map((f, i) => (
                  <motion.div
                    key={f}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.7, ease: 'easeOut' }}
                    className="flex items-center gap-5 py-4 border-b border-cream/[0.06]"
                  >
                    <span className="text-[0.6rem] tracking-[0.2em] text-gold/50 font-body shrink-0"
                      style={{ minWidth: '2rem' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-body text-[0.82rem] text-cream/55">{f}</span>
                  </motion.div>
                ))}
              </div>

              <a
                href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
                className="group inline-flex items-center gap-4 text-[0.72rem] tracking-[0.25em] uppercase font-body"
                style={{ color: '#1A8CA5' }}
              >
                Launch Platform
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </motion.span>
              </a>
            </SlideIn>

            {/* Right: 3D Dashboard mockup */}
            <SlideIn from="right" delay={0.2}>
              <TiltCard intensity={6}>
                <div className="rounded-none overflow-hidden border border-cream/[0.08]"
                  style={{
                    background: '#080812',
                    boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 0 60px rgba(26,140,165,0.06)',
                    transform: 'perspective(1000px) rotateX(6deg) rotateY(-3deg)',
                  }}
                >
                  {/* Chrome */}
                  <div className="h-8 flex items-center px-4 gap-1.5 border-b border-cream/[0.05]"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                    <div className="mx-auto text-[10px] text-cream/15 font-body px-8 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      app.yulaa.in/dashboard
                    </div>
                    <div className="w-10" />
                  </div>

                  {/* Body */}
                  <div className="flex" style={{ height: '320px' }}>
                    {/* Sidebar */}
                    <div className="w-32 shrink-0 border-r border-cream/[0.04] p-3 space-y-1"
                      style={{ background: 'rgba(255,255,255,0.01)' }}
                    >
                      <div className="flex items-center gap-2 px-2 py-1.5 mb-3">
                        <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-[#050505]"
                          style={{ background: '#1A8CA5' }}>Y</div>
                        <span className="text-[10px] text-cream/60 font-body font-medium">Yulaa</span>
                      </div>
                      {['Dashboard', 'Students', 'Attendance', 'Fees', 'Timetable', 'Exams', 'Reports'].map((item, i) => (
                        <div key={item} className="flex items-center gap-2 px-2 py-1.5 rounded text-[10px] font-body"
                          style={{
                            background: i === 0 ? 'rgba(26,140,165,0.15)' : 'transparent',
                            color: i === 0 ? '#2ba6c0' : 'rgba(240,236,228,0.2)',
                          }}
                        >
                          <div className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-brand-400' : 'bg-cream/10'}`} />
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Main area */}
                    <div className="flex-1 p-4 overflow-hidden">
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[['Students', '1,248', '#2ba6c0'], ['Absent', '24', '#fb923c'], ['Fee Due', '₹2.4L', '#f87171'], ['Teachers', '86', '#a78bfa']].map(([l, v, c]) => (
                          <div key={l} className="rounded p-2.5 border border-cream/[0.04]"
                            style={{ background: 'rgba(255,255,255,0.025)' }}
                          >
                            <div className="text-[8px] text-cream/25 mb-0.5 font-body">{l}</div>
                            <div className="text-sm font-bold font-display" style={{ color: c }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded border border-cream/[0.04] p-3 mb-2"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                      >
                        <div className="text-[8px] text-cream/20 mb-2 font-body">Attendance This Week</div>
                        <div className="flex items-end gap-1.5 h-12">
                          {[78, 92, 68, 96, 84, 90, 76].map((h, i) => (
                            <motion.div key={i}
                              initial={{ height: 0 }}
                              whileInView={{ height: `${h}%` }}
                              viewport={{ once: true }}
                              transition={{ delay: 0.4 + i * 0.07, duration: 0.6, ease: 'easeOut' }}
                              className="flex-1 rounded-sm"
                              style={{ background: 'linear-gradient(to top, #0e7490, #22d3ee)', opacity: 0.65 }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[['Announcements', '3 new'], ['Leave Pending', '7'], ['Next Exam', 'Apr 15']].map(([l, v]) => (
                          <div key={l} className="rounded p-2 border border-cream/[0.03]"
                            style={{ background: 'rgba(255,255,255,0.015)' }}
                          >
                            <div className="text-[7px] text-cream/20 font-body">{l}</div>
                            <div className="text-[10px] text-cream/50 font-body mt-0.5">{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </SlideIn>
          </div>
        </div>
      </section>

      <div className="rule mx-6 md:mx-20" />

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 05 · VISION                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section id="vision" className="relative py-32 md:py-48 px-6 md:px-20">
        <div className="max-w-7xl mx-auto">

          <FadeUp className="mb-20">
            <div className="flex items-center gap-5 mb-2">
              <span className="font-display text-[4rem] font-light text-gold/20 leading-none">04</span>
              <div>
                <p className="text-[0.62rem] tracking-[0.35em] uppercase text-cream/30 mb-2 font-body">What&apos;s Next</p>
                <h2 className="font-display font-light text-cream leading-none"
                  style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
                >
                  The Laboratory<br />
                  <span style={{ fontStyle: 'italic', color: 'rgba(240,236,228,0.4)' }}>Never Stops</span>
                </h2>
              </div>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-cream/[0.06]">
            {[
              {
                num: '01',
                title: 'Yulaa',
                desc: 'School Management Platform — live and serving schools now. Continuously evolving.',
                status: 'Live',
                statusColor: '#1A8CA5',
                year: '2024',
              },
              {
                num: '02',
                title: '[YLX-02]',
                desc: 'A new dimension of learning analytics. Student outcome intelligence at scale.',
                status: 'In Development',
                statusColor: '#c9a566',
                year: '2025',
              },
              {
                num: '03',
                title: '[YLX-03]',
                desc: 'AI-native infrastructure purpose-built for educational institutions.',
                status: 'Concepting',
                statusColor: '#8b5cf6',
                year: '2026',
              },
            ].map((item, i) => (
              <FadeUp key={item.num} delay={i * 0.12}>
                <div className="bg-[#0a0a0a] border-0 p-10 md:p-12 h-full min-h-[320px] flex flex-col justify-between"
                  style={{ borderRight: i < 2 ? '1px solid rgba(240,236,228,0.06)' : 'none' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-8">
                      <span className="font-display text-[2.5rem] font-light text-gold/15 leading-none">{item.num}</span>
                      <span className="text-[0.58rem] tracking-[0.3em] uppercase font-body" style={{ color: item.statusColor }}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="font-display font-light text-cream/90 mb-4 leading-none"
                      style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.4rem)' }}
                    >
                      {item.title.startsWith('[') ? <span className="redacted">{item.title}</span> : item.title}
                    </h3>
                    <div className="rule-gold mb-6" style={{ width: '40px' }} />
                    <p className="font-body text-sm text-cream/35 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-8">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: item.statusColor }} />
                    <span className="text-[0.58rem] tracking-[0.2em] uppercase text-cream/20 font-body">{item.year}</span>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CTA · FULL SCREEN                                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden px-6">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 60% at 50% 50%, rgba(26,140,165,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 60% 40% at 20% 80%, rgba(201,165,102,0.05) 0%, transparent 60%),
              #050505
            `,
          }} />
          <div className="noise-overlay" />
        </div>
        <div className="rule-gold absolute top-0 left-6 right-6" />

        <FadeUp className="relative z-10 text-center max-w-4xl mx-auto">
          <p className="text-[0.62rem] tracking-[0.4em] uppercase text-gold/60 mb-8 font-body">
            <span className="gold-line mr-4" />
            Begin Your Journey
            <span className="gold-line ml-4" />
          </p>
          <h2 className="font-display font-light text-cream leading-[0.9] mb-8"
            style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
          >
            Ready to transform<br />
            <span style={{ fontStyle: 'italic', color: 'rgba(240,236,228,0.45)' }}>
              your institution?
            </span>
          </h2>
          <p className="font-body text-cream/35 mb-12 text-sm tracking-wide">
            No setup fees. No contracts. Start in minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href={WEB_APP_URL} target="_blank" rel="noopener noreferrer"
              className="group px-10 py-5 text-[0.72rem] tracking-[0.3em] uppercase font-body font-medium transition-all duration-400"
              style={{
                background: 'rgba(201,165,102,0.1)',
                border: '1px solid rgba(201,165,102,0.45)',
                color: '#c9a566',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'rgba(201,165,102,0.18)';
                el.style.boxShadow = '0 0 60px rgba(201,165,102,0.15)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.background = 'rgba(201,165,102,0.1)';
                el.style.boxShadow = 'none';
              }}
            >
              Start Free Trial →
            </a>
            <a href="#products"
              className="text-[0.72rem] tracking-[0.25em] uppercase text-cream/30 hover:text-cream/60 transition-colors font-body"
            >
              View Products
            </a>
          </div>
        </FadeUp>

        <div className="rule-gold absolute bottom-0 left-6 right-6" />
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 md:px-20 border-t border-cream/[0.05]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center text-[#050505] font-bold text-xs"
              style={{ background: '#c9a566' }}
            >Y</div>
            <div>
              <div className="text-[0.6rem] tracking-[0.35em] uppercase text-gold/70 font-body">Yulix Labs</div>
            </div>
          </div>

          <div className="flex items-center gap-8 text-[0.6rem] tracking-[0.2em] uppercase text-cream/25 font-body">
            <a href="#manifesto" className="hover:text-cream/50 transition-colors">About</a>
            <a href="#products"  className="hover:text-cream/50 transition-colors">Products</a>
            <a href={WEB_APP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-cream/50 transition-colors">Yulaa</a>
          </div>

          <p className="text-[0.6rem] tracking-[0.2em] uppercase text-cream/20 font-body">
            © {new Date().getFullYear()} Yulix Labs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
