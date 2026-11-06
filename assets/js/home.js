// Homepage motion: mounts the scrollcraft engine, runs the smoothed scroll scenes and weaves the
// closing cloth. The loom runs through the page: hero thread, margin loom frame, closing cloth.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 860px)').matches;
  // Very tall viewports (a zoomed-out window, a 4K screen at 100%) would make each pinned scene one
  // giant screen with the 1200px-wide content as a small island in it. There the pinned scenes run in
  // natural flow instead, still scroll-driven. Crossing the threshold (zooming) reloads once, because
  // pinning is set up when the engine mounts.
  const roomyQuery = matchMedia('(min-height: 1500px)');
  const roomy = roomyQuery.matches && !small;
  roomyQuery.addEventListener('change', () => location.reload());

  // Reduced motion gets a complete static page: no pinned scroll space and nothing gated on progress.
  if (reduce) {
    root.classList.add('is-static');
    document.querySelectorAll('[data-sc-act="pin"]').forEach((el) => {
      el.removeAttribute('data-sc-span');
      el.setAttribute('data-sc-act', 'flow');
      el.querySelector('[data-sc-stage]')?.removeAttribute('data-sc-stage');
    });
    document.querySelectorAll('[data-sc-cue], [data-sc-kinetic], [data-sc-reveal]').forEach((el) => {
      el.removeAttribute('data-sc-cue');
      el.removeAttribute('data-sc-kinetic');
      el.removeAttribute('data-sc-reveal');
    });
  } else if (roomy) {
    root.classList.add('is-roomy');
    document.querySelectorAll('[data-sc-act="pin"]').forEach((el) => {
      el.setAttribute('data-sc-act', 'flow');
      el.removeAttribute('data-sc-span');
      el.querySelector('[data-sc-stage]')?.removeAttribute('data-sc-stage');
    });
  } else if (small) {
    // Phones read the hero as one natural-flow screen; the thread still draws with scroll.
    const hero = document.querySelector('.loom-act');
    hero.setAttribute('data-sc-act', 'flow');
    hero.removeAttribute('data-sc-span');
    hero.querySelector('[data-sc-stage]').removeAttribute('data-sc-stage');
  }

  if (window.ScrollCraft) window.ScrollCraft.mount(document.body);

  // ---- Smoothed scroll scenes ------------------------------------------
  // Each scene reads its own progress from layout and eases toward it every frame, so motion glides
  // between wheel notches instead of stepping, without taking over native scrolling.
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t);
  const scenes = [];
  const progress = (node, mode) => {
    const r = node.getBoundingClientRect();
    const vh = innerHeight;
    if (mode === 'pin') return clamp(-r.top / Math.max(r.height - vh, 1), -1, 2); // unclamped through entry/exit
    return clamp((vh - r.top) / (vh + r.height)); // flow: 0 entering at the bottom, 1 leaving at the top
  };
  const scene = (node, mode, apply) => node && scenes.push({ node, mode, apply, cur: null });
  let running = false;
  const frame = () => {
    let moving = false;
    for (const s of scenes) {
      const target = progress(s.node, s.mode);
      s.cur = s.cur === null ? target : s.cur + (target - s.cur) * 0.16;
      if (Math.abs(target - s.cur) > 0.0004) moving = true; else s.cur = target;
      s.apply(s.cur);
    }
    running = moving;
    if (moving) requestAnimationFrame(frame);
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  if (!reduce) {
    // Hero: the weft is pulled through the phones and drawn taut.
    const hero = document.querySelector('.loom-act');
    scene(hero, hero.getAttribute('data-sc-act') === 'pin' ? 'pin' : 'flow', (p) => hero.style.setProperty('--weft', clamp(p).toFixed(4)));

    // 1Chat: the headline lights word by word, then the card turns over to its private side.
    const peak = document.querySelector('#onechat');
    const title = peak.querySelector('.lit');
    const split = (part) => {
      const words = part.textContent.trim().split(/\s+/);
      part.textContent = '';
      return words.map((w, i) => {
        const span = document.createElement('span');
        span.className = 'lw';
        span.textContent = w;
        part.append(span, i < words.length - 1 ? ' ' : '');
        return span;
      });
    };
    const wordsA = split(title.querySelector('.peak-a'));
    const wordsB = split(title.querySelector('.peak-b'));
    const light = (words, t) => words.forEach((w, i) => {
      w.style.opacity = (0.2 + 0.8 * clamp(t * words.length - i)).toFixed(3);
    });
    const phone = peak.querySelector('.peak-phone');
    peak.classList.add('peak-lit');
    // Pinned, u runs through the pin (-1 entering, 0..1 held, 2 leaving). In flow (tall viewports) the
    // same choreography is mapped onto the stretch where the whole section is on screen.
    const peakPinned = peak.getAttribute('data-sc-act') === 'pin';
    const toU = (p) => {
      if (peakPinned) return p;
      const h = peak.offsetHeight;
      const vh = innerHeight;
      const a = h / (vh + h);
      const b = vh / (vh + h);
      return -0.5 + 1.1 * clamp((p - a) / Math.max((b - a) * 0.7, 0.01), -0.5, 1);
    };
    scene(peak, peakPinned ? 'pin' : 'flow', (raw) => {
      const u = toU(raw);
      light(wordsA, clamp((u + 0.5) / 0.42)); // lights while the stage slides in
      light(wordsB, clamp((u - 0.08) / 0.3));
      const f = ease(clamp((u - 0.26) / 0.32));
      phone.style.setProperty('--flip', f.toFixed(4));
      phone.style.setProperty('--lift', Math.sin(f * Math.PI).toFixed(4));
      if (u > 0.5) peak.classList.add('is-lit');
      else if (u < 0.42) peak.classList.remove('is-lit');
    });

    // In-development screens settle from a rounded inset to full size as they come in.
    document.querySelectorAll('.pick-media.screen').forEach((fig) => {
      scene(fig, 'flow', (p) => fig.style.setProperty('--s', ease(clamp((p - 0.04) / 0.36)).toFixed(4)));
    });

    // Background: a faint loom frame in the left margin drifts slower than the page.
    const band = document.querySelector('.warp-band');
    if (band) {
      let y = scrollY;
      let bandRun = false;
      const drift = () => {
        y += (scrollY - y) * 0.12;
        band.style.transform = `translate3d(0, ${(-(y * 0.35) % 1320).toFixed(2)}px, 0)`;
        if (Math.abs(scrollY - y) > 0.5) requestAnimationFrame(drift); else bandRun = false;
      };
      drift();
      addEventListener('scroll', () => { if (!bandRun) { bandRun = true; requestAnimationFrame(drift); } }, { passive: true });
    }

    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', kick);
    addEventListener('load', kick);
    kick();
  }

  // OpenNote writes itself in (page wipe + ink underline) every time it comes into view, like the
  // other scroll moments. It resets only once the section is fully off screen, so the visitor never
  // sees it un-write, and the gap between the two observers stops flicker at the edge.
  const feature = document.querySelector('.pick-feature');
  if (feature && !reduce) {
    feature.classList.add('write-armed');
    // The ink follows its heading and the wipe follows the page, so each plays when it is the thing
    // in view (on phones the page sits a screen below the heading).
    const trigger = (node, cls) => new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) feature.classList.add(cls);
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0.2 }).observe(node);
    trigger(feature.querySelector('.ink-title'), 'is-inked');
    trigger(feature.querySelector('.pages'), 'is-written');
    new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) feature.classList.remove('is-inked', 'is-written');
    }, { threshold: 0 }).observe(feature);
  }

  // ---- The weave -------------------------------------------------------
  const apps = [
    { key: 'opennote', name: 'OpenNote', target: '#app-opennote' },
    { key: 'connections', name: 'Connections', target: '#app-connections' },
    { key: 'onechat', name: '1Chat', target: '#onechat' },
    { key: 'libraryz', name: 'LibraryZ', target: '#app-libraryz' },
    { key: 'avplayer', name: 'AVPlayer', target: '#app-avplayer' },
    { key: 'codeatlas', name: 'CodeAtlas', target: '#app-codeatlas' },
  ];
  const NS = 'http://www.w3.org/2000/svg';

  const el = (tag, attrs, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };

  // Draws a plain weave: warps run the full height, each app adds `rows` weft rows that pass
  // over and under alternate warps. Returns one <g> per app so each band can be woven in.
  const weave = (svg, { warps, pitch, warpW, rows, rowH, rowGap, bandGap, pad }) => {
    const width = pad * 2 + (warps - 1) * pitch + warpW;
    const band = rows * rowH + (rows - 1) * rowGap;
    const height = pad * 2 + apps.length * band + (apps.length - 1) * bandGap;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const warpX = (j) => pad + j * pitch;
    const warpGroup = el('g', { class: 'w-warp' }, svg);
    for (let j = 0; j < warps; j++) el('rect', { x: warpX(j), y: 0, width: warpW, height }, warpGroup);
    return apps.map((app, i) => {
      const g = el('g', { class: 'w-pick', style: `--pick: var(--${app.key})` }, svg);
      for (let r = 0; r < rows; r++) {
        const y = pad + i * (band + bandGap) + r * (rowH + rowGap);
        el('rect', { class: 'w-weft', x: 0, y, width, height: rowH }, g);
        // Where the weft passes under, the warp shows on top of it.
        for (let j = 0; j < warps; j++) {
          if ((i * rows + r + j) % 2) el('rect', { class: 'w-under', x: warpX(j), y: y - 0.5, width: warpW, height: rowH + 1 }, g);
        }
      }
      return g;
    });
  };

  // The closing cloth: all six apps woven together. It weaves itself in, band by band, each time it
  // comes into view, and resets only once it is fully off screen so it never visibly unweaves.
  const cloth = document.querySelector('.cloth-swatch');
  const clothPicks = weave(cloth.querySelector('svg'), { warps: 25, pitch: 10, warpW: 4, rows: 3, rowH: 7, rowGap: 2, bandGap: 6, pad: 6 });
  cloth.hidden = false;
  // The maker's woven label (QR for his card) zooms onto the middle of the cloth once its last band
  // has settled (each band starts 150ms after the last and takes 700ms to weave).
  const label = document.querySelector('.woven-label');
  if (label && !reduce) label.classList.add('label-armed');
  const clothDone = 120 + (clothPicks.length - 1) * 150 + 700;
  let timers = [];
  new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    timers.forEach(clearTimeout);
    timers = clothPicks.map((g, i) => setTimeout(() => g.classList.add('is-woven'), reduce ? 0 : 120 + i * 150));
    if (label && !reduce) timers.push(setTimeout(() => label.classList.add('is-woven'), clothDone));
  }, { threshold: 0.35 }).observe(cloth);
  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting || reduce) return;
    timers.forEach(clearTimeout);
    clothPicks.forEach((g) => g.classList.remove('is-woven'));
    label?.classList.remove('is-woven');
  }, { threshold: 0 }).observe(cloth);
})();
