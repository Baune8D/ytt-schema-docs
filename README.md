# ytt schema documentation

**Example site here:** https://baunegaard.net/ytt-schema-docs/

General information like `title`, `description`and `version` can be modified in `patch.yaml`

Properties can be excluded from the documentation if setting `#@schema/title` to `__REMOVE_ME__`

Run `npm run build` to generate assets. Feel free to change path to `schema.yaml` in the `package.json` `generate` script.

You can use html in `#@schema/desc`, but you might need to add tailwind classes to the `safelist` in `tailwind.config.js` if you use any.

### Development

Run `npm start` to launch a webpack development server.

Changes to `index.mustache` and `schema.yaml` does not trigger hot reload and needs a restart.
