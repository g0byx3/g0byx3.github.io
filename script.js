(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover: hover)').matches;
  const $ = s => document.querySelector(s);

  const GLYPHS = '░▒▓█/\\|-_=+*#<>§¤@%&';
  const glyph = () => GLYPHS[Math.random() * GLYPHS.length | 0];
  const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* Header: two layers of noise scroll in opposite directions. The name is
     only the region where the second layer shows through, so a still frame
     is just noise. */
  {
    const hero = $('#hero'), canvas = $('#noise'), ctx = canvas.getContext('2d');
    const DARK = 11, LIGHT = 150;
    let W, H, mask, back, front, frame, t = 0, frozen = false, last = 0;

    const gridSize = () => {
      const cell = innerWidth < 640 ? 3 : 5;
      return [Math.max(60, Math.floor(canvas.clientWidth / cell)), Math.max(30, Math.floor(canvas.clientHeight / cell))];
    };

    const build = () => {
      [W, H] = gridSize();
      canvas.width = W;
      canvas.height = H;

      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const o = off.getContext('2d');
      let size = H * 0.8;
      o.font = `700 ${size}px "IBM Plex Mono", monospace`;
      size = Math.min(size, size * W * 0.9 / o.measureText('g0byx3').width);
      o.font = `700 ${size}px "IBM Plex Mono", monospace`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillText('g0byx3', W / 2, H * 0.47);
      const alpha = o.getImageData(0, 0, W, H).data;

      mask = new Uint8Array(W * H);
      back = new Uint8Array(W * H);
      front = new Uint8Array(W * H);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = alpha[i * 4 + 3] > 110;
        back[i] = Math.random() < .5;
        front[i] = Math.random() < .5;
      }
      frame = ctx.createImageData(W, H);
      draw();
    };

    const draw = () => {
      const d = frame.data;
      for (let y = 0; y < H; y++) {
        const yb = (y + t) % H, yf = (y - t % H + H) % H;
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          const v = reduce
            ? (mask[i] ? (front[i] ? 235 : 90) : (back[i] ? 75 : DARK))
            : ((mask[i] ? front[yf * W + x] : back[yb * W + x]) ? LIGHT : DARK);
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
          d[i * 4 + 3] = 255;
        }
      }
      ctx.putImageData(frame, 0, 0);
    };

    const loop = now => {
      if (!frozen && now - last > 55) { t++; draw(); last = now; }
      requestAnimationFrame(loop);
    };

    hero.addEventListener('mouseenter', () => frozen = true);
    hero.addEventListener('mouseleave', () => frozen = false);
    hero.addEventListener('touchstart', () => frozen = !frozen, { passive: true });
    // rebuild as the header changes size, at most once a frame, and only
    // when the number of cells actually changes
    let pending = false;
    const fit = () => {
      pending = false;
      const [w, h] = gridSize();
      if (w !== W || h !== H) build();
    };
    document.fonts.ready.then(() => {
      build();
      new ResizeObserver(() => { if (!pending) { pending = true; requestAnimationFrame(fit); } }).observe(canvas);
      if (!reduce) requestAnimationFrame(loop);
    });
  }

  /* CrunchTime: the app's own launch mark, inlined so every replay redraws it.
     Each copy gets suffixed ids so two copies never share a clip-path or mask. */
  const WORDMARK = [...'CRUNCHTIME'];
  let markSvg = '';

  const drawMark = el => {
    if (!markSvg) return;
    el.querySelector('.ct-mark').innerHTML = el.dataset.suffix
      ? markSvg.replace(/id="([\w-]+)"/g, `id="$1${el.dataset.suffix}"`).replace(/url\(#([\w-]+)\)/g, `url(#$1${el.dataset.suffix})`)
      : markSvg;
  };
  const makeCt = (el, suffix = '') => {
    el.dataset.suffix = suffix;
    const letters = WORDMARK.map((c, i) => `<span style="--i:${i};--s:${((i - (WORDMARK.length - 1) / 2) * 2.2).toFixed(1)}">${c}</span>`);
    el.innerHTML = `<div class="ct-mark"><img src="img/crunchtime-mark.svg" alt=""></div><p class="ct-word">${letters.join('')}</p><p class="ct-tag">YOUR FITNESS JOURNEY</p>`;
    drawMark(el);
    return el;
  };
  const playCt = el => {
    el.classList.remove('play');
    drawMark(el);
    void el.offsetWidth;
    el.classList.add('play');
  };

  const tileCt = makeCt($('.works .ct'));
  fetch('img/crunchtime-mark.svg').then(r => r.text()).then(svg => { markSvg = svg; drawMark(tileCt); }).catch(() => {});

  /* The ASCII box. */
  const wrapJustified = (text, width) => {
    const lines = [''];
    for (const word of text.split(' ')) {
      const cur = lines[lines.length - 1];
      if (cur && cur.length + 1 + word.length > width) lines.push(word);
      else lines[lines.length - 1] = cur ? `${cur} ${word}` : word;
    }
    return lines.map((line, i) => {
      const gaps = line.split(' ').length - 1;
      if (i === lines.length - 1 || !gaps) return line;
      const extra = width - line.length;
      let n = 0;
      return line.replace(/ /g, () => ' '.repeat(1 + Math.floor(extra / gaps) + (n++ < extra % gaps ? 1 : 0)));
    });
  };

  // the frame leaves a gap in the top border for the title and empty rows for the note
  const frameText = (d, width, rows, gap) => {
    const f = s => `<span class="f">${s}</span>`;
    const row = (html, len) => f('| ') + html + ' '.repeat(width - len) + f(' |');
    const out = [f('+--') + ' '.repeat(gap) + f('-'.repeat(width - gap) + '+')];
    out.push(row(f(esc(d.kind)), d.kind.length), row('', 0));
    for (let i = 0; i < rows; i++) out.push(row('', 0));
    const links = [[d.link, 'more'], [d.privacy, 'privacy']].filter(([href]) => href);
    if (links.length) out.push(row('', 0), ...links.map(([href, label]) => row(`<a href="${href}">&gt; ${label}</a>`, label.length + 2)));
    out.push(f('+' + '-'.repeat(width + 2) + '+'));
    return out.join('\n');
  };

  // written word by word; ~~struck~~ and __underlined__ once their words are down
  const handwrite = text => {
    let i = 0;
    const words = s => s.split(/(\s+)/).map(p => /\S/.test(p) ? `<span class="w" style="--i:${i++}">${esc(p)}</span>` : p).join('');
    return text.split(/(~~.*?~~|__.*?__)/).map(part => {
      const m = part.match(/^(~~|__)(.*)\1$/);
      if (!m) return words(part);
      const inner = words(m[2]);
      return `<span class="${m[1] === '~~' ? 'struck' : 'under'}" style="--d:${(.45 + i * .055).toFixed(2)}s">${inner}</span>`;
    }).join('');
  };

  // the frame resolves out of noise going round the border from the top-left
  // corner, both ways at once, and closes at the middle of the bottom edge
  const drawFrameIn = pre => {
    if (reduce) return;
    const lines = pre.textContent.split('\n');
    const R = lines.length, C = lines[0].length, mid = C >> 1;
    const left = R - 1 + mid, right = (C - 1) + (R - 1) + (C - 1 - mid);
    const when = (r, c) => {
      if (r === 0) return c / right;
      if (c === C - 1) return (C - 1 + r) / right;
      if (r === R - 1) return c >= mid ? (C - 1 + R - 1 + C - 1 - c) / right : (R - 1 + c) / left;
      return r / left;
    };

    const cells = [];
    let r = 0, c = 0;
    const walk = node => {
      for (const n of node.childNodes) {
        if (n.nodeType !== 3) { walk(n); continue; }
        const text = n.textContent, at = [];
        for (const ch of text) {
          at.push(ch === '\n' ? -1 : when(r, c));
          if (ch === '\n') { r++; c = 0; } else c++;
        }
        cells.push([n, text, at]);
      }
    };
    walk(pre);

    const run = pre.dataset.run = String(+(pre.dataset.run || 0) + 1);
    const start = performance.now(), duration = 900;
    const step = now => {
      const k = Math.min(1, (now - start) / duration);
      for (const [node, text, at] of cells) {
        let out = '';
        for (let i = 0; i < text.length; i++) out += text[i] === ' ' || at[i] < 0 || at[i] <= k ? text[i] : glyph();
        node.textContent = out;
      }
      if (k < 1 && pre.isConnected && pre.dataset.run === run) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* Tiles and the pop-up. */
  const projects = $('#projects'), pop = $('#pop'), media = pop.querySelector('.pop-media');
  const frameEl = pop.querySelector('.frame'), titleEl = pop.querySelector('.title'), note = pop.querySelector('.note');
  let current = null, closing, ctLoop;

  const layoutBox = work => {
    const d = work.dataset;
    const style = getComputedStyle(frameEl), cw = parseFloat(style.fontSize) * 0.6, lh = parseFloat(style.lineHeight);
    const room = Math.min(innerWidth - 32 - media.offsetWidth - parseFloat(getComputedStyle(pop).columnGap), 420);
    const width = Math.max(18, Math.min(38, Math.floor(room / cw) - 4));

    note.innerHTML = handwrite(d.info);
    Object.assign(note.style, { width: `${width * cw}px`, left: `${2 * cw}px`, top: `${2 + 3 * lh}px` });

    titleEl.textContent = d.name;
    titleEl.style.animation = 'none';
    void titleEl.offsetWidth;
    titleEl.style.animation = '';
    Object.assign(titleEl.style, { left: `${4 * cw}px`, top: `${2 + (lh - titleEl.offsetHeight) / 2}px` });

    const gap = Math.ceil(titleEl.offsetWidth / cw) + 2;
    frameEl.innerHTML = frameText(d, width, Math.ceil(note.offsetHeight / lh), gap);
    drawFrameIn(frameEl);
  };

  // just under the tile, kept inside the viewport
  const placePop = work => {
    const box = projects.getBoundingClientRect(), tile = work.getBoundingClientRect();
    const x = Math.min(tile.left - box.left, innerWidth - 16 - box.left - pop.offsetWidth);
    pop.style.top = `${tile.bottom - box.top + 14}px`;
    pop.style.left = `${Math.max(x, 16 - box.left)}px`;
    return tile;
  };

  const openWork = work => {
    clearTimeout(closing);
    if (current === work) return;
    const switching = !!current;
    if (current) { current.classList.remove('open'); current.setAttribute('aria-expanded', 'false'); }
    current = work;
    work.classList.add('open');
    work.setAttribute('aria-expanded', 'true');
    clearInterval(ctLoop);

    if (work.dataset.video) {
      media.innerHTML = `<video src="${work.dataset.video}" poster="${work.querySelector('img').src}" muted loop playsinline></video>`;
      if (!reduce) media.firstChild.play().catch(() => {});
    } else {
      const ct = makeCt(document.createElement('div'), '-pop');
      ct.className = 'ct';
      media.replaceChildren(ct);
      if (!reduce) { playCt(ct); ctLoop = setInterval(() => playCt(ct), 4200); }
    }

    pop.classList.add('on');
    layoutBox(work);
    // the pixel and hand fonts may still be loading: lay the box out again once they are in
    const fonts = ['15px Silkscreen', '600 19px Caveat'];
    if (!fonts.every(f => document.fonts.check(f))) {
      Promise.all(fonts.map(f => document.fonts.load(f))).then(() => { if (current === work) layoutBox(work); });
    }

    const tile = placePop(work);

    // grow out of the tile
    if (!reduce) {
      const to = media.getBoundingClientRect();
      media.animate([
        { transform: `translate(${tile.left - to.left}px, ${tile.top - to.top}px) scale(${tile.width / to.width})`, opacity: switching ? 1 : .6 },
        { transform: 'none', opacity: 1 },
      ], { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    }
  };

  const closeWork = () => {
    if (!current) return;
    current.classList.remove('open');
    current.setAttribute('aria-expanded', 'false');
    current = null;
    pop.classList.remove('on');
    clearInterval(ctLoop);
    media.querySelector('video')?.pause();
  };
  const closeSoon = () => { clearTimeout(closing); closing = setTimeout(closeWork, 250); };
  const toggle = work => current === work ? closeWork() : openWork(work);

  if (!hover) $('#hint').textContent = '// things i made. tap one.';
  for (const work of document.querySelectorAll('.work')) {
    work.setAttribute('aria-label', `${work.dataset.name}, ${work.dataset.kind}`);
    work.addEventListener('click', () => toggle(work));
    work.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(work); }
    });
    if (hover) {
      work.addEventListener('mouseenter', () => openWork(work));
      work.addEventListener('mouseleave', closeSoon);
    }
  }
  if (hover) {
    pop.addEventListener('mouseenter', () => clearTimeout(closing));
    pop.addEventListener('mouseleave', closeSoon);
  }
  document.addEventListener('click', e => { if (!e.target.closest('.work, .pop')) closeWork(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeWork(); });

  // a width change (rotation, window resize) reflows the open box; height-only
  // changes, like a mobile address bar sliding away, leave it alone
  let lastWidth = innerWidth;
  addEventListener('resize', () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    if (current) { layoutBox(current); placePop(current); }
  });

  /* Footer: the co-author stays a blur; the rooster crows. */
  const who = $('#who'), coded = $('#coded');
  const blur = () => { who.textContent = Array.from({ length: 6 }, glyph).join(''); };
  blur();
  if (!reduce) setInterval(blur, 90);

  const morph = (el, to, duration = 450) => {
    const len = Math.max(el.textContent.length, to.length), start = performance.now();
    const step = now => {
      const k = Math.min(1, (now - start) / duration);
      let out = '';
      for (let i = 0; i < len; i++) out += i / len < k ? (to[i] || '') : glyph();
      el.textContent = k < 1 ? out : to;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  let crowing = false;
  $('#rooster').addEventListener('click', () => {
    if (crowing) return;
    crowing = true;
    who.style.visibility = 'hidden';
    morph(coded, 'cocorico!');
    setTimeout(() => {
      morph(coded, 'co-coded with');
      who.style.visibility = '';
      crowing = false;
    }, 1600);
  });

  /* Clock: local time in France, and what that usually means. */
  const clock = $('#clock');
  const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  const tick = () => {
    const time = hhmm.format(new Date()), h = +time.slice(0, 2);
    const doing = h >= 21 || h < 2 ? 'night shift' : h < 8 ? 'asleep, probably' : h < 18 ? 'day job' : 'dinner, then code';
    clock.textContent = `${time} in France · ${doing}`;
  };
  tick();
  setInterval(tick, 20000);

  const title = document.title;
  document.addEventListener('visibilitychange', () => { document.title = document.hidden ? 'cocorico?' : title; });

  console.log('%cg0byx3 · view-source is still the best documentation.', 'color:#f2c94c;font-family:monospace');
})();
