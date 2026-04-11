(function initStratusPageTransitions() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return;

  window.addEventListener(
    "pageshow",
    (ev) => {
      if (!ev.persisted) return;
      document.documentElement.classList.remove("stratus-exit-prep");
      document.body.classList.remove("stratus-is-leaving");
    },
    false
  );

  document.documentElement.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target.closest("a");
      if (!a || !a.href) return;
      if (a.target === "_blank" || a.getAttribute("download")) return;

      const hrefAttr = (a.getAttribute("href") || "").trim();
      if (!hrefAttr || hrefAttr === "#") return;
      if (hrefAttr.startsWith("mailto:") || hrefAttr.startsWith("tel:") || hrefAttr.startsWith("javascript:"))
        return;
      if (hrefAttr.startsWith("#") && hrefAttr.length > 1) return;

      let dest;
      try {
        dest = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return;

      const here = new URL(window.location.href);
      const samePath =
        dest.pathname === here.pathname ||
        (dest.pathname.endsWith("/index.html") && here.pathname.endsWith("/")) ||
        (here.pathname.endsWith("/index.html") && dest.pathname.endsWith("/"));
      if (samePath && dest.hash && dest.hash.length > 1) return;

      e.preventDefault();

      const html = document.documentElement;
      const body = document.body;
      html.classList.add("stratus-exit-prep");
      body.classList.remove("stratus-is-leaving");
      void body.offsetWidth;
      body.classList.add("stratus-is-leaving");

      const destination = a.href;
      const fallbackMs = 420;
      const timeoutId = window.setTimeout(() => {
        window.location.href = destination;
      }, fallbackMs);

      function onExitEnd(ev) {
        if (ev.target !== body || ev.propertyName !== "opacity") return;
        window.clearTimeout(timeoutId);
        body.removeEventListener("transitionend", onExitEnd);
        window.location.href = destination;
      }

      body.addEventListener("transitionend", onExitEnd, false);
    },
    true
  );
})();

const projectTabs = document.querySelectorAll("[data-project-tab]");
const projectImages = document.querySelectorAll(".projects-frame .project-card img");
const projectLinks = document.querySelectorAll(".projects-frame [data-project-link]");

const projectPageLinks = {
  architecture: "./architecture.html",
  construction: "./Construction.html",
};

const projectAltText = {
  architecture: [
    "Modern cubic residence at night with warm lighting",
    "Contemporary home at dusk with triangular glass gable",
    "Multi-storey modern facade with glass balconies at evening",
  ],
  construction: [
    "Construction project 1",
    "Construction project 2",
    "Construction project 3",
  ],
};

function setActiveProjectTab(category) {
  projectTabs.forEach((tab) => {
    const isActive = tab.dataset.projectTab === category;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  projectImages.forEach((img, index) => {
    const nextSrc = img.dataset[category];
    if (!nextSrc) return;
    img.src = nextSrc;
    img.alt = projectAltText[category][index] || `${category} project ${index + 1}`;
  });

  projectLinks.forEach((link) => {
    link.href = projectPageLinks[category] || "./architecture.html";
  });
}

projectTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveProjectTab(tab.dataset.projectTab);
  });
});

const gallaryImages = document.querySelectorAll("[data-gallary-slot]");

const gallaryImagePool = [
  "./Public/313fc7585f39b443fe92c3760dff362f65dee332.png",
  "./Public/99cfc03b1894196bd8af33b7e2635199e3bb02eb.png",
  "./Public/about/IMG1%20(1).png",
  "./Public/IMG4.png",
];

const gallaryAltPool = [
  "Modern cafe interior with glass block partition, circular ceiling panels, and sage upholstered seating",
  "Cafe with glass block walls, exposed concrete ceiling, terracotta-textured walls, and bouclé chairs",
  "Warm-toned interior with layered materials, soft lighting, and contemporary furnishings",
  "Cafe interior with textured circular pendant lights, metal slat partition, and lush potted plants",
];

