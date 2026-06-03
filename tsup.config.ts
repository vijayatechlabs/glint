import { defineConfig } from "tsup";

// Build the engine to dist/: the library entry (re-exports the schema), the
// schema entry (consumers `import { blog } from "@vijayatech/glint/schema"`),
// and the CLI bin. deps (zod/yaml/turndown) stay external — consumers install them.
export default defineConfig({
  entry: ["src/index.ts", "src/content/schema.ts", "src/cli/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  target: "node20",
  outDir: "dist",
});
