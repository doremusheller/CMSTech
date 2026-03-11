document.addEventListener("DOMContentLoaded", function () {

  function setActiveNav(navRoot) {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = navRoot.querySelectorAll(".primary-nav a");
    const nav = navRoot.querySelector(".primary-nav");
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
        setActiveNav(navContainer);
      })
      .catch(error => {
        console.error("Error loading navigation:", error);
      });
  }

  /* ------------------------------
     Load Footer
  ------------------------------ */

  const footerContainer = document.getElementById("footer-placeholder");

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
