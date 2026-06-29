
/* =========================================================
   Gibbs Law Office — script.js
   Complete site behavior file
   ========================================================= */

(function () {
  "use strict";

  const body = document.body;
  const header =
    document.querySelector(".site-header") ||
    document.querySelector("header");

  const nav =
    document.querySelector(".main-nav") ||
    document.querySelector(".site-nav") ||
    document.querySelector(".nav");

  const menuToggle =
    document.querySelector(".menu-toggle") ||
    document.querySelector("[data-menu-toggle]");

  const focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* =========================================================
     Header scroll state
     ========================================================= */

  function updateHeaderState() {
    if (!header) return;

    if (window.scrollY > 12) {
      header.classList.add("is-scrolled");
      body.classList.add("header-scrolled");
    } else {
      header.classList.remove("is-scrolled");
      body.classList.remove("header-scrolled");
    }
  }

  window.addEventListener("scroll", updateHeaderState, { passive: true });
  window.addEventListener("load", updateHeaderState);
  updateHeaderState();

  /* =========================================================
     Mobile navigation
     ========================================================= */

  function isMenuOpen() {
    return body.classList.contains("nav-open");
  }

  function openMenu() {
    if (!nav || !menuToggle) return;

    body.classList.add("nav-open");
    nav.classList.add("is-open");

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close menu");

    const firstFocusable = nav.querySelector(focusableSelector);
    if (firstFocusable) firstFocusable.focus();
  }

  function closeMenu() {
    if (!nav || !menuToggle) return;

    body.classList.remove("nav-open");
    nav.classList.remove("is-open");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  }

  function toggleMenu() {
    if (isMenuOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  if (menuToggle && nav) {
    menuToggle.setAttribute("aria-expanded", "false");

    if (!menuToggle.hasAttribute("aria-label")) {
      menuToggle.setAttribute("aria-label", "Open menu");
    }

    menuToggle.addEventListener("click", toggleMenu);

    nav.addEventListener("click", function (event) {
      const link = event.target.closest("a");
      if (link) closeMenu();
    });

    document.addEventListener("click", function (event) {
      if (!isMenuOpen()) return;

      const clickedInsideNav = nav.contains(event.target);
      const clickedToggle = menuToggle.contains(event.target);

      if (!clickedInsideNav && !clickedToggle) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isMenuOpen()) {
        closeMenu();
        menuToggle.focus();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Tab" || !isMenuOpen()) return;

      const focusableItems = Array.from(nav.querySelectorAll(focusableSelector));
      if (!focusableItems.length) return;

      const firstItem = focusableItems[0];
      const lastItem = focusableItems[focusableItems.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    });
  }

  /* =========================================================
     Smooth scrolling for same-page links
     ========================================================= */

  function getHeaderOffset() {
    return header ? header.offsetHeight + 14 : 14;
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute("href");
    if (!targetId || targetId === "#") return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();

    const top =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      getHeaderOffset();

    window.scrollTo({
      top,
      behavior: "smooth"
    });

    history.pushState(null, "", targetId);
  });

  /* =========================================================
     Active navigation highlighting
     ========================================================= */

  const sectionLinks = nav
    ? Array.from(nav.querySelectorAll('a[href^="#"]')).filter(function (link) {
        const id = link.getAttribute("href");
        return id && id.length > 1 && document.querySelector(id);
      })
    : [];

  const linkedSections = sectionLinks.map(function (link) {
    return document.querySelector(link.getAttribute("href"));
  });

  function updateActiveNav() {
    if (!sectionLinks.length) return;

    let activeIndex = -1;
    const offset = getHeaderOffset() + 80;

    linkedSections.forEach(function (section, index) {
      if (!section) return;

      const rect = section.getBoundingClientRect();

      if (rect.top <= offset && rect.bottom > offset) {
        activeIndex = index;
      }
    });

    sectionLinks.forEach(function (link, index) {
      if (index === activeIndex) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  window.addEventListener("load", updateActiveNav);
  updateActiveNav();

  /* =========================================================
     Reveal-on-scroll animation hooks
     ========================================================= */

  const revealSelectors = [
    ".section-header",
    ".card",
    ".practice-card",
    ".service-card",
    ".testimonial",
    ".quote-card",
    ".split-image",
    ".split-copy",
    ".about-image",
    ".about-copy",
    ".attorney-card",
    ".profile-card",
    ".contact-card",
    ".contact-info",
    ".contact-form",
    ".form-card",
    ".hero-content",
    ".hero-card",
    ".hero-panel",
    ".hero-image"
  ];

  const revealItems = document.querySelectorAll(revealSelectors.join(","));

  if ("IntersectionObserver" in window && revealItems.length) {
    revealItems.forEach(function (item) {
      item.classList.add("reveal");
    });

    const revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px"
      }
    );

    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* =========================================================
     Animated counters
     ========================================================= */

  const counters = document.querySelectorAll("[data-count]");

  function animateCounter(counter) {
    const target = Number(counter.getAttribute("data-count"));
    if (!Number.isFinite(target)) return;

    const duration = Number(counter.getAttribute("data-duration")) || 1400;
    const prefix = counter.getAttribute("data-prefix") || "";
    const suffix = counter.getAttribute("data-suffix") || "";
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);

      counter.textContent = prefix + current.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  if ("IntersectionObserver" in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.35
      }
    );

    counters.forEach(function (counter) {
      counterObserver.observe(counter);
    });
  } else {
    counters.forEach(animateCounter);
  }

  /* =========================================================
     FAQ accordion
     ========================================================= */

  const faqItems = document.querySelectorAll(".faq-item, [data-faq-item]");

  faqItems.forEach(function (item, index) {
    const button =
      item.querySelector(".faq-question") ||
      item.querySelector("[data-faq-question]") ||
      item.querySelector("button");

    const answer =
      item.querySelector(".faq-answer") ||
      item.querySelector("[data-faq-answer]");

    if (!button || !answer) return;

    const answerId =
      answer.id || "faq-answer-" + String(index + 1).padStart(2, "0");

    answer.id = answerId;
    button.setAttribute("aria-controls", answerId);
    button.setAttribute("aria-expanded", "false");
    answer.hidden = true;

    button.addEventListener("click", function () {
      const expanded = button.getAttribute("aria-expanded") === "true";

      button.setAttribute("aria-expanded", String(!expanded));
      item.classList.toggle("is-open", !expanded);
      answer.hidden = expanded;
    });
  });

  /* =========================================================
     Contact form validation
     ========================================================= */

  const forms = document.querySelectorAll("form");

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showFieldError(field, message) {
    const wrapper = field.closest(".form-field") || field.parentElement;
    if (!wrapper) return;

    wrapper.classList.add("has-error");
    field.setAttribute("aria-invalid", "true");

    let error = wrapper.querySelector(".field-error");

    if (!error) {
      error = document.createElement("div");
      error.className = "field-error";
      wrapper.appendChild(error);
    }

    const errorId =
      error.id ||
      "field-error-" + Math.random().toString(36).slice(2, 10);

    error.id = errorId;
    error.textContent = message;
    field.setAttribute("aria-describedby", errorId);
  }

  function clearFieldError(field) {
    const wrapper = field.closest(".form-field") || field.parentElement;
    if (!wrapper) return;

    wrapper.classList.remove("has-error");
    field.removeAttribute("aria-invalid");

    const error = wrapper.querySelector(".field-error");
    if (error) error.remove();

    field.removeAttribute("aria-describedby");
  }

  forms.forEach(function (form) {
    const requiredFields = form.querySelectorAll("[required]");

    requiredFields.forEach(function (field) {
      field.addEventListener("input", function () {
        clearFieldError(field);
      });

      field.addEventListener("blur", function () {
        if (!field.value.trim()) {
          showFieldError(field, "This field is required.");
        } else if (
          field.type === "email" &&
          !isValidEmail(field.value.trim())
        ) {
          showFieldError(field, "Please enter a valid email address.");
        }
      });
    });

    form.addEventListener("submit", function (event) {
      let isValid = true;

      requiredFields.forEach(function (field) {
        const value = field.value.trim();

        clearFieldError(field);

        if (!value) {
          showFieldError(field, "This field is required.");
          isValid = false;
        } else if (field.type === "email" && !isValidEmail(value)) {
          showFieldError(field, "Please enter a valid email address.");
          isValid = false;
        }
      });

      if (!isValid) {
        event.preventDefault();

        const firstError = form.querySelector("[aria-invalid='true']");
        if (firstError) firstError.focus();
      }
    });
  });

  /* =========================================================
     Lazy loading safety
     ========================================================= */

  const images = document.querySelectorAll("img");

  images.forEach(function (image) {
    if (!image.hasAttribute("loading")) {
      image.setAttribute("loading", "lazy");
    }

    if (!image.hasAttribute("decoding")) {
      image.setAttribute("decoding", "async");
    }
  });

  const heroImages = document.querySelectorAll(
    ".hero img, .page-hero img, .site-header img"
  );

  heroImages.forEach(function (image) {
    image.setAttribute("loading", "eager");
  });

  /* =========================================================
     External links
     ========================================================= */

  const externalLinks = document.querySelectorAll('a[href^="http"]');

  externalLinks.forEach(function (link) {
    try {
      const linkUrl = new URL(link.href);
      const currentUrl = new URL(window.location.href);

      if (linkUrl.hostname !== currentUrl.hostname) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    } catch (error) {
      return;
    }
  });

  /* =========================================================
     Current year
     ========================================================= */

  const yearTargets = document.querySelectorAll(
    "[data-year], .current-year"
  );

  yearTargets.forEach(function (target) {
    target.textContent = new Date().getFullYear();
  });

  /* =========================================================
     Basic reveal CSS injection
     ========================================================= */

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!prefersReducedMotion) {
    const style = document.createElement("style");
    style.textContent = `
      .reveal {
        opacity: 0;
        transform: translateY(24px);
        transition:
          opacity 600ms ease,
          transform 600ms ease;
      }

      .reveal.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      .site-header.is-scrolled {
        box-shadow: 0 8px 30px rgba(8, 21, 37, 0.12);
      }

      .field-error {
        margin-top: 6px;
        color: #9f1d20;
        font-size: 0.84rem;
        font-weight: 700;
      }

      .has-error input,
      .has-error textarea,
      .has-error select {
        border-color: #9f1d20;
        box-shadow: 0 0 0 4px rgba(159, 29, 32, 0.12);
      }
    `;
    document.head.appendChild(style);
  }
})();
