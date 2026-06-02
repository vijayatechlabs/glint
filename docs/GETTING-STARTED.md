# Getting Started with Glint

The front door. Works the same in **any** agent — Claude Code, Google Antigravity
(Gemini), Codex, Cursor — or a plain terminal.

## The one idea

> **`glint init` is the universal entry point.** Point it at a folder and it
> figures out what state the project is in (empty, has a WordPress blog, a
> half-set-up site, or already a Glint site) and prints exactly what to do next.

You don't need to know the steps up front — `init` discovers them. Everything
downstream is the same in every tool because every tool reads the same
`AGENTS.md` contract.

---

## 1. Get the CLI

Until the engine is published to npm, run it from a local clone of the engine and
point `--dir` at your site:

```bash
git clone https://github.com/vijayatechlabs/glint.git
cd glint && pnpm install
pnpm glint init --dir /path/to/your-site     # discover state of any folder
```

(Once published, this becomes `pnpm dlx @vijayatech/glint init` from inside the
site — that's a v2 item.)

Every command takes `--dir` (defaults to the current folder): `init`, `new`,
`status`, `doctor`, `import`, `build`, `preview`.

---

## 2. Start in your agent

Whatever the tool, the universal first move is the same prompt:

> **"Set up Glint here. Run `glint init`, read `docs/INIT.md`, and follow the
> state-aware flow — discover → understand → voice → unfold. Ask me only what you
> can't detect. Don't publish or push to main."**

How each agent picks up the rules:

| Agent | Reads | First action |
|---|---|---|
| **Claude Code** | `CLAUDE.md` → `AGENTS.md` | paste the prompt above (or a `glint-init` skill if installed) |
| **Google Antigravity / Gemini** | `~/.gemini/GEMINI.md`, `.agents/rules/`, `AGENTS.md` | see ready-made prompts in the brand repo's `docs/antigravity.md` |
| **Codex** | `AGENTS.md` | paste the prompt above |
| **Any other agent** | `AGENTS.md` (the universal contract) | paste the prompt above |

These per-tool files are scaffolded into a brand repo by `glint new`, so once a
site is set up, any agent opening it is instantly oriented.

---

## 3. Your starting state (this is what `glint init` detects)

Real projects are messy — Glint expects that. `init` classifies into one of four
states and gives a tailored plan:

| You have… | State | What happens |
|---|---|---|
| An **empty folder / brand-new site** | `FRESH` | scaffold structure → draft brand voice → seed first post |
| **An existing WordPress/CMS blog** (e.g. naam.one's `blog.naam.one`) | `MIGRATION` | `glint import wordpress` → audit → regenerate on-brand |
| **An existing site/app, maybe with some posts** in another form | `ADOPT` | map existing content into Glint collections |
| **Already a Glint site** | `ESTABLISHED` | add content / re-audit / bump the engine |

### "It's half set up / already has some blogs" — the common real case

This is exactly what `ADOPT`/`ESTABLISHED` + an **idempotent `glint new`** are for:

- `glint init` tells you what's present and what's missing.
- **`glint new` only creates what's missing** — run it on a half-set-up repo and it
  fills the gaps (config, taxonomy registries, agent files) without touching your
  existing content.
- `glint doctor` then validates everything that's there.

So a repo with a few existing posts but no `AGENTS.md`/config is fine: `init` →
`new` (fills gaps) → `doctor` (validate) → carry on. Nothing is overwritten.

---

## 4. 60-second quickstart (a fresh brand)

```bash
glint init  --dir ./acme-blog                       # 1. discover (FRESH)
glint new   --dir ./acme-blog --brand acme \
            --domain acme.com --collections blog --mount /blog   # 2. unfold
# 3. edit acme-blog/docs/brand-voice.md, then write posts as drafts
glint doctor --dir ./acme-blog                       # 4. validate (the gate)
glint status --dir ./acme-blog                       # 5. see the content board
glint build  --dir ./acme-blog                       # 6. render static + AEO surface
```

Migrating a WordPress blog instead? Swap step 2 for:
```bash
glint import wordpress --wxr export.xml --out ./acme-blog
```

---

## 5. Pulling Glint updates into a project

Glint is the shared engine; brand sites consume it. Updates reach a site in two
different ways depending on the part:

**Engine logic** (the CLI: `init`/`new`/`import`/`doctor`/`build`/`preview`) — a site
always runs the latest once you update your copy of the engine.

- **Sibling clone (reliable today, no publish needed).** Keep the engine cloned
  next to your sites and pull:
  ```bash
  git -C ../glint pull                          # update the engine
  pnpm -C ../glint glint doctor --dir .         # run latest against this site
  ```
  Add a convenience script to the site's `package.json`:
  `"glint": "pnpm -C ../glint glint"` → then `pnpm glint init`, `pnpm glint build`, …

- **Git dependency (cleaner).** In the site's `package.json`:
  `"@vijayatech/glint": "github:vijayatechlabs/glint"`, then update with
  `pnpm update @vijayatech/glint`. Pin to a tag for stability:
  `github:vijayatechlabs/glint#v0.2.0` — a project only moves when you choose.

**Scaffolded site files** (Astro theme, `docs/brand-voice.md`, `data/categories.md`/
`data/tags.md`) were *copied* into the repo by `glint new`, so they are **yours and
don't auto-update**. Re-running `glint new` is idempotent — it adds new gaps but
never overwrites. Pull a theme/layout improvement in deliberately (copy the changed
file from the engine's `examples/playground/`).

**The frictionless future (v2):** once the engine is published with a build step, a
site imports the schema/components/theme *from the package*, so
`pnpm update @vijayatech/glint` pulls **everything** — logic and theme — at once.
That publish step is the highest-leverage upgrade for "pull updates".

## 6. Where to go deeper

- **`docs/INIT.md`** — the full state-aware runbook the agent follows.
- **`docs/AGENT-GUIDE.md`** — the operating contract (rules, lifecycle, conventions).
- **`docs/BLOG-SPEC.md`** — the SEO/AEO spec (status model, taxonomy, what the build emits).
- **`examples/playground/`** — a buildable reference Glint site.

Golden rules in every tool: **draft-first, PR is the human gate, never push to
`main`, never publish or deploy yourself.**
