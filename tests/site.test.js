const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const FIXED_DATE = '2026-09-26T12:00:00';
class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [FIXED_DATE]));
  }
  static now() {
    return Date.parse(FIXED_DATE);
  }
}

function createApp() {
  const context = vm.createContext({
    Date: FixedDate,
    document: {
      addEventListener() {},
      querySelector(selector) {
        if (selector === '#bkDate') return { min: '2026-09-26', max: '2026-12-25' };
        throw new Error(`Unexpected DOM query: ${selector}`);
      }
    },
    window: { location: {} }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site.js'), 'utf8');
  vm.runInContext(source, context);
  return expression => vm.runInContext(expression, context);
}

test('all activities are for children no older than eight and exclude weekends', () => {
  const run = createApp();
  assert.equal(run('ACTIVITIES.every(item => item.minAge >= 0 && item.maxAge <= 8)'), true);
  assert.equal(run('ACTIVITIES.every(item => item.days.every(day => day > 0 && day < 6))'), true);
});

test('bebeteca offers weekday mornings only and accepts ages zero to two', () => {
  const run = createApp();
  run("booking.activity = 'bebeteca'");
  assert.deepEqual(Array.from(run("slotsForDate('2026-09-28')")), ['10:00', '11:30']);
  assert.equal(run("slotsForDate('2026-10-03').length"), 0);
  assert.equal(run("activity().minAge === 0 && activity().maxAge === 2"), true);
});

test('birthdays can only be requested on Fridays', () => {
  const run = createApp();
  run("booking.activity = 'cumpleanos'");
  assert.deepEqual(Array.from(run("slotsForDate('2026-10-02')")), ['16:30']);
  assert.equal(run("slotsForDate('2026-10-01').length"), 0);
  assert.equal(run("slotsForDate('2026-10-03').length"), 0);
});

test('invalid dates are rejected and WhatsApp requests encode message text', () => {
  const run = createApp();
  assert.equal(run("validDate('2026-02-30')"), false);
  assert.equal(run("validDate('2027-01-01')"), false);
  assert.equal(
    run("whatsappUrl('Peque & familia').includes('text=Peque%20%26%20familia')"),
    true
  );
});

test('weekday afternoons offer a full afternoon for 15 euros and an hour for 8 euros', () => {
  const run = createApp();
  assert.equal(run("ACTIVITIES.some(item => item.id === 'ludoteca')"), false);
  assert.equal(run("ACTIVITIES.find(item => item.id === 'talleres').price"), 15);
  assert.equal(run("ACTIVITIES.find(item => item.id === 'talleres-hora').price"), 8);
  run("booking.activity = 'talleres'");
  assert.deepEqual(Array.from(run("slotsForDate('2026-09-28')")), ['16:30']);
  run("booking.slot = '16:30'");
  assert.equal(run('bookingTime()'), '16:30–20:00');
  run("booking.activity = 'talleres-hora'");
  assert.deepEqual(Array.from(run("slotsForDate('2026-09-28')")), ['16:30', '17:00', '17:30', '18:00', '18:30', '19:00']);
  run("booking.slot = '19:00'");
  assert.equal(run('bookingTime()'), '19:00–20:00');
  assert.equal(run("slotsForDate('2026-10-03').length"), 0);
});

test('afternoon vouchers offer five, ten and twenty sessions without inventing prices', () => {
  const run = createApp();
  assert.equal(run("ACTIVITIES.find(item => item.id === 'bebeteca').price"), 7);
  assert.equal(run("ACTIVITIES.find(item => item.id === 'campamentos').price"), 100);
  assert.deepEqual(Array.from(run('VOUCHERS.map(v => v.sessions)')), [5, 10, 20]);
  assert.equal(run('VOUCHERS.every(v => !("price" in v))'), true);
});

test('activity labels and WhatsApp booking request are in Galician', () => {
  const run = createApp();
  assert.equal(run("ACTIVITIES.find(item => item.id === 'talleres').name"), 'Tardes de xogo e obradoiros');
  assert.equal(run("ACTIVITIES.find(item => item.id === 'cumpleanos').name"), 'Aniversarios dos venres');
  assert.equal(run('euros(7)'), new Intl.NumberFormat('gl-ES', { style: 'currency', currency: 'EUR' }).format(7));
  run("Object.assign(booking, { activity: 'bebeteca', date: '2026-09-28', slot: '10:00', children: 1, ages: [1], childName: 'Noa', name: 'Ana', phone: '665369101', notes: '' })");
  run('sendRequest()');
  const url = run('window.location.href');
  assert.equal(url.startsWith('https://wa.me/34665369101?text='), true);
  const message = new URL(url).searchParams.get('text');
  assert.match(message, /^Ola, gustaríame solicitar unha praza/);
  assert.match(message, /Actividade: Bebeteca\nData: 2026-09-28\nHorario proposto: 10:00/);
  assert.match(message, /idades: 1 ano/);
});

test('hourly booking request includes duration and hourly price', () => {
  const run = createApp();
  run("Object.assign(booking, { activity: 'talleres-hora', date: '2026-09-28', slot: '19:00', children: 1, ages: [5], childName: 'Noa', name: 'Ana', phone: '665369101', notes: '' })");
  run('sendRequest()');
  const message = new URL(run('window.location.href')).searchParams.get('text');
  assert.match(message, /Horario proposto: 19:00–20:00/);
  assert.match(message, /Prezo orientativo: 8,00\s*€ \/ peque e hora/);
});

test('email links encode the subject and body with the IDN domain', () => {
  const run = createApp();
  const url = run("emailUrl('Ola, son Ana. ¿Hai prazas?')");
  assert.equal(url.startsWith('mailto:contacto@xn--miudios-8za.gal?'), true);
  assert.equal(new URL(url).searchParams.get('subject'), 'Consulta a Miudiños');
  assert.equal(new URL(url).searchParams.get('body'), 'Ola, son Ana. ¿Hai prazas?');
});

test('contact form opens an email draft with the entered name and message', () => {
  const handlers = {};
  const fields = {
    '#ctName': { value: 'Ana' },
    '#ctMsg': { value: 'Quería saber se hai prazas.' },
    '#contactForm': { addEventListener(type, handler) { handlers[type] = handler; } },
    '#contactEmail': { addEventListener(type, handler) { handlers[`email-${type}`] = handler; } }
  };
  const context = vm.createContext({
    document: {
      addEventListener() {},
      querySelector(selector) { return fields[selector]; }
    },
    window: { location: {} }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'site.js'), 'utf8'), context);
  vm.runInContext('bindContactForm()', context);

  handlers['email-click']();

  const url = new URL(context.window.location.href);
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.searchParams.get('body'), 'Ola, son Ana.\n\nQuería saber se hai prazas.');
});

