# sites/

Brand sites that use the Glint engine, living in this monorepo.

Each subdirectory is a complete Glint brand site — it depends on `@vijayatech/glint`
via a local `link:../../` path for development, and on the published npm package
for production.

## sites/glint-web/

Glint's own blog — `glint.vijayatech.in`. Dogfood site and second reference
implementation (more realistic than `examples/playground/`).

**To build locally:**

```sh
cd ../         # repo root
pnpm build     # build the engine package first

cd sites/glint-web
pnpm install
pnpm glint doctor    # validate content
pnpm build           # full site build
pnpm preview         # serve at localhost:4321
```

**To scaffold the Astro theme** (if `src/` is missing — engine was not yet installed):

```sh
pnpm glint new --dir . --brand Glint --domain glint.vijayatech.in --collections blog
```

`glint new` is idempotent — it only writes files that don't already exist, so it is
safe to run on a partially set-up site.

## Adding a new brand site

```sh
cd sites/
glint new --dir <brand-name> --brand "<Brand Name>" --domain <domain> --collections blog
```

Then edit `sites/<brand-name>/data/site.config.ts`, `docs/brand-voice.md`, and
`data/content-strategy.md` for the brand.
