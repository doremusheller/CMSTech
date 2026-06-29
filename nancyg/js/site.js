/**
 * Gibbs Law Office
 * site.js
 */

document.addEventListener("DOMContentLoaded", () => {

    //
    // -------------------------------------------------
    // Current Year
    // -------------------------------------------------
    //
    const year = document.getElementById("year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    //
    // -------------------------------------------------
    // Sticky Header
    // -------------------------------------------------
    //
    const header = document.querySelector(".site-header");

    function updateHeader() {
        if (window.scrollY > 30) {
            header.classList.add("is-scrolled");
        } else {
            header.classList.remove("is-scrolled");
        }
    }

    updateHeader();
    window.addEventListener("scroll", updateHeader);

    //
    // -------------------------------------------------
    // Active Navigation Highlight
    // -------------------------------------------------
    //
    const navLinks = document.querySelectorAll(".nav-link");

    const sections = document.querySelectorAll("section[id]");

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            const id = entry.target.getAttribute("id");

            navLinks.forEach(link => {

                link.classList.remove("active");

                if (link.getAttribute("href") === "#" + id) {
                    link.classList.add("active");
                }

            });

        });

    }, {

        threshold: 0.45

    });

    sections.forEach(section => observer.observe(section));

    //
    // -------------------------------------------------
    // Fade-In Animation
    // -------------------------------------------------
    //
    const animated = document.querySelectorAll(

        ".practice-card, .resource-card, .trust-item, .guidance-copy"

    );

    animated.forEach(el => {

        el.setAttribute("data-animate", "");

    });

    const reveal = new IntersectionObserver((entries) => {

        entries.forEach(entry => {

            if (!entry.isIntersecting) return;

            entry.target.classList.add("is-visible");

            reveal.unobserve(entry.target);

        });

    }, {

        threshold: 0.18

    });

    animated.forEach(el => reveal.observe(el));

    //
    // -------------------------------------------------
    // Hero Parallax (Desktop Only)
    // -------------------------------------------------
    //
    const heroImage = document.querySelector(".hero-image-card img");

    function parallax() {

        if (!heroImage) return;

        if (window.innerWidth < 992) {

            heroImage.style.transform = "";

            return;

        }

        const offset = window.scrollY * 0.18;

        heroImage.style.transform = `translateY(${offset}px) scale(1.04)`;

    }

    window.addEventListener("scroll", parallax);

    parallax();

    //
    // -------------------------------------------------
    // Smooth Scroll
    // -------------------------------------------------
    //
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {

        anchor.addEventListener("click", function (e) {

            const target = document.querySelector(this.getAttribute("href"));

            if (!target) return;

            e.preventDefault();

            const top =
                target.getBoundingClientRect().top +
                window.pageYOffset -
                80;

            window.scrollTo({

                top,

                behavior: "smooth"

            });

            const menu = document.querySelector(".navbar-collapse");

            if (menu.classList.contains("show")) {

                bootstrap.Collapse.getInstance(menu).hide();

            }

        });

    });

    //
    // -------------------------------------------------
    // Card Hover Elevation
    // -------------------------------------------------
    //
    const cards = document.querySelectorAll(".practice-card");

    cards.forEach(card => {

        card.addEventListener("mouseenter", () => {

            card.style.transform = "translateY(-8px)";

        });

        card.addEventListener("mouseleave", () => {

            card.style.transform = "";

        });

    });

    //
    // -------------------------------------------------
    // Boardwalk Slow Zoom
    // -------------------------------------------------
    //
    const boardwalk = document.querySelector(".guidance-img");

    if (boardwalk) {

        boardwalk.animate(

            [

                {
                    transform: "scale(1)"
                },

                {
                    transform: "scale(1.08)"
                }

            ],

            {

                duration: 28000,

                iterations: Infinity,

                direction: "alternate",

                easing: "ease-in-out"

            }

        );

    }

    //
    // -------------------------------------------------
    // Hero Button Pulse
    // -------------------------------------------------
    //
    const primaryButton = document.querySelector(".btn-navy");

    if (primaryButton) {

        setInterval(() => {

            primaryButton.classList.add("pulse");

            setTimeout(() => {

                primaryButton.classList.remove("pulse");

            }, 1200);

        }, 9000);

    }

});
