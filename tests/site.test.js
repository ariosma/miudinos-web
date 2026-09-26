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

test('weekday afternoons combine play and workshops without a separate ludoteca', () => {
  const run = createApp();
  assert.equal(run("ACTIVITIES.some(item => item.id === 'ludoteca')"), false);
  assert.equal(run("ACTIVITIES.find(item => item.id === 'talleres').price"), 10);
  run("booking.activity = 'talleres'");
  assert.deepEqual(Array.from(run("slotsForDate('2026-09-28')")), ['16:30', '18:30']);
});

test('daily passes apply to both activities without an unconfirmed price', () => {
  const run = createApp();
  assert.equal(run("ACTIVITIES.find(item => item.id === 'bebeteca').price"), 7);
  assert.equal(run("ACTIVITIES.find(item => item.id === 'campamentos').price"), 100);
  assert.deepEqual(Array.from(run('VOUCHERS.map(v => v.days)')), [5, 10]);
  assert.equal(run('VOUCHERS.every(v => !("price" in v) && !("activityId" in v))'), true);
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
  assert.match(message, /Actividade: Bebeteca\nData: 2026-09-28\nHora proposta: 10:00/);
  assert.match(message, /idades: 1 ano/);
});

test('static page sets Galician language and booking labels', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<html lang="gl">/);
  assert.match(html, /<span class="step-label">Actividade<\/span>/);
  assert.match(html, /maps\?q=42\.9564872,-9\.1886793&hl=gl/);
});
