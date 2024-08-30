# ytt schema documentation

Generate HTML documentation for any [ytt](https://carvel.dev/ytt/) schema.

**Example site here:** https://baunegaard.net/ytt-schema-docs/

Styling done using [tailwindcss](https://tailwindcss.com/) since i hate writing CSS.

### Documentation

General information like `title`, `description`and `version` can be modified in `patch.yaml`.

You can use html in `#@schema/desc`, but you might need to add tailwind classes to the `safelist` in `tailwind.config.js` if you use any.

Schema properties can be excluded from the documentation by setting: `#@schema/title "__REMOVE_ME__"`

### Build

Run `npm run build` to generate production ready assets in the `dist` folder.

Feel free to change path to `schema.yaml` in the `package.json` `generate` script.

### Development

Run `npm start` to launch a webpack development server.

Changes to `index.mustache` and `schema.yaml` does not trigger hot reload and needs a restart.

Project is preconfigured with Editorconfig, Prettier and ESLint.
