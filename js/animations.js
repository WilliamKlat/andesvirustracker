// Scroll-triggered fade-in animations — restrained, editorial timing
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.fade-in-up').forEach(el => fadeObserver.observe(el));

// Hero virus image — scroll-driven zoom (zooms in then back out)
(() => {
  const img = document.querySelector('.hero-visual-img');
  const hero = document.querySelector('.hero');
  if (!img || !hero) return;

  // Respect users who prefer reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    img.style.setProperty('--zoom', '1');
    return;
  }

  let ticking = false;
  const MIN_SCALE = 1.0;
  const PEAK_SCALE = 1.32;
  const TROUGH_SCALE = 0.96;

  function update() {
    const heroHeight = hero.offsetHeight || 600;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    // progress: 0 at top, 1 when scrolled exactly past hero, >1 below
    const progress = Math.min(Math.max(scrollY / heroHeight, 0), 1.6);

    let scale;
    if (progress <= 0.55) {
      // Phase 1: zoom in from 1.0 -> peak
      const t = progress / 0.55;
      scale = MIN_SCALE + (PEAK_SCALE - MIN_SCALE) * easeOutCubic(t);
    } else {
      // Phase 2: zoom back out from peak -> trough as user keeps scrolling
      const t = Math.min((progress - 0.55) / 1.05, 1);
      scale = PEAK_SCALE + (TROUGH_SCALE - PEAK_SCALE) * easeInOutCubic(t);
    }
    img.style.setProperty('--zoom', scale.toFixed(3));
    ticking = false;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
