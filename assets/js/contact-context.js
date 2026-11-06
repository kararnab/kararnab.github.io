// Keep app requests explicit while the contact form lives in the maker portfolio.
(() => {
    const app = new URLSearchParams(window.location.search).get('app');
    const earlyAccess = ['1Chat', 'AVPlayer', 'CodeAtlas'].includes(app);
    if (!earlyAccess && app !== 'OpenNote') return;
    const title = document.querySelector('[data-contact-title]');
    const context = document.querySelector('[data-contact-context]');
    if (!title || !context) return;
    title.textContent = earlyAccess ? `Request early access to ${app}` : 'OpenNote support';
    context.hidden = false;
    context.textContent = earlyAccess
        ? `Send a request to ask about testing ${app}. We’ll reply by email about availability and next steps. Sending this form does not grant access or automatically add you to a waitlist.`
        : 'Need help with OpenNote? Include your device model, app version and what happened, without private note content. We’ll reply by email.';
})();
