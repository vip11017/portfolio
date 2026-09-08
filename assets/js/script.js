'use strict';

/* ------------------------------------------------------------------
   Portfolio interactions: sidebar toggle, tabs (hash-linked),
   project filter, expandable project details, scroll reveal.
------------------------------------------------------------------ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ---------- current year ---------- */
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});

/* ---------- scroll reveal ----------
   First load: reveal on scroll via IntersectionObserver.
   Tab switch: staggered reveal immediately (user is scrolled to top). */
let revealObserver = null;
if (!reduceMotion && 'IntersectionObserver' in window) {
  revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px 20% 0px' });
}

function playReveal(root, { immediate = false } = {}) {
  const items = root.querySelectorAll('[data-reveal]:not(.is-visible)');

  // Reduced motion, no observer, or a tab switch (the panel already animates
  // itself in): just show everything at once.
  if (reduceMotion || immediate || !revealObserver) {
    items.forEach((el) => {
      el.style.transitionDelay = '0ms';
      el.classList.add('is-visible');
    });
    return;
  }

  // First load: stagger each item in as it scrolls into view.
  items.forEach((el, i) => {
    el.style.transitionDelay = Math.min(i * 55, 300) + 'ms';
    revealObserver.observe(el);
  });
  setTimeout(() => items.forEach((el) => el.classList.add('is-visible')), 1800);
}

/* ---------- sidebar contacts toggle (mobile) ---------- */
const sidebar = document.querySelector('[data-sidebar]');
const sidebarBtn = document.querySelector('[data-sidebar-btn]');
const sidebarBtnLabel = document.querySelector('[data-sidebar-btn-label]');

if (sidebar && sidebarBtn) {
  sidebarBtn.addEventListener('click', () => {
    const open = sidebar.classList.toggle('is-open');
    sidebarBtn.setAttribute('aria-expanded', String(open));
    if (sidebarBtnLabel) sidebarBtnLabel.textContent = open ? 'Hide contacts' : 'Show contacts';
  });
}

/* ---------- tabs ---------- */
const tabs = Array.from(document.querySelectorAll('[data-nav-link]'));
const panels = Array.from(document.querySelectorAll('.panel[data-page]'));

function activateTab(name, { push = true, focus = false, isInitial = false } = {}) {
  const tab = tabs.find((t) => t.dataset.page === name);
  if (!tab) return;

  tabs.forEach((t) => {
    const on = t === tab;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });

  panels.forEach((p) => {
    const on = p.dataset.page === name;
    p.hidden = !on;
    p.classList.toggle('is-active', on);
    if (on) playReveal(p, { immediate: !isInitial });
  });

  if (isInitial) {
    window.scrollTo({ top: 0, behavior: 'instant' });
  } else {
    // bring the tab bar (not the whole sidebar) to the top
    const anchor = document.querySelector('.navbar');
    if (anchor) {
      const y = anchor.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: Math.max(y, 0), behavior: 'instant' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  if (focus) tab.focus();
  if (push && location.hash.slice(1) !== name) {
    history.pushState({ tab: name }, '', '#' + name);
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.page));

  tab.addEventListener('keydown', (e) => {
    let next;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    activateTab(tabs[next].dataset.page, { focus: true });
  });
});

window.addEventListener('popstate', () => {
  const name = location.hash.slice(1);
  const valid = panels.some((p) => p.dataset.page === name);
  activateTab(valid ? name : 'about', { push: false });
});

/* open the tab named in the URL hash, else default; no scroll jump on first paint */
(() => {
  const initial = location.hash.slice(1);
  const valid = panels.some((p) => p.dataset.page === initial);
  activateTab(valid ? initial : 'about', { push: false, isInitial: true });
})();

/* ---------- project filter ---------- */
const filterBtns = Array.from(document.querySelectorAll('[data-filter]'));
const projectCards = Array.from(document.querySelectorAll('.project-card'));
const emptyMsg = document.querySelector('[data-grid-empty]');

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.filter;
    filterBtns.forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    let shown = 0;
    projectCards.forEach((card) => {
      const match = cat === 'all' || card.dataset.category === cat;
      card.classList.toggle('is-hidden', !match);
      if (match) shown += 1;
    });
    if (emptyMsg) emptyMsg.hidden = shown !== 0;
  });
});

/* ---------- expandable details (projects + certifications) ---------- */
document.querySelectorAll('.project-toggle, .cert-toggle').forEach((btn) => {
  const detail = document.getElementById(btn.getAttribute('aria-controls'));
  if (!detail) return;
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    detail.hidden = open;
  });
});

/* ---------- résumé lightbox ---------- */
(() => {
  const modal = document.querySelector('[data-lightbox-modal]');
  const trigger = document.querySelector('[data-lightbox]');
  if (!modal || !trigger) return;
  const modalImg = modal.querySelector('[data-lightbox-img]');
  const closeBtn = modal.querySelector('[data-lightbox-close]');
  const triggerImg = trigger.querySelector('img');

  const open = (e) => {
    e.preventDefault();
    modalImg.src = (triggerImg && (triggerImg.currentSrc || triggerImg.src)) || '';
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };
  const close = () => {
    modal.hidden = true;
    modalImg.src = '';
    document.body.style.overflow = '';
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
})();
