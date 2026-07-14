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
      const fallbackMs = 300;
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
  atelier: "./de-atelier.html",
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
  atelier: [
    "Interior vignette with layered materials and warm daylight",
    "Residential interior with refined furnishings and soft tones",
    "Spatial detail highlighting texture, lighting, and composition",
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

/** Triple-strip infinite horizontal gallery (clone | original | clone). */
(function initGallaryInfiniteScroll() {
  const viewports = document.querySelectorAll(".gallary-scroll-viewport--infinite");
  if (!viewports.length) return;

  const reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  function neutralizeGallaryCloneImages(root) {
    root.querySelectorAll("img[src]").forEach((img) => {
      img.dataset.gallaryCloneSrc = img.getAttribute("src") || "";
      img.removeAttribute("src");
      img.loading = "lazy";
      img.decoding = "async";
    });
  }

  function restoreGallaryCloneImages(root) {
    root.querySelectorAll("img[data-gallary-clone-src]").forEach((img) => {
      const src = img.dataset.gallaryCloneSrc;
      if (src && !img.getAttribute("src")) img.setAttribute("src", src);
    });
  }

  function startGallaryAutoplay(vp) {
    if (reduceMotionMq.matches) return null;

    const speedPxPerSec = 48;
    let paused = false;
    let pauseUntil = 0;
    let lastTs = 0;
    let rafId = null;

    const pause = (ms = 2800) => {
      pauseUntil = performance.now() + ms;
    };

    vp.classList.add("is-gallary-autoplay");

    vp.addEventListener("mouseenter", () => {
      paused = true;
    });
    vp.addEventListener("mouseleave", () => {
      paused = false;
      lastTs = 0;
    });
    vp.addEventListener(
      "focusin",
      () => {
        paused = true;
      },
      true
    );
    vp.addEventListener(
      "focusout",
      (e) => {
        if (!vp.contains(e.relatedTarget)) {
          paused = false;
          lastTs = 0;
        }
      },
      true
    );
    vp.addEventListener(
      "touchstart",
      () => {
        paused = true;
      },
      { passive: true }
    );
    vp.addEventListener(
      "touchend",
      () => {
        paused = false;
        pause(1500);
        lastTs = 0;
      },
      { passive: true }
    );
    vp.addEventListener(
      "wheel",
      () => {
        pause(3200);
      },
      { passive: true }
    );

    function stopAutoplay() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      vp.classList.remove("is-gallary-autoplay");
    }

    function resumeAutoplay() {
      if (rafId || reduceMotionMq.matches) return;
      lastTs = 0;
      vp.classList.add("is-gallary-autoplay");
      rafId = requestAnimationFrame(tick);
    }

    function tick(ts) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min(64, ts - lastTs) / 1000;
      lastTs = ts;

      if (
        !reduceMotionMq.matches &&
        vp._gallaryInView &&
        !paused &&
        ts >= pauseUntil &&
        !document.hidden
      ) {
        vp.scrollLeft += speedPxPerSec * dt;
        if (typeof vp._gallaryNormalize === "function") {
          vp._gallaryNormalize();
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    if (typeof reduceMotionMq.addEventListener === "function") {
      reduceMotionMq.addEventListener("change", () => {
        if (reduceMotionMq.matches) stopAutoplay();
        else if (vp._gallaryInView) resumeAutoplay();
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) lastTs = 0;
    });

    rafId = requestAnimationFrame(tick);
    return { stop: stopAutoplay, start: resumeAutoplay };
  }

  function setupGallaryViewport(vp) {
    if (vp.dataset.gallaryInfiniteDone) return;
    const grid = vp.querySelector(":scope > .gallary-grid");
    if (!grid || !grid.querySelector(".gallary-card")) return;

    const track = document.createElement("div");
    track.className = "gallary-infinite-track";
    vp.insertBefore(track, grid);
    track.appendChild(grid);

    const before = grid.cloneNode(true);
    const after = grid.cloneNode(true);
    before.setAttribute("aria-hidden", "true");
    after.setAttribute("aria-hidden", "true");
    neutralizeGallaryCloneImages(before);
    neutralizeGallaryCloneImages(after);
    track.insertBefore(before, grid);
    track.appendChild(after);
    vp._gallaryCloneBefore = before;
    vp._gallaryCloneAfter = after;

    vp.dataset.gallaryInfiniteDone = "1";

    /** Flex `gap` between cloned strip and the next (CSS does not add space across sibling grids). */
    function flexGapBetweenStrips() {
      const cs = getComputedStyle(track);
      const raw = cs.columnGap || cs.gap;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    }

    /** One full horizontal repeat unit: strip width + flex gap after it. */
    function segmentStep() {
      return grid.offsetWidth + flexGapBetweenStrips();
    }

    function normalize() {
      const step = segmentStep();
      if (grid.offsetWidth < 8) return;
      if (vp._gallaryNormalizing) return;

      const prevStep = Number(vp._gallaryPrevS) || 0;
      if (prevStep > 8 && Math.abs(step - prevStep) > 5) {
        vp._gallaryNormalizing = true;
        vp.style.scrollBehavior = "auto";
        const le = vp.scrollLeft;
        vp.scrollLeft = (le / prevStep) * step;
        vp._gallaryPrevS = String(step);
        requestAnimationFrame(() => {
          vp._gallaryNormalizing = false;
          vp.style.scrollBehavior = "";
        });
        return;
      }

      const le = vp.scrollLeft;
      if (le < step - 8) {
        vp._gallaryNormalizing = true;
        vp.style.scrollBehavior = "auto";
        vp.scrollLeft = le + step;
        vp._gallaryPrevS = String(step);
        requestAnimationFrame(() => {
          vp._gallaryNormalizing = false;
          vp.style.scrollBehavior = "";
        });
      } else if (le > 2 * step - vp.clientWidth + 8) {
        vp._gallaryNormalizing = true;
        vp.style.scrollBehavior = "auto";
        vp.scrollLeft = le - step;
        vp._gallaryPrevS = String(step);
        requestAnimationFrame(() => {
          vp._gallaryNormalizing = false;
          vp.style.scrollBehavior = "";
        });
      } else {
        vp._gallaryPrevS = String(step);
      }
    }

    function initScrollPos() {
      const step = segmentStep();
      if (grid.offsetWidth < 8) return;
      vp.style.scrollBehavior = "auto";
      vp.scrollLeft = step;
      vp._gallaryPrevS = String(step);
      requestAnimationFrame(() => {
        vp.style.scrollBehavior = "";
      });
    }

    vp._gallaryNormalize = normalize;

    let scrollTick = false;
    vp.addEventListener(
      "scroll",
      () => {
        if (scrollTick) return;
        scrollTick = true;
        requestAnimationFrame(() => {
          scrollTick = false;
          normalize();
        });
      },
      { passive: true }
    );

    let resizeTimer = null;
    function onWindowResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(initScrollPos, 120);
    }

    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(() => {
        normalize();
      });
      ro.observe(track);
      ro.observe(grid);
    }

    window.addEventListener("resize", onWindowResize, { passive: true });

    const boot = () => {
      if (vp._gallaryCloneBefore && vp._gallaryCloneAfter) {
        restoreGallaryCloneImages(vp._gallaryCloneBefore);
        restoreGallaryCloneImages(vp._gallaryCloneAfter);
      }
      initScrollPos();
      if (!vp._gallaryAutoplayCtl) {
        vp._gallaryAutoplayCtl = startGallaryAutoplay(vp);
      } else {
        vp._gallaryAutoplayCtl.start();
      }
    };

    const runWhenReady = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(boot);
      });
    };

    if (document.readyState === "complete") runWhenReady();
    else window.addEventListener("load", runWhenReady, { once: true });
  }

  viewports.forEach((vp) => {
    if (vp.closest("[hidden]")) return;
    vp._gallaryInView = false;

    const onVisible = () => {
      setupGallaryViewport(vp);
    };

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            vp._gallaryInView = entry.isIntersecting;
            if (entry.isIntersecting) {
              onVisible();
              if (vp._gallaryAutoplayCtl) vp._gallaryAutoplayCtl.start();
            } else if (vp._gallaryAutoplayCtl) {
              vp._gallaryAutoplayCtl.stop();
            }
          });
        },
        { rootMargin: "280px 0px", threshold: 0.01 }
      );
      io.observe(vp);
    } else {
      vp._gallaryInView = true;
      onVisible();
    }
  });
})();

