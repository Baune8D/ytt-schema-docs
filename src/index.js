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
const content = document.getElementById('content');

const subText = (text) => `<div class="text-xs mt-1">${text}</div>`;

const enumText = (value) =>
  subText(
    `Enum: ["<strong>${value.enum.join('</strong>", "<strong>')}</strong>"]`,
  );

const defaultText = (value) =>
  subText(`Default: <strong>${value.default}</strong>`);

const minLengthText = (length) =>
  subText(`Minimum length: <strong>${length}</strong>`);

const minimumText = (length) => subText(`Minimum: <strong>${length}</strong>`);

const maxLengthText = (length) =>
  subText(`Maximum length: <strong>${length}</strong>`);

const maximumText = (length) => subText(`Maximum: <strong>${length}</strong>`);

const exampleText = (value) =>
  subText(`${value['x-example-description']}: ${value.example}`);

const requiredText = () =>
  '<span class="font-bold italic text-red-600 text-xs ml-2">Required</span>';

const anchorLink = (ref, text) =>
  `<a href="#${ref}_anchor" class="text-blue-600 hover:underline">${text}</a>`;

const isRequired = (value) =>
  ((Array.isArray(value.default) && value.default.length === 0) ||
    !value.default) &&
  (('enum' in value && !value.nullable) ||
    value.minLength ||
    value.minItems ||
    value.minimum);

function createTd(index) {
  const td = document.createElement('td');
  if (index % 2 === 0) {
    td.className = 'border-b border-slate-700 p-4 text-slate-400';
  } else {
    td.className = 'border-b border-slate-700 p-4 pl-8 text-slate-400';
  }
  td.innerHTML = '';
  return td;
}

function getName(key, value) {
  let result = key;
  if (value.type === 'array' && value.items.ref) {
    result = anchorLink(value.items.ref, result);
  } else if (value.ref) {
    result = anchorLink(value.ref, result);
  }
  return `<div class="font-bold">${result}</div>`;
}

function getType(value) {
  let result = 'any';
  if (value.type === 'array') {
    result = `${value.type}&lt;${value.items.type}&gt;`;
  } else if (value.type) {
    result = value.type;
  }
  if (value.nullable) {
    result = `nullable&lt;${result}&gt;`;
  }
  return `<span class="font-bold italic">${result}</span>`;
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

  const tr = document.createElement('tr');

  const tdName = createTd(1);
  tdName.innerHTML += getName(key, value);
  if ('title' in value) {
    if (value.title === removeMe) {
      return;
    }
    tdName.innerHTML += `<div class="italic text-sm mt-1">${value.title}</div>`;
  }
  tr.appendChild(tdName);

  const tdType = createTd(2);

  tdType.innerHTML += getType(value);

  if (isRequired(value)) {
    tdType.innerHTML += requiredText(value);
  }

  const minLength = value.minLength || value.minItems;
  if (minLength) {
    tdType.innerHTML += minLengthText(minLength);
  }

  if (value.minimum) {
    tdType.innerHTML += minimumText(value.minimum);
  }

  const maxLength = value.maxLength || value.maxItems;
  if (maxLength) {
    tdType.innerHTML += maxLengthText(maxLength);
  }

  if (value.maximum) {
    tdType.innerHTML += maximumText(value.maximum);
  }

  if ('enum' in value) {
    tdType.innerHTML += enumText(value);
  }

  if (hasDefault(value)) {
    tdType.innerHTML += defaultText(value);
  }

  if ('example' in value) {
    tdType.innerHTML += exampleText(value);
  }

  tr.appendChild(tdType);

  const tdDesc = createTd(3);
  tdDesc.innerHTML += value.description ? value.description : 'None';
  tr.appendChild(tdDesc);

  table.appendChild(tr);
}

function generateBreadCrumbs(key, index, data) {
  const currName = data.isArray ? `${data.name}[]` : (data.name ?? 'root');
  const links = [
    `<span class="underline"><a id="${key}_anchor">${currName}</a></span>`,
  ];

  const resolveParentRef = (data) => {
    if (data.parentRef) {
      const parent = defs[data.parentRef];
      const name = parent.isArray ? `${parent.name}[]` : parent.name;
      links.push(anchorLink(parent.ref, name));
      resolveParentRef(parent);
    }
  };

  resolveParentRef(data);
  if (index > 0) {
    links.push(anchorLink('dataValues', 'root'));
  }

  links.reverse();

  return links.length > 1
    ? links.join('<span class="text-sm mx-2 pt-1">&gt;</span>')
    : links[0];
}

function createTable(key, index) {
  // Skip rendering table if title begins with __REMOVE_ME__
  if (key.startsWith(removeMe)) {
    return;
  }

  const data = defs[key];
  const breadCrumbs = generateBreadCrumbs(key, index, data);

  content.innerHTML += `
        <div class="not-prose relative rounded-xl overflow-hidden bg-slate-800/25 ${index !== 0 ? 'mt-8' : ''}">
            <div class="inset-0 bg-grid-slate-700/25">
                <div class="relative rounded-xl overflow-auto">
                    <div class="shadow-sm overflow-hidden my-8">
                        <table class="border-collapse table-fixed w-full text-sm">
                            <thead>
                                <tr>
                                    <th class="border-slate-600 font-medium p-4 pl-8 pt-0 pb-8 text-slate-200 text-left text-2xl" colspan="3">
                                        <div class="flex items-center flex-wrap">
                                            <span class="mr-2 font-bold">Map:</span>${breadCrumbs}
                                        </div>
                                    </th>
                                </tr>
                                <tr>
                                    <th class="border-b border-slate-600 font-bold p-4 pl-8 pt-0 pb-3 text-slate-200 text-left">Property</th>
                                    <th class="border-b border-slate-600 font-bold p-4 pt-0 pb-3 text-slate-200 text-left">Type</th>
                                    <th class="border-b border-slate-600 font-bold p-4 pl-8 pt-0 pb-3 text-slate-200 text-left">Description</th>
                                </tr>
                            </thead>
                            <tbody class="bg-slate-800" id="${key}"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>`;

  const properties = data.properties;
  const table = document.getElementById(key);

  // Append properties to table html.
  Object.keys(properties).forEach((prop) => appendRow(prop, properties, table));
}

// Make sure root data values is rendered first.
const keys = Object.keys(defs).filter((key) => key !== 'dataValues');
keys.unshift('dataValues');

// Render all properties to tables.
keys.forEach((key, index) => createTable(key, index));
