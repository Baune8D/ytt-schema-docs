# ytt-schema-docs

Generates a static HTML documentation site from a [ytt](https://carvel.dev/ytt/) data values schema. The example site at https://baunegaard.net/ytt-schema-docs/ documents `schema.yaml`.

1. `ytt` exports `schema.yaml` as an OpenAPI v3 document, and `patch.yaml` (a ytt overlay) sets the title, description and version.
2. openapi-generator renders it with the custom `html2` template in `src/index.mustache`. Its version is pinned in `openapitools.json`.
3. Webpack bundles `src/index.js` and the Tailwind styles, which render the schema as linked tables in the browser.

## Workflow

- Conventional commits (`feat:`, `fix:`, `chore(deps):`, `ci:`, `build:`, `docs:`), one commit per concern, directly on `main`.
- Only push, tag, publish or edit GitHub releases when asked.
- Commit messages must be accurate. If one turns out to be wrong before it is pushed, reword it (replay the commits and check that the tree is unchanged). Never rewrite pushed history.

## Building and testing

- Needs Node.js, `ytt` on the `PATH` and a Java runtime (for openapi-generator).
- CI pins ytt and Java 21 in `.github/workflows/ci.yml` (Dependabot doesn't update the ytt pin). openapi-generator orders the keys of the schema JSON embedded in `index.html` differently on other Java versions (Java 27 puts `enum` before `default`), so a local build on another Java version can differ from the deployed site in key order only.
- `npm run build` writes the site to `dist/`, `npm start` serves it with webpack-dev-server, and `npm run lint` / `npm run format` run ESLint and Prettier. CI runs lint and the build on every pull request and push.
- `npm run pages` builds and copies the four files the site serves to `site/`. On a push to `main`, CI deploys `site/` to GitHub Pages, so every change to `main` publishes the example site.
- After a dependency upgrade, compare the built files with the previous build to confirm the site didn't change.

## Dependencies

- Dependabot runs weekly on Monday with a 7-day cooldown. Minor/patch updates are grouped; security updates have their own group.
- Major versions are ignored by Dependabot and upgraded by hand: read the release notes, update, and build/lint before committing. If a major breaks the build and fixing it is a design decision, keep the old major and explain why in the commit.
- New exceptions go in `.github/dependabot.yml` with a comment explaining why.
- Before holding a package back, find the root cause and check the package's issue tracker.
- `npm audit` still reports findings from eslint (minimatch 10; only minimatch 11 is fixed) and openapi-generator-cli (it pins `glob` and `proxy-agent`, which bring minimatch 10 and basic-ftp 5). Both need upstream releases.
- The webpack `fs` fallback is `false`: json-schema-ref-parser only reads files in Node.js, and its `browser` field maps `fs` to `false`.
