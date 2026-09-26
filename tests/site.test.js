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
  assert.equal(run("ACTIVITIES.find(item => item.id === 'talleres').price"), 16);
  run("booking.activity = 'talleres'");
  assert.deepEqual(Array.from(run("slotsForDate('2026-09-28')")), ['16:30', '18:30']);
});

test('new prices and separate vouchers have a positive saving for their activity', () => {
  const run = createApp();
  assert.equal(run("ACTIVITIES.find(item => item.id === 'bebeteca').price"), 10);
  assert.equal(run("ACTIVITIES.find(item => item.id === 'campamentos').price"), 110);
  assert.equal(run("VOUCHERS.length"), 4);
  assert.equal(
    run("VOUCHERS.every(v => ACTIVITIES.find(a => a.id === v.activityId).price * v.sessions > v.price)"),
    true
  );
  assert.deepEqual(Array.from(run('VOUCHERS.map(v => v.price)')), [45, 85, 75, 140]);
});
