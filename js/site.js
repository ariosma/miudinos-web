/* Miudiños: solicitudes por WhatsApp; sen pagos nin reservas automáticas. */
'use strict';

const PHONE = '34665369101';
const EMAIL = 'contacto@xn--miudios-8za.gal';
const ACTIVITIES = [
  {
    id: 'bebeteca', emoji: '🪁', name: 'Bebeteca',
    tagline: 'Primeiros descubrimentos cunha persoa adulta',
    desc: 'Polas mañás, os bebés de 0 a 2 anos exploran materiais, texturas e movemento ao seu ritmo, sempre acompañados por unha persoa adulta. Un intre de calma para compartir e relaxarse xuntos.',
    minAge: 0, maxAge: 2, ages: '0–2 anos · cun acompañante',
    duration: '90 min · mañás', price: 7, priceUnit: 'bebé e acompañante',
    features: ['Unha persoa adulta acompaña ao bebé', 'Xogo sensorial e movemento', 'Sesión de 90 minutos'],
    days: [1, 2, 3, 4, 5], slots: ['10:00', '11:30']
  },
  {
    id: 'talleres', emoji: '🎨', name: 'Tardes de xogo e obradoiros',
    tagline: 'A tarde completa para xogar e crear',
    desc: 'De 16:30 a 20:00 combinamos xogo libre con propostas de arte e experimentación para peques de 3 a 8 anos. Consulta que proposta toca cada semana.',
    minAge: 3, maxAge: 8, ages: '3–8 anos',
    duration: '16:30–20:00 · tarde completa', price: 15, priceUnit: 'peque e tarde',
    features: ['Xogo libre e obradoiros', 'Tarde completa de 16:30 a 20:00', 'Materiais incluídos'],
    days: [1, 2, 3, 4, 5], slots: ['16:30'], featured: true
  },
  {
    id: 'talleres-hora', emoji: '⏱️', name: 'Hora solta de tarde',
    tagline: 'Unha hora de xogo e obradoiros',
    desc: 'Se prefires unha visita máis curta, reserva unha hora pola tarde para peques de 3 a 8 anos. Indica a hora de chegada na solicitude.',
    minAge: 3, maxAge: 8, ages: '3–8 anos',
    duration: '1 hora · entre 16:30 e 20:00', price: 8, priceUnit: 'peque e hora',
    features: ['Xogo e obradoiros', 'Unha hora entre 16:30 e 20:00', 'Materiais incluídos'],
    days: [1, 2, 3, 4, 5], slots: ['16:30', '17:00', '17:30', '18:00', '18:30', '19:00']
  },
  {
    id: 'campamentos', emoji: '🏕️', name: 'Campamentos',
    tagline: 'Mañás de vacacións para explorar',
    desc: 'Proposta de mañás durante as vacacións. Pregunta polas datas, o programa e as prazas dispoñibles.',
    minAge: 3, maxAge: 8, ages: '3–8 anos',
    duration: '5 mañás · 9:00–13:00', price: 100, priceUnit: 'peque e semana',
    features: ['Cinco mañás laborables', 'Horario proposto: 9:00–13:00', 'Datas por confirmar'],
    days: [1, 2, 3, 4, 5], slots: ['09:00']
  },
  {
    id: 'cumpleanos', emoji: '🎂', name: 'Aniversarios dos venres',
    tagline: 'Unha celebración á súa maneira',
    desc: 'Celebracións para peques de 3 a 8 anos, só os venres. Cóntanos cantos viredes e prepararemos un orzamento personalizado.',
    minAge: 3, maxAge: 8, ages: '3–8 anos',
    duration: 'Venres · horario por acordar', price: null, priceUnit: '',
    features: ['Só os venres', 'Proposta segundo o grupo', 'Orzamento antes de confirmar'],
    days: [5], slots: ['16:30'], maxChildren: 20
  }
];
const VOUCHERS = [
  { sessions: 5 },
  { sessions: 10 },
  { sessions: 20 }
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const booking = {
  activity: null, date: '', slot: '', children: 1, ages: [null],
  childName: '', name: '', phone: '', notes: ''
};
let currentStep = 1;

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

function activity() {
  return ACTIVITIES.find(item => item.id === booking.activity);
}

function euros(value) {
  return value.toLocaleString('gl-ES', { style: 'currency', currency: 'EUR' });
}

function whatsappUrl(message) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}

function emailUrl(message) {
  return `mailto:${EMAIL}?subject=${encodeURIComponent('Consulta a Miudiños')}&body=${encodeURIComponent(message)}`;
}

function openWhatsapp(message) {
  window.location.href = whatsappUrl(message);
}

