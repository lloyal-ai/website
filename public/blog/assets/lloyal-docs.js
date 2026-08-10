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

  /* --- Terminal captures: show the still first, swap in the animation only
         once it has fully downloaded, and never under reduced motion. --- */
  var animated = document.querySelectorAll('img[data-gif]');
  if (animated.length) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Array.prototype.forEach.call(animated, function (el) {
      var gif = el.getAttribute('data-gif');
      if (!gif) return;
      var full = new Image();
      full.onload = function () { el.src = gif; };
      full.src = gif;
    });
  }
})();
