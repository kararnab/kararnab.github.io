# 1Loom

Source for [1loom.com](https://1loom.com), Arnab Kar’s independent software studio
website. The site introduces 1Loom’s apps and includes the maker’s portfolio,
resume, writing links, and contact form.

## Project structure

| Path                                    | Purpose                                                                   |
|-----------------------------------------|---------------------------------------------------------------------------|
| `index.html`                            | Studio homepage and app catalog                                           |
| `apps/`                                 | Pages for OpenNote, Connections, LibraryZ, AVPlayer, 1Chat, and CodeAtlas |
| `about-me/index.html`                   | Maker profile, resume, portfolio, blog links, and Contact tab             |
| `assets/css/`                           | Shared site and portfolio styles                                          |
| `assets/css/about.css`                  | Maker page layout using the shared 1Loom design system                      |
| `assets/js/theme.js`                    | Theme handling                                                            |
| `assets/js/motion.js`, `assets/css/motion.css` | App page motion and the icon hand-off between pages (off for reduced motion) |
| `assets/js/script.js`                   | Portfolio navigation and interactions                                     |
| `assets/js/contact.js`                  | GoDaddy Conversations contact integration                                 |
| `assets/js/contact-context.js`          | App-specific early-access and OpenNote support context                     |
| `assets/images/`                        | Site images and icons                                                     |
| `welcome/`                              | Welcome page, branding assets, and web manifest                           |
| `privacy-policy/`                       | App privacy policies                                                      |
| `tests/contact.test.cjs`                | Mocked contact integration checks                                         |
| `CNAME`                                 | Custom domain: `1loom.com`                                                |
| `robots.txt`, `sitemap.xml`, `404.html` | Crawler guidance, sitemap, and error page                                 |

## Local development

The site uses plain HTML, CSS, and JavaScript. There is no package installation,
framework, or build step.

From the repository root, start a static server with Node.js and npm:

```sh
npx --yes http-server . -p 8000 -c-1
```

This downloads and runs `http-server` through npm without adding a project dependency.
The `-c-1` option disables caching while you work.

Open [localhost:8000](http://localhost:8000). To inspect the form, open
`/about-me/index.html` and select **Contact**. Local preview supports layout and
interaction checks. The button always reads **Send Message**. On preview hosts,
submitting validates the fields, keeps the entered values, and explains that
sending is available on 1loom.com. It does not
load reCAPTCHA or call the messaging API. This also applies to `file://` and other
preview hosts. Actual submission is enabled only on HTTPS `1loom.com` and
`www.1loom.com`; delivery still requires verification after deployment.

The GoDaddy-supplied reCAPTCHA key rejects localhost with “Invalid domain for site
key.” Its allowed-domain settings are managed outside this repository. Do not
replace it with an unrelated key: GoDaddy must be able to verify its tokens.

## Contact form

The Contact tab submits directly to the original GoDaddy Conversations messaging
endpoint. Public widget identifiers and request handling are centralized in
`assets/js/contact.js`; no backend or private credentials are included.

The form requires a name, valid email address, and message. On submission it:

1. Validates the fields and prevents concurrent submissions.
2. Fetches GoDaddy’s current public reCAPTCHA site key and loads reCAPTCHA v3.
3. Generates a fresh token and sends the message, with the email marked as reply-to.
4. Shows success and clears the form only after a successful response containing
   a positive integer `conversationId` (the observed GoDaddy response) or a nonempty `messageId`. Otherwise it retains the values and allows retry.

The endpoint is undocumented and may change. A timeout can happen after the server
accepts a message, so retrying an unconfirmed submission may deliver a duplicate.

### Checks

With Node.js installed, run:

```sh
node tests/contact.test.cjs
node tests/navigation.test.cjs
node --check assets/js/contact.js
node --check assets/js/script.js
node --check assets/js/motion.js
git diff --check
```

The 22 mocked contact tests cover required fields, invalid email, script and token failures,
network and HTTP failures, malformed success responses, concurrent submissions,
fresh tokens on subsequent submissions, preview isolation, and production-domain
routing. They never send real messages. The
email test uses a simplified mock; native browser validation needs a browser check.
Three additional navigation tests cover direct tab links, tab changes, and unknown
links. Early-access links prefill the message for AVPlayer, 1Chat, or CodeAtlas;
visitors must enter their details and submit the form themselves.

Early-access actions say **Request early access** and identify the app on the
Contact tab. The accompanying explanation makes clear that a request does not
grant access or automatically enroll the visitor in a waitlist. OpenNote's FAQ
links to an app-specific support message on the same tab.

Testimonials open through explicit buttons in a native modal dialog, supporting
keyboard activation, Escape, and focus restoration. OpenNote's page includes free
pricing and a FAQ covering note
limits, devices, stylus input, offline use, backup/restore, and support.

Use the studio voice (we/us/our) for app support, early-access requests, form
feedback, and product messaging. Keep the maker biography and personal contact
card personal, preserve testimonials as written, and retain the actual publisher
identity in policy and terms pages.

The maker page shares the studio header, theme toggle, fonts and footer. Its
About, Experience, Projects, Writing and Contact navigation preserves the original
fragment URLs (`#resume`, `#portfolio`, `#blog`, etc.). Contact links open directly
to the form without the maker introduction or map. Project filters use the same
buttons at every screen size; with JavaScript disabled, all sections and projects
remain readable. The unused legacy portfolio stylesheet and template artwork
have been removed. `assets/images/avatar-1.png` is used for Vijo Joseph’s
recommendation; the unused avatar artwork and original studio branding files are
retained for future use. Local logo fallbacks remain in use and must be retained.

Testimonials use one manually scrollable row with three-line previews, a visible
hint of the next card, and previous/next buttons. Full quotes remain available in
the keyboard-accessible dialog. There is no automatic rotation.

The organisation logo strip uses local copies for Swiggy and CureFit. Walgreens
uses a Wikimedia file redirect; Rently uses
`https://use.rently.com/wp-content/uploads/2023/03/logo.svg`, and the remaining
logos use their previous hosted sources. Hosted images fall back to local
`assets/images/client-*` copies if loading fails. Replacements at the same hosted
filename appear after upstream/browser caches refresh; a rebrand uploaded under
a new filename still needs a URL update.
The heading describes teams and organisations worked with, rather than implying
every organisation was a direct client.

Portfolio tabs can be linked directly, for example `/about-me/index.html#contact` or
`/about-me/index.html#portfolio`. Browser Back and Forward restore the selected tab.

Read-only checks on November 1, 2026 found that the configuration GET returned
HTTP 200 and the messaging CORS preflight returned HTTP 204, allowing requests
from `https://1loom.com` through a wildcard origin and the JSON content-type header.
Desktop/mobile layouts have been checked locally. Live reCAPTCHA and inbox
delivery remain unverified for this implementation. No real message was sent during local implementation.

## Deployment and verification

This repository is structured for GitHub Pages with the custom domain in `CNAME`.
No generated output directory is required. Confirm the publishing branch and root
folder in the repository’s **Settings → Pages** before deploying; this checkout
alone does not verify the remote Pages settings.

1. Review and commit the changes on the working branch, then merge into the
   configured publishing branch (`master` is the repository’s existing main branch)
   and push to GitHub.
2. Wait for a successful Pages deployment, then open
   [the About page](https://1loom.com/about-me/index.html) and select **Contact**.
3. Check desktop and mobile layouts, keyboard focus, required fields, and invalid
   email feedback.
4. With the site owner’s permission, send one clearly labelled test message using
   an email address you control. Verify both the success feedback and the actual
   conversation in the GoDaddy Conversations inbox, including the reply-to email.
5. Block the reCAPTCHA script or simulate an offline request in browser developer
   tools. Confirm that the form retains the entered message and permits retry.

An API response alone does not prove inbox delivery. Complete the inbox check
before considering the integration verified.

## Attribution and license

The portfolio design is inspired by
[codewithsadee/vcard-personal-portfolio](https://github.com/codewithsadee/vcard-personal-portfolio/).

This repository is licensed under the MIT License. See [LICENSE](LICENSE).
