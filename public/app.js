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

  // One carousel component owns selection, controls, focus and motion. Content
  // supplies only lifecycle hooks; widths and controls share the same CSS grid.
  const createCarousel = (root, { activate = () => {}, deactivate = () => {} } = {}) => {
    const slides = [...root.querySelectorAll('[data-carousel-slide]')];
    const selectors = [...root.querySelectorAll('[data-carousel-select]')];
    const previous = root.querySelector('[data-carousel-prev]');
    const next = root.querySelector('[data-carousel-next]');
    const status = root.querySelector('[data-carousel-status]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let selected = 0;
    let animation = null;

    const show = (index, initial = false) => {
      const destination = (index + slides.length) % slides.length;
      if (!initial && destination === selected) return;
      const direction = Math.sign(index - selected) || 1;
      animation?.cancel();
      if (!initial) deactivate(slides[selected]);
      selected = destination;
      slides.forEach((slide, i) => {
        slide.hidden = i !== selected;
        slide.inert = i !== selected;
      });
      selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
      root.querySelector('[data-carousel-count]').textContent = `${String(selected + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      const slide = slides[selected];
      activate(slide);
      if (!initial) {
        status.textContent = `${slide.dataset.carouselLabel}, ${selected + 1} of ${slides.length}`;
        if (!reducedMotion.matches && typeof slide.animate === 'function') {
          animation = slide.animate([
            { transform: `translateX(${direction * 64}px)`, opacity: 0 },
            { transform: 'translateX(0)', opacity: 1 },
          ], { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' });
        }
      }
    };

    previous.addEventListener('click', () => show(selected - 1));
    next.addEventListener('click', () => show(selected + 1));
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
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) animation?.cancel();
    });
    show(0, true);
    root.classList.add('is-ready');
    previous.hidden = false;
    next.hidden = false;
    root.querySelector('[data-carousel-controls]').hidden = false;
  };

  // Quote expansion belongs to the content, independently of carousel paging.
  const quotes = document.querySelector('[data-quote-carousel]');
  if (quotes) {
    const setExpanded = (slide, expanded) => {
      slide.querySelector('[data-quote-excerpt]').hidden = expanded;
      slide.querySelector('[data-quote-full]').hidden = !expanded;
      const button = slide.querySelector('[data-quote-expand]');
      button.setAttribute('aria-expanded', String(expanded));
      button.firstChild.textContent = expanded ? 'Show less ' : 'See more ';
      button.querySelector('[aria-hidden]').textContent = expanded ? '↑' : '↓';
    };
    quotes.querySelectorAll('[data-carousel-slide]').forEach((slide) => {
      const button = slide.querySelector('[data-quote-expand]');
      if (!button) return;
      setExpanded(slide, false);
      button.hidden = false;
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        setExpanded(slide, !expanded);
        if (expanded && slide.getBoundingClientRect().top < 0) {
          slide.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      });
    });
    createCarousel(quotes, {
      deactivate: (slide) => {
        // Reopen departing quotes at their excerpt. Reposition only when
        // collapsing a long article would leave the reader below the carousel.
        const expanded = slide.querySelector('[data-quote-expand]')?.getAttribute('aria-expanded') === 'true';
        if (!expanded) return;
        setExpanded(slide, false);
        if (quotes.getBoundingClientRect().top < 0) {
          quotes.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      },
    });
  }

  // A video owns its native player, loading lazily and stopping on departure.
  const videos = document.querySelector('[data-video-carousel]');
  if (videos) createCarousel(videos, {
    deactivate: (slide) => {
      slide.querySelector('iframe')?.remove();
      slide.querySelector('[data-video-id]').hidden = false;
    },
    activate: (slide) => {
      const fallback = slide.querySelector('[data-video-id]');
      const player = document.createElement('iframe');
      player.title = slide.dataset.carouselLabel;
      player.src = `https://www.youtube-nocookie.com/embed/${fallback.dataset.videoId}?playsinline=1&rel=0`;
      player.loading = 'lazy';
      player.allow = 'encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      fallback.hidden = true;
      slide.querySelector('.video-stage').append(player);
    },
  });

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
