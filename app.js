// ARM Ingeniería · Versión 1.1 · JS principal
(() => {
  const header = document.querySelector('[data-header]');
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.querySelector('[data-menu]');

  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  menuBtn?.addEventListener('click', () => {
    const isOpen = menu?.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(Boolean(isOpen)));
  });

  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }));

  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
  } else {
    items.forEach(item => item.classList.add('is-visible'));
  }
})();
