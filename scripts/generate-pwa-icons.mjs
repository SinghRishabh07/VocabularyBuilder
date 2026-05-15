import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const faviconSvg = join(root, "src/lib/assets/favicon.svg");
const raw = readFileSync(faviconSvg, "utf8");

const innerMatch = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>\s*$/i);
if (!innerMatch) {
	console.error("Could not parse favicon.svg");
	process.exit(1);
}
const body = innerMatch[1];

/** Center the logo on a square canvas with padding (maskable-safe). */
function buildSquareSvg(sizePx) {
	const vw = 107;
	const vh = 128;
	const safe = 0.82;
	const h = sizePx * safe;
	const w = (vw / vh) * h;
	const tx = (sizePx - w) / 2;
	const ty = (sizePx - h) / 2;
	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}">
  <rect width="${sizePx}" height="${sizePx}" fill="#070a10"/>
  <svg xmlns="http://www.w3.org/2000/svg" x="${tx}" y="${ty}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid meet">
${body}
  </svg>
</svg>`;
}

for (const sizePx of [192, 512]) {
	const svg = buildSquareSvg(sizePx);
	const resvg = new Resvg(svg);
	const png = resvg.render().asPng();
	const out = join(root, "static", `pwa-${sizePx}x${sizePx}.png`);
	writeFileSync(out, png);
	console.log(`Wrote ${out}`);
}
