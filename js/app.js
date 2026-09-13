/* ==========================================================================
   Miudiños · Centro de Ocio Montessori — Lógica de la aplicación
   Web 100% local: las reservas se guardan en localStorage.
   El paso de pago es una simulación (no se realiza ningún cargo).
   ========================================================================== */
'use strict';

/* ----------------------------- Datos base ------------------------------ */

const ACTIVITIES = [
  {
    id: 'ludoteca',
    emoji: '🧩',
    name: 'Ludoteca Montessori',
    tagline: 'Juego libre en ambiente preparado',
    desc: 'Sesiones de juego libre con materiales Montessori reales, acompañadas por educadoras. Ellos eligen, exploran y recogen.',
    ages: '3–12 años',
    duration: 'Sesión de 2 h',
    priceChild: 8,
    priceLabel: '8 € / niño·sesión',
    features: ['Materiales Montessori reales', 'Educadoras tituladas (ratio 1:8)', 'Merienda saludable incluida', 'Zonas por edades 3–6 / 7–9 / 10–12'],
    featured: false,
    saturdayMorning: true
  },
  {
    id: 'talleres',
    emoji: '🎨',
    name: 'Talleres creativos',
    tagline: 'Arte, cocina y ciencia cada semana',
    desc: 'Talleres temáticos semanales: pintura natural, cocina sensorial, experimentos y carpintería suave. Grupos reducidos.',
    ages: '4–12 años',
    duration: 'Taller de 1,5 h',
    priceChild: 14,
    priceLabel: '14 € / niño·taller',
    features: ['Temática nueva cada semana', 'Todos los materiales incluidos', 'Grupos de máximo 10 niños', 'Se llevan su creación a casa'],
    featured: true,
    saturdayMorning: true
  },
  {
    id: 'campamentos',
    emoji: '🏕️',
    name: 'Campamentos',
    tagline: 'Semanas temáticas en vacaciones',
    desc: 'Urban camps en Navidad, Semana Santa y verano. Naturaleza, arte y vida práctica en jornada de mañana.',
    ages: '3–12 años',
    duration: 'Semana · 9:00–14:00',
    priceChild: 85,
    priceLabel: '85 € / niño·semana',
    features: ['Jornada de 9:00 a 14:00', 'Desayuno y almuerzo incluidos', 'Salida semanal a la naturaleza', 'Hermanos con 20% de descuento'],
    featured: false,
    saturdayMorning: true
  }
];

const WEEKDAY_SLOTS = ['16:30', '18:30'];
const SATURDAY_SLOTS = ['10:30', '12:30', '16:30', '18:30'];

const VOUCHERS = [
  {
    id: 'b5',
    sessions: 5,
    price: 36,
    fullPrice: 40,
    tagline: 'Para probar sin compromiso',
    features: ['5 sesiones de ludoteca', 'Válido 6 meses', 'Nominativo e intransferible', 'Compatible con dto. hermanos'],
    featured: false
  },
  {
    id: 'b10',
    sessions: 10,
    price: 64,
    fullPrice: 80,
    tagline: 'El favorito de las familias',
    features: ['10 sesiones de ludoteca', 'Válido 6 meses', 'Nominativo e intransferible', '20% de ahorro sobre precio suelto'],
    featured: true
  },
  {
    id: 'b20',
    sessions: 20,
    price: 112,
    fullPrice: 160,
    tagline: 'Para los de cada tarde',
    features: ['20 sesiones de ludoteca', 'Válido 6 meses', 'Nominativo e intransferible', '30% de ahorro sobre precio suelto'],
    featured: false
  }
];

const SIBLING_DISCOUNT = 0.20; // 20% a partir del segundo niño
const STORAGE_KEY = 'miudinos_bookings';
const VOUCHER_KEY = 'miudinos_vouchers';
const VOUCHER_SESSION_PRICE = 8; // precio de referencia de sesión de ludoteca

/* --------------------------- Estado de reserva -------------------------- */

const booking = {
  activity: null,
  date: null,
  slot: null,
  children: 1,
  ages: [null],
  childName: '',
  name: '',
  email: '',
  phone: '',
  notes: '',
  voucher: null // código de bono aplicado
};

