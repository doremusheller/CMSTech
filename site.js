document.addEventListener("DOMContentLoaded", function () {

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

});