(function initGallarySectionReveal() {
  const gallaryCards = document.querySelectorAll(".gallary-section .gallary-card");
  if (!gallaryCards.length) return;

  if ("IntersectionObserver" in window) {
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
    gallaryCards.forEach((card) => {
      if (card.closest("[aria-hidden='true']")) return;
      gallaryObserver.observe(card);
    });
  } else {
    gallaryCards.forEach((card) => {
      if (!card.closest("[aria-hidden='true']")) card.classList.add("is-inview");
    });
  }
})();

/** Map vertical mouse wheel to horizontal scroll (laptops rarely use shift+wheel). */
(function initGallaryScrollViewportWheel() {
  const viewports = document.querySelectorAll(".gallary-scroll-viewport");
  if (!viewports.length) return;

  function maxScrollX(vp) {
    return Math.max(0, vp.scrollWidth - vp.clientWidth);
  }

  viewports.forEach((vp) => {
    const infinite = vp.classList.contains("gallary-scroll-viewport--infinite");

    vp.addEventListener(
      "wheel",
      (e) => {
        const max = maxScrollX(vp);
        if (max <= 1) return;
        if (e.deltaY === 0) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

        const left = vp.scrollLeft;
        const dy = e.deltaY;
        if (!infinite) {
          if (dy < 0 && left <= 0) return;
          if (dy > 0 && left >= max - 1) return;
        }

        e.preventDefault();
        vp.scrollLeft += dy;
        if (infinite && typeof vp._gallaryNormalize === "function") {
          requestAnimationFrame(() => {
            vp._gallaryNormalize();
          });
        }
      },
      { passive: false }
    );
  });
})();

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

