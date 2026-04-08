const projectTabs = document.querySelectorAll("[data-project-tab]");
const projectImages = document.querySelectorAll(".projects-frame .project-card img");

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
