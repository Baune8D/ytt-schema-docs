import $RefParser from '@apidevtools/json-schema-ref-parser';
import './style.css';

try {
  await $RefParser.dereference(
    {
      components: {
        schemas: window.defs,
      },
    },
    {
      dereference: {
        onDereference: (path, value, parent, prop) => {
          // Add extra properties to each value.
          value.ref = path.replace('#/components/schemas/', '');
          value.name = prop;

          // Add a parent reference value to all sub properties.
          Object.values(value.properties ?? {}).forEach((entry) => {
            if (entry.type === 'array') {
              entry.items.parentRef = value.ref;
            } else {
              entry.parentRef = value.ref;
            }
          });
        },
      },
    },
  );
} catch (err) {
  console.error(err);
}

const defs = window.defs;
const removeMe = '__REMOVE_ME__';
const rootKey = 'dataValues';
const svgNs = 'http://www.w3.org/2000/svg';
const content = document.getElementById('content');
const toc = document.getElementById('toc');

const anchorId = (ref) => `${ref}_anchor`;

// Build an element with classes and children, strings become text nodes.
const el = (tag, className = '', ...children) => {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  node.append(
    ...children.flat().filter((child) => child != null && child !== false),
  );
  return node;
};

// Parse HTML authored in #@schema/desc and #@schema/examples without executing scripts.
const fromHtml = (markup) => [
  ...new DOMParser().parseFromString(String(markup), 'text/html').body
    .childNodes,
];

const chevron = (className) => {
  const svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('fill-rule', 'evenodd');
  path.setAttribute('clip-rule', 'evenodd');
  path.setAttribute(
    'd',
    'M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z',
  );
  svg.append(path);
  return svg;
};

const chip = (text) =>
  el(
    'code',
    'inline-flex items-center rounded-md border border-line bg-chip px-1.5 py-0.5 font-mono text-xs text-heading',
    String(text),
  );

const constraint = (label, ...value) =>
  el(
    'div',
    'flex flex-wrap items-baseline gap-x-1.5 gap-y-1',
    el('dt', 'text-muted', label),
    el('dd', 'font-medium text-body', ...value),
  );

const enumText = (value) =>
  constraint(
    'One of',
    el('span', 'inline-flex flex-wrap gap-1', value.enum.map(chip)),
  );

const defaultText = (value) => constraint('Default', chip(value.default));

const minLengthText = (length) => constraint('Min length', chip(length));

const minimumText = (length) => constraint('Minimum', chip(length));

const maxLengthText = (length) => constraint('Max length', chip(length));

const maximumText = (length) => constraint('Maximum', chip(length));

const exampleText = (value) =>
  constraint(value['x-example-description'], ...fromHtml(value.example));

const requiredBadge = () =>
  el(
    'span',
    'inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger ring-1 ring-inset ring-danger/30',
    'Required',
  );

const anchorLink = (ref, className, ...children) => {
  const link = el(
    'a',
    `text-accent hover:underline ${className}`.trim(),
    ...children,
  );
  link.href = `#${anchorId(ref)}`;
  return link;
};

const isRequired = (value) =>
  ((Array.isArray(value.default) && value.default.length === 0) ||
    !value.default) &&
  (('enum' in value && !value.nullable) ||
    value.minLength ||
    value.minItems ||
    value.minimum);

const isHidden = (key, value) =>
  key.startsWith(removeMe) || value.title === removeMe;

// Display name of a map, arrays of maps are suffixed with [].
const mapName = (data) =>
  data.isArray ? `${data.name}[]` : (data.name ?? 'root');

function createTd(label) {
  return el(
    'td',
    'block px-4 py-2 align-top sm:px-6 md:table-cell md:py-4 md:first:pl-6',
    el(
      'div',
      'mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted md:hidden',
      label,
    ),
  );
}

