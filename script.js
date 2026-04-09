const projectTabs = document.querySelectorAll("[data-project-tab]");
const projectImages = document.querySelectorAll(".projects-frame .project-card img");
const projectLinks = document.querySelectorAll(".projects-frame [data-project-link]");

const projectPageLinks = {
  architecture: "./architecture.html",
  construction: "./Construction.html",
};

const projectAltText = {
  architecture: [
    "Architecture project 1",
    "Architecture project 2",
    "Architecture project 3",
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
  "./Public/56bd5a4161ff0da43798dc1e10e7b57daa4fdf22.jpg",
  "./Public/563a5173d6b7e08f3f5c7b229b6094f267cd063a.jpg",
  "./Public/65339acbdecec6082d0c26491b2fd9b835f97d2d.jpg",
  "./Public/66878b007410800d33e501ce4a6592ccbb6ac6da.jpg",
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
    img.alt = `Gallary image ${slotIndex + 1}`;
  });

  let gallaryStep = 0;

  setInterval(() => {
    gallaryStep += 1;
    gallaryImages.forEach((img, slotIndex) => {
      img.classList.remove("is-sliding-in");
      img.classList.add("is-sliding-out");
      const nextIndex = (slotIndex + gallaryStep) % gallaryImagePool.length;
      setTimeout(() => {
        img.classList.remove("is-sliding-out");
        img.classList.add("is-sliding-in");
        img.src = gallaryImagePool[nextIndex];
        img.alt = `Gallary image ${nextIndex + 1}`;
        requestAnimationFrame(() => {
          img.classList.remove("is-sliding-in");
        });
      }, 220);
    });
  }, 2600);
}

// Architecture page — Latest works slider (two-up layout)
const latestRoot = document.querySelector("[data-latest-works]");

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

  const slides = [
    {
      subtitle:
        "A curated selection of projects that reflect our design thinking and execution.",
      left: {
        src: "./Public/services/architecture/architecture-main.jpg",
        alt: "Coastal retreat project",
        label: "Coastal Retreat ©2019",
        meta: ["15 Rue des Rosiers, Le Marais", "Paris, France", "LH-103"],
      },
      right: {
        src: "./Public/services/construction/construction-main.jpg",
        alt: "Chic apartment project",
        label: "Chic Apartment ©2019",
        meta: ["789 Broadway, SoHo", "New York, USA", "LH-001"],
      },
    },
    {
      subtitle:
        "Dummy content for now — swap images and copy whenever you’re ready.",
      left: {
        src: "./Public/2151003670.jpg",
        alt: "Modern residence exterior",
        label: "Hillside House ©2020",
        meta: ["Sierra Road", "California, USA", "LH-112"],
      },
      right: {
        src: "./Public/4719.jpg",
        alt: "Interior detail study",
        label: "Studio Loft ©2020",
        meta: ["Market Street", "San Francisco, USA", "LH-019"],
      },
    },
    {
      subtitle:
        "An evolving set of references — replace with final project content later.",
      left: {
        src: "./Public/65339acbdecec6082d0c26491b2fd9b835f97d2d.jpg",
        alt: "Contemporary architectural study",
        label: "Courtyard Home ©2021",
        meta: ["Old Town", "Barcelona, Spain", "LH-208"],
      },
      right: {
        src: "./Public/66878b007410800d33e501ce4a6592ccbb6ac6da.jpg",
        alt: "Modern facade detail",
        label: "Urban Pavilion ©2021",
        meta: ["Docklands", "Melbourne, AU", "LH-054"],
      },
    },
    {
      subtitle:
        "More dummy projects — keep the layout, swap assets anytime.",
      left: {
        src: "./Public/services/initial-consultation/initial-consultation-main.jpg",
        alt: "Interior lounge concept",
        label: "Atrium Villa ©2022",
        meta: ["Lakeside Drive", "Zurich, CH", "LH-317"],
      },
      right: {
        src: "./Public/services/approach/approach-main.jpg",
        alt: "Material palette study",
        label: "Material Study ©2022",
        meta: ["Design District", "Copenhagen, DK", "LH-088"],
      },
    },
  ];

  let slideIndex = 0;

  function setMeta(container, values) {
    if (!container) return;
    const spans = container.querySelectorAll("span");
    spans.forEach((span, idx) => {
      span.textContent = values[idx] || "";
    });
  }

  function setSlide(index) {
    const slide = slides[index];
    if (!slide) return;

    if (subtitleEl) subtitleEl.textContent = slide.subtitle;

    if (leftImg) {
      leftImg.src = slide.left.src;
      leftImg.alt = slide.left.alt;
    }
    if (rightImg) {
      rightImg.src = slide.right.src;
      rightImg.alt = slide.right.alt;
    }

    if (leftLabel) leftLabel.textContent = slide.left.label;
    if (rightLabel) rightLabel.textContent = slide.right.label;

    setMeta(leftMeta, slide.left.meta);
    setMeta(rightMeta, slide.right.meta);

    if (progressEl) {
      const stepPct = slides.length ? 100 / slides.length : 100;
      progressEl.style.width = `${stepPct}%`;
      progressEl.style.transform = `translateX(${index * stepPct}%)`;
    }
  }

  function next() {
    slideIndex = (slideIndex + 1) % slides.length;
    setSlide(slideIndex);
  }

  function prev() {
    slideIndex = (slideIndex - 1 + slides.length) % slides.length;
    setSlide(slideIndex);
  }

  if (nextBtn) nextBtn.addEventListener("click", next);
  if (prevBtn) prevBtn.addEventListener("click", prev);

  setSlide(slideIndex);
}