if (gallaryImages.length) {
  const gallaryCards = document.querySelectorAll(".gallary-card");

  if ("IntersectionObserver" in window && gallaryCards.length) {
    const gallaryObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.22 }
    );

    gallaryCards.forEach((card) => gallaryObserver.observe(card));
  } else {
    gallaryCards.forEach((card) => card.classList.add("is-inview"));
  }

  gallaryImages.forEach((img, slotIndex) => {
    const src = gallaryImagePool[slotIndex % gallaryImagePool.length];
    img.src = src;
    img.alt = gallaryAltPool[slotIndex % gallaryAltPool.length] || `Gallery image ${slotIndex + 1}`;
  });

  let gallaryStep = 0;
  let gallaryTimer = null;

  const gallarySection = document.querySelector(".gallary-section");
  function gallaryLikelyInView(el) {
    if (!el) return true;
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight + 120 && r.bottom > -120;
  }
  let gallarySectionVisible = gallaryLikelyInView(gallarySection);

  function gallaryTick() {
    gallaryStep += 1;
    gallaryImages.forEach((img, slotIndex) => {
      img.classList.remove("is-sliding-in");
      img.classList.add("is-sliding-out");
      const nextIndex = (slotIndex + gallaryStep) % gallaryImagePool.length;
      setTimeout(() => {
        img.classList.remove("is-sliding-out");
        img.classList.add("is-sliding-in");
        img.src = gallaryImagePool[nextIndex];
        img.alt = gallaryAltPool[nextIndex] || `Gallery image ${nextIndex + 1}`;
        requestAnimationFrame(() => {
          img.classList.remove("is-sliding-in");
        });
      }, 220);
    });
  }

  function startGallaryRotation() {
    if (gallaryTimer || !gallarySectionVisible || document.visibilityState === "hidden") return;
    gallaryTimer = setInterval(gallaryTick, 2600);
  }

  function stopGallaryRotation() {
    if (!gallaryTimer) return;
    clearInterval(gallaryTimer);
    gallaryTimer = null;
  }

  function syncGallaryRotation() {
    if (gallarySectionVisible && document.visibilityState === "visible") {
      startGallaryRotation();
    } else {
      stopGallaryRotation();
    }
  }

  document.addEventListener("visibilitychange", () => {
    syncGallaryRotation();
  });

  if (gallarySection && "IntersectionObserver" in window) {
    const rotObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          gallarySectionVisible = entry.isIntersecting;
          syncGallaryRotation();
        });
      },
      { root: null, rootMargin: "80px 0px", threshold: 0 }
    );
    rotObserver.observe(gallarySection);
  }

  syncGallaryRotation();
}

const galleryCategoryRoot = document.querySelector("[data-gallery-categories]");
if (galleryCategoryRoot) {
  const tabs = galleryCategoryRoot.querySelectorAll("[data-gallery-tab]");
  const panels = galleryCategoryRoot.querySelectorAll("[data-gallery-panel]");

  function activateGalleryCategory(category) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.galleryTab === category;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    panels.forEach((panel) => {
      const match = panel.dataset.galleryPanel === category;
      panel.hidden = !match;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activateGalleryCategory(tab.dataset.galleryTab);
    });
  });
}

// Projects that Inspire — six projects rotate two at a time: main (left) + next (right) only
const latestWorksSubtitleVariants = [
  "A curated selection of projects that reflect our design thinking and execution.",
  "Commercial and hospitality interiors shaped by light, texture, and material craft.",
  "Spaces where architecture, interiors, and daily use meet with clarity.",
];

