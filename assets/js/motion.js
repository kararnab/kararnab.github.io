// Shared page motion for the app pages, plus the icon hand-off between pages (homepage included).
// Loaded in <head> without defer: it arms motion before first paint, so nothing flashes in and then
// hides, and it must register the page-transition listeners before the first render.
// Reduced motion gets the finished, static page: no class, no listeners, no transitions.
(() => {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('motion');

  // ---- Icon hand-off between pages --------------------------------------
  // The app icon the visitor clicked travels into the next page's hero (and back again). Only a
  // tile that is on screen takes part, so an icon never flies in from somewhere the visitor can't see.
  const slugs = { '1chat': 'onechat', opennote: 'opennote', connections: 'connections', libraryz: 'libraryz', avplayer: 'avplayer', codeatlas: 'codeatlas' };
  const appOf = (url) => {
    try {
      const m = new URL(url, location.href).pathname.match(/\/apps\/([^/]+)\//);
      return m ? slugs[m[1]] || null : null;
    } catch { return null; }
  };
  const onScreen = (node) => {
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  const tileFor = (app) => [...document.querySelectorAll('.app-tile')]
    .find((t) => t.closest('[data-app]')?.dataset.app === app && onScreen(t));
  const named = new Set();
  const clear = () => { named.forEach((t) => { t.style.viewTransitionName = ''; }); named.clear(); };
  const name = (app) => {
    const tile = app && tileFor(app);
    if (!tile) return;
    tile.style.viewTransitionName = 'app-icon';
    named.add(tile);
  };
  // Leaving an app page for a non-app page hands off this page's own icon; otherwise the destination's.
  const handOff = (here, there) => appOf(there) || appOf(here);

  addEventListener('pageswap', (e) => {
    if (!e.viewTransition) return;
    clear();
    name(handOff(location.href, e.activation?.entry?.url));
  });
  addEventListener('pagereveal', (e) => {
    clear(); // a page restored from the back/forward cache still carries the name it left with
    if (!e.viewTransition) return;
    const from = window.navigation?.activation?.from?.url || document.referrer;
    name(handOff(from, location.href));
    e.viewTransition.finished.finally(clear);
  });

  // ---- App page motion --------------------------------------------------
  const ready = () => {
    if (!document.querySelector('.app-hero')) return;
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

    // Sections rise in once as they reach the viewport, staggered within their group. The hidden
    // starting state lives in motion.css, keyed on the .motion class set above.
    const groups = '.summary, .features, .gallery, .roadmap, .other-apps';
    const singles = '.section-head, .gallery ~ figure, .share-card, .faq, .cipher';
    document.querySelectorAll(groups).forEach((g) => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
    const items = document.querySelectorAll(`:is(${groups}) > *, ${singles}`);
    if (!('IntersectionObserver' in window)) { items.forEach((n) => n.classList.add('is-in')); return; }
    const reveal = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      reveal.unobserve(en.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((n) => reveal.observe(n));

    // Hero: the thread stitched through the screenshot is pulled taut as the hero scrolls away.
    // Progress eases toward the scroll position each frame, so it glides between wheel notches.
    const hero = document.querySelector('.app-hero');
    const ease = (t) => t * t * (3 - 2 * t);
    // Runs apply(progress) with progress easing toward target() each frame until it arrives.
    const smoothed = (target, apply, rate = 0.16) => {
      let cur = null;
      let running = false;
      const frame = () => {
        const t = target();
        cur = cur === null ? t : cur + (t - cur) * rate;
        if (Math.abs(t - cur) < 0.0005) cur = t;
        apply(cur);
        running = cur !== t;
        if (running) requestAnimationFrame(frame);
      };
      const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', kick);
      kick();
    };
    // How far the hero has scrolled away, 0 to 1, over `span` of its height.
    const heroOut = (span = 1) => () => clamp(-hero.getBoundingClientRect().top / (hero.offsetHeight * span));

    const loom = hero.querySelector('.hero-loom');
    if (loom) smoothed(heroOut(), (p) => loom.style.setProperty('--weft', p.toFixed(4)));

    // Wide screenshots settle from a rounded inset to full size as they scroll in, like the
    // in-development screens on the homepage. The clip is dropped once settled so the shadow shows.
    // A screenshot inside a .shot-frame settles as one piece with its overlays; a quality tag in the
    // frame steps up its ladder as the screenshot comes to full size.
    const wides = [...document.querySelectorAll('.hero-shot-wide')].map((img) => {
      const frame = img.closest('.shot-frame');
      const tag = frame?.querySelector('[data-ladder]');
      return { img: frame || img, tag, ladder: tag?.dataset.ladder.split('|'), cur: null };
    });
    if (wides.length) {
      let running = false;
      const frame = () => {
        running = false;
        for (const w of wides) {
          const r = w.img.getBoundingClientRect();
          const t = ease(clamp(((innerHeight - r.top) / (innerHeight + r.height) - 0.04) / 0.36));
          w.cur = w.cur === null ? t : w.cur + (t - w.cur) * 0.16;
          if (Math.abs(t - w.cur) < 0.0005) w.cur = t; else running = true;
          const k = 1 - w.cur;
          w.img.style.clipPath = k < 0.001 ? '' : `inset(${(k * 6).toFixed(2)}% ${(k * 9).toFixed(2)}% round ${(16 + k * 18).toFixed(1)}px)`;
          w.img.style.transform = k < 0.001 ? '' : `scale(${(1 - k * 0.05).toFixed(4)})`;
          if (w.tag) {
            const last = w.ladder.length - 1;
            const rung = k < 0.001 ? last : Math.min(last, Math.floor((1 - k) * w.ladder.length));
            w.tag.textContent = w.ladder[rung];
            w.tag.classList.toggle('is-climbing', rung < last);
          }
        }
        if (running) requestAnimationFrame(frame);
      };
      const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', kick);
      kick();
    }

    // LibraryZ: pages turn over the spine as the hero scrolls away, one after another, each eased so
    // it lifts slowly, crosses quickly and settles. Any resting angle is a real page at an angle.
    const library = hero.querySelector('.library');
    if (library) {
      const leaves = [...library.querySelectorAll('.leaf')].sort((x, y) => x.style.getPropertyValue('--i') - y.style.getPropertyValue('--i'));
      smoothed(heroOut(0.55), (p) => leaves.forEach((leaf, i) => leaf.style.setProperty('--t', ease(clamp(p * leaves.length * 1.15 - i * 1.05)).toFixed(4))), 0.14);
    }

    // AVPlayer: packets keep flowing from the server along each thread, the TV's stream steps up
    // the quality ladder once it is on, and scrolling hands the episode from the TV to the phone.
    const cast = hero.querySelector('.cast');
    if (cast) {
      const NS = 'http://www.w3.org/2000/svg';
      const svg = cast.querySelector('.cast-threads');
      svg.querySelectorAll('path').forEach((path, i) => [0, 1].forEach((k) => {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('r', '0.9');
        const move = document.createElementNS(NS, 'animateMotion');
        move.setAttribute('dur', '1.6s');
        move.setAttribute('repeatCount', 'indefinite');
        move.setAttribute('begin', `${(2.2 + i * 0.25 + k * 0.8).toFixed(2)}s`);
        move.setAttribute('fill', 'freeze');
        const mpath = document.createElementNS(NS, 'mpath');
        mpath.setAttribute('href', `#${path.id}`);
        move.append(mpath);
        dot.append(move);
        dot.setAttribute('opacity', '0');
        const show = document.createElementNS(NS, 'set');
        show.setAttribute('attributeName', 'opacity');
        show.setAttribute('to', '1');
        show.setAttribute('begin', move.getAttribute('begin'));
        dot.append(show);
        svg.append(dot);
      }));
      // Packets only flow while the scene is on screen.
      new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) svg.unpauseAnimations(); else svg.pauseAnimations();
      }).observe(cast);
      const chip = cast.querySelector('.cast-quality');
      const ladder = chip.dataset.ladder.split(' ');
      ladder.forEach((q, i) => setTimeout(() => { chip.textContent = q; }, 2100 + i * 800));
      smoothed(heroOut(0.6), (p) => cast.style.setProperty('--p', ease(p).toFixed(4)));
    }

    // The privacy band sends a message across the thread: readable on your phone, scrambled while
    // it crosses the servers, readable again on theirs. It replays on each visit and resets only
    // once fully off screen, so the visitor never sees it run backwards.
    const cipher = document.querySelector('.cipher');
    if (cipher) {
      const [, locked, opened] = cipher.querySelectorAll('.bubble');
      const finals = [locked.textContent, opened.textContent];
      const glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789#$%&@*+=?!';
      const noise = (len) => Array.from({ length: len }, () => glyphs[Math.floor(Math.random() * glyphs.length)]).join('');
      let jobs = [];
      // Characters settle into the final text left to right while the rest keeps churning.
      const settle = (node, text, delay, duration) => new Promise((done) => {
        const start = performance.now() + delay;
        const tick = (now) => {
          const t = clamp((now - start) / duration);
          if (now >= start) {
            const fixed = Math.floor(t * text.length);
            node.textContent = text.slice(0, fixed) + noise(text.length - fixed).replace(/./g, (c, i) => (text[fixed + i] === ' ' ? ' ' : c));
          }
          if (t < 1) jobs.push(requestAnimationFrame(tick)); else { node.textContent = text; done(); }
        };
        jobs.push(requestAnimationFrame(tick));
      });
      const stop = () => { jobs.forEach(cancelAnimationFrame); jobs = []; };
      new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        stop();
        cipher.classList.add('is-sending');
        locked.textContent = noise(finals[0].length);
        opened.textContent = finals[0];
        settle(locked, finals[0], 350, 650).then(() => settle(opened, finals[1], 150, 650));
      }, { threshold: 0.6 }).observe(cipher);
      new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) return;
        stop();
        cipher.classList.remove('is-sending');
        locked.textContent = finals[0];
        opened.textContent = finals[1];
      }, { threshold: 0 }).observe(cipher);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