// Interior page — Design Space showcase
const interiorSpaceRoot = document.querySelector("[data-interior-space]");

if (interiorSpaceRoot) {
  const nextBtn = interiorSpaceRoot.querySelector("[data-space-next]");
  const titleEl = interiorSpaceRoot.querySelector("[data-space-title]");
  const subtitleEl = interiorSpaceRoot.querySelector("[data-space-subtitle]");
  const mainImg = interiorSpaceRoot.querySelector('[data-space-img="main"]');
  const topImg = interiorSpaceRoot.querySelector('[data-space-img="left-top"]');
  const bottomImg = interiorSpaceRoot.querySelector('[data-space-img="left-bottom"]');

  const spaces = [
    {
      title: "Living Room",
      subtitle: "Beach Side",
      main: "./Public/services/de-atelier/de-atelier-main.jpg",
      top: "./Public/services/de-atelier/de-atelier-main.jpg",
      bottom: "./Public/services/approach/approach-main.jpg",
    },
    {
      title: "Dining Room",
      subtitle: "City View",
      main: "./Public/services/architecture/architecture-main.jpg",
      top: "./Public/2151003670.jpg",
      bottom: "./Public/services/construction/construction-main.jpg",
    },
    {
      title: "Lounge",
      subtitle: "Sunset Deck",
      main: "./Public/56bd5a4161ff0da43798dc1e10e7b57daa4fdf22.jpg",
      top: "./Public/66878b007410800d33e501ce4a6592ccbb6ac6da.jpg",
      bottom: "./Public/65339acbdecec6082d0c26491b2fd9b835f97d2d.jpg",
    },
  ];

  let currentSpace = 0;

  function setSpace(index) {
    const space = spaces[index];
    if (!space) return;

    if (titleEl) titleEl.textContent = space.title;
    if (subtitleEl) subtitleEl.textContent = space.subtitle;

    if (mainImg) {
      mainImg.src = space.main;
      mainImg.alt = `${space.title} main view`;
    }

    if (topImg) {
      topImg.src = space.top;
      topImg.alt = `${space.title} detail top`;
    }

    if (bottomImg) {
      bottomImg.src = space.bottom;
      bottomImg.alt = `${space.title} detail bottom`;
    }
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentSpace = (currentSpace + 1) % spaces.length;
      setSpace(currentSpace);
    });
  }

  setSpace(currentSpace);
}