const latestWorksProjects = [
  {
    src: "./Public/about/our_ongoing.jpg",
    alt: "Brutalist waterside building at dusk with warm interior light and reflective plaza",
    label: "Coastal Retreat ©2019",
    meta: ["15 Rue des Rosiers, Le Marais", "Paris, France", "LH-103"],
  },
  {
    src: "./Public/about/on_going.jpg",
    alt: "Contemporary interior lounge with concrete walls, patterned tile, and staircase",
    label: "Chic Apartment ©2019",
    meta: ["789 Broadway, SoHo", "new york, usa", "LH-001"],
  },
  {
    src: "./Public/about/vk.png",
    alt: "Modern cafe with bar seating, brick wall, patterned tile, and palm views",
    label: "CAFE GREY",
    meta: ["15 Rue des Rosiers, Le Marais", "Paris, France", "LH-103"],
  },
  {
    src: "./Public/about/Avk.png",
    alt: "Bright cafe and workspace with varied seating and warm accent lighting",
    label: "DONGLE DESK",
    meta: ["789 Broadway, Soho", "new york, usa", "LH-001"],
  },
  {
    src: "./Public/about/cafe_grey.png",
    alt: "Industrial chic cafe with wood tables, Edison bulbs, and red brick bar wall",
    label: "CAFE GREY",
    meta: ["15 Rue des Rosiers, Le Marais", "Paris, France", "LH-103"],
  },
  {
    src: "./Public/about/Dongle.png",
    alt: "Collaborative workspace and dining interior with refined detailing",
    label: "DONGLE DESK",
    meta: ["789 Broadway, SoHo", "new york, usa", "LH-001"],
  },
];

const latestRoot = document.querySelector("[data-latest-works]");
const LATEST_FADE_MS = 360;