let currentStep = 1;
const TOTAL_STEPS = 4;

/* --------------------------- Utilidades DOM ----------------------------- */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function formatDateES(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function euros(amount) {
  return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

/* --------------------- Render de actividades y tarifas ------------------ */

function renderActivities() {
  const grid = $('#activitiesGrid');
  grid.innerHTML = ACTIVITIES.map(a => `
    <article class="activity-card">
      <div class="activity-emoji" style="background:${a.id === 'talleres' ? '#fdf1ea' : a.id === 'campamentos' ? '#eef3e6' : '#f6f0e2'}">${a.emoji}</div>
      <div class="activity-body">
        <h3>${a.name}</h3>
        <p class="activity-meta">${a.ages} · ${a.duration}</p>
        <p>${a.desc}</p>
        <p class="activity-price">${a.priceChild} € <small>${a.priceLabel.split('/')[1] ? '/ ' + a.priceLabel.split('/')[1].trim() : ''}</small></p>
        <button class="btn btn-ghost btn-sm" data-book="${a.id}">Reservar</button>
      </div>
    </article>`).join('');

  $$('#activitiesGrid [data-book]').forEach(btn =>
    btn.addEventListener('click', () => startBookingWith(btn.dataset.book))
  );
}

function renderPricing() {
  const grid = $('#pricingGrid');
  grid.innerHTML = ACTIVITIES.map(a => `
    <div class="price-card ${a.featured ? 'featured' : ''}">
      ${a.featured ? '<span class="tag">Más popular</span>' : ''}
      <h3>${a.emoji} ${a.name}</h3>
      <p class="price-amount">${a.priceChild} €<small> / niño</small></p>
      <ul>${a.features.map(f => `<li>${f}</li>`).join('')}</ul>
      <button class="btn ${a.featured ? 'btn-primary' : 'btn-ghost'}" data-book="${a.id}">Reservar</button>
    </div>`).join('');

  $$('#pricingGrid [data-book]').forEach(btn =>
    btn.addEventListener('click', () => startBookingWith(btn.dataset.book))
  );
}

function startBookingWith(activityId) {
  selectActivity(activityId);
  document.getElementById('reservas').scrollIntoView({ behavior: 'smooth' });
  showToast(`Has elegido: ${getActivity(activityId).name}`);
}

/* ------------------------------ Wizard ---------------------------------- */

function getActivity(id = booking.activity) {
  return ACTIVITIES.find(a => a.id === id);
}

function selectActivity(id) {
  booking.activity = id;
  const act = getActivity();
  // Ajustar número de niños a los límites de la actividad
  const min = act.minChildren || 1;
  const max = act.maxChildren || 10;
  booking.children = Math.min(Math.max(booking.children, min), max);
  booking.ages = Array.from({ length: booking.children }, (_, i) => booking.ages[i] ?? null);
  booking.slot = null;

  $$('#activityPicker .pick-card').forEach(c =>
    c.classList.toggle('is-selected', c.dataset.activity === id));
  $('#err-activity').hidden = true;

  renderAgesInputs();
  updateCounterUI();
  if ($('#bkDate').value) renderSlots($('#bkDate').value);
}

function renderActivityPicker() {
  $('#activityPicker').innerHTML = ACTIVITIES.map(a => `
    <button type="button" class="pick-card" data-activity="${a.id}" aria-pressed="false">
      <span class="pick-emoji">${a.emoji}</span>
      <span>
        <h3>${a.name}</h3>
        <p>${a.tagline}</p>
        <span class="pick-price">${a.priceLabel}</span>
      </span>
    </button>`).join('');

  $$('#activityPicker .pick-card').forEach(card =>
    card.addEventListener('click', () => {
      selectActivity(card.dataset.activity);
      $$('#activityPicker .pick-card').forEach(c => c.setAttribute('aria-pressed', c.dataset.activity === card.dataset.activity));
    })
  );
}

/* Paso 2: slots ---------------------------------------------------------- */

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function slotsForDate(isoDate) {
  const day = new Date(isoDate + 'T12:00:00').getDay(); // 0=Dom … 6=Sáb
  if (day === 0) return []; // Domingos cerrado
  const slots = day === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
  // Ocupación determinista simulada: algunas franjas completas según fecha
  return slots.map(time => ({ time, full: pseudoRandomFull(isoDate, time) }));
}

function pseudoRandomFull(dateStr, timeStr) {
  // Hash simple y determinista para simular plazas agotadas (~25%)
  let h = 0;
  const s = dateStr + timeStr;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h % 4 === 0;
}

function renderSlots(isoDate) {
  const picker = $('#slotPicker');
  const slots = slotsForDate(isoDate);
  booking.slot = null;

  if (!slots.length) {
    picker.innerHTML = '<p class="hint">Los domingos descansamos. Elige otro día. 🙏</p>';
    return;
  }
  picker.innerHTML = slots.map(s => `
    <button type="button" class="slot" data-slot="${s.time}" ${s.full ? 'disabled aria-disabled="true" title="Completo"' : ''}>${s.time}</button>
  `).join('');

  $$('#slotPicker .slot:not(:disabled)').forEach(btn =>
    btn.addEventListener('click', () => {
      booking.slot = btn.dataset.slot;
      $$('#slotPicker .slot').forEach(b => b.classList.toggle('is-selected', b === btn));
      $('#err-slot').hidden = true;
    })
  );
}

/* Paso 2: niños y edades -------------------------------------------------- */

function renderAgesInputs() {
  const row = $('#agesRow');
  row.innerHTML = booking.ages.map((age, i) => `
    <span class="age-field">
      <label for="age-${i}">Niño/a ${i + 1}</label>
      <input type="number" id="age-${i}" min="3" max="12" inputmode="numeric" value="${age ?? ''}" data-age-index="${i}">
    </span>`).join('');

  $$('#agesRow input').forEach(inp =>
    inp.addEventListener('input', () => {
      booking.ages[Number(inp.dataset.ageIndex)] = inp.value === '' ? null : Number(inp.value);
      inp.classList.remove('is-invalid');
      $('#err-ages').hidden = true;
    })
  );
}

function updateCounterUI() {
  const act = getActivity() || { minChildren: 1, maxChildren: 10 };
  const min = act.minChildren || 1;
  const max = act.maxChildren || 10;
  $('#bkChildren').value = booking.children;
  $$('.counter-btn[data-counter="children"]').forEach(btn => {
    const dir = Number(btn.dataset.dir);
    btn.disabled = dir === -1 ? booking.children <= min : booking.children >= max;
  });
}

function bindCounter() {
  $$('.counter-btn[data-counter="children"]').forEach(btn =>
    btn.addEventListener('click', () => {
      const act = getActivity() || { minChildren: 1, maxChildren: 10 };
      const min = act.minChildren || 1;
      const max = act.maxChildren || 10;
      const next = booking.children + Number(btn.dataset.dir);
      if (next < min || next > max) return;
      booking.children = next;
      booking.ages = Array.from({ length: next }, (_, i) => booking.ages[i] ?? null);
      renderAgesInputs();
      updateCounterUI();
    })
  );
}

/* Paso 4: resumen y precio ------------------------------------------------ */

function computePrice() {
  const act = getActivity();
  const perChild = act.priceChild;
  let total = 0;
  for (let i = 0; i < booking.children; i++) {
    total += i === 0 ? perChild : perChild * (1 - SIBLING_DISCOUNT);
  }
  return {
    perChild,
    total: booking.voucher ? 0 : Math.round(total * 100) / 100,
    discount: booking.children > 1
  };
}

function renderSummary(target) {
  const act = getActivity();
  const price = computePrice();
  target.innerHTML = `
    <h3>Resumen de tu reserva</h3>
    <div class="summary-line"><span>Actividad</span><span>${act.emoji} ${act.name}</span></div>
    <div class="summary-line"><span>Fecha</span><span>${formatDateES(booking.date)}</span></div>
    <div class="summary-line"><span>Hora</span><span>${booking.slot} h</span></div>
    <div class="summary-line"><span>Para</span><span>${booking.childName} ${booking.children > 1 ? `y ${booking.children - 1} más (${booking.ages.join(', ')} años)` : `(${booking.ages[0]} años)`}</span></div>
    <div class="summary-line"><span>Reserva a nombre de</span><span>${booking.name}</span></div>
    ${price.discount && !booking.voucher ? `<div class="summary-line"><span>Descuento hermanos</span><span>−20% desde el 2.º</span></div>` : ''}
    ${booking.voucher ? `<div class="summary-line"><span>Pago</span><span>🎟️ Bono ${booking.voucher} (${booking.children} sesión/es)</span></div>` : ''}
    <div class="summary-total"><span>Total</span><span>${booking.voucher ? '0 € (bono)' : euros(price.total)}</span></div>`;
}

/* --------------------------- Validación ---------------------------------- */

function setError(input, errEl, show) {
  if (input) input.classList.toggle('is-invalid', show);
  if (errEl) errEl.hidden = !show;
  return !show;
}

function validateStep(step) {
  switch (step) {
    case 1:
      return setError(null, $('#err-activity'), !booking.activity);

    case 2: {
      let ok = true;
      const dateVal = $('#bkDate').value;
      const dateOk = dateVal && dateVal >= toISODate(new Date()) && slotsForDate(dateVal).length > 0;
      ok = setError($('#bkDate'), $('#err-date'), !dateOk) && ok;
      booking.date = dateOk ? dateVal : null;
      ok = setError(null, $('#err-slot'), !booking.slot) && ok;
      const childName = $('#bkChildName').value.trim();
      ok = setError($('#bkChildName'), $('#err-childname'), childName.length < 2) && ok;
      if (childName.length >= 2) booking.childName = childName;
      const agesOk = booking.ages.every(a => a !== null && a >= 3 && a <= 12);
      $$('#agesRow input').forEach(inp => {
        const v = booking.ages[Number(inp.dataset.ageIndex)];
        inp.classList.toggle('is-invalid', !(v >= 3 && v <= 12));
      });
      ok = setError(null, $('#err-ages'), !agesOk) && ok;
      return ok;
    }

    case 3: {
      let ok = true;
      const name = $('#bkName').value.trim();
      const email = $('#bkEmail').value.trim();
      const phone = $('#bkPhone').value.replace(/[\s-]/g, '');
      ok = setError($('#bkName'), $('#err-name'), name.length < 3) && ok;
      ok = setError($('#bkEmail'), $('#err-email'), !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) && ok;
      ok = setError($('#bkPhone'), $('#err-phone'), !/^\+?\d{9,15}$/.test(phone)) && ok;
      if (ok) {
        booking.name = name;
        booking.email = email;
        booking.phone = $('#bkPhone').value.trim();
        booking.notes = $('#bkNotes').value.trim();
      }
      return ok;
    }

    case 4: {
      if (booking.voucher) return true; // pago cubierto con bono
      let ok = true;
      const cardName = $('#cardName').value.trim();
      const cardNum = $('#cardNumber').value.replace(/\s/g, '');
      const expiry = $('#cardExpiry').value;
      const cvv = $('#cardCvv').value;
      ok = setError($('#cardName'), $('#err-cardname'), cardName.length < 3) && ok;
      ok = setError($('#cardNumber'), $('#err-cardnumber'), !(cardNum.length >= 13 && cardNum.length <= 19 && luhnCheck(cardNum))) && ok;
      ok = setError($('#cardExpiry'), $('#err-cardexpiry'), !validExpiry(expiry)) && ok;
      ok = setError($('#cardCvv'), $('#err-cardcvv'), !/^\d{3,4}$/.test(cvv)) && ok;
      return ok;
    }
  }
  return true;
}

function luhnCheck(num) {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

function validExpiry(val) {
  const m = val.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

/* ------------------------- Navegación de pasos --------------------------- */

function goToStep(step) {
  currentStep = step;
  $$('.bstep').forEach(fs => fs.classList.toggle('is-active', Number(fs.dataset.step) === step));
  $$('#stepper .step').forEach(s => {
    const n = Number(s.dataset.step);
    s.classList.toggle('is-active', n === step);
    s.classList.toggle('is-done', n < step);
  });
  const onDone = step === 5;
  $('#wizardNav').style.display = onDone ? 'none' : 'flex';
  $('#stepper').style.visibility = onDone ? 'hidden' : 'visible';
  $('#btnPrev').disabled = step === 1;
  $('#btnNext').textContent = step === TOTAL_STEPS ? '💳 Pagar y confirmar' : 'Continuar →';
  if (step === 4) renderSummary($('#bookingSummary'));
  $('.booking-shell').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function nextStep() {
  if (!validateStep(currentStep)) {
    showToast('Revisa los campos marcados ✍️');
    return;
  }
  if (currentStep === TOTAL_STEPS) {
    confirmBooking();
    return;
  }
  goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

/* ------------------------ Confirmación y storage ------------------------- */

function generateCode(prefix = 'MDN-') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = prefix;
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ------------------------------ Bonos ----------------------------------- */

function loadVouchers() {
  try { return JSON.parse(localStorage.getItem(VOUCHER_KEY)) || []; }
  catch { return []; }
}

function saveVouchers(list) {
  localStorage.setItem(VOUCHER_KEY, JSON.stringify(list));
}

function findVoucher(code) {
  return loadVouchers().find(v => v.code === code.toUpperCase().trim());
}

let selectedVoucher = null; // bono que se está comprando

function renderVouchers() {
  $('#voucherGrid').innerHTML = VOUCHERS.map(v => `
    <div class="voucher-card ${v.featured ? 'featured' : ''}">
      ${v.featured ? '<span class="tag">Más vendido</span>' : ''}
      <h3>🎟️ Bono ${v.sessions} sesiones</h3>
      <p class="voucher-sessions">${v.price} € <small><s>${v.fullPrice} €</s></small></p>
      <span class="voucher-saving">Ahorras ${v.fullPrice - v.price} €</span>
      <p class="hint" style="font-size:.9rem">${v.tagline}</p>
      <ul>${v.features.map(f => `<li>${f}</li>`).join('')}</ul>
      <button class="btn ${v.featured ? 'btn-primary' : 'btn-ghost'}" data-voucher="${v.id}">Comprar bono</button>
    </div>`).join('');

  $$('#voucherGrid [data-voucher]').forEach(btn =>
    btn.addEventListener('click', () => openVoucherForm(btn.dataset.voucher))
  );
}

function openVoucherForm(voucherId) {
  selectedVoucher = VOUCHERS.find(v => v.id === voucherId);
  $('#voucherShell').hidden = false;
  $('#voucherForm').hidden = false;
  $('#voucherDone').hidden = true;
  $('#voucherSummary').innerHTML = `
    <div class="summary-line"><span>Bono</span><span>🎟️ ${selectedVoucher.sessions} sesiones de ludoteca</span></div>
    <div class="summary-line"><span>Validez</span><span>6 meses desde la compra</span></div>
    <div class="summary-total"><span>Total</span><span>${euros(selectedVoucher.price)}</span></div>
    <p class="hint" style="margin:.6em 0 0;font-size:.8rem">* Pago simulado — entorno de demostración.</p>`;
  $('#voucherShell').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function bindVoucherForm() {
  $('#btnVoucherCancel').addEventListener('click', () => { $('#voucherShell').hidden = true; });
  $('#btnVoucherClose').addEventListener('click', () => {
    $('#voucherShell').hidden = true;
    $('#voucherForm').reset();
  });

  $('#voucherForm').addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const forName = $('#voFor').value.trim();
    const name = $('#voName').value.trim();
    const email = $('#voEmail').value.trim();
    const phone = $('#voPhone').value.replace(/[\s-]/g, '');
    ok = setError($('#voFor'), $('#err-vofor'), forName.length < 2) && ok;
    ok = setError($('#voName'), $('#err-voname'), name.length < 3) && ok;
    ok = setError($('#voEmail'), $('#err-voemail'), !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) && ok;
    ok = setError($('#voPhone'), $('#err-vophone'), !/^\+?\d{9,15}$/.test(phone)) && ok;
    if (!ok) { showToast('Revisa los campos marcados ✍️'); return; }

    const record = {
      code: generateCode('BONO-'),
      type: selectedVoucher.id,
      sessionsTotal: selectedVoucher.sessions,
      sessionsLeft: selectedVoucher.sessions,
      price: selectedVoucher.price,
      forName,
      name,
      email,
      phone,
      createdAt: new Date().toISOString()
    };
    const list = loadVouchers();
    list.push(record);
    saveVouchers(list);

    $('#voucherCode').textContent = record.code;
    $('#voucherDoneSummary').innerHTML = `
      <div class="summary-line"><span>Bono</span><span>🎟️ ${record.sessionsTotal} sesiones de ludoteca</span></div>
      <div class="summary-line"><span>Para</span><span>${record.forName}</span></div>
      <div class="summary-line"><span>Comprado por</span><span>${record.name}</span></div>
      <div class="summary-total"><span>Total pagado*</span><span>${euros(record.price)}</span></div>`;
    $('#voucherForm').hidden = true;
    $('#voucherDone').hidden = false;
    renderMyVouchers();
    showToast('¡Bono comprado! 🎟️');
  });
}

function renderMyVouchers() {
  const wrap = $('#myVouchers');
  const list = $('#myVouchersList');
  const items = loadVouchers().slice().reverse();
  if (!items.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  list.innerHTML = items.map(v => {
    const used = v.sessionsTotal - v.sessionsLeft;
    const pct = Math.round((v.sessionsLeft / v.sessionsTotal) * 100);
    return `
      <div class="booking-item voucher-item">
        <span class="b-emoji">🎟️</span>
        <div class="b-info">
          <strong>Bono ${v.sessionsTotal} sesiones · para ${v.forName}</strong>
          <span>Comprado por ${v.name} · ${euros(v.price)} · caduca en 6 meses</span>
          <div class="v-bar"><div class="v-bar-fill" style="width:${pct}%"></div></div>
        </div>
        <span class="v-uses">${v.sessionsLeft} / ${v.sessionsTotal} sesiones</span>
        <span class="b-code">${v.code}</span>
        <span class="b-status">${v.sessionsLeft > 0 ? 'activo' : 'agotado'}</span>
      </div>`;
  }).join('');
}

function bindVoucherApply() {
  $('#btnApplyVoucher').addEventListener('click', () => {
    const input = $('#voucherInput');
    const msg = $('#voucherMsg');
    const code = input.value.trim().toUpperCase();
    msg.hidden = false;

    if (!code) {
      msg.textContent = 'Escribe el código del bono.';
      msg.className = 'voucher-msg ko';
      return;
    }
    const voucher = findVoucher(code);
    if (!voucher) {
      msg.textContent = '❌ Código no encontrado. Revísalo.';
      msg.className = 'voucher-msg ko';
      return;
    }
    if (voucher.sessionsLeft < booking.children) {
      msg.textContent = `❌ A ${voucher.forName} le quedan ${voucher.sessionsLeft} sesión(es) y necesitas ${booking.children}.`;
      msg.className = 'voucher-msg ko';
      return;
    }
    if (getActivity().id !== 'ludoteca') {
      msg.textContent = '❌ Los bonos solo son válidos para la ludoteca.';
      msg.className = 'voucher-msg ko';
      return;
    }
    if (voucher.forName.toLowerCase() !== booking.childName.toLowerCase()) {
      msg.textContent = `❌ Este bono es nominativo de ${voucher.forName}.`;
      msg.className = 'voucher-msg ko';
      return;
    }
    booking.voucher = voucher.code;
    msg.textContent = `✅ Bono de ${voucher.forName} aplicado: ${booking.children} sesión(es). ¡No pagas nada hoy!`;
    msg.className = 'voucher-msg ok';
    $('#cardFields').classList.add('is-hidden');
    $('#payDivider').classList.add('is-hidden');
    $('#btnNext').textContent = '🎟️ Confirmar con bono';
    renderSummary($('#bookingSummary'));
  });

  // Quitar bono si se edita el código
  $('#voucherInput').addEventListener('input', () => {
    if (!booking.voucher) return;
    booking.voucher = null;
    $('#voucherMsg').hidden = true;
    $('#cardFields').classList.remove('is-hidden');
    $('#payDivider').classList.remove('is-hidden');
    $('#btnNext').textContent = '💳 Pagar y confirmar';
    renderSummary($('#bookingSummary'));
  });
}

function loadBookings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveBookings(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function confirmBooking() {
  const price = computePrice();
  const record = {
    code: generateCode(),
    createdAt: new Date().toISOString(),
    status: 'confirmada',
    activity: booking.activity,
    date: booking.date,
    slot: booking.slot,
    children: booking.children,
    ages: [...booking.ages],
    childName: booking.childName,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    notes: booking.notes,
    voucher: booking.voucher,
    total: price.total
  };
  const list = loadBookings();
  list.push(record);
  saveBookings(list);

  // Descontar sesiones del bono
  if (booking.voucher) {
    const vouchers = loadVouchers();
    const v = vouchers.find(x => x.code === booking.voucher);
    if (v) {
      v.sessionsLeft = Math.max(0, v.sessionsLeft - booking.children);
      saveVouchers(vouchers);
    }
  }

  $('#bookingCode').textContent = record.code;
  renderDoneSummary(record);
  goToStep(5);
  showToast('¡Reserva confirmada! 🎉');
}

function renderDoneSummary(r) {
  const act = getActivity(r.activity);
  $('#doneSummary').innerHTML = `
    <div class="summary-line"><span>Actividad</span><span>${act.emoji} ${act.name}</span></div>
    <div class="summary-line"><span>Fecha</span><span>${formatDateES(r.date)}</span></div>
    <div class="summary-line"><span>Hora</span><span>${r.slot} h</span></div>
    <div class="summary-line"><span>Para</span><span>${r.childName} (${r.ages.join(', ')} años)</span></div>
    <div class="summary-line"><span>Reserva a nombre de</span><span>${r.name}</span></div>
    ${r.voucher ? `<div class="summary-line"><span>Pagado con</span><span>🎟️ Bono ${r.voucher}</span></div>` : ''}
    <div class="summary-total"><span>Total pagado*</span><span>${r.voucher ? '0 € (bono)' : euros(r.total)}</span></div>
    <p class="hint" style="margin:.8em 0 0;font-size:.8rem">* Pago simulado — entorno de demostración.</p>`;
}

function resetBooking() {
  booking.activity = null;
  booking.date = null;
  booking.slot = null;
  booking.children = 1;
  booking.ages = [null];
  booking.childName = '';
  booking.name = booking.email = booking.phone = booking.notes = '';
  booking.voucher = null;
  $('#bookingForm').reset();
  $('#bkChildren').value = 1;
  $('#cardFields').classList.remove('is-hidden');
  $('#payDivider').classList.remove('is-hidden');
  $('#voucherMsg').hidden = true;
  $$('#activityPicker .pick-card').forEach(c => { c.classList.remove('is-selected'); c.setAttribute('aria-pressed', 'false'); });
  $$('.field-error').forEach(e => { e.hidden = true; });
  $$('.is-invalid').forEach(i => i.classList.remove('is-invalid'));
  $('#slotPicker').innerHTML = '<p class="hint">Elige primero una fecha 📅</p>';
  renderAgesInputs();
  updateCounterUI();
  goToStep(1);
}

/* ----------------------------- Mis reservas ------------------------------ */

function renderMyBookings() {
  const wrap = $('#myBookings');
  const list = $('#myBookingsList');
  const items = loadBookings().slice().reverse();
  wrap.hidden = false;

  if (!items.length) {
    list.innerHTML = '<p class="my-bookings-empty">Todavía no tienes ninguna reserva. ¡Anímate! 🌱</p>';
    return;
  }

  list.innerHTML = items.map(r => {
    const act = getActivity(r.activity);
    const cancelled = r.status === 'cancelada';
    return `
      <div class="booking-item ${cancelled ? 'is-cancelled' : ''}" data-code="${r.code}">
        <span class="b-emoji">${act.emoji}</span>
        <div class="b-info">
          <strong>${act.name} · ${formatDateES(r.date)} · ${r.slot} h</strong>
          <span>Para ${r.childName}${r.children > 1 ? ` +${r.children - 1}` : ''} · ${r.name} · ${r.voucher ? '🎟️ bono' : euros(r.total)}</span>
        </div>
        <span class="b-code">${r.code}</span>
        <span class="b-status">${r.status}</span>
        <button type="button" class="b-cancel" data-cancel="${r.code}">Cancelar</button>
      </div>`;
  }).join('');

  $$('#myBookingsList [data-cancel]').forEach(btn =>
    btn.addEventListener('click', () => cancelBooking(btn.dataset.cancel))
  );
}

function cancelBooking(code) {
  const list = loadBookings();
  const rec = list.find(r => r.code === code);
  if (!rec || rec.status === 'cancelada') return;
  if (!confirm(`¿Cancelar la reserva ${code}?\nSe liberarán las plazas sin coste.`)) return;
  rec.status = 'cancelada';
  saveBookings(list);
  renderMyBookings();
  showToast(`Reserva ${code} cancelada`);
}

/* ------------------------- Formato de tarjeta ---------------------------- */

function bindCardInputs() {
  $('#cardNumber').addEventListener('input', e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
    e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
    e.target.classList.remove('is-invalid');
  });
  $('#cardExpiry').addEventListener('input', e => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2);
    e.target.value = d;
    e.target.classList.remove('is-invalid');
  });
  $('#cardCvv').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.classList.remove('is-invalid');
  });
}

/* --------------------------- Navegación / menú --------------------------- */

function bindNav() {
  const toggle = $('#navToggle');
  const nav = $('#mainNav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  $$('#mainNav a').forEach(a =>
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

/* --------------------------- Formulario contacto ------------------------- */

function bindContactForm() {
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#ctName').value.trim();
    const email = $('#ctEmail').value.trim();
    const msg = $('#ctMsg').value.trim();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || msg.length < 5) {
      showToast('Revisa el formulario: faltan datos ✍️');
      return;
    }
    e.target.reset();
    $('#contactOk').hidden = false;
    setTimeout(() => { $('#contactOk').hidden = true; }, 5000);
    showToast('Mensaje enviado 💌');
  });
}

/* ------------------------------- Lightbox -------------------------------- */

function bindGallery() {
  const lightbox = $('#lightbox');
  const img = $('#lightboxImg');
  const caption = $('#lightboxCaption');
  let lastFocus = null;

  const open = item => {
    lastFocus = document.activeElement;
    const itemImg = $('img', item);
    img.src = itemImg.src;
    img.alt = itemImg.alt;
    caption.textContent = $('figcaption', item).textContent;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#lightboxClose').focus();
  };
  const close = () => {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  };

  $$('#galleryGrid .gallery-item').forEach(item => {
    item.addEventListener('click', () => open(item));
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item); }
    });
  });
  $('#lightboxClose').addEventListener('click', close);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !lightbox.hidden) close();
  });
}

