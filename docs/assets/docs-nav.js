// octo docs shell — no framework, no build. One manifest drives the sidebar on
// every docs page, so navigation lives in exactly one place. Also wires Mermaid
// diagrams and YAML highlighting the same way the landing page does.
//
// Mermaid is imported lazily (dynamic import inside renderDiagrams) so a CDN
// hiccup degrades to plain-text diagrams instead of taking the whole nav down.

const GH = 'https://github.com/juancavallotti/octo';

/* ---------- The docs information architecture (single source of truth) ---------- */
const NAV = [
  {
    title: 'Start here',
    links: [
      { href: 'docs.html', label: 'Overview' },
    ],
  },
  {
    title: 'Concepts & runtime',
    links: [
      { href: 'runtime-architecture.html', label: 'Runtime architecture' },
      { href: 'connectors.html', label: 'Connectors & blocks' },
      { href: 'cel.html', label: 'CEL expressions' },
      { href: 'state.html', label: 'State & clustering' },
      { href: 'error-handling.html', label: 'Error handling' },
    ],
  },
  {
    title: 'Build & run',
    links: [
      { href: 'building-integrations.html', label: 'Building integrations' },
      { href: 'standalone.html', label: 'Running standalone' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { href: 'platform.html', label: 'Platform architecture' },
      { href: 'deployment.html', label: 'Deployment' },
    ],
  },
  {
    title: 'AI',
    links: [
      { href: 'mcp.html', label: 'Authoring with MCP' },
    ],
  },
];

/* ---------- Current page (match by filename; treat / and docs.html as the hub) ---------- */
function currentFile() {
  const path = location.pathname.replace(/\/+$/, '');
  const file = path.split('/').pop() || '';
  return file === '' || file === 'index.html' ? 'docs.html' : file;
}

/* ---------- Top bar (brand + mobile toggle + GitHub) ---------- */
function renderTopbar() {
  const bar = document.getElementById('docs-topbar');
  if (!bar) return;
  bar.className = 'docs-topbar';
  bar.innerHTML = `
    <div class="docs-topbar-inner">
      <button class="docs-burger" id="docs-burger" aria-label="Toggle navigation">☰</button>
      <a class="brand" href="index.html"><img class="logo" src="assets/octo.png" alt="" /> Octo</a>
      <span class="docs-topbar-tag">Docs</span>
      <nav class="docs-topbar-links">
        <a href="index.html">Home</a>
        <a href="docs.html">Docs</a>
        <a href="index.html#samples">Samples</a>
        <a class="nav-gh" href="${GH}" target="_blank" rel="noopener">GitHub ↗</a>
      </nav>
    </div>`;
}

/* ---------- Sidebar ---------- */
function renderSidebar() {
  const aside = document.getElementById('docs-nav');
  if (!aside) return;
  aside.className = 'docs-sidebar';
  const here = currentFile();
  const groups = NAV.map((group) => {
    const links = group.links
      .map((l) => {
        const active = l.href === here ? ' aria-current="page"' : '';
        return `<a href="${l.href}" class="docs-nav-link"${active}>${l.label}</a>`;
      })
      .join('');
    return `<div class="docs-nav-group"><div class="docs-nav-title">${group.title}</div>${links}</div>`;
  }).join('');
  aside.innerHTML = `<nav class="docs-nav-inner">${groups}</nav>`;
}

/* ---------- Mobile drawer toggle ---------- */
function wireToggle() {
  const burger = document.getElementById('docs-burger');
  const aside = document.getElementById('docs-nav');
  if (!burger || !aside) return;
  burger.addEventListener('click', () => aside.classList.toggle('open'));
  // Close the drawer after following a link on mobile.
  aside.addEventListener('click', (e) => {
    if (e.target.closest('a')) aside.classList.remove('open');
  });
}

/* ---------- YAML highlighting (matches the landing-page approach) ---------- */
function highlightCode() {
  if (!window.hljs) return;
  document.querySelectorAll('pre code').forEach((el) => window.hljs.highlightElement(el));
}

/* ---------- Mermaid (same theme as the landing page; loaded lazily) ---------- */
async function renderDiagrams() {
  if (!document.querySelector('.mermaid')) return;
  try {
    const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: {
        background: '#0b0f14',
        primaryColor: '#141b24',
        primaryBorderColor: '#243140',
        primaryTextColor: '#e6edf3',
        lineColor: '#4a5d70',
        secondaryColor: '#11161d',
        tertiaryColor: '#11161d',
        fontSize: '14px',
      },
      flowchart: { htmlLabels: true, curve: 'basis', padding: 14 },
    });
    await mermaid.run({ querySelector: '.mermaid' });
  } catch (e) {
    console.error('mermaid load/render failed', e);
  }
}

// Nav + highlighting run synchronously and never depend on the CDN above.
renderTopbar();
renderSidebar();
wireToggle();
highlightCode();
renderDiagrams();
