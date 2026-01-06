// public/nav.js
(function () {
  const links = [
    { href: "/",            label: "Home",        id: "home" },
    { href: "/upload",      label: "Upload",      id: "upload" },
    { href: "/reports",     label: "Reports",     id: "reports" },
    { href: "/coming-soon", label: "Coming Soon", id: "coming" },
    { href: "/pricing",     label: "Pricing",     id: "pricing" },
    { href: "/faq",         label: "FAQ",         id: "faq" },
    { href: "/contact",     label: "Contact",     id: "contact" },
    { href: "/about",       label: "About",       id: "about" }
  ];

  const curr = location.pathname.replace(/\/+$/,'') || "/";
  const html = `
    <div class="navwrap">
      <a class="brand" href="/"><img src="/virtualcoach-logo-transparent.png" alt="Virtual Coach AI"><span>Virtual Coach AI</span></a>
      <nav aria-label="Primary">
        ${links.map(l => {
          const isCurrent =
            curr === l.href ||
            (l.href !== "/" && curr.startsWith(l.href));
          return `<a href="${l.href}" ${isCurrent ? 'aria-current="page"' : ''}>${l.label}</a>`;
        }).join("")}
      </nav>
    </div>
  `;

  const hdr = document.getElementById("site-header");
  if (hdr) hdr.innerHTML = html;
})();



