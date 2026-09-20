# ytt schema documentation

Generate a static HTML documentation site for any [ytt](https://carvel.dev/ytt/) data values schema.

**Example site:** https://baunegaard.net/ytt-schema-docs/

Styling is done with [Tailwind CSS](https://tailwindcss.com/) since I hate writing CSS.

## How it works

1. `ytt` inspects `schema.yaml` and exports it as an OpenAPI v3 document.
2. `patch.yaml` is applied as a ytt overlay to set the site title, description and version.
3. [openapi-generator](https://openapi-generator.tech/) renders the result with the custom `html2` template in `src/index.mustache`.
4. Webpack bundles `src/index.js` and the Tailwind styles, which render the schema as linked tables in the browser.

## Prerequisites

- [Node.js](https://nodejs.org/) and npm
- [ytt](https://carvel.dev/ytt/docs/latest/install/) available on your `PATH`
- A Java runtime, required by openapi-generator (the generator version is pinned in `openapitools.json`)

## Quick start

```sh
npm install
npm run build
```

The production ready site is written to the `dist` folder.

Replace `schema.yaml` with your own schema, or change the path in the `generate` script in `package.json`.
The intermediate `schema-openapi.yaml` file is regenerated on every build and is ignored by git.

## Customizing the output

### Site metadata

Edit `patch.yaml` to change the `title`, `description` and `version` shown at the top of the page.
It is a regular ytt overlay, so any other OpenAPI `info` field can be patched as well.

### Schema annotations

The documentation is built from the standard ytt schema annotations:

| Annotation                     | Rendered as                      |
| ------------------------------ | -------------------------------- |
| `#@schema/title`               | Subtitle below the property name |
| `#@schema/desc`                | Description column               |
| `#@schema/nullable`            | Type shown as `nullable<type>`   |
| `#@schema/examples`            | `Label: value` below the type    |
| `#@schema/validation min_len=` | Minimum length                   |
| `#@schema/validation max_len=` | Maximum length                   |
| `#@schema/validation min=`     | Minimum                          |
| `#@schema/validation max=`     | Maximum                          |
| `#@schema/validation one_of=`  | Enum                             |

Arrays are shown as `array<type>`, nested maps get their own table, and non-empty default values are listed below the type.

```yaml
#@schema/title "Port Number"
#@schema/desc "Ensure a value between min and max."
#@schema/validation min=1, max=65535
port: 1024
```

### Required properties

A property is marked as **Required** when its default value is empty (`""`, `[]` or `0`) and one of the following applies:

- `min_len` or `min` validation
- `one_of` validation on a non-nullable property

Conditional validations, such as `when=` lambdas, cannot be detected and must be described manually in `#@schema/desc`.

### HTML in descriptions

HTML is allowed in `#@schema/desc` and `#@schema/examples`.
Tailwind only keeps classes it finds in `src`, so a class used only inside the schema must be added to the `safelist` in `tailwind.config.js`.
For example `underline` is safelisted, while `text-red-600` works because the generated markup already uses it.

```yaml
#@schema/desc "<strong><span class=\"text-red-600\">Required:</span></strong> when <strong>type</strong> equals <strong>LoadBalancer</strong>."
```

### Hiding properties

Exclude a property from the documentation by giving it a special title:

```yaml
#@schema/title "__REMOVE_ME__"
```

## Development

```sh
npm start
```

This runs the generator and starts a webpack development server on http://localhost:9090.

Changes to `index.mustache` and `schema.yaml` do not trigger a hot reload and require a restart.

The project is preconfigured with EditorConfig, Prettier and ESLint:

```sh
npm run lint
npm run format
```

## Publishing the example site

The example site is served by GitHub Pages from the `docs` folder. To update it, build the project and copy the output into place:

```sh
npm run pages
```

## License

[MIT](LICENSE)
