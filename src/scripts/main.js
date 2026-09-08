(() => {
  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  root.classList.add("js");

  /* Navigation */
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector(".site-nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = [...document.querySelectorAll(".site-nav > a")];
  const more = document.querySelector(".nav-more");
  const moreToggle = document.querySelector("[data-more-toggle]");

  const closeNavigation = () => {
    nav?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    more?.classList.remove("is-open");
    moreToggle?.setAttribute("aria-expanded", "false");
    body.classList.remove("nav-open");
  };

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") !== "true";
    nav?.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    body.classList.toggle("nav-open", open);
  });

  moreToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !more?.classList.contains("is-open");
    more?.classList.toggle("is-open", open);
    moreToggle.setAttribute("aria-expanded", String(open));
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeNavigation();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-more")) {
      more?.classList.remove("is-open");
      moreToggle?.setAttribute("aria-expanded", "false");
    }
  });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* Entrance motion and active section */
  const revealItems = [...document.querySelectorAll(".reveal")];
  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.06 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  if ("IntersectionObserver" in window) {
    const sections = [...document.querySelectorAll("main section[id]")];
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${current.target.id}`));
    }, { rootMargin: "-24% 0px -64% 0px", threshold: [0.01, 0.15, 0.35] });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* Experience accordions and row-synced career timeline */
  const experienceList = document.querySelector(".experience-list");
  const experienceItems = [...document.querySelectorAll(".experience-item")];
  const careerTimeline = document.querySelector(".career-timeline");
  const timelineMarkers = [...document.querySelectorAll(".career-timeline li")];
  let timelineFrame = 0;

  const syncCareerTimeline = () => {
    if (!experienceList || !careerTimeline || timelineMarkers.length !== experienceItems.length) return;
    const timelineRect = careerTimeline.getBoundingClientRect();
    const positions = experienceItems.map((item) => {
      const trigger = item.querySelector(".experience-trigger");
      const triggerRect = trigger?.getBoundingClientRect();
      return triggerRect ? triggerRect.top - timelineRect.top + triggerRect.height / 2 : 0;
    });

    timelineMarkers.forEach((marker, index) => {
      marker.style.setProperty("--timeline-y", `${positions[index]}px`);
    });

    if (positions.length > 1) {
      careerTimeline.style.setProperty("--timeline-start", `${positions[0]}px`);
      careerTimeline.style.setProperty("--timeline-line-height", `${positions.at(-1) - positions[0]}px`);
    }
  };

  const queueTimelineSync = () => {
    window.cancelAnimationFrame(timelineFrame);
    timelineFrame = window.requestAnimationFrame(syncCareerTimeline);
  };

  experienceItems.forEach((item, index) => {
    const trigger = item.querySelector(".experience-trigger");
    trigger?.addEventListener("click", () => {
      const panel = item.querySelector(".experience-panel");
      const willOpen = trigger.getAttribute("aria-expanded") !== "true";
      item.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", String(willOpen));
      if (panel) panel.inert = !willOpen;
      timelineMarkers.forEach((marker, markerIndex) => marker.classList.toggle("is-selected", markerIndex === index));
      queueTimelineSync();
    });
  });

  if ("ResizeObserver" in window && experienceList) {
    const timelineObserver = new ResizeObserver(queueTimelineSync);
    timelineObserver.observe(experienceList);
    experienceItems.forEach((item) => timelineObserver.observe(item));
  }
  window.addEventListener("resize", queueTimelineSync, { passive: true });
  document.fonts?.ready.then(queueTimelineSync);
  queueTimelineSync();

  /* Publications: filters, rail, cursor-responsive pixels */
  const publicationRail = document.querySelector("[data-publication-rail]");
  const publicationCards = [...document.querySelectorAll(".paper-card")];
  const publicationButtons = [...document.querySelectorAll("[data-publication-filter]")];

  publicationButtons.forEach((button, index) => {
    button.setAttribute("aria-pressed", String(index === 0));
    button.addEventListener("click", () => {
      const value = button.dataset.publicationFilter;
      publicationButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      publicationCards.forEach((card) => card.classList.toggle("is-filtered", value !== "all" && card.dataset.year !== value));
      publicationRail?.scrollTo({ left: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  document.querySelector("[data-rail-prev]")?.addEventListener("click", () => publicationRail?.scrollBy({ left: -380, behavior: reducedMotion ? "auto" : "smooth" }));
  document.querySelector("[data-rail-next]")?.addEventListener("click", () => publicationRail?.scrollBy({ left: 380, behavior: reducedMotion ? "auto" : "smooth" }));

  if (publicationRail && finePointer) {
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    publicationRail.addEventListener("pointerdown", (event) => {
      if (event.target.closest("a, button")) return;
      dragging = true;
      startX = event.clientX;
      startScroll = publicationRail.scrollLeft;
      publicationRail.classList.add("is-dragging");
      publicationRail.setPointerCapture(event.pointerId);
    });
    publicationRail.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      publicationRail.scrollLeft = startScroll - (event.clientX - startX) * 1.2;
    });
    const stopDragging = () => { dragging = false; publicationRail.classList.remove("is-dragging"); };
    publicationRail.addEventListener("pointerup", stopDragging);
    publicationRail.addEventListener("pointercancel", stopDragging);
  }

  publicationCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--pixel-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
      card.style.setProperty("--pixel-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
    }, { passive: true });
  });

  /* Project archive and discipline filters */
  const projectCards = [...document.querySelectorAll(".project-card")];
  const projectButtons = [...document.querySelectorAll("[data-project-filter]")];
  const showProjects = document.querySelector("[data-show-projects]");
  const projectCount = document.querySelector("[data-project-count]");
  let archiveExpanded = false;
  let projectFilter = "all";

  const updateProjects = () => {
    let visible = 0;
    projectCards.forEach((card) => {
      const matchesFilter = projectFilter === "all" || card.dataset.category?.split(" ").includes(projectFilter);
      const allowedByArchive = archiveExpanded || projectFilter !== "all" || Number(card.dataset.order) <= 6;
      const show = matchesFilter && allowedByArchive;
      card.classList.toggle("is-filtered", !matchesFilter);
      card.classList.toggle("is-expanded", allowedByArchive);
      if (show) visible += 1;
    });
    if (projectCount) projectCount.textContent = String(visible).padStart(2, "0");
    if (showProjects) {
      showProjects.setAttribute("aria-expanded", String(archiveExpanded));
      showProjects.querySelector("span").textContent = archiveExpanded ? "Collapse to selected projects" : "Show complete project archive";
      showProjects.querySelector("i").textContent = archiveExpanded ? "− 06" : "+ 06";
    }
  };

  projectButtons.forEach((button, index) => {
    button.setAttribute("aria-pressed", String(index === 0));
    button.addEventListener("click", () => {
      projectFilter = button.dataset.projectFilter || "all";
      projectButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("is-active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      updateProjects();
    });
  });

  showProjects?.addEventListener("click", () => { archiveExpanded = !archiveExpanded; updateProjects(); });
  updateProjects();

  /* Deliberate, lazy-loaded iframe previews */
  const modal = document.querySelector(".preview-modal");
  const frame = modal?.querySelector("iframe");
  const modalTitle = modal?.querySelector("[data-preview-title]");
  const externalLink = modal?.querySelector("[data-preview-external]");
  const modalClose = modal?.querySelector("header button");
  const previewWindow = modal?.querySelector(".preview-window");
  let previewReturnFocus = null;
  let previewOpenedByHover = false;
  let hoverPreviewTimer = 0;

  const closePreview = () => {
    window.clearTimeout(hoverPreviewTimer);
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    body.classList.remove("modal-open");
    if (frame) { frame.removeAttribute("src"); frame.classList.remove("is-loaded"); }
    previewReturnFocus?.focus();
    previewReturnFocus = null;
    previewOpenedByHover = false;
  };

  const openPreview = (trigger, openedByHover = false) => {
    window.clearTimeout(hoverPreviewTimer);
    const card = trigger.closest(".project-card");
    const url = card?.dataset.previewUrl;
    if (!modal || !frame || !url) return;
    previewOpenedByHover = openedByHover;
    previewReturnFocus = openedByHover ? null : trigger;
    modal.hidden = false;
    body.classList.add("modal-open");
    if (modalTitle) modalTitle.textContent = card.dataset.previewTitle || "Live project";
    if (externalLink) externalLink.href = card.querySelector(".project-links a:last-child")?.href || url.replace("?embed=true", "");
    frame.classList.remove("is-loaded");
    frame.src = url;
    if (!openedByHover) modalClose?.focus();
  };

  document.querySelectorAll(".preview-trigger").forEach((trigger) => trigger.addEventListener("click", () => openPreview(trigger)));
  if (finePointer && !reducedMotion) {
    document.querySelectorAll(".project-card[data-preview-url]").forEach((card) => {
      const media = card.querySelector(".project-media");
      const trigger = card.querySelector(".preview-trigger");
      if (!media || !trigger) return;
      media.addEventListener("mouseenter", () => {
        window.clearTimeout(hoverPreviewTimer);
        hoverPreviewTimer = window.setTimeout(() => openPreview(trigger, true), 480);
      });
      media.addEventListener("mouseleave", () => window.clearTimeout(hoverPreviewTimer));
    });
    previewWindow?.addEventListener("mouseleave", () => {
      if (previewOpenedByHover) closePreview();
    });
  }
  modal?.querySelectorAll("[data-preview-close]").forEach((item) => item.addEventListener("click", closePreview));
  frame?.addEventListener("load", () => frame.classList.add("is-loaded"));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { closePreview(); closeNavigation(); }
    if (event.key !== "Tab" || !modal || modal.hidden) return;
    const focusable = [...modal.querySelectorAll("button, a, iframe")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });

  /* Pointer depth and liquid highlights */
  if (finePointer && !reducedMotion) {
    window.addEventListener("pointermove", (event) => {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
    }, { passive: true });

    document.querySelectorAll(".liquid-panel").forEach((panel) => {
      panel.addEventListener("pointermove", (event) => {
        const bounds = panel.getBoundingClientRect();
        panel.style.setProperty("--glass-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
        panel.style.setProperty("--glass-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
      }, { passive: true });
    });

    document.querySelectorAll(".project-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        card.style.setProperty("--rx", `${(0.5 - y) * 3.5}deg`);
        card.style.setProperty("--ry", `${(x - 0.5) * 3.5}deg`);
      });
      card.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
    });

    const identityStage = document.querySelector("[data-tilt]");
    identityStage?.addEventListener("pointermove", (event) => {
      const bounds = identityStage.getBoundingClientRect();
      identityStage.style.setProperty("--tilt-x", `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 5}deg`);
      identityStage.style.setProperty("--tilt-y", `${(((event.clientX - bounds.left) / bounds.width) - 0.5) * 7}deg`);
    });
    identityStage?.addEventListener("pointerleave", () => { identityStage.style.setProperty("--tilt-x", "0deg"); identityStage.style.setProperty("--tilt-y", "0deg"); });

    document.querySelectorAll(".magnetic").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const bounds = item.getBoundingClientRect();
        item.style.transform = `translate3d(${(event.clientX - bounds.left - bounds.width / 2) * .06}px, ${(event.clientY - bounds.top - bounds.height / 2) * .08}px, 0)`;
      });
      item.addEventListener("pointerleave", () => { item.style.transform = ""; });
    });
  }

  /* Count-up once the research instrument enters view */
  const counters = [...document.querySelectorAll("[data-counter]")];
  const runCounters = () => counters.forEach((element) => {
    const target = Number(element.dataset.counter || 0);
    if (reducedMotion) { element.textContent = String(target); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = clamp((now - start) / 1050, 0, 1);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  const consolePanel = document.querySelector(".research-console");
  if (consolePanel && "IntersectionObserver" in window && !reducedMotion) {
    const counterObserver = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      runCounters();
      observer.disconnect();
    }, { threshold: .3 });
    counterObserver.observe(consolePanel);
  } else { runCounters(); }

  /* Lightweight canvas fields */
  const setupHeroField = () => {
    const canvas = document.querySelector("#hero-field");
    const host = document.querySelector(".hero");
    if (!(canvas instanceof HTMLCanvasElement) || !host || reducedMotion) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let width = 1, height = 1, ratio = 1, frameId = 0, visible = true;
    let points = [];
    const pointer = { x: -1000, y: -1000 };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.floor(bounds.width)); height = Math.max(1, Math.floor(bounds.height));
      canvas.width = Math.floor(width * ratio); canvas.height = Math.floor(height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0);
      points = Array.from({ length: clamp(Math.round(width / 30), 28, 55) }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .14, vy: (Math.random() - .5) * .14, r: .6 + Math.random() * 1.1 }));
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      points.forEach((point, index) => {
        point.x += point.vx; point.y += point.vy;
        if (point.x < 0 || point.x > width) point.vx *= -1;
        if (point.y < 0 || point.y > height) point.vy *= -1;
        const dx = point.x - pointer.x; const dy = point.y - pointer.y; const distanceToPointer = Math.hypot(dx, dy);
        if (distanceToPointer < 110 && distanceToPointer > 0) { point.x += (dx / distanceToPointer) * .35; point.y += (dy / distanceToPointer) * .35; }
        for (let next = index + 1; next < points.length; next += 1) {
          const other = points[next]; const distance = Math.hypot(point.x - other.x, point.y - other.y);
          if (distance > 105) continue;
          context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(other.x, other.y); context.strokeStyle = `rgba(102,244,192,${(1 - distance / 105) * .13})`; context.lineWidth = .65; context.stroke();
        }
        context.beginPath(); context.arc(point.x, point.y, point.r, 0, Math.PI * 2); context.fillStyle = "rgba(184,255,61,.52)"; context.fill();
      });
      if (visible) frameId = requestAnimationFrame(draw);
    };
    host.addEventListener("pointermove", (event) => { const bounds = host.getBoundingClientRect(); pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top; }, { passive: true });
    host.addEventListener("pointerleave", () => { pointer.x = -1000; pointer.y = -1000; });
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; cancelAnimationFrame(frameId); if (visible) draw(); }).observe(host);
    resize(); draw();
  };

  const setupPublicationField = () => {
    const canvas = document.querySelector("#publication-field");
    const host = document.querySelector(".publications");
    if (!(canvas instanceof HTMLCanvasElement) || !host || reducedMotion) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let width = 1, height = 1, ratio = 1, frameId = 0, visible = true;
    let streams = [];
    const resize = () => {
      const bounds = host.getBoundingClientRect(); ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      width = Math.floor(bounds.width); height = Math.floor(bounds.height); canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0);
      streams = Array.from({ length: clamp(Math.round(width / 95), 10, 18) }, (_, index) => ({ x: (index / 18) * width + Math.random() * 60, y: Math.random() * height, speed: .22 + Math.random() * .35, size: 2 + Math.floor(Math.random() * 4), hue: index % 4 }));
    };
    const colors = ["rgba(184,255,61,.28)", "rgba(102,244,192,.24)", "rgba(88,215,245,.2)", "rgba(154,124,248,.16)"];
    const draw = () => {
      context.clearRect(0, 0, width, height);
      streams.forEach((stream) => {
        stream.y += stream.speed; if (stream.y > height + 20) stream.y = -20;
        for (let cell = 0; cell < 7; cell += 1) { context.fillStyle = colors[stream.hue]; context.fillRect(stream.x + (cell % 2) * 6, stream.y - cell * 10, stream.size, stream.size); }
      });
      if (visible) frameId = requestAnimationFrame(draw);
    };
    new ResizeObserver(resize).observe(host);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; cancelAnimationFrame(frameId); if (visible) draw(); }).observe(host);
    resize(); draw();
  };

  setupHeroField();
  setupPublicationField();

  /* Halftone-by-default portrait with an explicit touch/keyboard color toggle */
  const portraitSwitch = document.querySelector("[data-portrait-switch]");
  if (portraitSwitch) {
    portraitSwitch.addEventListener("click", () => {
      const isColor = portraitSwitch.classList.toggle("is-color");
      portraitSwitch.setAttribute("aria-pressed", String(isColor));
    });
  }

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();


/* Calculate completed experience from September 3, 2018 */
const careerStartDate = new Date(2018, 8, 3); // Month is zero-based: 8 = September
const today = new Date();

let experienceYears = today.getFullYear() - careerStartDate.getFullYear();

const anniversaryPassed =
  today.getMonth() > careerStartDate.getMonth() ||
  (today.getMonth() === careerStartDate.getMonth() &&
    today.getDate() >= careerStartDate.getDate());

if (!anniversaryPassed) {
  experienceYears -= 1;
}

document.querySelectorAll("[data-experience-years]").forEach((element) => {
  element.textContent = experienceYears;
});


document.querySelectorAll("[data-experience-years]").forEach((element) => {
  element.textContent = `${experienceYears}+ years`;
});

const numberWords = [
  "zero", "one", "two", "three", "four", "five",
  "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen",
  "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty"
];

const experienceYearsWord =
  numberWords[experienceYears] || experienceYears.toString();

document.querySelectorAll("[data-experience-summary]").forEach((element) => {
  element.textContent =
    `For ${experienceYearsWord} years, I have worked where model behavior, scientific evidence, and real operating constraints meet.`;
});

document.querySelectorAll("[data-experience-years-word]").forEach((element) => {
  element.textContent = experienceYearsWord;
});