/* --------------------------------- Init ---------------------------------- */

function init() {
  renderActivities();
  renderPricing();
  renderActivityPicker();
  renderVouchers();
  renderAgesInputs();
  updateCounterUI();
  bindCounter();
  bindCardInputs();
  bindNav();
  bindContactForm();
  bindGallery();
  bindVoucherForm();
  bindVoucherApply();
  renderMyVouchers();

  // Fecha mínima: hoy. Máxima: +90 días.
  const dateInput = $('#bkDate');
  const today = new Date();
  const max = new Date();
  max.setDate(max.getDate() + 90);
  dateInput.min = toISODate(today);
  dateInput.max = toISODate(max);
  dateInput.addEventListener('change', () => {
    setError(dateInput, $('#err-date'), false);
    if (dateInput.value) renderSlots(dateInput.value);
  });

  $('#slotPicker').innerHTML = '<p class="hint">Elige primero una fecha 📅</p>';

  $('#btnNext').addEventListener('click', nextStep);
  $('#btnPrev').addEventListener('click', prevStep);
  $('#btnNewBooking').addEventListener('click', resetBooking);
  $('#btnMyBookings').addEventListener('click', () => {
    renderMyBookings();
    $('#myBookings').scrollIntoView({ behavior: 'smooth' });
  });
  $('#btnMyVouchers').addEventListener('click', () => {
    renderMyVouchers();
    document.getElementById('bonos').scrollIntoView({ behavior: 'smooth' });
  });

  // Enter avanza de paso salvo en textarea
  $('#bookingForm').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && currentStep <= TOTAL_STEPS) {
      e.preventDefault();
      nextStep();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
