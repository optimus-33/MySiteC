/* ==========================================================================
   Hrishikesh Dehankar — main.js
   Plain JavaScript. No libraries, no build step.
   Sections: theme, nav, reveal, keyboard, bonda, line field, init.
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionAllowed = () => !reducedMotion.matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* ------------------------------------------------------------------------
     Theme: day / dusk, shared by the header icon and the Play corner switch
     ------------------------------------------------------------------------ */

  const themeToggles = Array.from(document.querySelectorAll('[data-theme-toggle]'));

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dusk' ? 'dusk' : 'day';
  }

  function applyTheme(theme, persist) {
    const isDusk = theme === 'dusk';
    root.setAttribute('data-theme', isDusk ? 'dusk' : 'day');

    if (persist) {
      try {
        localStorage.setItem('hd-theme', isDusk ? 'dusk' : 'day');
      } catch (error) {
        /* private browsing; the theme simply won't be remembered */
      }
    }

    themeToggles.forEach((button) => {
      if (button.getAttribute('data-theme-toggle') === 'switch') {
        button.setAttribute('aria-pressed', String(isDusk));
      }
      if (button.getAttribute('data-theme-toggle') === 'icon') {
        button.setAttribute('aria-label', isDusk ? 'Switch to day theme' : 'Switch to dusk theme');
      }
    });

    document.dispatchEvent(new CustomEvent('hd:theme'));
  }

  themeToggles.forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dusk' ? 'day' : 'dusk', true);
    });
  });

  applyTheme(currentTheme(), false);

  /* ------------------------------------------------------------------------
     Navigation (small screens)
     ------------------------------------------------------------------------ */

  const navToggle = document.querySelector('[data-nav-toggle]');
  const siteNav = document.getElementById('primary-nav');

  function setNav(open) {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      siteNav.setAttribute('data-open', 'true');
    } else {
      siteNav.removeAttribute('data-open');
    }
    document.body.classList.toggle('nav-open', open);
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    siteNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setNav(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        navToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 800) setNav(false);
    });
  }

  /* ------------------------------------------------------------------------
     Reveal on scroll. The hidden state is added by JS, so no JS means no
     invisible content. Reduced motion skips it entirely.
     ------------------------------------------------------------------------ */

  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));

  if (motionAllowed() && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
    );

    revealItems.forEach((item) => {
      item.classList.add('will-reveal');
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------------
     Play corner: a small opt-in keyboard (Web Audio, no samples)
     ------------------------------------------------------------------------ */

  const soundToggle = document.querySelector('[data-sound-toggle]');
  const soundLabel = soundToggle ? soundToggle.querySelector('[data-sound-label]') : null;
  const audioHint = document.querySelector('[data-audio-hint]');
  const pianoKeys = Array.from(document.querySelectorAll('[data-note]'));
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  let audioContext = null;
  let masterGain = null;
  let soundOn = false;

  function ensureAudio() {
    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.18;

      const softener = audioContext.createBiquadFilter();
      softener.type = 'lowpass';
      softener.frequency.value = 2600;

      masterGain.connect(softener);
      softener.connect(audioContext.destination);
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    return audioContext;
  }

  function playNote(frequency) {
    const context = ensureAudio();
    if (!context || !masterGain) return;

    const now = context.currentTime;
    const noteGain = context.createGain();
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.exponentialRampToValueAtTime(0.34, now + 0.015);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

    const fundamental = context.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.setValueAtTime(frequency, now);
    fundamental.detune.setValueAtTime(-3, now);

    const overtone = context.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(frequency * 2, now);

    const overtoneGain = context.createGain();
    overtoneGain.gain.value = 0.14;

    fundamental.connect(noteGain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(noteGain);
    noteGain.connect(masterGain);

    fundamental.start(now);
    overtone.start(now);
    fundamental.stop(now + 1.6);
    overtone.stop(now + 1.6);
  }

  function setSound(on, withGreeting) {
    soundOn = Boolean(on);

    if (soundToggle) {
      soundToggle.setAttribute('aria-pressed', String(soundOn));
    }
    if (soundLabel) {
      soundLabel.textContent = soundOn ? 'Sound on' : 'Sound off';
    }
    if (audioHint) {
      audioHint.textContent = soundOn
        ? 'Sound is on. Press A S D F G H J, or tap the keys.'
        : 'Sound is off. Turn it on when you want to hear it.';
    }

    if (soundOn && withGreeting !== false && AudioContextClass) {
      playNote(392);
    }
  }

  if (!AudioContextClass) {
    if (soundToggle) soundToggle.disabled = true;
    if (audioHint) audioHint.textContent = 'This browser has no Web Audio, so the keyboard stays a drawing.';
  }

  if (soundToggle && AudioContextClass) {
    soundToggle.addEventListener('click', () => {
      setSound(!soundOn);
    });
  }

  const keyByHotkey = {};

  function strikeKey(key) {
    const frequency = parseFloat(key.getAttribute('data-note'));

    key.classList.add('is-active');
    window.clearTimeout(key.releaseTimer);
    key.releaseTimer = window.setTimeout(() => {
      key.classList.remove('is-active');
    }, 220);

    if (soundOn) {
      playNote(frequency);
    } else if (audioHint && AudioContextClass) {
      audioHint.textContent = 'Sound is off — flip the switch above to hear it.';
    }
  }

  pianoKeys.forEach((key) => {
    const hotkey = key.getAttribute('data-hotkey');
    if (hotkey) keyByHotkey[hotkey] = key;
    key.addEventListener('click', () => strikeKey(key));
  });

  document.addEventListener('keydown', (event) => {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    const key = keyByHotkey[String(event.key).toLowerCase()];
    if (!key) return;

    event.preventDefault();
    strikeKey(key);
  });

  setSound(false, false);

  /* ------------------------------------------------------------------------
     The aloo bonda easter egg
     ------------------------------------------------------------------------ */

  const bondaButtons = Array.from(document.querySelectorAll('[data-bonda]'));
  const bondaMessage = document.querySelector('[data-bonda-msg]');
  const bondaRestock = document.querySelector('[data-bonda-restock]');
  const bondaLines = [
    'One fewer. The chutney has no comment.',
    'Gone. It was doing nothing wrong.',
    'The plate is starting to look nervous.',
    'Two left. This is still a portfolio.',
    'Last one. Somebody had to.'
  ];
  let bondasEaten = 0;

  function updateBondaMessage() {
    if (!bondaMessage) return;
    const left = bondaButtons.length - bondasEaten;
    if (left === 0) {
      bondaMessage.textContent = 'Plate empty. Normal service resumes.';
    } else {
      bondaMessage.textContent = bondaLines[Math.min(bondasEaten, bondaLines.length) - 1];
    }
  }

  function eatBonda(button) {
    if (button.disabled) return;

    const hadFocus = document.activeElement === button;
    button.disabled = true;
    button.classList.add('is-eaten');
    bondasEaten += 1;
    updateBondaMessage();

    const nextBonda = bondaButtons.find((item) => !item.disabled);

    if (bondaRestock) {
      bondaRestock.hidden = Boolean(nextBonda);
    }

    if (hadFocus) {
      if (nextBonda) {
        nextBonda.focus();
      } else if (bondaRestock) {
        bondaRestock.focus();
      }
    }
  }

  bondaButtons.forEach((button) => {
    button.addEventListener('click', () => eatBonda(button));
  });

  if (bondaRestock) {
    bondaRestock.addEventListener('click', () => {
      bondaButtons.forEach((button) => {
        button.disabled = false;
        button.classList.remove('is-eaten');
      });
      bondasEaten = 0;
      if (bondaMessage) bondaMessage.textContent = 'Five bondas. All accounted for.';
      bondaRestock.hidden = true;
      if (bondaButtons[0]) bondaButtons[0].focus();
    });
  }

  /* ------------------------------------------------------------------------
     The living line field
     Furrows at the top, code through Work, a staff at the Play corner.
     One canvas, three weights, cross-faded by the section in view.
     ------------------------------------------------------------------------ */

  const canvas = document.getElementById('line-field');
  const canvasContext = canvas ? canvas.getContext('2d') : null;
  const timeline = document.querySelector('[data-timeline]');
  const header = document.querySelector('[data-header]');
  const modeSections = [];

  const field = {
    width: 0,
    height: 0,
    dpr: 1,
    mode: 0,
    target: 0,
    phase: 0.9,
    lastTime: 0,
    frame: 0,
    running: false
  };

  const pointer = {
    x: -9999,
    y: -9999,
    tx: -9999,
    ty: -9999,
    strength: 0,
    targetStrength: 0
  };

  let wind = 0;
  let lastScroll = window.scrollY;

  const palette = {
    furrow: [138, 115, 80],
    code: [63, 107, 79],
    staff: [46, 79, 68],
    accent: [196, 85, 45],
    alpha: 0.34
  };

  function hexToRgb(value) {
    let hex = String(value || '').replace('#', '').trim();
    if (hex.length === 3) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }
    const number = parseInt(hex, 16);
    if (hex.length !== 6 || Number.isNaN(number)) return [120, 120, 120];
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  }

  function readPalette() {
    const styles = getComputedStyle(root);
    const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

    palette.furrow = hexToRgb(read('--line-furrow', '#8A7350'));
    palette.code = hexToRgb(read('--line-code', '#3F6B4F'));
    palette.staff = hexToRgb(read('--line-staff', '#2E4F44'));
    palette.accent = hexToRgb(read('--accent', '#C4552D'));

    const alpha = parseFloat(read('--line-alpha', '0.34'));
    palette.alpha = Number.isFinite(alpha) ? alpha : 0.34;
  }

  function rgba(color, alpha) {
    const safeAlpha = clamp(alpha, 0, 1).toFixed(3);
    return 'rgba(' + Math.round(color[0]) + ',' + Math.round(color[1]) + ',' + Math.round(color[2]) + ',' + safeAlpha + ')';
  }

  function measureSections() {
    modeSections.length = 0;
    document.querySelectorAll('[data-row-mode]').forEach((element) => {
      const rect = element.getBoundingClientRect();
      modeSections.push({
        top: rect.top + window.scrollY,
        mode: parseFloat(element.getAttribute('data-row-mode')) || 0
      });
    });
    modeSections.sort((a, b) => a.top - b.top);
  }

  function updateMode(immediate) {
    if (!modeSections.length) return;

    const anchor = window.scrollY + field.height * 0.55;
    let mode = modeSections[0].mode;

    modeSections.forEach((section) => {
      if (section.top <= anchor) mode = section.mode;
    });

    field.target = mode;
    if (immediate || !motionAllowed()) field.mode = mode;
  }

  function updateRail() {
    if (!timeline) return;

    if (!motionAllowed()) {
      timeline.style.removeProperty('--rail-progress');
      return;
    }

    const rect = timeline.getBoundingClientRect();
    const progress = clamp((field.height * 0.8 - rect.top) / Math.max(1, rect.height), 0.01, 1);
    timeline.style.setProperty('--rail-progress', progress.toFixed(3));
  }

  function resizeField() {
    if (!canvas || !canvasContext) return;

    field.width = Math.max(1, window.innerWidth);
    field.height = Math.max(1, window.innerHeight);
    field.dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(field.width * field.dpr);
    canvas.height = Math.round(field.height * field.dpr);
    canvasContext.setTransform(field.dpr, 0, 0, field.dpr, 0, 0);

    measureSections();
    updateMode(true);
    updateRail();
    paintField();
  }

  function paintField() {
    if (!canvasContext) return;

    const ctx = canvasContext;
    const width = field.width;
    const height = field.height;
    const mode = field.mode;

    const furrowWeight = mode <= 1 ? 1 - mode : 0;
    const codeWeight = mode <= 1 ? mode : 2 - mode;
    const staffWeight = mode <= 1 ? 0 : mode - 1;

    const lineColor = [
      palette.furrow[0] * furrowWeight + palette.code[0] * codeWeight + palette.staff[0] * staffWeight,
      palette.furrow[1] * furrowWeight + palette.code[1] * codeWeight + palette.staff[1] * staffWeight,
      palette.furrow[2] * furrowWeight + palette.code[2] * codeWeight + palette.staff[2] * staffWeight
    ];

    const small = width < 600;
    const spacing = (small ? 34 : 30) - 4 * codeWeight;
    const count = Math.ceil(height / spacing) + 3;
    const heroFactor = 1 - clamp(window.scrollY / (height * 0.9), 0, 1);
    const baseAlpha = palette.alpha * (0.7 + 0.3 * heroFactor) * (1 - 0.25 * staffWeight);
    const phase = field.phase;
    const windAmount = motionAllowed() ? 1 + wind * 0.4 : 1;
    const step = small ? 10 : 7;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    for (let index = 0; index < count; index += 1) {
      const u = index / (count - 1);
      const baseY = index * spacing - spacing * 0.65 + Math.sin(index * 2.1) * 2.4 * furrowWeight;
      const edgeFade = Math.min(1, Math.min(u, 1 - u) * 8);
      const lineAlpha =
        baseAlpha *
        (0.5 + 0.5 * (0.5 + 0.5 * Math.sin(index * 1.37 + 0.7))) *
        edgeFade;
      const wobble = 0.7 + 0.3 * Math.sin(index * 2.3 + 1.1);
      const amplitude =
        (7.2 * furrowWeight + 1.4 * codeWeight + 4.4 * staffWeight) * wobble * windAmount;
      const frequency = 0.0068 * furrowWeight + 0.012 * codeWeight + 0.0042 * staffWeight;
      const speed = 0.55 + index * 0.014;

      ctx.beginPath();

      for (let x = -step; x <= width + step; x += step) {
        let y = baseY + amplitude * Math.sin(x * frequency + phase * speed + index * 0.6);

        if (furrowWeight > 0) {
          y += furrowWeight * 2.8 * Math.sin(x * 0.0022 - phase * 0.32 + index * 1.7);
        }

        if (pointer.strength > 0.002) {
          const distanceY = (baseY - pointer.y) / (small ? 110 : 150);
          const nearY = Math.exp(-distanceY * distanceY) * pointer.strength;

          if (nearY > 0.002) {
            const distanceX = (x - pointer.x) / (width * 0.55);
            const nearX = Math.exp(-distanceX * distanceX);
            y += nearY * nearX * (22 * Math.sin((x - pointer.x) * 0.011 + phase * 1.2) + 6);
          }
        }

        if (codeWeight > 0.02) {
          y = y * (1 - codeWeight) + Math.round(y / 7) * 7 * codeWeight;
        }

        if (x === -step) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = rgba(lineColor, lineAlpha);
      ctx.stroke();
    }

    if (staffWeight > 0.02) drawStaff(staffWeight, phase, lineColor);
  }

  function drawStaff(weight, phase, lineColor) {
    if (!canvasContext) return;

    const ctx = canvasContext;
    const width = field.width;
    const height = field.height;
    const centerY = height * 0.5;
    const gap = clamp(height * 0.021, 13, 20);
    const bend = (x) => Math.sin(x * 0.0032 + phase * 0.4) * 3.2;

    ctx.lineWidth = 1.2;

    for (let line = -2; line <= 2; line += 1) {
      const baseY = centerY + line * gap;
      ctx.beginPath();
      for (let x = -8; x <= width + 8; x += 8) {
        const y = baseY + bend(x);
        if (x === -8) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = rgba(lineColor, 0.32 * weight);
      ctx.stroke();
    }

    const notes = [
      { x: 0.22, step: -1, up: true },
      { x: 0.34, step: 2, up: false },
      { x: 0.47, step: 0, up: true },
      { x: 0.59, step: -2, up: true },
      { x: 0.72, step: 1, up: false },
      { x: 0.84, step: 3, up: false }
    ];

    notes.forEach((note, index) => {
      const drift = Math.sin(phase * 0.32 + index * 1.3) * 12;
      const x = note.x * width + drift;
      const y = centerY + note.step * (gap / 2) + bend(x);
      const color = index === 2 ? palette.accent : lineColor;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.2, 4.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 0.6 * weight);
      ctx.fill();
      ctx.restore();

      const stemX = x + 5.2;
      const stemEnd = y + (note.up ? -26 : 26);
      ctx.beginPath();
      ctx.moveTo(stemX, y);
      ctx.lineTo(stemX, stemEnd);
      ctx.strokeStyle = rgba(color, 0.5 * weight);
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function tick(time) {
    if (!canvasContext) return;

    const delta = field.lastTime ? Math.min(0.05, (time - field.lastTime) / 1000) : 0.016;
    field.lastTime = time;

    field.mode += (field.target - field.mode) * Math.min(1, delta * 2.2);
    if (Math.abs(field.target - field.mode) < 0.0005) field.mode = field.target;

    pointer.x += (pointer.tx - pointer.x) * Math.min(1, delta * 7);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, delta * 7);
    pointer.strength += (pointer.targetStrength - pointer.strength) * Math.min(1, delta * 3);

    wind *= Math.pow(0.08, delta);
    field.phase += delta * (0.55 + Math.min(1.4, wind * 0.8));

    paintField();
    field.frame = requestAnimationFrame(tick);
  }

  function startField() {
    if (!canvas || !canvasContext) return;

    readPalette();
    resizeField();

    if (motionAllowed()) {
      if (!field.running) {
        field.running = true;
        field.lastTime = 0;
        field.frame = requestAnimationFrame(tick);
      }
    } else {
      field.running = false;
      cancelAnimationFrame(field.frame);
      field.mode = field.target;
      paintField();
    }
  }

  function stopField() {
    field.running = false;
    cancelAnimationFrame(field.frame);
  }

  let scrollQueued = false;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;

    requestAnimationFrame(() => {
      scrollQueued = false;

      const currentScroll = window.scrollY;
      wind = Math.min(2.2, wind + Math.abs(currentScroll - lastScroll) * 0.02);
      lastScroll = currentScroll;

      if (header) header.classList.toggle('is-scrolled', currentScroll > 8);

      updateMode(!motionAllowed());
      updateRail();

      if (!motionAllowed()) paintField();
    });
  }

  let resizeTimer = 0;

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeField();
      updateRail();
    }, 150);
  }

  function handleMotionPreference() {
    if (!canvasContext) return;

    if (motionAllowed()) {
      if (!field.running) {
        field.running = true;
        field.lastTime = 0;
        field.frame = requestAnimationFrame(tick);
      }
    } else {
      stopField();
      pointer.strength = 0;
      pointer.targetStrength = 0;
      field.phase = 0.9;
      updateMode(true);
      updateRail();
      paintField();
    }
  }

  if (canvas && canvasContext) {
    window.addEventListener(
      'pointermove',
      (event) => {
        if (!motionAllowed()) return;
        pointer.tx = event.clientX;
        pointer.ty = event.clientY;
        pointer.targetStrength = 1;
      },
      { passive: true }
    );

    window.addEventListener(
      'pointerdown',
      (event) => {
        if (!motionAllowed()) return;
        pointer.tx = event.clientX;
        pointer.ty = event.clientY;
        pointer.targetStrength = 1;
      },
      { passive: true }
    );

    window.addEventListener('pointerup', () => {
      pointer.targetStrength = 0;
    }, { passive: true });

    window.addEventListener('pointercancel', () => {
      pointer.targetStrength = 0;
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      pointer.targetStrength = 0;
    });
  }

  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', handleMotionPreference);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(handleMotionPreference);
  }

  document.addEventListener('visibilitychange', () => {
    if (!canvasContext || !motionAllowed()) return;

    if (document.hidden) {
      stopField();
    } else if (!field.running) {
      field.running = true;
      field.lastTime = 0;
      field.frame = requestAnimationFrame(tick);
    }
  });

  document.addEventListener('hd:theme', () => {
    readPalette();
    paintField();
  });

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */

  startField();
  onScroll();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  window.addEventListener('load', () => {
    measureSections();
    updateRail();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready
      .then(() => {
        measureSections();
        updateRail();
      })
      .catch(() => {
        /* font loading is best effort */
      });
  }

})();
