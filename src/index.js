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
          Object.keys(value.properties).forEach((key) => {
            const entry = value.properties[key];
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
const content = document.getElementById('content');
const toc = document.getElementById('toc');

const anchorId = (ref) => `${ref}_anchor`;

const chip = (text) =>
  `<code class="inline-flex items-center rounded-md border border-line bg-chip px-1.5 py-0.5 font-mono text-xs text-heading">${text}</code>`;

const constraint = (label, value) =>
  `<div class="flex flex-wrap items-baseline gap-x-1.5 gap-y-1"><dt class="text-muted">${label}</dt><dd class="font-medium text-body">${value}</dd></div>`;

const enumText = (value) =>
  constraint(
    'One of',
    `<span class="inline-flex flex-wrap gap-1">${value.enum.map(chip).join('')}</span>`,
  );

const defaultText = (value) => constraint('Default', chip(value.default));

const minLengthText = (length) => constraint('Min length', chip(length));

const minimumText = (length) => constraint('Minimum', chip(length));

const maxLengthText = (length) => constraint('Max length', chip(length));

const maximumText = (length) => constraint('Maximum', chip(length));

const exampleText = (value) =>
  constraint(value['x-example-description'], value.example);

const requiredText = () =>
  '<span class="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger ring-1 ring-inset ring-danger/30">Required</span>';

const anchorLink = (ref, text, className = '') =>
  `<a href="#${anchorId(ref)}" class="text-accent hover:underline ${className}">${text}</a>`;

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
  const td = document.createElement('td');
  td.className =
    'block px-4 py-2 align-top sm:px-6 md:table-cell md:py-4 md:first:pl-6';
  td.innerHTML = `<div class="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted md:hidden">${label}</div>`;
  return td;
}

function getName(key, value) {
  const ref = value.type === 'array' ? value.items.ref : value.ref;
  if (ref) {
    const icon =
      '<svg class="ml-1 inline h-3.5 w-3.5 align-[-2px]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clip-rule="evenodd"/></svg>';
    return anchorLink(
      ref,
      `${key}${icon}`,
      'font-mono text-sm font-semibold break-all',
    );
  }
  return `<span class="font-mono text-sm font-semibold text-heading break-all">${key}</span>`;
}

function getType(value) {
  let result = 'any';
  if (value.type === 'array') {
    result = `${value.type}&lt;${value.items.type ?? 'any'}&gt;`;
  } else if (value.type) {
    result = value.type;
  }
  if (value.nullable) {
    result = `nullable&lt;${result}&gt;`;
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

  const tr = document.createElement('tr');
  tr.className =
    'block border-b border-line py-2 last:border-b-0 md:table-row md:py-0 md:transition-colors md:hover:bg-hover/50';

  const tdName = createTd('Property');
  tdName.innerHTML += getName(key, value);
  if (value.title) {
    tdName.innerHTML += `<div class="mt-1 text-xs text-muted">${value.title}</div>`;
  }
  tr.appendChild(tdName);

  const tdType = createTd('Type');

  let badges = getType(value);
  if (isRequired(value)) {
    badges += requiredText(value);
  }
  tdType.innerHTML += `<div class="flex flex-wrap items-center gap-2">${badges}</div>`;

  let constraints = '';

  const minLength = value.minLength || value.minItems;
  if (minLength) {
    constraints += minLengthText(minLength);
  }

  if ('minimum' in value) {
    constraints += minimumText(value.minimum);
  }

  const maxLength = value.maxLength || value.maxItems;
  if (maxLength) {
    constraints += maxLengthText(maxLength);
  }

  if ('maximum' in value) {
    constraints += maximumText(value.maximum);
  }

  if ('enum' in value) {
    constraints += enumText(value);
  }

  if (hasDefault(value)) {
    constraints += defaultText(value);
  }

  if ('example' in value) {
    constraints += exampleText(value);
  }

  if (constraints) {
    tdType.innerHTML += `<dl class="mt-2 space-y-1.5 text-xs">${constraints}</dl>`;
  }

  tr.appendChild(tdType);

  const tdDesc = createTd('Description');
  tdDesc.innerHTML += value.description
    ? `<div class="text-sm leading-relaxed">${value.description}</div>`
    : '<span class="text-sm italic text-muted">No description</span>';
  tr.appendChild(tdDesc);

  table.appendChild(tr);
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
  const links = path.map((entry, index) =>
    index === path.length - 1
      ? `<span class="font-semibold text-heading" aria-current="page">${mapName(entry)}</span>`
      : anchorLink(entry.ref, mapName(entry)),
  );

  const separator =
    '<svg class="h-3.5 w-3.5 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clip-rule="evenodd"/></svg>';

  return `<nav class="flex flex-wrap items-center gap-1.5 font-mono text-sm" aria-label="Breadcrumb">${links.join(separator)}</nav>`;
}

function createTable(key, index) {
  const data = defs[key];

  // Skip rendering table if title begins with __REMOVE_ME__
  if (isHidden(key, data)) {
    return;
  }

  const title =
    data.title && data.title !== removeMe && index > 0
      ? `<p class="mt-1 text-sm text-muted">${data.title}</p>`
      : '';

  content.innerHTML += `
        <section id="${anchorId(key)}" class="scroll-mt-20 overflow-hidden rounded-xl border border-line bg-card shadow-sm" aria-labelledby="${key}_heading">
            <div class="border-b border-line px-4 py-4 sm:px-6">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span class="text-xs font-semibold uppercase tracking-wide text-muted">Map</span>
                    <h2 id="${key}_heading" class="min-w-0">${generateBreadCrumbs(data)}</h2>
                </div>
                ${title}
            </div>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left md:table-fixed">
                    <thead class="hidden md:table-header-group">
                        <tr class="border-b border-line text-xs font-semibold uppercase tracking-wide text-muted">
                            <th class="w-1/4 px-6 py-3" scope="col">Property</th>
                            <th class="w-[30%] px-6 py-3" scope="col">Type</th>
                            <th class="px-6 py-3" scope="col">Description</th>
                        </tr>
                    </thead>
                    <tbody class="block divide-line md:table-row-group md:divide-y" id="${key}"></tbody>
                </table>
            </div>
        </section>`;

  const properties = data.properties;
  const table = document.getElementById(key);

  // Append properties to table html.
  Object.keys(properties).forEach((prop) => appendRow(prop, properties, table));
}

const escapeAttr = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

function createToc(keys) {
  const items = keys
    .filter((key) => !isHidden(key, defs[key]))
    .map((key) => {
      const data = defs[key];
      const path = resolvePath(data);
      const depth = path.length - 1;
      const parents = path.slice(0, -1).map((entry) => entry.ref);
      const properties = Object.keys(data.properties ?? {});
      const name = [mapName(data), data.title ?? ''].join(' ').toLowerCase();
      return `<li data-key="${escapeAttr(key)}" data-parents="${escapeAttr(parents.join(' '))}" data-name="${escapeAttr(name)}" data-properties="${escapeAttr(properties.join(' '))}">
            <a href="#${anchorId(key)}" class="block rounded-md py-1 pr-2 font-mono text-sm text-body transition-colors hover:bg-hover/60 hover:text-heading" style="padding-left: ${0.5 + depth * 0.75}rem" title="${escapeAttr(mapName(data))}">
                <span class="block truncate">${mapName(data)}</span>
                <span class="toc-hint hidden truncate font-sans text-xs text-muted"></span>
            </a>
        </li>`;
    })
    .join('');

  toc.innerHTML = `
        <details class="rounded-xl border border-line bg-card lg:border-0 lg:bg-transparent" open>
            <summary class="cursor-pointer select-none px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted lg:cursor-default lg:px-2 lg:py-0 lg:pb-2 lg:[&::-webkit-details-marker]:hidden lg:[&::marker]:content-none">Maps</summary>
            <div class="z-10 bg-card px-4 pb-3 lg:sticky lg:top-0 lg:bg-page lg:px-0 lg:pb-2">
                <input id="toc-search" type="search" placeholder="Filter maps and properties" autocomplete="off" class="w-full rounded-md border border-line bg-card px-3 py-1.5 text-sm text-body placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" aria-label="Filter maps and properties" />
            </div>
            <ul id="toc-list" class="space-y-0.5 px-2 pb-3 lg:px-0 lg:pb-0">${items}</ul>
            <p id="toc-empty" class="hidden px-4 pb-3 text-sm italic text-muted lg:px-2">No maps match</p>
        </details>`;
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
  Object.values(defs[key].properties).forEach((value) => {
    const ref = value.type === 'array' ? value.items.ref : value.ref;
    if (ref && !keys.includes(ref)) {
      collectKeys(ref, keys);
    }
  });
  return keys;
}

// The root is never dereferenced, so give it the same metadata as the other maps.
defs[rootKey].ref = rootKey;
Object.values(defs[rootKey].properties).forEach((entry) => {
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
