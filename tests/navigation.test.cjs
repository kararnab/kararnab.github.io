const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('assets/js/script.js', 'utf8').split('// Keep portfolio tabs addressable')[1];
function setup(hash) {
    let hashchange;
    const names = ['about', 'resume', 'portfolio', 'blog', 'contact'];
    const pages = names.map(name => ({ dataset: { page: name }, classList: { toggle(_, value) { this.active = value; } } }));
    const links = names.map(name => ({
        classList: { toggle(_, value) { this.active = value; } },
        getAttribute: () => '#' + name,
        setAttribute(_, value) { this.current = value; }, removeAttribute() { delete this.current; }
    }));
    const window = { location: { hash }, scrollTo() {}, addEventListener(_, listener) { hashchange = listener; } };
    vm.runInNewContext('// Keep portfolio tabs addressable' + source, { window, document: { querySelectorAll: selector => selector === '[data-page]' ? pages : links } });
    return { pages, links, navigate(hash) { window.location.hash = hash; hashchange(); } };
}
test('direct contact URL opens only Contact and marks its link current', () => {
    const h = setup('#contact');
    assert.deepEqual(h.pages.filter(p => p.classList.active).map(p => p.dataset.page), ['contact']);
    assert.equal(h.links[4].current, 'page');
});
test('hash changes switch tabs and clear the previous current state', () => {
    const h = setup('#contact'); h.navigate('#portfolio');
    assert.equal(h.pages[2].classList.active, true);
    assert.equal(h.pages[4].classList.active, false);
    assert.equal(h.links[4].current, undefined);
    h.navigate('#contact');
    assert.equal(h.pages[4].classList.active, true);
});
test('missing or unknown tab falls back to About', () => {
    for (const hash of ['', '#unknown']) assert.equal(setup(hash).pages[0].classList.active, true);
});
