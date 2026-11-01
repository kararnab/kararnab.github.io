const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('assets/js/contact.js', 'utf8');
function setup(mode = 'success', address = 'https://1loom.com/about-me/index.html') {
    let submit, calls = [], tokens = 0;
    const title = {}, body = {}, email = {};
    const status = { dataset: {}, querySelector: selector => selector === '[data-status-title]' ? title : selector === '[data-status-message]' ? body : email, get textContent() { return [title.textContent, body.textContent].join(' '); } };
    const text = {}, button = { querySelector: () => text };
    const fields = ['Visitor', 'visitor@example.com', 'Hello'].map(value => ({ value, addEventListener() {}, setCustomValidity(value) { this.error = value; } }));
    const form = {
        querySelector: selector => selector === '[data-form-btn]' ? button : selector === '[name="message"]' ? fields[2] : status,
        querySelectorAll: () => fields,
        addEventListener: (_, fn) => submit = fn,
        reportValidity: () => fields.every(f => !f.error) && fields[1].value.includes('@'),
        setAttribute() {}, removeAttribute() {}, reset() { fields.forEach(f => f.value = ''); }
    };
    const context = {
        AbortSignal, URLSearchParams, setTimeout, clearTimeout,
        window: { location: new URL(address), matchMedia: () => ({ matches: false }), grecaptcha: {
            ready: fn => fn(), execute: () => {
                tokens++;
                if (mode.startsWith('thenable')) return {
                    then(resolve, reject) {
                        queueMicrotask(() => mode === 'thenable-error' ? reject(Error('Verification failed')) : resolve(`token-${tokens}`));
                        return this;
                    }
                };
                return mode === 'token' ? Promise.reject(Error()) : Promise.resolve(`token-${tokens}`);
            }
        } },
        document: { querySelector: () => form, createElement: () => ({ remove() {} }), head: { append: s => queueMicrotask(() => mode === 'script' ? s.onerror() : s.onload()) } },
        fetch: async (url, options) => {
            calls.push({ url, options });
            if (!options?.method) return { ok: true, json: async () => ({ siteKey: 'public-key' }) };
            if (mode === 'network') throw Error();
            return { ok: mode !== 'http', json: async () => mode === 'malformed' ? {} : { messageId: 'confirmed-id' } };
        }
    };
    vm.runInNewContext(source, context);
    return { fields, status, button, text, calls, submit: () => submit({ preventDefault() {} }) };
}
test('confirmed delivery uses recovered payload and clears fields', async () => {
    const h = setup(); await h.submit();
    const body = JSON.parse(h.calls[1].options.body);
    assert.equal(body.formData[1].replyTo, true);
    assert.equal(body.formData[1].value, 'visitor@example.com');
    assert.equal(body.metadata.formIdentifier, 'MESSAGING_EMAIL');
    assert.equal(body.metadata.pathName, '/about-me/index.html');
    assert.match(h.status.textContent, /received/);
    assert.equal(h.fields[0].value, '');
});
for (const [label, index, value] of [['missing name', 0, '   '], ['invalid email', 1, 'invalid'], ['empty message', 2, '']]) {
    test(label, async () => { const h = setup(); h.fields[index].value = value; await h.submit(); assert.equal(h.calls.length, 0); });
}
for (const mode of ['script', 'token', 'network', 'http', 'malformed']) {
    test(`${mode} failure preserves input and enables retry`, async () => {
        const h = setup(mode); await h.submit();
        assert.equal(h.fields[0].value, 'Visitor');
        assert.equal(h.button.disabled, false);
        assert.match(h.status.textContent, mode === 'script' || mode === 'token' ? /hasn’t been sent/ : /could not be confirmed/);
        assert.equal(h.status.dataset.state, 'error');
        assert.equal(h.status.querySelector('[data-status-email]').hidden, false);
        assert.equal(h.text.textContent, 'Try again');
    });
}
test('concurrent submits send once; later submit gets fresh token', async () => {
    const h = setup(); await Promise.all([h.submit(), h.submit()]);
    assert.equal(h.calls.filter(c => c.options?.method).length, 1);
    h.fields.forEach((f, i) => f.value = ['Visitor', 'visitor@example.com', 'Again'][i]);
    await h.submit();
    assert.equal(JSON.parse(h.calls[2].options.body).recaptchaToken, 'token-2');
    assert.equal(h.calls.filter(c => !c.options?.method).length, 1);
});

test('early-access links prefill recognized apps without replacing a draft', () => {
    const prefill = source.slice(source.indexOf('    const app = new URLSearchParams'), source.indexOf("    const button = form.querySelector"));
    for (const app of ['AVPlayer', 'LibraryZ', '1Chat', 'CodeAtlas', 'Unknown']) {
        const message = { value: '' };
        vm.runInNewContext(prefill, { URLSearchParams, window: { location: { search: `?app=${app}` } }, form: { querySelector: () => message } });
        assert.equal(message.value.includes(app), app !== 'Unknown');
    }
    const message = { value: 'My existing draft' };
    vm.runInNewContext(prefill, { URLSearchParams, window: { location: { search: '?app=AVPlayer' } }, form: { querySelector: () => message } });
    assert.equal(message.value, 'My existing draft');
});

for (const address of [
    'http://localhost:8000/about-me/index.html',
    'http://127.0.0.1:8000/about-me/index.html',
    'http://[::1]:8000/about-me/index.html',
    'file:///home/user/site/about-me/index.html',
    'https://preview.example.com/about-me/index.html'
]) {
    test('preview validates without verification or delivery: ' + address, async () => {
        const h = setup('success', address);
        assert.equal(h.text.textContent, 'Send Message');
        await h.submit();
        assert.equal(h.calls.length, 0);
        assert.equal(h.fields[0].value, 'Visitor');
        assert.match(h.status.textContent, /No message was sent/);
    });
}
test('preview still rejects whitespace-only input', async () => {
    const h = setup('success', 'http://localhost:8000/about-me/index.html');
    h.fields[2].value = '   ';
    await h.submit();
    assert.equal(h.fields[2].error, 'Please fill out this field.');
    assert.equal(h.calls.length, 0);
    assert.doesNotMatch(h.status.textContent, /looks valid/);
});
test('production www domain still submits through verification', async () => {
    const h = setup('success', 'https://www.1loom.com/about-me/index.html');
    await h.submit();
    assert.equal(h.calls.filter(c => c.options?.method === 'POST').length, 1);
    assert.match(h.status.textContent, /received/);
});

for (const mode of ['thenable-success', 'thenable-error']) {
    test('verification handles a non-native promise: ' + mode, async () => {
        const h = setup(mode);
        await h.submit();
        const posts = h.calls.filter(c => c.options?.method === 'POST');
        assert.equal(posts.length, mode === 'thenable-success' ? 1 : 0);
        assert.equal(h.status.dataset.state, mode === 'thenable-success' ? 'success' : 'error');
        if (posts.length) assert.equal(JSON.parse(posts[0].options.body).recaptchaToken, 'token-1');
        else assert.equal(h.fields[0].value, 'Visitor');
    });
}
