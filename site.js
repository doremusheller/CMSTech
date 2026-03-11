document.addEventListener("DOMContentLoaded", function () {

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