function makeButton(label, className, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function renderActivities() {
  const grid = $('#activitiesGrid');
  grid.replaceChildren();
  for (const item of ACTIVITIES) {
    const card = document.createElement('article');
    card.className = 'activity-card';
    const body = document.createElement('div');
    body.className = 'activity-body';
    const icon = document.createElement('div');
    icon.className = 'activity-emoji';
    icon.textContent = item.emoji;
    const heading = document.createElement('h3');
    heading.textContent = item.name;
    const meta = document.createElement('p');
    meta.className = 'activity-meta';
    meta.textContent = `${item.ages} · ${item.duration}`;
    const desc = document.createElement('p');
    desc.textContent = item.desc;
    const price = document.createElement('p');
    price.className = 'activity-price';
    price.textContent = item.price === null ? 'Prezo por consultar' : `${euros(item.price)} / ${item.priceUnit}`;
    body.append(heading, meta, desc, price, makeButton('Solicitar praza', 'btn btn-ghost btn-sm', () => startBooking(item.id)));
    card.append(icon, body);
    grid.append(card);
  }
}

function renderPricing() {
  const grid = $('#pricingGrid');
  grid.replaceChildren();
  for (const item of ACTIVITIES) {
    const card = document.createElement('div');
    card.className = `price-card${item.featured ? ' featured' : ''}`;
    const heading = document.createElement('h3');
    heading.textContent = `${item.emoji} ${item.name}`;
    const price = document.createElement('p');
    price.className = 'price-amount';
    price.textContent = item.price === null ? 'Por consultar' : euros(item.price);
    const unit = document.createElement('p');
    unit.className = 'activity-meta';
    unit.textContent = item.price === null ? 'Orzamento segundo o grupo' : `Por ${item.priceUnit} · ${item.duration}`;
    const features = document.createElement('ul');
    for (const feature of item.features) {
      const li = document.createElement('li');
      li.textContent = feature;
      features.append(li);
    }
    card.append(heading, price, unit, features, makeButton('Solicitar praza', 'btn btn-ghost', () => startBooking(item.id)));
    grid.append(card);
  }
}

function renderVouchers() {
  const grid = $('#voucherGrid');
  grid.replaceChildren();
  for (const voucher of VOUCHERS) {
    const card = document.createElement('div');
    card.className = 'voucher-card';
    const heading = document.createElement('h3');
    heading.textContent = `🎟️ Bono de ${voucher.sessions} tardes`;
    const price = document.createElement('p');
    price.className = 'voucher-sessions';
    price.textContent = 'Prezo por consultar';
    const info = document.createElement('p');
    info.textContent = 'Para tardes completas de xogo e obradoiros (16:30–20:00). Consulta o prezo, a dispoñibilidade e as condicións co centro.';
    const link = document.createElement('a');
    link.className = 'btn btn-ghost';
    link.href = whatsappUrl(`Ola, gustaríame consultar o bono de ${voucher.sessions} tardes completas de xogo e obradoiros. Poderiades dicirme o prezo e as condicións?`);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Consultar bono';
    card.append(heading, price, info, link);
    grid.append(card);
  }
}

function renderActivityPicker() {
  const picker = $('#activityPicker');
  picker.replaceChildren();
  for (const item of ACTIVITIES) {
    const button = makeButton(`${item.emoji}  ${item.name} · ${item.ages} · ${item.price === null ? 'Por consultar' : euros(item.price)}`, 'pick-card', () => selectActivity(item.id));
    button.dataset.activity = item.id;
    button.setAttribute('aria-pressed', 'false');
    picker.append(button);
  }
}

function startBooking(id) {
  selectActivity(id);
  if (currentStep !== 1) goToStep(1);
  $('#reservas').scrollIntoView({ behavior: 'smooth' });
}

function selectActivity(id) {
  if (!ACTIVITIES.some(item => item.id === id)) return;
  booking.activity = id;
  booking.slot = '';
  booking.children = Math.min(booking.children, activity().maxChildren ?? 10);
  booking.ages = Array.from({ length: booking.children }, () => null);
  $$('#activityPicker .pick-card').forEach(button => {
    const selected = button.dataset.activity === id;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#ageHint').textContent = `${activity().ages}`;
  $('#err-activity').hidden = true;
  renderAgesInputs();
  updateCounter();
  renderSlots();
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && toISODate(parsed) === value &&
    value >= toISODate(new Date()) && value >= $('#bkDate').min && value <= $('#bkDate').max;
}

function slotsForDate(value) {
  if (!activity() || !validDate(value)) return [];
  const day = new Date(`${value}T12:00:00`).getDay();
  if (!activity().days.includes(day)) return [];
  return activity().slots;
}

function renderSlots() {
  const picker = $('#slotPicker');
  booking.slot = '';
  picker.replaceChildren();
  const value = $('#bkDate').value;
  const slots = slotsForDate(value);
  if (!slots.length) {
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = value && activity() ? 'Só abrimos de luns a venres. Para aniversarios, escolle un venres.' : 'Escolle actividade e data para ver os horarios propostos.';
    picker.append(hint);
    return;
  }
  for (const time of slots) {
    const button = makeButton(time, 'slot', () => {
      booking.slot = time;
      $$('#slotPicker .slot').forEach(slot => slot.classList.toggle('is-selected', slot === button));
      $('#err-slot').hidden = true;
    });
    button.dataset.slot = time;
    picker.append(button);
  }
}

function renderAgesInputs() {
  const row = $('#agesRow');
  row.replaceChildren();
  for (let index = 0; index < booking.children; index++) {
    const field = document.createElement('span');
    field.className = 'age-field';
    const label = document.createElement('label');
    label.htmlFor = `age-${index}`;
    label.textContent = `Peque ${index + 1}`;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = label.htmlFor;
    input.min = activity()?.minAge ?? 0;
    input.max = activity()?.maxAge ?? 8;
    input.inputMode = 'numeric';
    input.value = booking.ages[index] ?? '';
    input.addEventListener('input', () => {
      booking.ages[index] = input.value === '' ? null : Number(input.value);
      input.classList.remove('is-invalid');
      $('#err-ages').hidden = true;
    });
    field.append(label, input);
    row.append(field);
  }
}

function updateCounter() {
  $('#bkChildren').value = booking.children;
  const max = activity()?.maxChildren ?? 10;
  $('#bkChildren').max = max;
  $$('.counter-btn').forEach(button => {
    button.disabled = Number(button.dataset.dir) < 0 ? booking.children <= 1 : booking.children >= max;
  });
}

function setError(input, message, invalid) {
  input?.classList.toggle('is-invalid', invalid);
  message.hidden = !invalid;
  return !invalid;
}

function validateStep(step) {
  if (step === 1) return setError(null, $('#err-activity'), !activity());
  if (step === 2) {
    const date = $('#bkDate').value;
    const valid = slotsForDate(date).length > 0;
    let ok = setError($('#bkDate'), $('#err-date'), !valid);
    ok = setError(null, $('#err-slot'), !booking.slot || !slotsForDate(date).includes(booking.slot)) && ok;
    const childName = $('#bkChildName').value.trim();
    ok = setError($('#bkChildName'), $('#err-childname'), childName.length < 2 || childName.length > 80) && ok;
    const ageValid = booking.ages.length === booking.children &&
      booking.ages.every(age => Number.isInteger(age) && age >= activity().minAge && age <= activity().maxAge);
    $$('#agesRow input').forEach(input => {
      const age = booking.ages[Number(input.id.slice(4))];
      input.classList.toggle('is-invalid', !Number.isInteger(age) || age < activity().minAge || age > activity().maxAge);
    });
    ok = setError(null, $('#err-ages'), !ageValid) && ok;
    if (ok) {
      booking.date = date;
      booking.childName = childName;
    }
    return ok;
  }
  if (step === 3) {
    const name = $('#bkName').value.trim();
    const phone = $('#bkPhone').value.replace(/[\s-]/g, '');
    let ok = setError($('#bkName'), $('#err-name'), name.length < 3 || name.length > 100);
    ok = setError($('#bkPhone'), $('#err-phone'), !/^\+?\d{9,15}$/.test(phone)) && ok;
    if (ok) {
      booking.name = name;
      booking.phone = phone;
      booking.notes = $('#bkNotes').value.trim().slice(0, 300);
    }
    return ok;
  }
  return true;
}

function summaryLine(container, label, value) {
  const line = document.createElement('div');
  line.className = 'summary-line';
  const title = document.createElement('span');
  title.textContent = label;
  const detail = document.createElement('span');
  detail.textContent = value;
  line.append(title, detail);
  container.append(line);
}

function agesText() {
  return booking.ages.map(age => `${age} ${age === 1 ? 'ano' : 'anos'}`).join(', ');
}

function bookingTime() {
  if (activity().id === 'talleres') return '16:30–20:00';
  if (activity().id !== 'talleres-hora') return booking.slot;
  const [hours, minutes] = booking.slot.split(':').map(Number);
  const end = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return `${booking.slot}–${end}`;
}

function renderSummary() {
  const box = $('#bookingSummary');
  box.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = 'Revisa a túa solicitude';
  box.append(heading);
  summaryLine(box, 'Actividade', activity().name);
  summaryLine(box, 'Data', new Date(`${booking.date}T12:00:00`).toLocaleDateString('gl-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  summaryLine(box, 'Horario proposto', bookingTime());
  summaryLine(box, 'Peques', `${booking.childName}${booking.children > 1 ? ` e ${booking.children - 1} máis` : ''} (${agesText()})`);
  summaryLine(box, 'Contacto', `${booking.name} · ${booking.phone}`);
  if (activity().price !== null) {
    summaryLine(box, 'Prezo orientativo', `${euros(activity().price)} / ${activity().priceUnit}`);
  } else {
    summaryLine(box, 'Prezo', 'Orzamento por consultar');
  }
}

function goToStep(step) {
  currentStep = step;
  $$('.bstep').forEach(fieldset => fieldset.classList.toggle('is-active', Number(fieldset.dataset.step) === step));
  $$('#stepper .step').forEach(item => {
    const index = Number(item.dataset.step);
    item.classList.toggle('is-active', index === step);
    item.classList.toggle('is-done', index < step);
  });
  $('#btnPrev').disabled = step === 1;
  $('#btnNext').textContent = step === 4 ? 'Abrir WhatsApp →' : 'Continuar →';
  if (step === 4) renderSummary();
  $('.booking-shell').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function sendRequest() {
  const lines = [
    'Ola, gustaríame solicitar unha praza en Miudiños (pendente da vosa confirmación):',
    `Actividade: ${activity().name}`,
    `Data: ${booking.date}`,
    `Horario proposto: ${bookingTime()}`,
    `Peques: ${booking.children}; idades: ${agesText()}`,
    `Nome do peque: ${booking.childName}`,
    `Contacto: ${booking.name} · ${booking.phone}`,
    ...(activity().price === null ? [] : [`Prezo orientativo: ${euros(activity().price)} / ${activity().priceUnit}`]),
    ...(booking.notes ? [`Comentario: ${booking.notes}`] : [])
  ];
  openWhatsapp(lines.join('\n'));
}

function bindNav() {
  const toggle = $('#navToggle');
  const nav = $('#mainNav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Pechar o menú' : 'Abrir o menú');
  });
  $$('#mainNav a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

function bindContactForm() {
  function contactMessage() {
    const name = $('#ctName').value.trim();
    const message = $('#ctMsg').value.trim();
    if (name.length < 2 || name.length > 100 || message.length < 5 || message.length > 1000) {
      toast('Revisa o teu nome e a mensaxe antes de continuar.');
      return null;
    }
    return `Ola, son ${name}.\n\n${message}`;
  }
  $('#contactForm').addEventListener('submit', event => {
    event.preventDefault();
    const message = contactMessage();
    if (message) openWhatsapp(message);
  });
  $('#contactEmail').addEventListener('click', () => {
    const message = contactMessage();
    if (message) {
      window.location.href = emailUrl(message);
    }
  });
}

function bindGallery() {
  const modal = $('#lightbox');
  const image = $('#lightboxImg');
  const caption = $('#lightboxCaption');
  let previousFocus;
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    previousFocus?.focus();
  }
  for (const item of $$('#galleryGrid .gallery-item')) {
    function open() {
      previousFocus = document.activeElement;
      const photo = $('img', item);
      image.src = photo.src;
      image.alt = photo.alt;
      caption.textContent = $('figcaption', item).textContent;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      $('#lightboxClose').focus();
    }
    item.addEventListener('click', open);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  }
  $('#lightboxClose').addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) close();
    if (event.key === 'Tab' && !modal.hidden) {
      event.preventDefault();
      $('#lightboxClose').focus();
    }
  });
}

function init() {
  try {
    localStorage.removeItem('miudinos_bookings');
    localStorage.removeItem('miudinos_vouchers');
  } catch (error) {
    console.warn('Non foi posible limpar a caché das reservas da versión anterior.', error);
  }
  renderActivities();
  renderPricing();
  renderVouchers();
  renderActivityPicker();
  renderAgesInputs();
  updateCounter();
  bindNav();
  bindContactForm();
  bindGallery();
  const date = $('#bkDate');
  const max = new Date();
  max.setDate(max.getDate() + 90);
  date.min = toISODate(new Date());
  date.max = toISODate(max);
  date.addEventListener('change', () => {
    $('#err-date').hidden = true;
    renderSlots();
  });
  renderSlots();
  $$('.counter-btn').forEach(button => button.addEventListener('click', () => {
    const next = booking.children + Number(button.dataset.dir);
    if (next < 1 || next > (activity()?.maxChildren ?? 10)) return;
    booking.children = next;
    booking.ages = Array.from({ length: next }, (_, index) => booking.ages[index] ?? null);
    renderAgesInputs();
    updateCounter();
  }));
  $('#btnNext').addEventListener('click', () => {
    if (!validateStep(currentStep)) {
      toast('Revisa os campos marcados.');
      return;
    }
    if (currentStep === 4) sendRequest();
    else goToStep(currentStep + 1);
  });
  $('#btnPrev').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
  $('#bookingForm').addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      event.preventDefault();
      $('#btnNext').click();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
