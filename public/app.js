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

  // The full, attributed quotes remain readable when JavaScript is unavailable.
  const carousel = document.querySelector('[data-quote-carousel]');
  if (carousel) {
    const slides = [...carousel.querySelectorAll('[data-quote-slide]')];
    const selectors = [...carousel.querySelectorAll('[data-quote-select]')];
    const previous = carousel.querySelector('[data-quote-prev]');
    const next = carousel.querySelector('[data-quote-next]');
    const status = carousel.querySelector('[data-quote-status]');
    let selected = 0;

    const setExpanded = (slide, expanded) => {
      slide.querySelector('[data-quote-excerpt]').hidden = expanded;
      slide.querySelector('[data-quote-full]').hidden = !expanded;
      const button = slide.querySelector('[data-quote-expand]');
      button.setAttribute('aria-expanded', String(expanded));
      button.firstChild.textContent = expanded ? 'Show less ' : 'See more ';
      button.querySelector('[aria-hidden]').textContent = expanded ? '↑' : '↓';
    };

    const show = (index) => {
      const destination = (index + slides.length) % slides.length;
      const changed = destination !== selected;
      selected = destination;
      slides.forEach((slide, i) => { slide.hidden = i !== selected; });
      selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
      carousel.querySelector('[data-quote-count]').textContent = `${String(selected + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      status.textContent = `${selectors[selected].textContent.trim()}, quote ${selected + 1} of ${slides.length}`;
      if (changed && carousel.getBoundingClientRect().top < 0) {
        carousel.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    };

    slides.forEach((slide) => {
      const button = slide.querySelector('[data-quote-expand]');
      setExpanded(slide, false);
      button.hidden = false;
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        setExpanded(slide, !expanded);
        // Collapsing a long post must not leave the reader below the quote.
        if (expanded && slide.getBoundingClientRect().top < 0) {
          slide.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      });
    });
    previous.addEventListener('click', () => show(selected - 1));
    next.addEventListener('click', () => show(selected + 1));
    selectors.forEach((button, index) => {
      button.addEventListener('click', () => show(index));
      button.addEventListener('keydown', (event) => {
        const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!direction) return;
        event.preventDefault();
        show(index + direction);
        selectors[selected].focus({ preventScroll: true });
      });
    });
    show(0);
    status.textContent = '';
    carousel.classList.add('is-ready');
    previous.hidden = false;
    next.hidden = false;
    carousel.querySelector('[data-quote-controls]').hidden = false;
  }

  // Manual paging, with a single native YouTube player. Removing the departing
  // iframe stops its audio. Off-screen players are lazy and never autoplay.
  const videos = document.querySelector('[data-video-carousel]');
  if (videos) {
    const slides = [...videos.querySelectorAll('[data-video-slide]')];
    const selectors = [...videos.querySelectorAll('[data-video-select]')];
    const status = videos.querySelector('[data-video-status]');
    let selected = 0;

    const stop = (slide) => {
      slide.querySelector('iframe')?.remove();
      slide.querySelector('[data-video-id]').hidden = false;
    };
    const show = (index, announce = true) => {
      const destination = (index + slides.length) % slides.length;
      if (destination !== selected) stop(slides[selected]);
      selected = destination;
      slides.forEach((slide, i) => { slide.hidden = i !== selected; });
      selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
      videos.querySelector('[data-video-count]').textContent = `${String(selected + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      const slide = slides[selected];
      const name = slide.querySelector('[data-video-name]').textContent;
      if (!slide.querySelector('iframe')) {
        const fallback = slide.querySelector('[data-video-id]');
        const player = document.createElement('iframe');
        player.title = name;
        player.src = `https://www.youtube-nocookie.com/embed/${fallback.dataset.videoId}?playsinline=1&rel=0`;
        player.loading = 'lazy';
        player.allow = 'encrypted-media; picture-in-picture; fullscreen';
        player.allowFullscreen = true;
        player.referrerPolicy = 'strict-origin-when-cross-origin';
        fallback.hidden = true;
        slide.querySelector('.video-stage').append(player);
      }
      if (announce) status.textContent = `${name}, video ${selected + 1} of ${slides.length}`;
    };

    videos.querySelector('[data-video-prev]').addEventListener('click', () => show(selected - 1));
    videos.querySelector('[data-video-next]').addEventListener('click', () => show(selected + 1));
    selectors.forEach((button, index) => {
      button.addEventListener('click', () => show(index));
      button.addEventListener('keydown', (event) => {
        const destination = event.key === 'ArrowRight' ? index + 1
          : event.key === 'ArrowLeft' ? index - 1
          : event.key === 'Home' ? 0
          : event.key === 'End' ? slides.length - 1 : null;
        if (destination === null) return;
        event.preventDefault();
        show(destination);
        selectors[selected].focus({ preventScroll: true });
      });
    });
    show(0, false);
    videos.classList.add('is-ready');
    videos.querySelector('[data-video-prev]').hidden = false;
    videos.querySelector('[data-video-next]').hidden = false;
    videos.querySelector('[data-video-controls]').hidden = false;
  }

  // Reactive nav underline: highlights the nav item for the section under the
  // header, immediately on click and via scrollspy as the user scrolls.
  const scrollspyIds = ['developers', 'abilities', 'build', 'partner'];
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


  // The controller graph plays its fork once, when it arrives on screen: the
  // branches draw out of fork_head while the prefix stays put. It never loops —
  // a diagram is a still object, and motion here is only worth spending to show
  // that a fork inherits the prefix rather than copying it.
  const graph = document.querySelector('.controller-graph');
  if (graph && 'IntersectionObserver' in window) {
    const play = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-live');
        play.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -25% 0px', threshold: 0 });
    play.observe(graph);
  }

  // Google Sheet endpoint: paste the Apps Script Web App URL (ends in /exec)
  // from sheet-endpoint/README-DEPLOY.md here to activate direct-to-Sheet
  // submissions. While empty, the form falls back to the mailto behaviour.
  const SHEET_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyErIGjOHyNWMHFd-P7gBBc86H_ja2k6JRU7qX4_9sXpnW50KBB2_RhBGByTfakMnEz/exec';

  const form = document.querySelector('[data-partner-form]');
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    // Honeypot: only a naive bot fills a field parked off-screen. Bail
    // silently so it learns nothing about why nothing happened.
    if (String(data.get('website') || '')) { form.reset(); return; }

    const note = String(data.get('note') || '');
    const reason = String(data.get('reason') || '');
    const fields = {
      name: String(data.get('name') || ''),
      email: String(data.get('email') || ''),
      reason,
      note,
      sender: String(data.get('sender') || 'a human'),
      // Legacy keys so the existing Sheet columns keep filling until they are
      // renamed: capability held the free text, placement held the routing.
      company: '',
      capability: note,
      placement: reason,
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

    const subject = `Lloyal — ${fields.reason || 'get in touch'}`;
    const body = [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Reason: ${fields.reason}`,
      `Sent by: ${fields.sender}`,
      '',
      fields.note,
    ].join('\n');
    window.location.href = `mailto:zuhair@lloyal.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();

document.querySelectorAll('[data-copy-command]').forEach((button) => {
  button.addEventListener('click', async () => {
    const command = button.getAttribute('data-copy-command');
    try {
      await navigator.clipboard.writeText(command);
      const previous = button.textContent;
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = previous; }, 1600);
    } catch (_) {
      button.textContent = command;
    }
  });
});
