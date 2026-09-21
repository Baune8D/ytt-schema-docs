/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  content: ['./src/*.{mustache,js}'],
  theme: {
    extend: {
      colors: {
        page: token('page'),
        card: token('card'),
        line: token('line'),
        hover: token('hover'),
        chip: token('chip'),
        heading: token('heading'),
        body: token('body'),
        muted: token('muted'),
        accent: token('accent'),
        danger: token('danger'),
      },
    },
  },
  plugins: [],
  // Classes used only inside schema.yaml descriptions must be listed here.
  safelist: ['underline', 'text-red-600'],
};