function getName(key, value) {
  const ref = value.type === 'array' ? value.items.ref : value.ref;
  if (ref) {
    return anchorLink(
      ref,
      'font-mono text-sm font-semibold break-all',
      key,
      chevron('ml-1 inline h-3.5 w-3.5 align-[-2px]'),
    );
  }
  return el(
    'span',
    'font-mono text-sm font-semibold text-heading break-all',
    key,
  );
}

function getType(value) {
  let result = 'any';
  if (value.type === 'array') {
    result = `${value.type}<${value.items.type ?? 'any'}>`;
  } else if (value.type) {
    result = value.type;
  }
  if (value.nullable) {
    result = `nullable<${result}>`;
  }
  return chip(result);
}

function hasDefault(value) {
  if ('default' in value) {
    if (Array.isArray(value.default)) {
      return value.default.length;
    }
    return value.default;
  }
  return false;
}

function appendRow(key, data, table) {
  const value = data[key];

  // When type is array we need to fix some properties that was not possible on dereference.
  if (value.type === 'array') {
    value.items.name = key;
    value.items.isArray = true;
  }

  // Skip rendering row if title is __REMOVE_ME__
  if (isHidden(key, value)) {
    return;
  }

  const tr = el(
    'tr',
    'block border-b border-line py-2 last:border-b-0 md:table-row md:py-0 md:transition-colors md:hover:bg-hover/50',
  );

  const tdName = createTd('Property');
  tdName.append(getName(key, value));
  if (value.title) {
    tdName.append(el('div', 'mt-1 text-xs text-muted', value.title));
  }
  tr.append(tdName);

  const tdType = createTd('Type');
  tdType.append(
    el(
      'div',
      'flex flex-wrap items-center gap-2',
      getType(value),
      isRequired(value) ? requiredBadge() : null,
    ),
  );

  const constraints = [];

  const minLength = value.minLength || value.minItems;
  if (minLength) {
    constraints.push(minLengthText(minLength));
  }

  if ('minimum' in value) {
    constraints.push(minimumText(value.minimum));
  }

  const maxLength = value.maxLength || value.maxItems;
  if (maxLength) {
    constraints.push(maxLengthText(maxLength));
  }

  if ('maximum' in value) {
    constraints.push(maximumText(value.maximum));
  }

  if ('enum' in value) {
    constraints.push(enumText(value));
  }

  if (hasDefault(value)) {
    constraints.push(defaultText(value));
  }

  if ('example' in value) {
    constraints.push(exampleText(value));
  }

  if (constraints.length) {
    tdType.append(el('dl', 'mt-2 space-y-1.5 text-xs', constraints));
  }
  tr.append(tdType);

  const tdDesc = createTd('Description');
  tdDesc.append(
    value.description
      ? el('div', 'text-sm leading-relaxed', fromHtml(value.description))
      : el('span', 'text-sm italic text-muted', 'No description'),
  );
  tr.append(tdDesc);

  table.append(tr);
}

// Resolve the chain of parent maps, from the root down to the given map.
function resolvePath(data) {
  const path = [];
  let current = data;
  while (current) {
    path.unshift(current);
    current = current.parentRef ? defs[current.parentRef] : undefined;
  }
  return path;
}

function generateBreadCrumbs(data) {
  const path = resolvePath(data);
  const nav = el(
    'nav',
    'flex flex-wrap items-center gap-1.5 font-mono text-sm',
  );
  nav.setAttribute('aria-label', 'Breadcrumb');

  path.forEach((entry, index) => {
    if (index > 0) {
      nav.append(chevron('h-3.5 w-3.5 shrink-0 text-muted'));
    }
    if (index === path.length - 1) {
      const current = el('span', 'font-semibold text-heading', mapName(entry));
      current.setAttribute('aria-current', 'page');
      nav.append(current);
    } else {
      nav.append(anchorLink(entry.ref, '', mapName(entry)));
    }
  });

  return nav;
}