function whenLatestImageReady(img) {
  if (!img) return Promise.resolve();
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

if (latestRoot) {
  const prevBtn = latestRoot.querySelector("[data-latest-prev]");
  const nextBtn = latestRoot.querySelector("[data-latest-next]");
  const progressEl = latestRoot.querySelector("[data-latest-progress]");
  const subtitleEl = latestRoot.querySelector("[data-latest-subtitle]");

  const leftImg = latestRoot.querySelector('[data-latest-img="left"]');
  const rightImg = latestRoot.querySelector('[data-latest-img="right"]');
  const leftLabel = latestRoot.querySelector('[data-latest-label="left"]');
  const rightLabel = latestRoot.querySelector('[data-latest-label="right"]');
  const leftMeta = latestRoot.querySelector('[data-latest-meta="left"]');
  const rightMeta = latestRoot.querySelector('[data-latest-meta="right"]');

  const projectCount = latestWorksProjects.length;
  let frameIndex = 0;
  let animating = false;

  function setMeta(container, values) {
    if (!container) return;
    const spans = container.querySelectorAll("span");
    spans.forEach((span, idx) => {
      span.textContent = values[idx] || "";
    });
  }

  function subtitleForFrame(i) {
    const idx = Math.min(Math.floor(i / 2), latestWorksSubtitleVariants.length - 1);
    return latestWorksSubtitleVariants[idx];
  }

  function updateProgress(i) {
    if (!progressEl) return;
    const n = projectCount || 1;
    const stepPct = 100 / n;
    progressEl.style.width = `${stepPct}%`;
    progressEl.style.transform = `translateX(${i * 100}%)`;
  }

  function applyFrame(i) {
    const main = latestWorksProjects[i % projectCount];
    const next = latestWorksProjects[(i + 1) % projectCount];

    if (subtitleEl) subtitleEl.textContent = subtitleForFrame(i);

    if (leftImg) {
      leftImg.src = main.src;
      leftImg.alt = main.alt;
    }
    if (rightImg) {
      rightImg.src = next.src;
      rightImg.alt = next.alt;
    }

    if (leftLabel) leftLabel.textContent = main.label;
    if (rightLabel) rightLabel.textContent = next.label;

    setMeta(leftMeta, main.meta);
    setMeta(rightMeta, next.meta);
    updateProgress(i);
  }

  async function setFrame(index, { animate = true } = {}) {
    if (!projectCount) return;

    const leftMedia = leftImg?.closest(".architecture-latest-media");
    const rightMedia = rightImg?.closest(".architecture-latest-media");

    if (!animate) {
      applyFrame(index);
      await Promise.all([whenLatestImageReady(leftImg), whenLatestImageReady(rightImg)]);
      return;
    }

    leftMedia?.classList.add("is-latest-fading");
    rightMedia?.classList.add("is-latest-fading");

    await new Promise((r) => setTimeout(r, LATEST_FADE_MS));

    applyFrame(index);

    await Promise.all([whenLatestImageReady(leftImg), whenLatestImageReady(rightImg)]);

    requestAnimationFrame(() => {
      leftMedia?.classList.remove("is-latest-fading");
      rightMedia?.classList.remove("is-latest-fading");
    });
  }

  async function goTo(delta) {
    if (animating || projectCount === 0) return;
    animating = true;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    frameIndex = (frameIndex + delta + projectCount) % projectCount;
    try {
      await setFrame(frameIndex, { animate: true });
    } finally {
      animating = false;
      if (prevBtn) prevBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;
    }
  }

  if (nextBtn) nextBtn.addEventListener("click", () => goTo(1));
  if (prevBtn) prevBtn.addEventListener("click", () => goTo(-1));

  setFrame(0, { animate: false });
}

/* Mobile navbar: hamburger drawer */
(function initMobileNav() {
  const mq = window.matchMedia("(max-width: 768px)");

  function syncNavbar(nav) {
    const toggle = nav.querySelector(".nav-toggle");
    const panel = nav.querySelector(".nav-right");
    const backdrop = nav.querySelector(".nav-backdrop");
    if (!toggle || !panel || !backdrop) return;

    const mobile = mq.matches;
    const open = nav.classList.contains("is-open");

    if (!mobile) {
      nav.classList.remove("is-open");
      panel.removeAttribute("inert");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      return;
    }

    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      panel.removeAttribute("inert");
    } else {
      panel.setAttribute("inert", "");
    }
  }

  function setBodyScrollLock(open) {
    document.body.classList.toggle("nav-menu-open", open && mq.matches);
  }

  document.querySelectorAll(".navbar").forEach((nav) => {
    const toggle = nav.querySelector(".nav-toggle");
    const panel = nav.querySelector(".nav-right");
    const backdrop = nav.querySelector(".nav-backdrop");
    if (!toggle || !panel || !backdrop) return;

    function applyState() {
      syncNavbar(nav);
      setBodyScrollLock(nav.classList.contains("is-open"));
    }

    toggle.addEventListener("click", () => {
      if (!mq.matches) return;
      nav.classList.toggle("is-open");
      applyState();
    });

    backdrop.addEventListener("click", () => {
      if (!mq.matches || !nav.classList.contains("is-open")) return;
      nav.classList.remove("is-open");
      applyState();
    });

    panel.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mq.matches) {
          nav.classList.remove("is-open");
          applyState();
        }
      });
    });

    const cta = panel.querySelector(".btn-primary");
    if (cta) {
      cta.addEventListener("click", () => {
        if (mq.matches) {
          nav.classList.remove("is-open");
          applyState();
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!mq.matches || !nav.classList.contains("is-open")) return;
      nav.classList.remove("is-open");
      applyState();
      toggle.focus();
    });

    mq.addEventListener("change", () => {
      if (!mq.matches) {
        nav.classList.remove("is-open");
      }
      applyState();
    });

    applyState();
  });
})();

(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("contact-form-status");
  const mail = "studio@stratus.example";

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const topic = String(fd.get("topic") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const topicLabel = (() => {
      const sel = form.querySelector("#contact-topic");
      if (!sel || !sel.selectedOptions.length) return topic;
      return sel.selectedOptions[0].textContent || topic;
    })();

    const subject = encodeURIComponent(`Stratus enquiry: ${topicLabel}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nInterest: ${topicLabel}\n\n${message}`
    );

    window.location.href = `mailto:${mail}?subject=${subject}&body=${body}`;

    if (status) {
      status.textContent =
        "If your email app did not open, send the same details to " + mail + ".";
    }
  });
})();
