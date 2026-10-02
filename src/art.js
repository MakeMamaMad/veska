export const icons = {
  home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
  sound: '<path d="M4 9v6m4-10v14m4-17v20m4-17v14m4-10v6"/>',
  moon: '<path d="M20 14.5A9 9 0 0 1 9.5 4 9 9 0 1 0 20 14.5Z"/>',
  leaf: '<path d="M20 3C8 2 2 8 5 15s15 5 15-12ZM4 21 15 9"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  rain: '<path d="M6 13a4 4 0 1 1 0-8 6 6 0 0 1 11 1 3.5 3.5 0 1 1 1 7ZM7 17l-1 3m6-3-1 3m6-3-1 3"/>',
  fire: '<path d="M12 3c2 5-5 6-2 10 1-2 3-3 5-4 5 7 2 12-3 12S3 17 6 12c0 3 2 3 2 3-3-7 4-8 4-12Z"/>',
  forest:
    '<path d="m8 3-5 8h3l-4 6h12l-4-6h3ZM8 17v4m8-17 5 8h-3l4 6h-6m1 0v3"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7a3 3 0 1 1-3 3"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  lock: '<rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
};
export const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.leaf}</svg>`;
export function landscape(level = 1) {
  const tree = (x, y, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 4v52" stroke="#304c3b" stroke-width="3"/><path d="m0-28-17 32h9l-18 27h15l-21 28H32L12 31h14L8 4h10Z" fill="#183f32"/><path d="m0-28-12 32h8l-13 27h9l-14 28H0" fill="#244b39"/></g>`;
  return `<svg class="landscape" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 640" role="img" aria-label="${level > 1 ? "Vёska" : "Vёska · quiet landscape"}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#112d30"/><stop offset="1" stop-color="#426253"/></linearGradient><linearGradient id="ground" x2="0" y2="1"><stop stop-color="#3a6043"/><stop offset="1" stop-color="#122f28"/></linearGradient><radialGradient id="glow"><stop stop-color="#f5c37a" stop-opacity=".5"/><stop offset="1" stop-color="#f5c37a" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="12"/></filter></defs>
  <rect width="1000" height="640" fill="url(#sky)"/><circle cx="737" cy="111" r="55" fill="#ccd4ab" opacity=".035"/><circle cx="737" cy="111" r="33" fill="#e2dfb9" opacity=".8"/><circle cx="751" cy="100" r="31" fill="#1b3838"/>
  ${Array.from({ length: 48 }, (_, i) => `<circle cx="${(i * 137 + 57) % 1000}" cy="${(i * 71 + 13) % 255}" r="${i % 3 === 0 ? 1.4 : 0.7}" fill="#dfe8ce" opacity="${0.18 + (i % 5) * 0.12}"/>`).join("")}
  <path d="M0 281Q120 160 266 245T531 231T798 228T1060 251V640H0" fill="#294a40"/><path d="M0 331Q162 205 374 321T721 289T1000 317V640H0" fill="#254637"/>
  ${Array.from({ length: 21 }, (_, i) => tree(i * 53, 290 + Math.sin(i) * 20, 0.6 + (i % 4) * 0.1)).join("")}
  <path d="M-30 415Q142 281 359 362T710 340T1030 382L1060 640H0Z" fill="url(#ground)"/>
  <path class="moon-path" d="M610 326C530 379 667 407 521 451S322 502 311 640" fill="none" stroke="#738567" stroke-opacity=".23" stroke-width="27"/>
  <path d="M1000 412Q793 389 776 433T681 488Q780 467 1000 490" fill="#68938b" opacity=".24"/>
  ${tree(108, 413, 1.4)}${tree(177, 402, 0.9)}${tree(876, 371, 1.2)}${tree(941, 412, 1.65)}${tree(62, 475, 1.8)}${tree(834, 443, 0.8)}
  ${level >= 2 ? `<g class="cottage"><ellipse cx="402" cy="424" rx="120" ry="72" fill="url(#glow)"/><path d="m323 383 77-33 91 44-83 39Z" fill="#0e241e" opacity=".6"/><path d="M336 352v69l70 29v-72Z" fill="#63583b"/><path d="m406 378 72-37v70l-72 39Z" fill="#3e4831"/><path d="m319 355 82-67 96 60-91 47Z" fill="#1c2e28"/><path d="m319 355 82-67 5 107Z" fill="#4b5543"/><path d="m401 298 78 51" stroke="#657057" stroke-width="3"/><path d="M365 316v-30l15 4v18" fill="#505a44"/><path d="m350 372 22 9v27l-22-9Zm36 15 12 5v27l-12-5Z" fill="#ecc58a"/><path d="m431 380 22-11v26l-22 11Z" fill="#ce9c5d"/><path d="M361 377v26m-11-17 22 8" stroke="#6b5c3c" stroke-width="2"/><path class="smoke" d="M372 281q-19-24 1-40t-4-43" fill="none" stroke="#bcc4aa" opacity=".18" stroke-width="9" filter="url(#blur)"/></g>` : ""}
  ${level >= 3 ? `<g transform="translate(650 284)"><path d="m-26 105 12-92h35l14 91-29 14Z" fill="#615f47"/><path d="m-22 14 24-33 27 32Z" fill="#25392b"/><g class="sails" style="transform-origin:4px 32px"><path d="M4 32-50-20M4 32 57 84M4 32 56-22M4 32-48 86" stroke="#c2b993" stroke-width="4"/><path d="m-43-22-12 11 40 35 9-10ZM57 72l-12 12-34-41 11-9Zm-6-89 11 11-39 34-9-9Zm-94 89-12-11 40-35 9 10Z" fill="#819376"/></g><path d="M0 82v22h12V82" fill="#e0bc7c"/></g>` : ""}
  ${level >= 4 ? `<g transform="translate(586 465)"><path d="m-59-33 55-26 55 32v54l-55 23-55-26Z" fill="#645c42"/><path d="m-70-31 43-52 30 22 59 34-66 26Z" fill="#273b2c"/><path d="M-34-10v44l30 12V2" fill="#334433"/><path d="M11 5v14l21-8V-5Z" fill="#c0a66c"/></g>` : ""}
  ${level >= 5 ? `<g transform="translate(480 520)"><ellipse rx="65" ry="38" fill="url(#glow)"/><path d="m-22 9 43 14m-41 0L19 7" stroke="#58452c" stroke-width="9"/><path class="flame" d="M-17 12Q-27-4-7-24q-2 14 7 14Q11-17 9-33q28 38 9 50Z" fill="#d5a35d"/><path d="M-7 14Q-14 0 2-7q-2 7 8 14v10Z" fill="#f3d291"/></g>` : ""}
  <g class="fog" opacity=".12" filter="url(#blur)"><ellipse cx="300" cy="450" rx="280" ry="14" fill="#b7c8bb"/><ellipse cx="780" cy="355" rx="230" ry="13" fill="#b7c8bb"/></g>
  ${Array.from({ length: 15 }, (_, i) => `<circle class="firefly" style="animation-delay:${i * 0.47}s" cx="${200 + ((i * 97) % 620)}" cy="${360 + ((i * 43) % 220)}" r="1.7" fill="#dce3a5"/>`).join("")}
  <path d="M0 571Q130 503 264 590T562 572T800 600T1000 542V640H0" fill="#102d24"/>
  ${tree(18, 551, 2.1)}${tree(973, 552, 2)}
  </svg>`;
}
