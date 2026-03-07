#!/usr/bin/env node
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

await Promise.all([
  build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: "dist/index.js",
    define: {
      __VERSION__: JSON.stringify(pkg.version)
    }
  }),
  build({
    entryPoints: ["src/cli/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: "dist/cli.js",
    banner: {
      js: "#!/usr/bin/env node"
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version)
    }
  })
]);

console.log(`Built ${pkg.name} v${pkg.version}`);
