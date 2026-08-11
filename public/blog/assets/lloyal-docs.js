/* Lloyal Labs — dispatch page behaviour.
   Interaction reveals structure; nothing here animates for its own sake (§10). */
(function () {
  'use strict';

  /* --- Table of contents: mark the section currently being read (§6.2) --- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.rail__link'));
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    var sections = [];
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      byId[id] = link;
      sections.push(section);
    });

    var visible = {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      var current = null;
      sections.forEach(function (section) {
        if (visible[section.id] && !current) current = section.id;
      });
      if (!current) {
        // Between headings: the last one scrolled past is the section we are in.
        sections.forEach(function (section) {
          if (section.getBoundingClientRect().top < 120) current = section.id;
        });
      }
      links.forEach(function (link) { link.classList.remove('is-active'); });
      if (current && byId[current]) byId[current].classList.add('is-active');
    }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* --- Back to top: appears once the masthead is out of the way (§10) --- */
  var totop = document.querySelector('.totop');
  if (totop) {
    var toggle = function () {
      totop.classList.toggle('is-visible', window.scrollY > 600);
    };
    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
  }

  /* --- Expandable plates: a dense figure opens to fill the viewport (§8.4) ---
         The plate is moved into the overlay rather than cloned: inline SVG keeps
         its ids (filters, gradients, markers) unique, and any running animation
         carries straight through. A placeholder holds its slot until it returns.
         Closes on the backdrop, the control, or Escape. */
  var plates = document.querySelectorAll('.figure--wide');
  if (plates.length) {
    var ZOOM_IN = '<svg viewBox="0 0 20 20" aria-hidden="true">' +
      '<circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.6 12.6 17.5 17.5M8.5 6v5M6 8.5h5"/></svg>';
    var ZOOM_OUT = '<svg viewBox="0 0 20 20" aria-hidden="true">' +
      '<path d="M4.5 4.5l11 11M15.5 4.5l-11 11"/></svg>';

    var box = null, stage = null, scroll = null, cap = null, closer = null;
    var slot = null, held = null, returnFocus = null;

    var build = function () {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.hidden = true;
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Expanded diagram');
      box.innerHTML =
        '<div class="lightbox__bar">' +
          '<span class="lightbox__hint">Click outside or press Esc to close</span>' +
          '<button type="button" class="lightbox__close" aria-label="Close expanded diagram">' + ZOOM_OUT + '</button>' +
        '</div>' +
        '<div class="lightbox__stage">' +
          '<div class="lightbox__scroll"></div>' +
          '<figcaption class="lightbox__cap"></figcaption>' +
        '</div>';
      stage = box.querySelector('.lightbox__stage');
      scroll = box.querySelector('.lightbox__scroll');
      cap = box.querySelector('.lightbox__cap');
      closer = box.querySelector('.lightbox__close');

      closer.addEventListener('click', close);
      box.addEventListener('click', function (e) { if (!stage.contains(e.target)) close(); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { close(); return; }
        // One control in the overlay: keep Tab from walking out of it.
        if (e.key === 'Tab') { e.preventDefault(); closer.focus(); }
      });
      document.body.appendChild(box);
    };

    var open = function (figure) {
      var media = figure.querySelector('.wm-diagram, .media, img');
      if (!media || held) return;
      if (!box) build();

      box.classList.toggle('lightbox--dark', figure.classList.contains('figure--dark'));

      var caption = figure.querySelector('figcaption');
      cap.innerHTML = caption ? caption.innerHTML : '';
      cap.hidden = !caption;

      slot = document.createComment('plate');
      media.parentNode.insertBefore(slot, media);
      held = media;
      scroll.appendChild(media);

      returnFocus = document.activeElement;
      box.hidden = false;
      document.body.classList.add('is-locked');
      closer.focus();
    };

    var close = function () {
      if (!held) return;
      slot.parentNode.replaceChild(held, slot);
      held = null;
      slot = null;
      box.hidden = true;
      document.body.classList.remove('is-locked');
      if (returnFocus && returnFocus.focus) returnFocus.focus();
      returnFocus = null;
    };

    Array.prototype.forEach.call(plates, function (figure) {
      var media = figure.querySelector('.wm-diagram, .media, img');
      if (!media) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'fig-zoom';
      button.innerHTML = ZOOM_IN;
      button.setAttribute('aria-label', 'Expand diagram');
      button.addEventListener('click', function () { open(figure); });
      figure.insertBefore(button, figure.firstChild);

      media.addEventListener('click', function () { open(figure); });
    });
  }

  /* --- Terminal captures: show the still first, swap in the animation only
         once it has fully downloaded, and never under reduced motion. --- */
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animated = document.querySelectorAll('img[data-gif]');
  if (animated.length && !still) {
    Array.prototype.forEach.call(animated, function (el) {
      var gif = el.getAttribute('data-gif');
      if (!gif) return;
      var full = new Image();
      full.onload = function () { el.src = gif; };
      full.src = gif;
    });
  }
})();
