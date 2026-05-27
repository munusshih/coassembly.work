// Decorates the main column items: random italics on English text, big
// circular number badges on ordered-list items, and a scroll-triggered
// staggered reveal animation via GSAP ScrollTrigger.
// GSAP + ScrollTrigger are loaded via CDN <script> in src/components/Reveal.astro.

const ITALIC_P = 0.18;

function italicize(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeValue.trim()) targets.push(n);
  }
  for (const tn of targets) {
    const parts = tn.nodeValue.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      if (Math.random() < ITALIC_P) {
        const em = document.createElement("em");
        em.textContent = part;
        frag.appendChild(em);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    }
    tn.parentNode.replaceChild(frag, tn);
  }
}

function addBadges() {
  for (const col of document.querySelectorAll(".col")) {
    let i = 0;
    const tag = (col.lang || "x").replace(/[^a-z]/gi, "");
    for (const li of col.querySelectorAll(":scope > ol > li")) {
      i++;
      const id = `badge-${tag}-${i}`;
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.setAttribute("aria-hidden", "true");
      badge.innerHTML =
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<mask id="' +
        id +
        '">' +
        '<rect width="100" height="100" fill="white"/>' +
        '<text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="inherit" font-weight="700" font-size="68" fill="black">' +
        i +
        "</text>" +
        "</mask>" +
        '<circle cx="50" cy="50" r="48" fill="#000" mask="url(#' +
        id +
        ')"/>' +
        "</svg>";
      li.prepend(badge);
    }
  }
}

const main = document.querySelector("main");
if (main) {
  for (const el of main.querySelectorAll('[lang="en"] li, [lang="en"] p')) {
    italicize(el);
  }
  addBadges();

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const all = Array.from(
    main.querySelectorAll(
      ".col > h1, .col > ol > li, .col > p, [data-reveal]",
    ),
  );

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  if (typeof gsap === "undefined" || reduceMotion || !all.length) {
    main.classList.add("decorated");
  } else {
    gsap.set(all, {
      clipPath: "inset(0 100% 0 0)",
      xPercent: -2,
      willChange: "clip-path, transform",
    });
    main.classList.add("decorated");

    if (gsap.registerPlugin && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    const reveal = (batch) => {
      gsap.to(batch, {
        clipPath: "inset(0 0% 0 0)",
        xPercent: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.15,
        onComplete: () => {
          for (const el of batch) el.style.willChange = "";
        },
      });
    };

    if (ScrollTrigger) {
      ScrollTrigger.batch(all, {
        start: "top 90%",
        once: true,
        onEnter: reveal,
      });
    } else {
      reveal(all);
    }
  }
}
