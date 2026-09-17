"use strict";

(() => {
  const paths = [
    /* Mobile */
    `
      <rect x="6" y="2" width="12" height="20" rx="3"/>
      <path d="M10 5h4M11 19h2"/>
    `,

    /* Web */
    `
      <rect x="2" y="3" width="20" height="17" rx="3"/>
      <path d="M2 8h20M6 5.5h.01M9 5.5h.01"/>
      <path d="m9 12-3 2.5L9 17m6-5 3 2.5-3 2.5"/>
    `,

    /* Security */
    `
      <path d="m12 2-8.5 3.5v5.7c0 5.2 3.5 8.8 8.5 11
        5-2.2 8.5-5.8 8.5-11V5.5L12 2Z"/>
      <path d="m8 12 2.6 2.6L16 9"/>
    `,

    /* Social */
    `
      <path d="m3 10 11-4v12L3 14v-4Z"/>
      <path d="m14 6 4-3v18l-4-3M5 15l2 6h3l-2-5M21 8v8"/>
    `,

    /* 3D */
    `
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/>
      <path d="m3 7 9 5 9-5M12 12v10M7.5 4.5l9 5"/>
    `,

    /* AI */
    `
      <rect x="6" y="6" width="12" height="12" rx="3"/>
      <path d="M9 2v4m6-4v4M9 18v4m6-4v4
        M2 9h4m-4 6h4m12-6h4m-4 6h4"/>
      <path d="m10 14 2-4 2 4m-3-1h2"/>
    `
  ];

  const tags = [
    ["iOS & Android", "App experiences"],
    ["Websites", "Web applications"],
    ["Assessments", "Secure systems"],
    ["Content", "Campaigns"],
    ["Product models", "Visualisation"],
    ["Assistants", "Automation"]
  ];

  function icon(index) {
    return `
      <svg
        class="service-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        ${paths[index]}
      </svg>
    `;
  }

  document.querySelectorAll(".tab-icon").forEach(
    (element, index) => {
      element.innerHTML = icon(index);
    }
  );

  document.querySelectorAll(".card-icon").forEach(
    (element, index) => {
      element.innerHTML = icon(index);
    }
  );

  document.querySelectorAll(".service-card").forEach(
    (card, index) => {
      const labels = document.createElement("div");
      labels.className = "card-tags";

      tags[index].forEach((value) => {
        const label = document.createElement("span");
        label.textContent = value;
        labels.append(label);
      });

      card.insertBefore(
        labels,
        card.querySelector(".card-link")
      );
    }
  );

  document.querySelector(".hero h1").innerHTML =
    'Built for<br><span>what’s next.</span>';

  document.querySelector(".hero > .eyebrow").textContent =
    "DIGITAL PRODUCTS · CREATIVE TECHNOLOGY";

  document.querySelector(".showcase-toolbar > span").textContent =
    "EXPLORE OUR CAPABILITIES";

  /* Arrow keys for the two-row service selector. */
  const tabs = document.querySelector("#service-tabs");
  tabs.setAttribute("aria-orientation", "horizontal");

  const buttons = [...tabs.children];

  buttons.forEach((button, index) => {
    button.addEventListener("keydown", (event) => {
      if (
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }

      event.preventDefault();

      const direction = event.key === "ArrowDown" ? 3 : -3;

      const next =
        (index + direction + buttons.length) % buttons.length;

      buttons[next].click();
      buttons[next].focus();
    });
  });

  const preference = matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  /* Animate the service copy after a selection changes. */
  const title = document.querySelector("#service-title");

  const copy = [
    title,
    document.querySelector("#service-description"),
    document.querySelector("#service-link")
  ];

  new MutationObserver(() => {
    copy.forEach((element, index) => {
      element.getAnimations().forEach(
        (animation) => animation.cancel()
      );

      if (preference.matches) return;

      element.animate(
        [
          {
            opacity: 0,
            transform: "translateY(9px)"
          },
          {
            opacity: 1,
            transform: "translateY(0)"
          }
        ],
        {
          duration: 360,
          delay: index * 35,
          easing: "cubic-bezier(.2,.8,.2,1)",
          fill: "backwards"
        }
      );
    });
  }).observe(title, { childList: true });

  /* One-time section entrances. */
  const revealElements = [
    ...document.querySelectorAll(
      ".section-heading, .service-card, " +
      ".approach-layout > div, .steps li, .contact > h2"
    )
  ];

  if (
    "IntersectionObserver" in window &&
    !preference.matches
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealElements.forEach((element) => {
      element.classList.add("reveal-ready");
      observer.observe(element);
    });

    preference.addEventListener("change", (event) => {
      if (!event.matches) return;

      revealElements.forEach((element) => {
        element.classList.add("is-visible");
      });

      observer.disconnect();
    });
  }
})();