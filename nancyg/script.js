/*
    Gibbs Law Office
    script.js
*/

document.addEventListener("DOMContentLoaded", () => {

    // Current year in footer
    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

});