function createTable(key, index) {
  const data = defs[key];

  // Skip rendering table if title begins with __REMOVE_ME__
  if (isHidden(key, data)) {
    return;
  }

  const heading = el('h2', 'min-w-0', generateBreadCrumbs(data));
  heading.id = `${key}_heading`;

  const header = el(
    'div',
    'border-b border-line px-4 py-4 sm:px-6',
    el(
      'div',
      'flex flex-wrap items-center gap-x-3 gap-y-1',
      el(
        'span',
        'text-xs font-semibold uppercase tracking-wide text-muted',
        'Map',
      ),
      heading,
    ),
  );
  if (data.title && data.title !== removeMe && index > 0) {
    header.append(el('p', 'mt-1 text-sm text-muted', data.title));
  }

  const th = (label, className) => {
    const cell = el('th', `${className} px-6 py-3`.trim(), label);
    cell.scope = 'col';
    return cell;
  };

  const tbody = el('tbody', 'block divide-line md:table-row-group md:divide-y');
  tbody.id = key;

  const table = el(
    'table',
    'w-full border-collapse text-left md:table-fixed',
    el(
      'thead',
      'hidden md:table-header-group',
      el(
        'tr',
        'border-b border-line text-xs font-semibold uppercase tracking-wide text-muted',
        th('Property', 'w-1/4'),
        th('Type', 'w-[30%]'),
        th('Description', ''),
      ),
    ),
    tbody,
  );

  const section = el(
    'section',
    'scroll-mt-20 overflow-hidden rounded-xl border border-line bg-card shadow-sm',
    header,
    el('div', 'overflow-x-auto', table),
  );
  section.id = anchorId(key);
  section.setAttribute('aria-labelledby', heading.id);
  content.append(section);

  const properties = data.properties ?? {};

  // Append properties to table html.
  Object.keys(properties).forEach((prop) => appendRow(prop, properties, tbody));
}

function createToc(keys) {
  const list = el('ul', 'space-y-0.5 px-2 pb-3 lg:px-0 lg:pb-0');
  list.id = 'toc-list';

  keys
    .filter((key) => !isHidden(key, defs[key]))
    .forEach((key) => {
      const data = defs[key];
      const path = resolvePath(data);
      const depth = path.length - 1;

      const link = el(
        'a',
        'block rounded-md py-1 pr-2 font-mono text-sm text-body transition-colors hover:bg-hover/60 hover:text-heading',
        el('span', 'block truncate', mapName(data)),
        el('span', 'toc-hint hidden truncate font-sans text-xs text-muted'),
      );
      link.href = `#${anchorId(key)}`;
      link.title = mapName(data);
      link.style.paddingLeft = `${0.5 + depth * 0.75}rem`;

      const item = el('li', '', link);
      item.dataset.key = key;
      item.dataset.parents = path
        .slice(0, -1)
        .map((entry) => entry.ref)
        .join(' ');
      item.dataset.name = [mapName(data), data.title ?? '']
        .join(' ')
        .toLowerCase();
      item.dataset.properties = Object.keys(data.properties ?? {}).join(' ');
      list.append(item);
    });

  const summary = el(
    'summary',
    'cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted lg:cursor-default lg:px-2 lg:py-0 lg:pb-2 lg:[&::-webkit-details-marker]:hidden lg:[&::marker]:content-none',
    'Maps',
  );

  const input = el(
    'input',
    'w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm text-body placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
  );
  input.id = 'toc-search';
  input.type = 'search';
  input.placeholder = 'Filter maps and properties';
  input.autocomplete = 'off';
  input.setAttribute('aria-label', 'Filter maps and properties');

  const empty = el(
    'p',
    'hidden px-4 pb-3 text-sm italic text-muted lg:px-2',
    'No maps match',
  );
  empty.id = 'toc-empty';

  const details = el(
    'details',
    'rounded-xl border border-line bg-card lg:border-0 lg:bg-transparent',
    summary,
    el(
      'div',
      'z-10 bg-card px-4 pb-3 lg:sticky lg:top-0 lg:bg-page lg:px-0 lg:pb-2',
      input,
    ),
    list,
    empty,
  );
  details.open = true;
  toc.append(details);
}

