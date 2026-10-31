/*
 * Local QA harness: starts a static server, drives headless Edge over CDP,
 * checks the interactive bits, and saves section screenshots to .preview/.
 * Dev-only; the site itself needs nothing from this file.
 *
 * Usage: node tools/validate.mjs
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const preview = path.join(root, '.preview');
fs.mkdirSync(preview, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const edgeCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const edgePath = edgeCandidates.find((candidate) => fs.existsSync(candidate));
if (!edgePath) {
  console.error('Edge not found; cannot run the screenshot checks.');
  process.exit(1);
}

const serverPort = 8124;
const debugPort = 9333;
const server = spawn('python', ['-m', 'http.server', String(serverPort), '--bind', '127.0.0.1'], {
  cwd: root,
  stdio: 'ignore'
});

async function waitForHttp(url, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (error) {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Timed out waiting for ' + url);
}

async function waitForJson(url, timeout = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('Timed out waiting for ' + url);
}

let edge;
let ws;
const consoleErrors = [];

try {
  const siteUrl = `http://127.0.0.1:${serverPort}/`;
  await waitForHttp(siteUrl, 10000);

  const profile = path.join(os.tmpdir(), 'hd-edge-' + Date.now());
  edge = spawn(
    edgePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--remote-debugging-port=' + debugPort,
      '--user-data-dir=' + profile,
      '--window-size=1440,1050',
      'about:blank'
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No page target from Edge');

  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = (event) => reject(new Error('WebSocket error: ' + event.message));
  });

  let messageId = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails;
      consoleErrors.push('exception: ' + (detail.text || '') + ' ' + (detail.exception?.description || ''));
    }

    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      consoleErrors.push(
        'console.error: ' + message.params.args.map((arg) => arg.value || arg.description || '').join(' ')
      );
    }

    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      consoleErrors.push('log: ' + message.params.entry.text);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Evaluation failed');
    }
    return result.result.value;
  }

  async function shot(name) {
    const result = await send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(preview, name);
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
    return file;
  }

  async function scrollToSection(id) {
    await evaluate(`(() => {
      const el = document.getElementById(${JSON.stringify(id)});
      if (!el) return false;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: 'instant' });
      return true;
    })()`);
    await sleep(700);
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  await send('Page.navigate', { url: siteUrl });
  await evaluate('new Promise((resolve) => { if (document.readyState === "complete") resolve(true); else addEventListener("load", () => resolve(true), { once: true }); })');
  await sleep(1600);

  const structure = await evaluate(`(() => {
    const qa = (selector) => Array.from(document.querySelectorAll(selector));
    const canvas = document.querySelector('#line-field');
    return {
      title: document.title,
      sections: qa('main section').map((section) => section.id),
      rowModes: qa('[data-row-mode]').map((section) => [section.id, section.getAttribute('data-row-mode')]),
      canvas: canvas ? [canvas.width, canvas.height] : null,
      navLinks: qa('.site-nav a').map((link) => link.textContent),
      soundToggles: qa('[data-sound-toggle]').length,
      strings: qa('[data-string-note]').length,
      breeze: Boolean(document.querySelector('[data-breeze]')),
      theme: document.documentElement.getAttribute('data-theme'),
      scenes: qa('.scene').length,
      sarod: qa('.sarod').length
    };
  })()`);

  const themeCheck = await evaluate(`(async () => {
    const button = document.querySelector('[data-theme-toggle="icon"]');
    button.click();
    const dusk = document.documentElement.getAttribute('data-theme');
    const switchDusk = document.querySelector('[data-theme-toggle="switch"]').getAttribute('aria-pressed');
    await new Promise((resolve) => setTimeout(resolve, 900));
    const sceneMoon = getComputedStyle(document.querySelector('.scene__moon')).opacity;
    button.click();
    return {
      dusk,
      switchDusk,
      sceneMoon,
      backTo: document.documentElement.getAttribute('data-theme'),
      switchDay: document.querySelector('[data-theme-toggle="switch"]').getAttribute('aria-pressed')
    };
  })()`);

  const soundCheck = await evaluate(`(() => {
    const toggles = Array.from(document.querySelectorAll('[data-sound-toggle]'));
    const labels = Array.from(document.querySelectorAll('[data-sound-label]'));
    toggles[0].click();
    const pressed = toggles.map((button) => button.getAttribute('aria-pressed'));
    const labelText = labels.map((label) => label.textContent);
    const strings = Array.from(document.querySelectorAll('[data-string-note]'));
    strings[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const plucked = strings[2].classList.contains('is-plucked');
    strings[0].focus();
    const focused = document.activeElement === strings[0];
    strings[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const keyboardPlucked = strings[0].classList.contains('is-plucked');
    const hint = document.querySelector('[data-sound-hint]').textContent;
    toggles[1].click();
    const pressedOff = toggles.map((button) => button.getAttribute('aria-pressed'));
    return { pressed, labelText, plucked, focused, keyboardPlucked, hint, pressedOff };
  })()`);

  const breezeCheck = await evaluate(`(() => {
    document.querySelector('[data-breeze]').click();
    return {
      className: document.querySelector('[data-scene]').className,
      label: document.querySelector('[data-breeze-label]').textContent
    };
  })()`);

  const bondaCheck = await evaluate(`(() => {
    const button = document.querySelector('[data-bonda]');
    button.click();
    return {
      disabled: button.disabled,
      message: document.querySelector('[data-bonda-msg]').textContent
    };
  })()`);

  const keyCheck = await evaluate(`(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    return Boolean(document.querySelector('.key.is-active'));
  })()`);

  const screenshots = [];

  await send('Page.reload', { ignoreCache: true });
  await sleep(1600);

  screenshots.push(await shot('desktop-hero.png'));

  await scrollToSection('work');
  screenshots.push(await shot('desktop-work.png'));

  await scrollToSection('field');
  screenshots.push(await shot('desktop-field.png'));

  await evaluate(`(() => {
    const el = document.querySelector('.scene');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'instant' });
  })()`);
  await sleep(600);
  screenshots.push(await shot('desktop-field-scene.png'));

  await scrollToSection('sound');
  screenshots.push(await shot('desktop-sound.png'));

  await scrollToSection('toolbox');
  screenshots.push(await shot('desktop-toolbox.png'));

  await scrollToSection('play');
  screenshots.push(await shot('desktop-play.png'));

  await scrollToSection('contact');
  screenshots.push(await shot('desktop-contact.png'));

  await evaluate('document.querySelector(\'[data-theme-toggle="icon"]\').click()');
  await sleep(500);
  await scrollToSection('field');
  screenshots.push(await shot('desktop-field-dusk.png'));
  await evaluate('document.querySelector(\'[data-theme-toggle="icon"]\').click()');

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await sleep(500);

  const navCheck = await evaluate(`(() => {
    const button = document.querySelector('[data-nav-toggle]');
    const display = getComputedStyle(button).display;
    button.click();
    const expanded = button.getAttribute('aria-expanded');
    const open = document.getElementById('primary-nav').getAttribute('data-open');
    button.click();
    return { display, expanded, open, closed: button.getAttribute('aria-expanded') };
  })()`);

  await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
  await sleep(500);
  screenshots.push(await shot('mobile-hero.png'));

  await scrollToSection('field');
  screenshots.push(await shot('mobile-field.png'));
  await scrollToSection('sound');
  screenshots.push(await shot('mobile-sound.png'));

  await send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(300);
  const tabletCheck = await evaluate(`(() => {
    const nav = document.querySelector('.site-nav');
    const button = document.querySelector('[data-nav-toggle]');
    return {
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      navVisibility: getComputedStyle(nav).visibility,
      menuButtonDisplay: getComputedStyle(button).display
    };
  })()`);
  await send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);

  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await sleep(400);
  const reducedCheck = await evaluate(`(() => {
    const breeze = document.querySelector('[data-breeze]');
    return {
      breezeDisplay: getComputedStyle(breeze).display,
      cropAnimation: getComputedStyle(document.querySelector('.crop')).animationDuration
    };
  })()`);

  const report = {
    structure,
    themeCheck,
    soundCheck,
    breezeCheck,
    bondaCheck,
    keyCheck,
    navCheck,
    tabletCheck,
    reducedCheck,
    consoleErrors,
    screenshots
  };

  fs.writeFileSync(path.join(preview, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (consoleErrors.length) {
    process.exitCode = 2;
  }
} catch (error) {
  console.error('Validation failed:', error.message);
  process.exitCode = 1;
} finally {
  try {
    if (ws) ws.close();
  } catch (error) {
    /* ignore */
  }
  if (edge && !edge.killed) {
    spawn('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' });
  }
  if (server && !server.killed) {
    server.kill();
  }
}

