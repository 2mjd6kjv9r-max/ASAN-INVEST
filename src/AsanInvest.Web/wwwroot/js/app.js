// Inline skript yoxdur (CSP: script-src 'self').
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t && t.hasAttribute && t.hasAttribute('data-autosubmit') && t.form) t.form.submit();
});
document.addEventListener('click', function (e) {
  var t = e.target.closest ? e.target.closest('[data-confirm]') : null;
  if (t && !window.confirm(t.getAttribute('data-confirm'))) e.preventDefault();
});
// «+N» çiplərini aç/bağla
document.addEventListener('click', function (e) {
  var t = e.target.closest ? e.target.closest('[data-more]') : null;
  if (!t) return;
  var box = t.parentElement;
  box.classList.toggle('open');
  t.textContent = box.classList.contains('open') ? 'daha az' : t.getAttribute('data-more');
});
