const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const menuToggle = $('#menuToggle');
menuToggle.addEventListener('click', () => $('#mainNav').classList.toggle('open'));
$$('#mainNav a').forEach(a => a.addEventListener('click', () => $('#mainNav').classList.remove('open')));

function openModal(id) {
  $$('.modal').forEach(m => { m.classList.remove('open'); m.setAttribute('aria-hidden','true'); });
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
}
function closeModals() {
  $$('.modal').forEach(m => { m.classList.remove('open'); m.setAttribute('aria-hidden','true'); });
}
$$('[data-open]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.open)));
$$('[data-close]').forEach(btn => btn.addEventListener('click', closeModals));
$$('[data-switch]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.switch)));
$$('[data-book]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); openModal('bookingModal'); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });

const dateInput = $('#bookingDate');
if (dateInput) {
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  dateInput.min = localToday;
}
const toast = $('#toast');
function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
$$('[data-demo-form]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault(); closeModals();
  showToast('This is a front-end demo. Connect secure account services to enable login and registration.');
}));
$('#bookingForm').addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  const saved = JSON.parse(localStorage.getItem('altf4_demo_requests') || '[]');
  saved.push({...data, submittedAt:new Date().toISOString(), status:'For confirmation'});
  localStorage.setItem('altf4_demo_requests', JSON.stringify(saved));
  e.currentTarget.reset(); closeModals();
  showToast('Demo request saved in this browser only — no appointment was sent.');
});
