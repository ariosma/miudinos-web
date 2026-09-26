/* Miudiños: solicitudes por WhatsApp; no pagos ni reservas automáticas. */
'use strict';

const PHONE = '34665369101';
const ACTIVITIES = [
  {
    id: 'bebeteca', emoji: '🪁', name: 'Bebeteca',
    tagline: 'Primeros descubrimientos con un adulto',
    desc: 'Por las mañanas, bebés de 0 a 2 años exploran materiales, texturas y movimiento a su ritmo, siempre acompañados por un adulto. Un rato de calma para compartir y relajarse juntos.',
    minAge: 0, maxAge: 2, ages: '0–2 años · con acompañante',
    duration: '90 min · mañanas', price: 7, priceUnit: 'bebé y acompañante',
    features: ['Una persona adulta acompaña al peque', 'Juego sensorial y movimiento', 'Sesión de 90 minutos'],
    days: [1, 2, 3, 4, 5], slots: ['10:00', '11:30']
  },
  {
    id: 'talleres', emoji: '🎨', name: 'Tardes de juego y talleres',
    tagline: 'Juego libre y propuestas para crear',
    desc: 'Por las tardes combinamos juego libre con propuestas de arte y experimentación para peques de 3 a 8 años. Consulta qué propuesta toca cada semana.',
    minAge: 3, maxAge: 8, ages: '3–8 años',
    duration: '90 min · tardes', price: 10, priceUnit: 'niño/a y tarde',
    features: ['Juego libre y talleres', 'Sesión de 90 minutos', 'Materiales incluidos'],
    days: [1, 2, 3, 4, 5], slots: ['16:30', '18:30'], featured: true
  },
  {
    id: 'campamentos', emoji: '🏕️', name: 'Campamentos',
    tagline: 'Mañanas de vacaciones para explorar',
    desc: 'Propuesta de mañanas durante vacaciones. Pregunta por fechas, programa y plazas disponibles.',
    minAge: 3, maxAge: 8, ages: '3–8 años',
    duration: '5 mañanas · 9:00–13:00', price: 100, priceUnit: 'niño/a y semana',
    features: ['Cinco mañanas laborables', 'Horario propuesto: 9:00–13:00', 'Fechas a confirmar'],
    days: [1, 2, 3, 4, 5], slots: ['09:00']
  },
  {
    id: 'cumpleanos', emoji: '🎂', name: 'Cumpleaños de los viernes',
    tagline: 'Una celebración a su manera',
    desc: 'Celebraciones para peques de 3 a 8 años, solo los viernes. Cuéntanos cuántos vendréis y prepararemos un presupuesto personalizado.',
    minAge: 3, maxAge: 8, ages: '3–8 años',
    duration: 'Viernes · horario a convenir', price: null, priceUnit: '',
    features: ['Solo los viernes', 'Propuesta según grupo', 'Presupuesto antes de confirmar'],
    days: [5], slots: ['16:30'], maxChildren: 20
  }
];
const VOUCHERS = [
  { activityId: 'bebeteca', sessions: 5, price: 32 },
  { activityId: 'bebeteca', sessions: 10, price: 60 },
  { activityId: 'talleres', sessions: 5, price: 45 },
  { activityId: 'talleres', sessions: 10, price: 85 }
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
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function whatsappUrl(message) {
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
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
    price.textContent = item.price === null ? 'Precio a consultar' : `${euros(item.price)} / ${item.priceUnit}`;
    body.append(heading, meta, desc, price, makeButton('Solicitar plaza', 'btn btn-ghost btn-sm', () => startBooking(item.id)));
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
    price.textContent = item.price === null ? 'A consultar' : euros(item.price);
    const unit = document.createElement('p');
    unit.className = 'activity-meta';
    unit.textContent = item.price === null ? 'Presupuesto según grupo' : `Por ${item.priceUnit} · ${item.duration}`;
    const features = document.createElement('ul');
    for (const feature of item.features) {
      const li = document.createElement('li');
      li.textContent = feature;
      features.append(li);
    }
    card.append(heading, price, unit, features, makeButton('Solicitar plaza', 'btn btn-ghost', () => startBooking(item.id)));
    grid.append(card);
  }
}

function renderVouchers() {
  const grid = $('#voucherGrid');
  grid.replaceChildren();
  for (const voucher of VOUCHERS) {
    const offering = ACTIVITIES.find(item => item.id === voucher.activityId);
    const period = voucher.activityId === 'bebeteca' ? 'mañanas de bebeteca' : 'tardes de juego y talleres';
    const card = document.createElement('div');
    card.className = 'voucher-card';
    const heading = document.createElement('h3');
    heading.textContent = `🎟️ ${voucher.sessions} ${period}`;
    const price = document.createElement('p');
    price.className = 'voucher-sessions';
    price.textContent = euros(voucher.price);
    const info = document.createElement('p');
    info.textContent = `${(voucher.sessions * 1.5).toLocaleString('es-ES')} horas en ${voucher.sessions} días · ahorras ${euros(offering.price * voucher.sessions - voucher.price)}. Condiciones a confirmar con el centro.`;
    const link = document.createElement('a');
    link.className = 'btn btn-ghost';
    link.href = whatsappUrl(`Hola, quisiera consultar el bono de ${voucher.sessions} ${period} para un peque. ¿Podéis decirme las condiciones?`);
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
    const button = makeButton(`${item.emoji}  ${item.name} · ${item.ages} · ${item.price === null ? 'A consultar' : euros(item.price)}`, 'pick-card', () => selectActivity(item.id));
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
    hint.textContent = value && activity() ? 'Solo abrimos de lunes a viernes. Para cumpleaños, elige un viernes.' : 'Elige actividad y fecha para ver los horarios propuestos.';
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

function renderSummary() {
  const box = $('#bookingSummary');
  box.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = 'Revisa tu solicitud';
  box.append(heading);
  summaryLine(box, 'Actividad', activity().name);
  summaryLine(box, 'Fecha', new Date(`${booking.date}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  summaryLine(box, 'Hora propuesta', booking.slot);
  summaryLine(box, 'Peques', `${booking.childName}${booking.children > 1 ? ` y ${booking.children - 1} más` : ''} (${booking.ages.join(', ')} años)`);
  summaryLine(box, 'Contacto', `${booking.name} · ${booking.phone}`);
  if (activity().price !== null) {
    summaryLine(box, 'Precio orientativo', `${euros(activity().price)} ${activity().priceUnit === 'niño/a y semana' ? 'por peque y semana' : 'por peque'}`);
  } else {
    summaryLine(box, 'Precio', 'Presupuesto a consultar');
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
    'Hola, quisiera solicitar una plaza en Miudiños (pendiente de vuestra confirmación):',
    `Actividad: ${activity().name}`,
    `Fecha: ${booking.date}`,
    `Hora propuesta: ${booking.slot}`,
    `Peques: ${booking.children}; edades: ${booking.ages.join(', ')} años`,
    `Nombre del peque: ${booking.childName}`,
    `Contacto: ${booking.name} · ${booking.phone}`,
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
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  $$('#mainNav a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

function bindContactForm() {
  $('#contactForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#ctName').value.trim();
    const message = $('#ctMsg').value.trim();
    if (name.length < 2 || name.length > 100 || message.length < 5 || message.length > 1000) {
      toast('Revisa tu nombre y mensaje antes de continuar.');
      return;
    }
    openWhatsapp(`Hola, soy ${name}. ${message}`);
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
    console.warn('No se pudo limpiar la caché de reservas de la versión anterior.', error);
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
      toast('Revisa los campos marcados.');
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
