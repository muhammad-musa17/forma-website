"use strict";

/* Add your real business email before publishing. */
const BUSINESS_EMAIL = "";

const services = [
  {
    name: "Mobile development",
    short: "Mobile apps",
    icon: "▯",
    title: "Small screen.<br>Big possibilities.",
    description:
      "Intuitive mobile apps that turn everyday interactions into experiences worth coming back to.",
    detail:
      "iOS and Android experiences, from your first prototype to a polished, connected product.",
    link: "Let’s build your app ↗",
    caption: "MOBILE APP CONCEPT"
  },
  {
    name: "Web development",
    short: "Web development",
    icon: "⌘",
    title: "Your vision.<br>On every screen.",
    description:
      "Fast, responsive websites and web applications that make your business easier to discover and use.",
    detail:
      "Business websites, ecommerce and custom web applications built around your customers.",
    link: "Let’s build your website ↗",
    caption: "WEB APPLICATION CONCEPT"
  },
  {
    name: "Cybersecurity",
    short: "Cybersecurity",
    icon: "◇",
    title: "Build confidence.<br>Protect what matters.",
    description:
      "Find weaknesses, strengthen your systems and put security at the heart of your digital business.",
    detail:
      "Security reviews, authorised vulnerability assessments and practical hardening guidance.",
    link: "Let’s discuss your security ↗",
    caption: "SECURITY / LAYERED DEFENCE"
  },
  {
    name: "Social media marketing",
    short: "Social media",
    icon: "↗",
    title: "Start conversations.<br>Build connections.",
    description:
      "Thoughtful content and campaigns that help the right people discover, remember and connect with your brand.",
    detail:
      "Social strategy, creative content and campaign management with meaningful measurement.",
    link: "Let’s grow your presence ↗",
    caption: "SOCIAL / CONNECTED CAMPAIGNS"
  },
  {
    name: "3D modelling",
    short: "3D modelling",
    icon: "⬡",
    title: "Another dimension.<br>Of possibility.",
    description:
      "Bring products, spaces and ideas into focus with carefully crafted 3D models and visual experiences.",
    detail:
      "Product models, visualisations and digital assets that turn an idea into something you can see.",
    link: "Let’s shape your idea ↗",
    caption: "3D STUDY / ORBITAL FORM"
  },
  {
    name: "AI integration",
    short: "AI integration",
    icon: "✳",
    title: "Less repetitive.<br>More remarkable.",
    description:
      "Connect useful AI to the tools and workflows you already rely on, with people in control.",
    detail:
      "AI assistants, workflow automation and intelligent features tailored to a clear business need.",
    link: "Let’s explore your workflow ↗",
    caption: "AI / CONNECTED INTELLIGENCE"
  }
];

const tabs = document.querySelector("#service-tabs");
const grid = document.querySelector("#service-grid");
const panel = document.querySelector("#service-panel");
const motionButton = document.querySelector("#motion-toggle");

let activeService = 0;

function selectService(index) {
  activeService = index;

  const service = services[index];

  document.querySelector("#service-number").textContent =
    `${String(index + 1).padStart(2, "0")} / 06`;

  document.querySelector("#service-title").innerHTML =
    service.title;

  document.querySelector("#service-description").textContent =
    service.description;

  document.querySelector("#service-link").textContent =
    service.link;

  document.querySelector("#visual-caption").textContent =
    service.caption;

  document.querySelector("#service-canvas").setAttribute(
    "aria-label",
    `Animated three-dimensional concept for ${service.name}`
  );

  panel.setAttribute(
    "aria-labelledby",
    `service-tab-${index}`
  );

  [...tabs.children].forEach((button, buttonIndex) => {
    const selected = buttonIndex === index;

    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  window.studioScene.setService(index);
}

services.forEach((service, index) => {
  /* Create a service tab. */
  const tab = document.createElement("button");

  tab.type = "button";
  tab.id = `service-tab-${index}`;
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-controls", "service-panel");

  tab.innerHTML = `
    <span class="tab-icon" aria-hidden="true">
      ${service.icon}
    </span>
    ${service.short}
  `;

  tab.addEventListener("click", () => {
    selectService(index);
  });

  tab.addEventListener("keydown", (event) => {
    let nextIndex = index;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % services.length;
        break;

      case "ArrowLeft":
        nextIndex =
          (index - 1 + services.length) % services.length;
        break;

      case "Home":
        nextIndex = 0;
        break;

      case "End":
        nextIndex = services.length - 1;
        break;

      default:
        return;
    }

    event.preventDefault();

    selectService(nextIndex);
    tabs.children[nextIndex].focus();
  });

  tabs.appendChild(tab);

  /* Create the corresponding service card. */
  const card = document.createElement("article");
  card.className = "service-card";

  card.innerHTML = `
    <div class="card-top">
      <span class="card-icon" aria-hidden="true">
        ${service.icon}
      </span>

      <span class="card-number">
        ${String(index + 1).padStart(2, "0")}
      </span>
    </div>

    <h3>${service.name}</h3>

    <p>${service.detail}</p>

    <button class="card-link" type="button">
      Explore ${service.short.toLowerCase()} ↗
    </button>
  `;

  card.querySelector("button").addEventListener("click", () => {
    selectService(index);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    document.querySelector("#services").scrollIntoView({
      behavior: reduceMotion ? "instant" : "smooth"
    });

    tabs.children[index].focus({ preventScroll: true });
  });

  grid.appendChild(card);
});

function updateMotionButton() {
  const paused = window.studioScene.isPaused();

  motionButton.textContent = paused
    ? "Play motion ▷"
    : "Pause motion Ⅱ";

  motionButton.setAttribute("aria-pressed", String(paused));
}

motionButton.addEventListener("click", () => {
  window.studioScene.toggleMotion();
  updateMotionButton();
});

window.addEventListener("studio-motion-change", updateMotionButton);

document.querySelector("#contact-button").addEventListener(
  "click",
  () => {
    const status = document.querySelector("#contact-status");

    if (!BUSINESS_EMAIL.trim()) {
      status.textContent =
        "Contact details are coming soon. Please check back shortly.";
      return;
    }

    const subject =
      `Project enquiry — ${services[activeService].name}`;

    const body = [
      "Hello Forma Studio,",
      "",
      `I’m interested in ${services[activeService].name.toLowerCase()}.`,
      "",
      "My name:",
      "About my project:",
      "Preferred timeline:",
      "",
      "Thank you."
    ].join("\n");

    window.location.href =
      `mailto:${BUSINESS_EMAIL.trim()}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    status.textContent =
      `Email us at ${BUSINESS_EMAIL.trim()} if your email app did not open.`;
  }
);

document.querySelector("#year").textContent =
  new Date().getFullYear();

selectService(0);
updateMotionButton();