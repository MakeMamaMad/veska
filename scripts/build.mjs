import { mkdir, copyFile, cp } from "node:fs/promises";
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js",
  ".nojekyll",
  "audio-credits.html",
])
  await copyFile(file, `dist/${file}`);
await cp("src", "dist/src", { recursive: true });
await cp("assets", "dist/assets", { recursive: true });
console.log("Built static application in dist/");
