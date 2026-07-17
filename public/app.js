(() => {
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const mobileNav = document.querySelector('[data-mobile-nav]');

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      mobileNav.hidden = open;
    });
    mobileNav.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement) {
        menuButton.setAttribute('aria-expanded', 'false');
        mobileNav.hidden = true;
      }
    });
  }

  const eventLabel = document.querySelector('[data-event-label]');
  if (eventLabel && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const labels = ['agent:spawn', 'branch:fork', 'tool:result', 'spine:extend', 'agent:complete'];
    let index = 0;
    window.setInterval(() => {
      index = (index + 1) % labels.length;
      eventLabel.textContent = labels[index];
    }, 1800);
  }

  // Reactive nav underline: highlights the nav item for the section under the
  // header, immediately on click and via scrollspy as the user scrolls.
  const scrollspyIds = ['difference', 'build', 'product', 'compute', 'partner'];
  const scrollspySections = scrollspyIds.map((id) => document.getElementById(id)).filter(Boolean);
  const navItems = document.querySelectorAll('.desktop-nav a, .header-cta');

  const setActiveNav = (id) => {
    navItems.forEach((a) => {
      a.classList.toggle('is-active', id != null && a.getAttribute('href') === `#${id}`);
    });
  };

  navItems.forEach((a) => {
    a.addEventListener('click', () => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) setActiveNav(href.slice(1));
    });
  });

  if (scrollspySections.length && 'IntersectionObserver' in window) {
    const headerHeight = header?.getBoundingClientRect().height || 71;
    // Trigger band starts a few px past the header line so a landed section's
    // top edge is unambiguously inside it, not exactly coincident with the
    // outgoing section's bottom edge (both sit at ~headerHeight after an
    // anchor scroll, which is a sub-pixel tie without this offset).
    const bandTop = Math.ceil(headerHeight) + 6;
    const intersecting = new Set();
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        });
        // Prefer the latest section in document order among current matches:
        // if two sections briefly overlap the band during a transition, the
        // later one is the arriving section and should win.
        const activeId = [...scrollspyIds].reverse().find((id) => intersecting.has(id)) || null;
        setActiveNav(activeId);
      },
      { rootMargin: `-${bandTop}px 0px -60% 0px`, threshold: 0 }
    );
    scrollspySections.forEach((section) => spy.observe(section));
  }

  // Google Sheet endpoint: paste the Apps Script Web App URL (ends in /exec)
  // from sheet-endpoint/README-DEPLOY.md here to activate direct-to-Sheet
  // submissions. While empty, the form falls back to the mailto behaviour.
  const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyErIGjOHyNWMHFd-P7gBBc86H_ja2k6JRU7qX4_9sXpnW50KBB2_RhBGByTfakMnEz/exec';

  const form = document.querySelector('[data-partner-form]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const fields = {
      company: String(data.get('company') || ''),
      name: String(data.get('name') || ''),
      email: String(data.get('email') || ''),
      capability: String(data.get('capability') || ''),
      placement: String(data.get('placement') || ''),
    };

    if (SHEET_ENDPOINT) {
      const button = form.querySelector('button[type="submit"]');
      const label = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      try {
        // text/plain avoids a CORS preflight; no-cors is fire-and-forget
        // (Apps Script web apps don't return CORS headers).
        await fetch(SHEET_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(fields),
        });
        form.reset();
        button.textContent = 'Received — we’ll reply within a day';
        window.setTimeout(() => {
          button.disabled = false;
          button.textContent = label;
        }, 6000);
        return;
      } catch (_) {
        button.disabled = false;
        button.textContent = label;
        // network failure → fall through to the mailto fallback below
      }
    }

    const subject = `Lloyal product capability — ${fields.company || 'product discussion'}`;
    const body = [
      `Company: ${fields.company}`,
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      '',
      'What the product should be able to do:',
      fields.capability,
      '',
      'Required placements:',
      fields.placement,
    ].join('\n');
    window.location.href = `mailto:zuhair@lloyal.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
