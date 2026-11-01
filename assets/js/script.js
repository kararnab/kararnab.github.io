'use strict';

document.documentElement.classList.add('has-page-navigation');

// Prefer hosted logos; keep the strip usable if a remote file moves or fails.
document.querySelectorAll('img[data-fallback-src]').forEach(image => {
    const useFallback = () => {
        const source = image.dataset.fallbackSrc;
        if (!source) return;
        delete image.dataset.fallbackSrc;
        image.src = source;
    };
    image.addEventListener('error', useFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) useFallback();
});

// A quiet, manually scrolled row: no automatic rotation or hidden quotes.
const testimonialRail = document.querySelector('#testimonial-list');
const testimonialControls = document.querySelector('[data-testimonial-controls]');
const previousTestimonials = document.querySelector('[data-testimonial-prev]');
const nextTestimonials = document.querySelector('[data-testimonial-next]');
function updateTestimonialControls() {
    const end = testimonialRail.scrollWidth - testimonialRail.clientWidth;
    previousTestimonials.disabled = testimonialRail.scrollLeft <= 2;
    nextTestimonials.disabled = testimonialRail.scrollLeft >= end - 2;
}
function scrollTestimonials(direction) {
    const cardWidth = testimonialRail.firstElementChild.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(testimonialRail).columnGap) || 0;
    testimonialRail.scrollBy({
        left: direction * (cardWidth + gap),
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
}
testimonialControls.hidden = false;
previousTestimonials.addEventListener('click', () => scrollTestimonials(-1));
nextTestimonials.addEventListener('click', () => scrollTestimonials(1));
testimonialRail.addEventListener('scroll', updateTestimonialControls, { passive: true });
if ('ResizeObserver' in window) new ResizeObserver(updateTestimonialControls).observe(testimonialRail);
else window.addEventListener('resize', updateTestimonialControls);
updateTestimonialControls();

// testimonials variables
const testimonialsItem = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");
const modalSource = document.querySelector('[data-modal-source]');
const modalDate = document.querySelector('[data-modal-date]');
let testimonialTrigger;
for (const item of testimonialsItem) {
    const trigger = item.querySelector('[data-testimonials-open]');
    trigger.addEventListener('click', () => {
        modalImg.src = item.querySelector('[data-testimonials-avatar]').src;
        modalImg.alt = item.querySelector('[data-testimonials-avatar]').alt;
        modalTitle.textContent = item.querySelector('[data-testimonials-title]').textContent;
        const date = item.dataset.testimonialDate;
        modalDate.hidden = !date;
        if (date) {
            const [y, m, d] = date.split('-').map(Number);
            modalDate.dateTime = date;
            modalDate.textContent = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } else {
            modalDate.removeAttribute('datetime');
            modalDate.textContent = '';
        }
        const source = item.dataset.testimonialSource;
        modalSource.hidden = !source;
        if (source) {
            modalSource.href = source;
            modalSource.setAttribute('aria-label', `View ${modalTitle.textContent}’s recommendation on LinkedIn (opens in a new tab)`);
        } else {
            modalSource.removeAttribute('href');
            modalSource.removeAttribute('aria-label');
        }
        modalText.replaceChildren(...[...item.querySelector('[data-testimonials-text]').children].map(node => node.cloneNode(true)));
        testimonialTrigger = trigger;
        modalContainer.showModal();
    });
}
modalCloseBtn.addEventListener('click', () => modalContainer.close());
// Native dialog handles Escape and confines Tab focus; restore the opener on every close path.
modalContainer.addEventListener('close', () => testimonialTrigger?.focus());
modalContainer.addEventListener('click', event => {
    const bounds = modalContainer.getBoundingClientRect();
    if (event.target === modalContainer &&
        (event.clientX < bounds.left || event.clientX > bounds.right ||
         event.clientY < bounds.top || event.clientY > bounds.bottom)) modalContainer.close();
});


// Explicit category buttons work with pointer, keyboard and touch on every viewport.
const filterBtn = document.querySelectorAll('[data-filter-btn]');
const filterItems = document.querySelectorAll('[data-filter-item]');
for (const button of filterBtn) {
    button.addEventListener('click', () => {
        const category = button.textContent.trim().toLowerCase();
        filterItems.forEach(item => {
            item.classList.toggle('active', category === 'all' || item.dataset.category === category);
        });
        filterBtn.forEach(filter => {
            const selected = filter === button;
            filter.classList.toggle('active', selected);
            filter.setAttribute('aria-pressed', String(selected));
        });
    });
}

// Preserve the shared header on direct links after the browser resolves its initial fragment.
window.addEventListener('load', () => requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
}), { once: true });

// Keep portfolio tabs addressable, including reloads and browser Back/Forward.
const navigationLinks = document.querySelectorAll('[data-nav-link]');
const pages = document.querySelectorAll('[data-page]');
function showPageFromHash() {
    const requested = window.location.hash.slice(1).toLowerCase();
    if (requested === 'main') return;
    const selected = [...pages].some(page => page.dataset.page === requested) ? requested : 'about';
    const titles = {
        about: 'Arnab Kar — About the maker | 1Loom',
        resume: 'Experience — Arnab Kar | 1Loom',
        portfolio: 'Projects — Arnab Kar | 1Loom',
        blog: 'Writing — Arnab Kar | 1Loom',
        contact: 'Contact | 1Loom'
    };
    document.title = titles[selected];
    pages.forEach(page => page.classList.toggle('active', page.dataset.page === selected));
    navigationLinks.forEach(link => {
        const active = link.getAttribute('href') === '#' + selected;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('hashchange', showPageFromHash);
showPageFromHash();