test('static page exposes Galician booking labels, afternoon vouchers and email contact', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<html lang="gl">/);
  assert.match(html, /<span class="step-label">Actividade<\/span>/);
  assert.match(html, /maps\?q=42\.9564872,-9\.1886793&hl=gl/);
  assert.match(html, /Bonos de 5, 10 ou 20 tardes/);
  assert.match(html, /contacto@miudiños\.gal/);
  assert.match(html, /class="mobile-contact"/);
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.gallery-item img \{ height: auto; aspect-ratio: auto; object-fit: contain; \}/);
  assert.match(css, /\.hero-scene \{[\s\S]*?width: clamp\(720px, 130vw, 950px\)/);
});

test('WhatsApp shortcut stays visible on all screens and opens the chat', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
  const shortcut = html.match(/<a class="mobile-contact-whatsapp"[^>]*>/)?.[0];
  assert.ok(shortcut);
  assert.match(shortcut, /href="https:\/\/wa\.me\/34665369101"/);
  assert.match(shortcut, /target="_blank" rel="noopener"/);
  assert.match(html, /<span>WhatsApp<\/span>/);
  const globalRule = css.match(/\.mobile-contact \{([^}]+)\}/)?.[1];
  assert.match(globalRule, /position: fixed/);
  assert.match(globalRule, /display: flex/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.mobile-contact a\.mobile-contact-email \{ display: flex; \}/);
});

test('search metadata, local business data and sitemap refer to the published page', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
  const canonical = 'https://ariosma.github.io/miudinos-web/';
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]);

  assert.match(html, /<html lang="gl">/);
  assert.match(html, /<title>Miudiños \| Centro de lecer infantil en Cee/);
  assert.match(html, /<meta name="description" content="[^"]*Cee \(A Coruña\)[^"]*">/);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
  assert.ok(html.includes(`<meta property="og:image" content="${canonical}images/galeria-sala.jpg">`));
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.equal(schema['@type'], 'LocalBusiness');
  assert.equal(schema.url, canonical);
  assert.equal(schema.telephone, '+34665369101');
  assert.equal(schema.address.addressLocality, 'Cee');
  assert.equal(schema.address.streetAddress, undefined);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
  assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  assert.ok(html.includes(`<link rel="sitemap" type="application/xml" href="${canonical}sitemap.xml">`));
});
