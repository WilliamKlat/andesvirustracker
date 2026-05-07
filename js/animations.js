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

// Hero particle — Tap to play / Tap to stop bouncing 3D sphere mode.
//
// Design notes:
//   * The source PNG is a 3D-rendered sphere viewed front-on. We rotate it
//     ONLY in-plane (rotateZ) so it always appears spherical — no rotateX/Y
//     because those flatten the PNG into a tilted card.
//   * The particle is hard-clamped inside the viewport every frame (and the
//     bouncing size is capped to fit the viewport), so it can never roll
//     off-screen.
(() => {
  const slot     = document.querySelector('.hero-particle-slot');
  const particle = document.querySelector('.hero-particle');
  const playBtn  = document.querySelector('.hero-particle-button');
  const stopBtn  = document.querySelector('.particle-stop');
  if (!slot || !particle || !playBtn || !stopBtn) return;

  let state = 'idle';            // idle | bouncing | returning
  let raf = null;
  let returnTimer = null;
  let x = 0, y = 0, vx = 0, vy = 0;
  let rz = 0, vrz = 0;
  let size = 360;

  function applyTransform() {
    particle.style.transform =
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rz.toFixed(1)}deg)`;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function computeSize(rectWidth) {
    const margin = 32;
    const cap = Math.min(window.innerWidth, window.innerHeight) - margin;
    const wanted = Math.round(rectWidth * 1.25);
    return Math.max(120, Math.min(wanted, cap));
  }

  function play() {
    if (state !== 'idle') return;

    const rect = slot.getBoundingClientRect();
    size = computeSize(rect.width);

    // Center on the slot's centre, then clamp so it starts fully on-screen
    x = rect.left + (rect.width  - size) / 2;
    y = rect.top  + (rect.height - size) / 2;
    x = clamp(x, 0, window.innerWidth  - size);
    y = clamp(y, 0, window.innerHeight - size);

    // Modest random direction
    const angle = Math.random() * Math.PI * 2;
    const speed = 6;
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;

    // In-plane spin only — ~3 deg/frame, random direction
    rz  = 0;
    vrz = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 2 + 2);

    particle.style.setProperty('--bounce-size', size + 'px');
    particle.classList.add('is-bouncing');
    document.body.classList.add('particle-locked');
    applyTransform();

    state = 'bouncing';
    playBtn.hidden = true;
    stopBtn.hidden = false;

    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    if (state !== 'bouncing') { raf = null; return; }

    // Re-read viewport every frame so resizing while bouncing stays correct
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If viewport shrank below particle size, downsize on the fly
    const cap = Math.min(vw, vh) - 32;
    if (size > cap) {
      size = Math.max(120, cap);
      particle.style.setProperty('--bounce-size', size + 'px');
    }

    const maxX = vw - size;
    const maxY = vh - size;

    x += vx;
    y += vy;

    // Clamp + reflect velocity. If maxX/maxY < 0 (impossible since we capped
    // size, but defensive), centre instead of letting position go negative.
    if (maxX < 0) { x = 0; vx = 0; }
    else {
      if (x < 0)    { x = 0;    vx =  Math.abs(vx); bumpSpin(); }
      if (x > maxX) { x = maxX; vx = -Math.abs(vx); bumpSpin(); }
    }
    if (maxY < 0) { y = 0; vy = 0; }
    else {
      if (y < 0)    { y = 0;    vy =  Math.abs(vy); bumpSpin(); }
      if (y > maxY) { y = maxY; vy = -Math.abs(vy); bumpSpin(); }
    }

    rz += vrz;

    applyTransform();
    raf = requestAnimationFrame(tick);
  }

  // Each wall collision nudges spin so it feels reactive — like a real ball
  function bumpSpin() {
    vrz += (Math.random() - 0.5) * 2;
    vrz = clamp(vrz, -8, 8);
    // Don't let spin sit at exactly zero
    if (Math.abs(vrz) < 0.6) vrz = vrz < 0 ? -0.6 : 0.6;
  }

  function stop() {
    if (state !== 'bouncing') return;

    state = 'returning';
    if (raf) { cancelAnimationFrame(raf); raf = null; }

    stopBtn.hidden = true;
    document.body.classList.remove('particle-locked');

    // Recompute slot rect — it may have moved if viewport changed
    const target = slot.getBoundingClientRect();
    const targetX = target.left + (target.width  - size) / 2;
    const targetY = target.top  + (target.height - size) / 2;

    particle.classList.add('is-returning');

    // Force the browser to register the current transform before changing it,
    // so the CSS transition has a "from" state to interpolate from.
    requestAnimationFrame(() => {
      x = targetX; y = targetY;
      rz = 0;
      applyTransform();
    });

    if (returnTimer) clearTimeout(returnTimer);
    returnTimer = setTimeout(finishReturn, 760);
  }

  function finishReturn() {
    if (state !== 'returning') return;
    particle.classList.remove('is-returning', 'is-bouncing');
    particle.style.removeProperty('--bounce-size');
    particle.style.transform = '';
    state = 'idle';
    playBtn.hidden = false;
    returnTimer = null;
  }

  // ----- input wiring -----
  playBtn.addEventListener('click', play);
  stopBtn.addEventListener('click', stop);

  particle.addEventListener('click', () => {
    if (state === 'idle')          play();
    else if (state === 'bouncing') stop();
  });

  particle.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (state === 'idle')          play();
    else if (state === 'bouncing') stop();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state === 'bouncing') stop();
  });
})();
