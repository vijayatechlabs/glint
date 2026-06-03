# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **content**: Added content strategy layer including strategy, plan, playbook, and agent workflow.
- **doctor**: Implemented the pre-merge quality gate and added warnings for unfilled onboarding placeholders.
- **docs**: Added Getting Started guide, Architecture/concept documents, Agent Guide, and documented the update workflows.
- **engine**: Scaffolded the core content contract and CLI system.
- **feedback**: Created a structured feedback pipeline for the read-only engine.
- **import**: Implemented a real WordPress to Glint importer.
- **init/new**: Built a state-aware initialization system (`glint init`, `glint new`) to scaffold a buildable Astro site with brand-aware configuration.
- **onboard**: Added `glint onboard` command for a seamless detect -> draft -> unfold workflow.
- **seo**: Added pre-launch hardening with `robots.txt` and `BreadcrumbList` JSON-LD.
- **theme**: Integrated token-styled static chrome, `glint theme pull` (the brand blend), category/tag archives, related posts, and Pagefind search.

### Changed
- **build**: Configured project as a publish-ready package (tsup build, importable schema, installable bin).
- **docs**: Refined documentation to make Layer 3 host-agnostic and locked the product model (capture-once onboarding, token-blend, positioning).
- **engine**: Positioned Glint as a fluid SEO/AEO content framework.

### Fixed
- **feedback**: Resolved an issue where the engine version from built dist was showing as "unknown".