// Filter the sidebar by map name, title or property name, keeping parents of a match for context.
function setupTocSearch() {
  const input = document.getElementById('toc-search');
  const empty = document.getElementById('toc-empty');
  const items = [...document.querySelectorAll('#toc-list li')];

  const filter = () => {
    const query = input.value.trim().toLowerCase();
    const shown = new Set();

    items.forEach((item) => {
      const hint = item.querySelector('.toc-hint');
      hint.textContent = '';
      hint.classList.add('hidden');

      if (!query) {
        shown.add(item.dataset.key);
        return;
      }

      const nameMatch = item.dataset.name.includes(query);
      const properties = item.dataset.properties
        .split(' ')
        .filter((property) => property.toLowerCase().includes(query));

      if (nameMatch || properties.length) {
        shown.add(item.dataset.key);
        item.dataset.parents
          .split(' ')
          .filter(Boolean)
          .forEach((parent) => shown.add(parent));
      }

      if (!nameMatch && properties.length) {
        hint.textContent = properties.join(', ');
        hint.classList.remove('hidden');
      }
    });

    items.forEach((item) =>
      item.classList.toggle('hidden', !shown.has(item.dataset.key)),
    );
    empty.classList.toggle('hidden', shown.size > 0);
  };

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.value = '';
      filter();
    }
  });
}

// Highlight the map being read, the first one not yet half scrolled past or still covering the top half of the viewport.
function setupScrollSpy() {
  const sections = [...document.querySelectorAll('main section')];
  const links = new Map(
    sections.map((section) => [
      section,
      document.querySelector(`#toc-list a[href="#${section.id}"]`),
    ]),
  );
  const activeClasses = ['bg-hover', 'text-heading', 'font-semibold'];
  let active;

  const update = () => {
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2;
    const headerLine = 96;
    const center = window.innerHeight / 2;
    let current = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top + rect.height / 2 > headerLine || rect.bottom > center;
    });
    if (atBottom || !current) {
      current = sections[sections.length - 1];
    }
    if (current === active) {
      return;
    }

    links.get(active)?.classList.remove(...activeClasses);
    links.get(active)?.removeAttribute('aria-current');
    active = current;
    const link = links.get(active);
    if (!link) {
      return;
    }
    link.classList.add(...activeClasses);
    link.setAttribute('aria-current', 'true');

    if (link.offsetParent && window.matchMedia('(min-width: 1024px)').matches) {
      const tocRect = toc.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      if (linkRect.top < tocRect.top + 48 || linkRect.bottom > tocRect.bottom) {
        toc.scrollTop += linkRect.top - tocRect.top - tocRect.height / 2;
      }
    }
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function setupThemeToggle() {
  const button = document.getElementById('theme-toggle');
  if (!button) {
    return;
  }
  button.addEventListener('click', () => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : prefersDark;
    const next = isDark ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch (err) {
      console.warn(err);
    }
  });
}

// Collect map keys depth first in schema order, starting from the root data values.
function collectKeys(key, keys = []) {
  keys.push(key);
  Object.values(defs[key].properties ?? {}).forEach((value) => {
    const ref = value.type === 'array' ? value.items.ref : value.ref;
    if (ref && !keys.includes(ref)) {
      collectKeys(ref, keys);
    }
  });
  return keys;
}

// The root is never dereferenced, so give it the same metadata as the other maps.
defs[rootKey].ref = rootKey;
Object.values(defs[rootKey].properties ?? {}).forEach((entry) => {
  if (entry.type === 'array') {
    entry.items.parentRef = rootKey;
  } else {
    entry.parentRef = rootKey;
  }
});

const keys = collectKeys(rootKey);

// Render all properties to tables.
keys.forEach((key, index) => createTable(key, index));
createToc(keys);
setupTocSearch();
setupScrollSpy();
setupThemeToggle();
