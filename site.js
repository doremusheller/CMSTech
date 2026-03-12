document.addEventListener("DOMContentLoaded", function () {

  function initializeNavigation(navRoot) {

    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    const nav = navRoot.querySelector(".primary-nav");
    const navLinks = navRoot.querySelectorAll(".primary-nav a");
    const underline = navRoot.querySelector(".nav-underline");

    let activeLink = null;

    navLinks.forEach(link => {

      const linkPage = link.getAttribute("href");

      link.classList.remove("active");
      link.removeAttribute("aria-current");

      if (linkPage === currentPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
        activeLink = link;
      }

    });

    if (nav && underline && activeLink) {

      const positionUnderline = () => {

        const navRect = nav.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        underline.style.left = `${linkRect.left - navRect.left}px`;
        underline.style.width = `${linkRect.width}px`;

        nav.classList.add("ready");

      };

      positionUnderline();

      window.addEventListener("resize", positionUnderline);

    }

    /* ------------------------------
       Mobile menu system
    ------------------------------ */

    const toggle = navRoot.querySelector(".menu-toggle");
    const mobileNav = navRoot.querySelector(".mobile-nav");

    if (!toggle || !mobileNav) return;

    /* create backdrop */

    const backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);

    function openMenu() {

      mobileNav.classList.add("open");
      toggle.classList.add("open");
      backdrop.classList.add("visible");

      toggle.setAttribute("aria-expanded", "true");

      document.body.style.overflow = "hidden";

    }

    function closeMenu() {

      mobileNav.classList.remove("open");
      toggle.classList.remove("open");
      backdrop.classList.remove("visible");

      toggle.setAttribute("aria-expanded", "false");

      document.body.style.overflow = "";

    }

    toggle.addEventListener("click", () => {

      if (mobileNav.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }

    });

    /* close on link click */

    mobileNav.querySelectorAll("a").forEach(link => {

      link.addEventListener("click", closeMenu);

    });

    /* close on backdrop click */

    backdrop.addEventListener("click", closeMenu);

    /* close on ESC */

    document.addEventListener("keydown", function (e) {

      if (e.key === "Escape") closeMenu();

    });

    /* close if resized to desktop */

    window.addEventListener("resize", () => {

      if (window.innerWidth > 980) {
        closeMenu();
      }

    });

  }

  /* ------------------------------
     Load Navigation
  ------------------------------ */

  const navContainer = document.getElementById("nav-placeholder");

  if (navContainer) {

    fetch("nav.html")
      .then(response => {

        if (!response.ok) {
          throw new Error("Navigation failed to load.");
        }

        return response.text();

      })
      .then(data => {

        navContainer.innerHTML = data;

        initializeNavigation(navContainer);

      })
      .catch(error => {

        console.error("Error loading navigation:", error);

      });

  }

  /* ------------------------------
     Load Footer
  ------------------------------ */

  const footerContainer =
    document.getElementById("footer-placeholder");

  if (footerContainer) {

    fetch("footer.html")
      .then(response => {

        if (!response.ok) {
          throw new Error("Footer failed to load.");
        }

        return response.text();

      })
      .then(data => {

        footerContainer.innerHTML = data;

      })
      .catch(error => {

        console.error("Error loading footer:", error);

      });

  }

});