const showcaseRoot = document.querySelector(".gallery-projects-showcase");
if (showcaseRoot) {
  const prevBtn = showcaseRoot.querySelector("[data-showcase-prev]");
  const nextBtn = showcaseRoot.querySelector("[data-showcase-next]");
  const progressEl = showcaseRoot.querySelector("[data-showcase-progress]");
  const featureImg = showcaseRoot.querySelector('[data-showcase-slot="feature"]');
  const collageOne = showcaseRoot.querySelector('[data-showcase-slot="collage-1"]');
  const collageTwo = showcaseRoot.querySelector('[data-showcase-slot="collage-2"]');
  const collageThree = showcaseRoot.querySelector('[data-showcase-slot="collage-3"]');

  const showcasePhotos = [
    {
      src: "./photos/Mungo/Image.png",
      alt: "Mungo interior with warm lighting and textured walls",
    },
    {
      src: "./photos/Mungo/Image%20(1).png",
      alt: "Interior cafe seating with warm materials",
    },
    {
      src: "./photos/Mungo/Image%20(2).png",
      alt: "Dining space with natural light and wood textures",
    },
    {
      src: "./photos/Mungo/Imagee.png",
      alt: "Modern dining area with patterned booth and garden view",
    },
  ];

  const slots = [featureImg, collageOne, collageTwo, collageThree];
  let showcaseIndex = 0;
  let showcaseAnimating = false;
  const SHOWCASE_FADE_MS = 260;

  function setShowcaseProgress(index) {
    if (!progressEl) return;
    const maxTravel = 60;
    const left = showcasePhotos.length > 1 ? (index / (showcasePhotos.length - 1)) * maxTravel : 0;
    progressEl.style.setProperty("--showcase-progress-left", `${left}%`);
  }

  function renderShowcase(index) {
    slots.forEach((slot, slotIndex) => {
      if (!slot) return;
      const item = showcasePhotos[(index + slotIndex) % showcasePhotos.length];
      slot.src = item.src;
      slot.alt = item.alt;
    });
    setShowcaseProgress(index);
  }

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  function preloadShowcaseBatch(index) {
    const nextBatch = slots.map((_, slotIndex) => showcasePhotos[(index + slotIndex) % showcasePhotos.length].src);
    return Promise.all(nextBatch.map((src) => preloadImage(src)));
  }

  async function moveShowcase(step) {
    if (showcaseAnimating) return;
    showcaseAnimating = true;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    slots.forEach((slot) => slot?.classList.add("is-showcase-fading"));
    showcaseIndex = (showcaseIndex + step + showcasePhotos.length) % showcasePhotos.length;
    await preloadShowcaseBatch(showcaseIndex);
    await new Promise((resolve) => setTimeout(resolve, SHOWCASE_FADE_MS));

    renderShowcase(showcaseIndex);

    requestAnimationFrame(() => {
      slots.forEach((slot) => slot?.classList.remove("is-showcase-fading"));
    });

    showcaseAnimating = false;
    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;
  }

  if (prevBtn) prevBtn.addEventListener("click", () => moveShowcase(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => moveShowcase(1));
  renderShowcase(showcaseIndex);
}

const eachProjectRoot = document.querySelector(".home-each-project-section");
if (eachProjectRoot) {
  const cards = Array.from(eachProjectRoot.querySelectorAll("[data-each-card]"));
  const steps = Array.from(eachProjectRoot.querySelectorAll("[data-each-step]"));
  const prevBtn = eachProjectRoot.querySelector("[data-each-prev]");
  const nextBtn = eachProjectRoot.querySelector("[data-each-next]");
  const fillEl = eachProjectRoot.querySelector("[data-each-progress-fill]");
  const currentLabelEl = eachProjectRoot.querySelector("[data-each-current-label]");
  const totalLabelEl = eachProjectRoot.querySelector("[data-each-count]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let eachIndex = Math.max(
    0,
    cards.findIndex((card) => card.classList.contains("is-active"))
  );

  function resolvedPhotoHref(urlStr) {
    if (!urlStr) return "";
    try {
      return new URL(urlStr, document.baseURI).href;
    } catch {
      return urlStr;
    }
  }

  const firstThumb = cards[0]?.querySelector("img");
  let lastBgSrc = firstThumb ? resolvedPhotoHref(firstThumb.currentSrc || firstThumb.src) : "";

  function primeEachProjectImages() {
    cards.forEach((card) => {
      const im = card.querySelector("img");
      if (!im?.src || !im.decode) return;
      im.decode().catch(() => {});
    });
  }

  function applySectionBackgroundFromImg(thumbImg) {
    const cssUrl = thumbImg.currentSrc || thumbImg.src;
    const hrefKey = resolvedPhotoHref(cssUrl);
    if (!hrefKey || hrefKey === lastBgSrc) return;
    lastBgSrc = hrefKey;
    const value = `url(${JSON.stringify(cssUrl)})`;
    const apply = () => eachProjectRoot.style.setProperty("--home-each-project-photo", value);
    if (reduceMotion) {
      requestAnimationFrame(apply);
      return;
    }
    const done = thumbImg.decode ? thumbImg.decode().catch(() => {}) : Promise.resolve();
    done.then(() => requestAnimationFrame(apply));
  }

  function renderEachProject(index) {
    cards.forEach((card, cardIndex) => {
      card.classList.toggle("is-active", cardIndex === index);
      card.setAttribute("aria-hidden", String(cardIndex !== index));
    });
    steps.forEach((step, stepIndex) => {
      const isActive = stepIndex === index;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (fillEl) {
      const pct = cards.length > 1 ? (index / (cards.length - 1)) * 100 : 100;
      fillEl.style.width = `${pct}%`;
    }

    if (currentLabelEl) {
      currentLabelEl.textContent = String(index + 1).padStart(2, "0");
    }

    if (totalLabelEl) {
      totalLabelEl.textContent = String(cards.length).padStart(2, "0");
    }

    const activeCard = cards[index];
    const thumbImg = activeCard?.querySelector("img");
    if (thumbImg?.src) {
      applySectionBackgroundFromImg(thumbImg);
    }
  }

  function moveEachProject(step) {
    if (!cards.length) return;
    eachIndex = (eachIndex + step + cards.length) % cards.length;
    renderEachProject(eachIndex);
  }

  primeEachProjectImages();

  if (prevBtn) prevBtn.addEventListener("click", () => moveEachProject(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => moveEachProject(1));
  steps.forEach((step, stepIndex) => {
    step.addEventListener("click", () => {
      eachIndex = stepIndex;
      renderEachProject(eachIndex);
    });
  });
  renderEachProject(eachIndex);
}

const homeFaqRoot = document.querySelector("[data-home-faq]");
if (homeFaqRoot) {
  const faqItems = Array.from(homeFaqRoot.querySelectorAll("[data-faq-item]"));

  function setFaqState(activeItem) {
    faqItems.forEach((item) => {
      const trigger = item.querySelector("[data-faq-trigger]");
      const panel = item.querySelector("[data-faq-panel]");
      const icon = item.querySelector(".home-faq-icon");
      const isOpen = item === activeItem;

      item.classList.toggle("is-open", isOpen);
      if (trigger) trigger.setAttribute("aria-expanded", String(isOpen));
      if (panel) panel.hidden = !isOpen;
      if (icon) icon.textContent = isOpen ? "\u2212" : "+";
    });
  }

  faqItems.forEach((item) => {
    const trigger = item.querySelector("[data-faq-trigger]");
    if (!trigger) return;
    trigger.addEventListener("click", () => {
      const isAlreadyOpen = item.classList.contains("is-open");
      setFaqState(isAlreadyOpen ? null : item);
    });
  });

  const initiallyOpenItem = faqItems.find((item) => item.classList.contains("is-open")) || null;
  setFaqState(initiallyOpenItem);
}

// Projects Under Gargi De Portfolio — projects rotate two at a time: main (left) + next (right)
const latestWorksSubtitleVariants = [
  "A curated selection of projects that reflect our design thinking and execution.",
  "Commercial and hospitality interiors shaped by light, texture, and material craft.",
  "Spaces where architecture, interiors, and daily use meet with clarity.",
];

const latestWorksProjects = [
  {
    src: "./photos/PROJECTS/Mahadev_Residence.png",
    alt: "Project image: Mahadev_Residence",
    label: "Mahadev_Residence",
    meta: ["Mahadev_Residence", "", ""],
  },
  {
    src: "./photos/PROJECTS/Chic Apartment @2019.png",
    alt: "Project image: Chic Apartment @2019",
    label: "Chic Apartment @2019",
    meta: ["Chic Apartment @2019", "", ""],
  },
  {
    src: "./photos/PROJECTS/DONGLE DESK.png",
    alt: "Project image: DONGLE DESK",
    label: "DONGLE DESK",
    meta: ["DONGLE DESK", "", ""],
  },
  {
    src: "./photos/PROJECTS/SMOOR.png",
    alt: "Project image: SMOOR",
    label: "SMOOR",
    meta: ["SMOOR", "", ""],
  },
  {
    src: "./photos/PROJECTS/KUNAL TANDON.png",
    alt: "Project image: KUNAL TANDON",
    label: "KUNAL TANDON",
    meta: ["KUNAL TANDON", "", ""],
  },
  {
    src: "./photos/PROJECTS/INK_ARCHITECTURE.png",
    alt: "Project image: INK_ARCHITECTURE",
    label: "INK_ARCHITECTURE",
    meta: ["INK_ARCHITECTURE", "", ""],
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

(function initInteriorTestimonials() {
  const root = document.querySelector("[data-interior-testimonials]");
  if (!root) return;

  const quoteEl = root.querySelector("[data-t-quote]");
  const contextEl = root.querySelector("[data-t-context]");
  const prevBtn = root.querySelector("[data-t-prev]");
  const nextBtn = root.querySelector("[data-t-next]");
  if (!quoteEl || !contextEl || !prevBtn || !nextBtn) return;

  const slides = [
    {
      quote:
        "From concept to reality, the team turned my vision into a stunning, livable space. I couldn\u2019t be happier with this!",
      context:
        "Morgan wanted a modern, functional office. We delivered a bright, stylish space with smart design solutions, perfectly tailored to his company style.",
    },
    {
      quote:
        "Our living room was completely transformed! The team captured our vision perfectly and exceeded our expectations.",
      context:
        "John Carter asked for a warm, contemporary family room. We layered light, texture, and practical storage without losing the home\u2019s character.",
    },
    {
      quote:
        "Professional and creative! The design process was smooth, and the results are stunning. Highly recommend their services.",
      context:
        "Sophie Moore\u2019s brief balanced hospitality and calm. The finished interiors feel polished yet easy to live in every day.",
    },
    {
      quote:
        "Their attention to detail and commitment to quality turned our house into a home we love. Outstanding work!",
      context:
        "Matt Cannon prioritized durability and quiet luxury. We refined each junction so the space feels composed and enduring.",
    },
  ];

  let index = 0;

  function render() {
    const s = slides[index];
    quoteEl.textContent = s.quote;
    contextEl.textContent = s.context;
  }

  prevBtn.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    render();
  });

  nextBtn.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    render();
  });
})();

(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("contact-form-status");
  const mail = "hello@stratus.company";

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

(function initHomeProcessReveal() {
  const section = document.querySelector(".home-process-section");
  if (!section) return;

  const cards = Array.from(section.querySelectorAll(".home-process-card"));
  if (!cards.length) return;

  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch {
    return;
  }

  section.classList.add("home-process-section--observe");

  cards.forEach((card, i) => {
    card.style.setProperty("--process-reveal-i", String(i));
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("home-process-card--visible");
        io.unobserve(entry.target);
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  cards.forEach((card) => io.observe(card));
})();

(function initWhatsAppFloat() {
  if (document.querySelector(".stratus-whatsapp-float")) return;

  /* +91 48773284 — digits only for wa.me */
  const phone = "9148773284";
  const preset = encodeURIComponent("Hello, I'd like to connect with Stratus.");
  const href = `https://wa.me/${phone}?text=${preset}`;

  const a = document.createElement("a");
  a.className = "stratus-whatsapp-float";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.setAttribute("aria-label", "Connect through WhatsApp");

  a.innerHTML = `
    <span class="stratus-whatsapp-float__icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="currentColor" focusable="false">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </span>
  `;

  /* Append to <html> so the FAB is not a descendant of <body>. Body uses opacity/transform
     animations for page transitions; any transform on body makes fixed children scroll with the page. */
  document.documentElement.appendChild(a);
})();

(function initHomeBannerCycle() {
  const root = document.querySelector("[data-home-banner-cycle]");
  if (!root) return;

  const frames = [...root.querySelectorAll("img")];
  if (frames.length < 2) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return;

  let index = 0;
  const startCycle = () => {
    window.setInterval(() => {
      frames[index].classList.remove("is-active");
      index = (index + 1) % frames.length;
      frames[index].classList.add("is-active");
    }, 4500);
  };

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        startCycle();
        io.disconnect();
      },
      { rootMargin: "120px 0px", threshold: 0.05 }
    );
    io.observe(root);
  } else {
    startCycle();
  }
})();

(function initDirectProjectFloorplans() {
  const root = document.querySelector("[data-direct-project-floorplans]");
  if (!root) return;

  const floorplanSets = {
    avena: [
      {
        src: "./Avena/Ground%20Floor.png",
        alt: "Avena ground floor plan",
        label: "Ground Floor",
      },
      {
        src: "./Avena/First%20Floor.png",
        alt: "Avena first floor plan",
        label: "First Floor",
      },
      {
        src: "./Avena/Second%20Floor.png",
        alt: "Avena second floor plan",
        label: "Second Floor",
      },
    ],
    evara: [
      {
        src: "./Evara/01_Stilt%20Floor.png",
        alt: "Evara stilt floor plan",
        label: "Stilt Floor",
      },
      {
        src: "./Evara/02_Typical%20Floors.png",
        alt: "Evara typical floors plan",
        label: "Typical Floors",
      },
      {
        src: "./Evara/03_Terrace%20Floor.png",
        alt: "Evara terrace floor plan",
        label: "Terrace Floor",
      },
    ],
    mungo: [
      {
        src: "./Mungo/Floor%20Plan_01.png",
        alt: "Mungo floor plan 01",
        label: "Floor Plan 01",
      },
      {
        src: "./Mungo/Floor%20Plan_02.png",
        alt: "Mungo floor plan 02",
        label: "Floor Plan 02",
      },
      {
        src: "./Mungo/Section.png",
        alt: "Mungo section drawing",
        label: "Section",
      },
    ],
  };

  const FLOORPLAN_FADE_MS = 360;
  const FLOORPLAN_INTERVAL_MS = 4500;
  const carousels = [...root.querySelectorAll("[data-floorplan-carousel]")];

  function whenFloorplanImageReady(img) {
    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  }

  carousels.forEach((card) => {
    const project = card.dataset.floorplanProject;
    const slides = floorplanSets[project];
    const img = card.querySelector("[data-floorplan-img]");
    const label = card.querySelector("[data-floorplan-label]");
    const media = card.querySelector(".direct-project-floorplan-media");

    if (!slides?.length || !img || !media) return;

    let index = 0;

    async function showSlide(nextIndex, { animate = true } = {}) {
      const slide = slides[nextIndex % slides.length];
      if (!slide) return;

      if (animate) {
        media.classList.add("is-floorplan-fading");
        await new Promise((resolve) => setTimeout(resolve, FLOORPLAN_FADE_MS));
      }

      img.src = slide.src;
      img.alt = slide.alt;
      if (label) label.textContent = slide.label;

      await whenFloorplanImageReady(img);

      if (animate) {
        requestAnimationFrame(() => {
          media.classList.remove("is-floorplan-fading");
        });
      }
    }

    let reduceMotion = false;
    try {
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduceMotion = false;
    }

    if (slides.length < 2 || reduceMotion) return;

    window.setInterval(() => {
      index = (index + 1) % slides.length;
      showSlide(index, { animate: true });
    }, FLOORPLAN_INTERVAL_MS);
  });
})();

(function initArchInteroProjectCardToggles() {
  document.querySelectorAll(".arch-intero-projects-card-toggle").forEach((btn) => {
    if (btn.dataset.archInteroToggleBound === "1") return;
    btn.dataset.archInteroToggleBound = "1";

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const panelId = btn.getAttribute("aria-controls");
      const panel =
        (panelId && document.getElementById(panelId)) ||
        btn.closest(
          ".arch-intero-projects-card, .de-atelier-gargi-portfolio__card, .project-portfolio-card"
        )?.querySelector(".arch-intero-projects-card-panel");
      if (!panel) return;

      const expanded = btn.getAttribute("aria-expanded") === "true";
      const willExpand = !expanded;

      if (willExpand) {
        panel.removeAttribute("hidden");
        btn.setAttribute("aria-expanded", "true");
        panel.querySelectorAll("img").forEach((img) => {
          img.loading = "eager";
          const src = img.getAttribute("src");
          if (src && !img.complete) {
            img.src = src;
          }
          if (typeof img.decode === "function") {
            img.decode().catch(() => {});
          }
        });
      } else {
        panel.setAttribute("hidden", "");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  });
})();

(function initArchInteroProjectDrawer() {
  const DRAWER_ID = "arch-intero-project-drawer";
  const SCOPE_SELECTOR = "#arch-intero-page-projects, #de-atelier-page-projects, #project-page-projects";
  const CARD_SELECTOR =
    ".arch-intero-projects-card, .de-atelier-gargi-portfolio__card--image, .project-portfolio-card";
  const HIT_SELECTOR =
    ".arch-intero-projects-card-hit, .de-atelier-gargi-portfolio__card-hit, .project-portfolio-card-hit";
  const MEDIA_IMG_SELECTOR =
    ".arch-intero-projects-media img, .de-atelier-gargi-portfolio__media img, .project-portfolio-media img";
  const scopes = document.querySelectorAll(SCOPE_SELECTOR);
  if (!scopes.length) return;

  let root = document.getElementById(DRAWER_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = DRAWER_ID;
    root.className = "arch-intero-drawer";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="arch-intero-drawer__scrim" data-arch-drawer-close tabindex="-1"></div>
      <div
        class="arch-intero-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arch-intero-drawer-title"
      >
        <button type="button" class="arch-intero-drawer__close" data-arch-drawer-close aria-label="Close project panel">
          <span aria-hidden="true">&times;</span>
        </button>
        <div class="arch-intero-drawer__scroll">
          <div class="arch-intero-drawer__banner">
            <img class="arch-intero-drawer__banner-img" src="" alt="" decoding="async" />
          </div>
          <div class="arch-intero-drawer__head">
            <div class="arch-intero-drawer__head-left">
              <p class="arch-intero-drawer__year"></p>
              <p class="arch-intero-drawer__location"></p>
              <div class="arch-intero-drawer__tags" aria-label="Project categories"></div>
            </div>
            <div class="arch-intero-drawer__head-right">
              <h2 id="arch-intero-drawer-title" class="arch-intero-drawer__title"></h2>
              <div class="arch-intero-drawer__desc"></div>
            </div>
          </div>
          <div class="arch-intero-drawer__grid" role="group" aria-label="Project images"></div>
          <p class="arch-intero-drawer__foot">
            <a class="arch-intero-drawer__project-link" href="./direct_project.html">View full project</a>
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  const scrim = root.querySelector(".arch-intero-drawer__scrim");
  const btnClose = root.querySelector(".arch-intero-drawer__close");
  const bannerImg = root.querySelector(".arch-intero-drawer__banner-img");
  const yearEl = root.querySelector(".arch-intero-drawer__year");
  const locationEl = root.querySelector(".arch-intero-drawer__location");
  const tagsEl = root.querySelector(".arch-intero-drawer__tags");
  const titleEl = root.querySelector(".arch-intero-drawer__title");
  const descEl = root.querySelector(".arch-intero-drawer__desc");
  const gridEl = root.querySelector(".arch-intero-drawer__grid");
  const projectLink = root.querySelector(".arch-intero-drawer__project-link");
  const scrollEl = root.querySelector(".arch-intero-drawer__scroll");
  const panelEl = root.querySelector(".arch-intero-drawer__panel");

  let lastFocus = null;
  let closeTimer = null;
  let scrollLockY = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  let reduceMotion = false;
  let isMobileDrawer = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    isMobileDrawer = window.matchMedia("(max-width: 767px)").matches;
  } catch {
    reduceMotion = false;
    isMobileDrawer = false;
  }

  function lockBodyScroll() {
    if (document.body.classList.contains("arch-intero-drawer-scroll-locked")) return;
    scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.classList.add("arch-intero-drawer-scroll-locked");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollLockY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  function unlockBodyScroll() {
    if (!document.body.classList.contains("arch-intero-drawer-scroll-locked")) return;
    const y = scrollLockY;
    document.body.classList.remove("arch-intero-drawer-scroll-locked");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";

    const html = document.documentElement;
    const prevHtmlScroll = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    try {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, y);
    }
    if (Math.abs((window.scrollY || html.scrollTop) - y) > 1) {
      html.scrollTop = y;
      document.body.scrollTop = y;
    }
    html.style.scrollBehavior = prevHtmlScroll;
  }

  function clearDrawerContent() {
    bannerImg.removeAttribute("src");
    gridEl.innerHTML = "";
    descEl.innerHTML = "";
    tagsEl.innerHTML = "";
    yearEl.textContent = "";
    yearEl.hidden = true;
    locationEl.textContent = "";
    locationEl.hidden = true;
    tagsEl.hidden = true;
    titleEl.textContent = "";
    scrollEl?.classList.remove("is-swapping", "is-swapped");
  }

  function finishClose() {
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("arch-intero-drawer-open");
    unlockBodyScroll();
    clearDrawerContent();
    if (document.activeElement && root.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    lastFocus = null;
  }

  function isOpen() {
    return root.classList.contains("is-open");
  }

  function openFromCard(card) {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    try {
      isMobileDrawer = window.matchMedia("(max-width: 767px)").matches;
    } catch {
      isMobileDrawer = false;
    }

    const sourcePanel = card.querySelector(".arch-intero-projects-card-panel");
    const mediaImg = card.querySelector(MEDIA_IMG_SELECTOR);
    if (!sourcePanel || !mediaImg || !gridEl) return;

    const switchingProject = isOpen();

    if (scrollEl) {
      scrollEl.style.scrollBehavior = "auto";
      scrollEl.scrollTop = 0;
      scrollEl.scrollLeft = 0;
      if (switchingProject && !reduceMotion) {
        scrollEl.classList.remove("is-swapped");
        scrollEl.classList.add("is-swapping");
      }
    }

    const title = card.getAttribute("data-arch-drawer-title") || "Project";
    const year = card.getAttribute("data-arch-drawer-year") || "";
    const location = card.getAttribute("data-arch-drawer-location") || "";
    const tagsRaw = card.getAttribute("data-arch-drawer-tags") || "";
    const status = card.getAttribute("data-arch-drawer-status") || "";
    const desc = card.getAttribute("data-arch-drawer-desc") || "";
    const href = card.getAttribute("data-arch-drawer-link") || "./direct_project.html";

    const bannerSrc = mediaImg.getAttribute("src") || "";
    const bannerAlt = mediaImg.getAttribute("alt") || title;
    bannerImg.src = bannerSrc;
    bannerImg.alt = bannerAlt;

    titleEl.textContent = title;

    yearEl.textContent = year;
    yearEl.hidden = !year;

    locationEl.textContent = location;
    locationEl.hidden = !location;

    let tagParts = tagsRaw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!tagParts.length && status) {
      tagParts = status
        .split(/[·,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    tagsEl.innerHTML = "";
    if (tagParts.length) {
      tagsEl.hidden = false;
      tagParts.forEach((t) => {
        const line = document.createElement("span");
        line.className = "arch-intero-drawer__tag-line";
        line.textContent = t;
        tagsEl.appendChild(line);
      });
    } else {
      tagsEl.hidden = true;
    }

    descEl.innerHTML = "";
    const blocks = desc.includes("|||") ? desc.split("|||").map((s) => s.trim()).filter(Boolean) : [desc.trim()].filter(Boolean);
    if (!blocks.length) {
      descEl.hidden = true;
    } else {
      descEl.hidden = false;
      blocks.forEach((block) => {
        const nl = block.indexOf("\n");
        const head = nl >= 0 ? block.slice(0, nl).trim() : block.trim();
        const body = nl >= 0 ? block.slice(nl + 1).trim() : "";
        const headNormalized = head.replace(/:$/, "");

        if (/^\d+\.\s/.test(head) && body) {
          const h = document.createElement("h3");
          h.className = "arch-intero-drawer__desc-heading";
          h.textContent = head;
          const p = document.createElement("p");
          p.className = "arch-intero-drawer__desc-p";
          p.textContent = body;
          descEl.appendChild(h);
          descEl.appendChild(p);
        } else if (headNormalized === "Project Highlights" && body) {
          const h = document.createElement("h3");
          h.className = "arch-intero-drawer__desc-heading";
          h.textContent = "Project Highlights";
          descEl.appendChild(h);
          const meta = document.createElement("div");
          meta.className = "arch-intero-drawer__desc-meta";
          body
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
              const p = document.createElement("p");
              p.className = "arch-intero-drawer__desc-meta-line";
              p.textContent = line;
              meta.appendChild(p);
            });
          descEl.appendChild(meta);
        } else if (headNormalized === "Key Features" && body) {
          const h = document.createElement("h3");
          h.className = "arch-intero-drawer__desc-heading";
          h.textContent = "Key Features";
          descEl.appendChild(h);
          const ul = document.createElement("ul");
          ul.className = "arch-intero-drawer__desc-list";
          body
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .forEach((line) => {
              const li = document.createElement("li");
              li.textContent = line.replace(/^[-•*]\s*/, "");
              ul.appendChild(li);
            });
          descEl.appendChild(ul);
        } else {
          const p = document.createElement("p");
          p.className = "arch-intero-drawer__desc-p";
          p.textContent = block;
          descEl.appendChild(p);
        }
      });
    }

    projectLink.setAttribute("href", href);

    gridEl.innerHTML = "";
    sourcePanel.querySelectorAll(".arch-intero-projects-card-panel-figure").forEach((fig) => {
      const clone = fig.cloneNode(true);
      gridEl.appendChild(clone);
    });

    gridEl.querySelectorAll("img").forEach((img, index) => {
      img.loading = isMobileDrawer && index > 0 ? "lazy" : "eager";
      const src = img.getAttribute("src");
      if (src && !img.complete) {
        img.src = src;
      }
      if (typeof img.decode === "function" && (!isMobileDrawer || index === 0)) {
        img.decode().catch(() => {});
      }
    });

    const alreadyVisible = !root.hidden;
    if (!alreadyVisible) {
      lastFocus = document.activeElement;
      root.hidden = false;
      root.setAttribute("aria-hidden", "false");
      document.body.classList.add("arch-intero-drawer-open");
      lockBodyScroll();
    }

    if (!root.classList.contains("is-open")) {
      if (reduceMotion) {
        root.classList.add("is-open");
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            root.classList.add("is-open");
          });
        });
      }
    }

    if (scrollEl) {
      scrollEl.scrollTop = 0;
      scrollEl.scrollLeft = 0;
      scrollEl.style.scrollBehavior = "";

      if (switchingProject && !reduceMotion) {
        requestAnimationFrame(() => {
          scrollEl.classList.remove("is-swapping");
          scrollEl.classList.add("is-swapped");
        });
      } else {
        scrollEl.classList.remove("is-swapping", "is-swapped");
      }
    }

    if (!switchingProject) {
      try {
        btnClose.focus({ preventScroll: true });
      } catch {
        btnClose.focus();
      }
    }
  }

  function close() {
    if (!isOpen() && root.hidden) return;
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    if (reduceMotion) {
      root.classList.remove("is-open");
      finishClose();
      return;
    }

    root.classList.remove("is-open");
    closeTimer = window.setTimeout(() => {
      closeTimer = null;
      finishClose();
    }, 380);
  }

  scopes.forEach((scope) => {
    scope.querySelectorAll(HIT_SELECTOR).forEach((hit) => {
      if (hit.dataset.archInteroDrawerBound === "1") return;
      hit.dataset.archInteroDrawerBound = "1";

      hit.addEventListener("click", (e) => {
        const card = hit.closest(CARD_SELECTOR);
        if (!card) return;
        const sourcePanel = card.querySelector(".arch-intero-projects-card-panel");
        const mediaImg = card.querySelector(MEDIA_IMG_SELECTOR);
        if (!sourcePanel || !mediaImg) return;
        e.preventDefault();
        openFromCard(card);
      });
    });
  });

  function onCloseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    close();
  }

  scrim?.addEventListener("click", onCloseClick);
  btnClose?.addEventListener("click", onCloseClick);

  panelEl?.addEventListener(
    "touchstart",
    (e) => {
      if (!isOpen() || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  panelEl?.addEventListener(
    "touchend",
    (e) => {
      if (!isOpen()) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (dx > 72 && Math.abs(dy) < 80) {
        close();
      }
    },
    { passive: true }
  );

  window.matchMedia("(max-width: 767px)").addEventListener("change", (e) => {
    isMobileDrawer = e.matches;
  });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    const lightbox = document.getElementById("portfolio-panel-lightbox");
    if (lightbox && !lightbox.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
})();

(function initPortfolioPanelLightbox() {
  const ROOT_ID = "portfolio-panel-lightbox";
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.className = "portfolio-panel-lightbox";
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div class="portfolio-panel-lightbox__backdrop" data-lightbox-close tabindex="-1"></div>
      <div
        class="portfolio-panel-lightbox__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portfolio-panel-lightbox-label"
      >
        <p id="portfolio-panel-lightbox-label" class="portfolio-panel-lightbox__label">
          Project image viewer
        </p>
        <button type="button" class="portfolio-panel-lightbox__close" data-lightbox-close aria-label="Close image viewer">
          <span aria-hidden="true">&times;</span>
        </button>
        <button type="button" class="portfolio-panel-lightbox__nav portfolio-panel-lightbox__nav--prev" data-lightbox-prev aria-label="Previous image">
          <span aria-hidden="true">&#8249;</span>
        </button>
        <button type="button" class="portfolio-panel-lightbox__nav portfolio-panel-lightbox__nav--next" data-lightbox-next aria-label="Next image">
          <span aria-hidden="true">&#8250;</span>
        </button>
        <figure class="portfolio-panel-lightbox__stage">
          <img class="portfolio-panel-lightbox__img" src="" alt="" decoding="async" />
        </figure>
        <p class="portfolio-panel-lightbox__counter" aria-live="polite"></p>
      </div>
    `;
    document.body.appendChild(root);
  }

  const backdrop = root.querySelector(".portfolio-panel-lightbox__backdrop");
  const stageImg = root.querySelector(".portfolio-panel-lightbox__img");
  const counter = root.querySelector(".portfolio-panel-lightbox__counter");
  const btnClose = root.querySelector(".portfolio-panel-lightbox__close");
  const btnPrev = root.querySelector('[data-lightbox-prev]');
  const btnNext = root.querySelector('[data-lightbox-next]');

  let slides = [];
  let index = 0;
  let lastFocus = null;

  function isOpen() {
    return !root.hidden;
  }

  function render() {
    if (!slides.length) return;
    const img = slides[index];
    const src = img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "Project image";
    stageImg.src = src;
    stageImg.alt = alt;
    counter.textContent = `${index + 1} / ${slides.length}`;
    btnPrev.disabled = slides.length <= 1;
    btnNext.disabled = slides.length <= 1;
  }

  function open(panel, clickedImg) {
    slides = Array.from(panel.querySelectorAll(".arch-intero-projects-card-panel-figure img"));
    if (!slides.length) return;

    const start = slides.indexOf(clickedImg);
    index = start >= 0 ? start : 0;
    lastFocus = clickedImg;

    render();
    root.hidden = false;
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("portfolio-panel-lightbox-open");
    btnClose.focus();
  }

  function close() {
    if (!isOpen()) return;
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("portfolio-panel-lightbox-open");
    stageImg.removeAttribute("src");
    slides = [];
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus();
    }
    lastFocus = null;
  }

  function step(delta) {
    if (slides.length <= 1) return;
    index = (index + delta + slides.length) % slides.length;
    render();
  }

  document.addEventListener("click", (e) => {
    const thumb = e.target.closest(".arch-intero-projects-card-panel-figure img");
    if (!thumb || isOpen()) return;
    const panel =
      thumb.closest(".arch-intero-projects-card-panel") || thumb.closest(".arch-intero-drawer__grid");
    if (!panel) return;
    if (panel.matches(".arch-intero-projects-card-panel") && panel.hidden) return;
    e.preventDefault();
    open(panel, thumb);
  });

  function onCloseClick(e) {
    e.preventDefault();
    e.stopPropagation();
    close();
  }

  btnClose.addEventListener("click", onCloseClick);
  backdrop.addEventListener("click", onCloseClick);

  btnPrev.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    step(-1);
  });

  btnNext.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    step(1);
  });

  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    }
  });
})();

(function initStratusPerformance() {
  function runWhenIdle(fn) {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(fn, { timeout: 1200 });
    } else {
      window.setTimeout(fn, 1);
    }
  }

  function applyLazyToImage(img) {
    if (!img || img.tagName !== "IMG") return;
    if (img.hasAttribute("loading")) return;
    if (img.getAttribute("fetchpriority") === "high") return;
    if (img.classList.contains("top-corner-logo-img") || img.classList.contains("brand-logo")) return;
    if (img.closest("header, .hero, .architecture-hero, .page-hero, .about-hero, .services-hero")) return;
    img.loading = "lazy";
    if (!img.hasAttribute("decoding")) img.decoding = "async";
  }

  function initGlobalImageLazy() {
    document.querySelectorAll("img").forEach(applyLazyToImage);
  }

  function observeLazyImages() {
    if (!("MutationObserver" in window)) return;
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.tagName === "IMG") applyLazyToImage(node);
          node.querySelectorAll?.("img").forEach(applyLazyToImage);
        });
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function initLazyHeroVideos() {
    document.querySelectorAll("video.home-hero-video, video.page-hero-video").forEach((video) => {
      if (video.dataset.heroVideoReady === "1") return;

      const loadAndPlay = () => {
        if (video.dataset.heroVideoReady === "1") return;
        video.dataset.heroVideoReady = "1";
        video.preload = "auto";
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      };

      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            if (!entries[0]?.isIntersecting) return;
            loadAndPlay();
            io.disconnect();
          },
          { rootMargin: "80px 0px", threshold: 0.12 }
        );
        io.observe(video);
      } else {
        loadAndPlay();
      }
    });
  }

  function initInternalLinkPrefetch() {
    const prefetched = new Set();

    document.addEventListener(
      "mouseover",
      (e) => {
        const a = e.target.closest("a[href]");
        if (!a || a.target === "_blank") return;

        let url;
        try {
          url = new URL(a.href, window.location.href);
        } catch {
          return;
        }
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.hash) return;

        const key = url.pathname + url.search;
        if (prefetched.has(key)) return;
        prefetched.add(key);

        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = url.href;
        link.as = "document";
        document.head.appendChild(link);
      },
      { passive: true }
    );
  }

  initLazyHeroVideos();
  initInternalLinkPrefetch();
  initGlobalImageLazy();
  observeLazyImages();
  runWhenIdle(initGlobalImageLazy);
})();
