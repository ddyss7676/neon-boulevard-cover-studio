// Neon Boulevard Cover Studio — the program that hands this entry in.
// Node 22, standard library only. It copies the app (app/) and the
// screenshots (screenshots/) from this repository into the output directory
// and writes /output/dossier.json with the vendored make.fun library, so
// the gate can check the entry and the judge can read it.
//
// Try it locally first with `node serve.ts` (http://localhost:8080), then:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's caps, as this bounty states them: the dossier text is capped
// at 160 KiB; at most 4 screenshots of at most 256 KiB each; app/ holds at
// most 993 files and directories and 48 MiB in all, with no path over
// 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
