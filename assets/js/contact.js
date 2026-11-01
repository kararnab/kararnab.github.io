'use strict';

// Public identifiers recovered from the original GoDaddy Conversations widget.
(() => {
    const endpoint = 'https://contact.apps-api.instantpage.secureserver.net';
    const config = {
        websiteId: 'b91d57a9-30f9-4411-afc2-9b12fa3bb047',
        widgetId: 'fe795296-9edc-47a1-adfb-d2a01beed90c',
        pageId: '00000000-0000-0000-0000-000000000000',
        accountId: '5c5ebfe4-d938-11ef-9585-008cfafff06e',
        domainName: '1loom.com',
        locale: 'en-IN',
        isReseller: false
    };
    const withTimeout = (promise) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Request timed out')), 20000);
        // Normalize third-party thenables before using native Promise methods.
        Promise.resolve(promise).then(
            value => { clearTimeout(timer); resolve(value); },
            error => { clearTimeout(timer); reject(error); }
        );
    });
    let recaptcha;
    function loadRecaptcha() {
        if (!recaptcha) {
            recaptcha = (async () => {
                const response = await fetch(`${endpoint}/v3/recaptcha`, { signal: AbortSignal.timeout(20000) });
                if (!response.ok) throw new Error('Configuration unavailable');
                const { siteKey } = await response.json();
                if (typeof siteKey !== 'string' || !siteKey.trim()) throw new Error('Invalid configuration');
                const script = document.createElement('script');
                script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
                script.async = true;
                try {
                    await withTimeout(new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = () => reject(new Error('Verification unavailable'));
                        document.head.append(script);
                    }));
                    await withTimeout(new Promise(resolve => window.grecaptcha.ready(resolve)));
                } catch (error) {
                    script.remove();
                    throw error;
                }
                return siteKey;
            })().catch(error => {
                recaptcha = undefined;
                throw error;
            });
        }
        return recaptcha;
    }
    async function sendMessage(name, email, message) {
        let token;
        try {
            const siteKey = await loadRecaptcha();
            token = await withTimeout(window.grecaptcha.execute(siteKey, { action: 'formSubmit' }));
            if (typeof token !== 'string' || !token) throw new Error('Empty token');
        } catch {
            throw Object.assign(new Error('Verification unavailable'), { stage: 'verification' });
        }
        const response = await fetch(`${endpoint}/messaging`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: '*/*' },
            signal: AbortSignal.timeout(20000),
            body: JSON.stringify({
                ...config,
                optedToSubscribe: false,
                metadata: {
                    formIdentifier: 'MESSAGING_EMAIL',
                    pathName: window.location.pathname,
                    deviceType: window.matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
                    deviceOs: '',
                    browserName: ''
                },
                formData: [
                    { label: 'Name', value: name, keyName: 'name' },
                    { label: 'Email', value: email, replyTo: true, keyName: 'email' },
                    { label: 'How can we help?', value: message, keyName: 'message' },
                    { label: '_app_id', value: '' }
                ],
                recaptchaToken: token
            })
        });
        if (!response.ok) throw new Error('Message not accepted');
        const result = await response.json();
        if (typeof result?.messageId !== 'string' || !result.messageId.trim()) throw new Error('Unconfirmed message');
    }

    const form = document.querySelector('[data-form]');
    if (!form) return;
    // Only recognized app names can provide context; never replace an entered message.
    const app = new URLSearchParams(window.location.search).get('app');
    const message = form.querySelector('[name="message"]');
    if (['AVPlayer', 'LibraryZ', '1Chat', 'CodeAtlas'].includes(app) && !message.value) {
        message.value = 'Hi Arnab, I’m interested in early access to ' + app + '. Please let me know about testing opportunities.';
    }
    const button = form.querySelector('[data-form-btn]');
    const buttonText = button.querySelector('span');
    const status = form.querySelector('[data-form-status]');
    const statusTitle = status.querySelector('[data-status-title]');
    const statusMessage = status.querySelector('[data-status-message]');
    const statusEmail = status.querySelector('[data-status-email]');
    function showStatus(state, title, message) {
        status.hidden = false;
        status.dataset.state = state;
        statusTitle.textContent = title;
        statusMessage.textContent = message;
        statusEmail.hidden = state !== 'error';
    }
    const fields = [...form.querySelectorAll('[data-form-input]')];
    // The provider's production reCAPTCHA key cannot verify local/preview domains.
    // Keep field validation usable there without loading verification or sending mail.
    const isPreview = window.location.protocol !== 'https:' ||
        !['1loom.com', 'www.1loom.com'].includes(window.location.hostname);
    buttonText.textContent = 'Send Message';
    let sending = false;
    fields.forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending) return;
        fields.forEach(field => field.setCustomValidity(field.value.trim() ? '' : 'Please fill out this field.'));
        if (!form.reportValidity()) return;
        if (isPreview) {
            showStatus('info', 'Open the live site to send', 'Messages can only be sent from 1loom.com. No message was sent from this preview; your text is still here.');
            return;
        }
        sending = true;
        button.disabled = true;
        form.setAttribute('aria-busy', 'true');
        buttonText.textContent = 'Sending…';
        showStatus('pending', 'Sending your message…', 'Please keep this page open.');
        try {
            await sendMessage(...fields.map(field => field.value.trim()));
            form.reset();
            showStatus('success', 'Message received', 'Thanks for reaching out. I’ll get back to you soon.');
        } catch (error) {
            if (error.stage === 'verification') {
                showStatus('error', 'Couldn’t verify your request', 'Your message hasn’t been sent. Try again, or contact me by email.');
            } else {
                showStatus('error', 'Delivery could not be confirmed', 'Your text is still here. You can retry or email me; retrying may send a duplicate.');
            }
        } finally {
            sending = false;
            button.disabled = false;
            form.removeAttribute('aria-busy');
            buttonText.textContent = status.dataset.state === 'error' ? 'Try again' : 'Send Message';
        }
    });
})();
