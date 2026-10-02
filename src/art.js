export const icons = {
  music: '<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/>',
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
const landscapes = new Map();
// Where each place sits in the 1000×640 scene; map buttons use the same coordinates.
// Phones crop the scene to roughly x 180–820, so every place stays inside that band.
export const PLACE_POSITIONS = [[400, 392], [650, 330], [586, 452], [740, 468], [262, 452], [508, 520], [318, 515], [786, 418], [528, 338]];
export function landscape(level = 1, unlocked = [0,1,2,3,4,5,6,7,8].slice(0, level-1)) {
  const key = [...unlocked].sort().join(",");
  if (landscapes.has(key)) return landscapes.get(key);
  const tree = (x, y, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 4v52" stroke="#304c3b" stroke-width="3"/><path d="m0-28-17 32h9l-18 27h15l-21 28H32L12 31h14L8 4h10Z" fill="#183f32"/><path d="m0-28-12 32h8l-13 27h9l-14 28H0" fill="#244b39"/></g>`;
  const scene = `<svg class="landscape" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 640" role="img" aria-label="${level > 1 ? "Vёska" : "Vёska · quiet landscape"}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#112d30"/><stop offset="1" stop-color="#426253"/></linearGradient><linearGradient id="ground" x2="0" y2="1"><stop stop-color="#3a6043"/><stop offset="1" stop-color="#122f28"/></linearGradient><radialGradient id="glow"><stop stop-color="#f5c37a" stop-opacity=".5"/><stop offset="1" stop-color="#f5c37a" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="12"/></filter></defs>
  <rect width="1000" height="640" fill="url(#sky)"/><circle cx="737" cy="111" r="55" fill="#ccd4ab" opacity=".035"/><circle cx="737" cy="111" r="33" fill="#e2dfb9" opacity=".8"/><circle cx="751" cy="100" r="31" fill="#1b3838"/>
  ${Array.from({ length: 48 }, (_, i) => `<circle cx="${(i * 137 + 57) % 1000}" cy="${(i * 71 + 13) % 255}" r="${i % 3 === 0 ? 1.4 : 0.7}" fill="#dfe8ce" opacity="${0.18 + (i % 5) * 0.12}"/>`).join("")}
  <path d="M0 281Q120 160 266 245T531 231T798 228T1060 251V640H0" fill="#294a40"/><path d="M0 331Q162 205 374 321T721 289T1000 317V640H0" fill="#254637"/>
  ${Array.from({ length: 21 }, (_, i) => tree(i * 53, 290 + Math.sin(i) * 20, 0.6 + (i % 4) * 0.1)).join("")}
  <path d="M-30 415Q142 281 359 362T710 340T1030 382L1060 640H0Z" fill="url(#ground)"/>
  <path class="moon-path" d="M610 326C530 379 667 407 521 451S322 502 311 640" fill="none" stroke="#738567" stroke-opacity=".23" stroke-width="27"/>
  <path d="M1000 412Q793 389 776 433T681 488Q780 467 1000 490" fill="#68938b" opacity=".24"/>
  ${tree(108, 413, 1.4)}${tree(177, 402, 0.9)}${tree(876, 371, 1.2)}${tree(941, 412, 1.65)}${tree(62, 475, 1.8)}${tree(834, 443, 0.8)}
  ${!unlocked.includes(0) ? '<g class="foundation"><path d="m334 399 68-34 75 35-70 39Z" fill="#293d34" stroke="#6b7762" stroke-width="4"/><path d="M334 399v12l73 39 70-38v-12" fill="none" stroke="#485447" stroke-width="8"/></g>' : ''}
  ${unlocked.includes(0) ? `<g class="cottage"><ellipse cx="402" cy="424" rx="120" ry="72" fill="url(#glow)"/><path d="m323 383 77-33 91 44-83 39Z" fill="#0e241e" opacity=".6"/><path d="M336 352v69l70 29v-72Z" fill="#63583b"/><path d="m406 378 72-37v70l-72 39Z" fill="#3e4831"/><path d="m319 355 82-67 96 60-91 47Z" fill="#1c2e28"/><path d="m319 355 82-67 5 107Z" fill="#4b5543"/><path d="m401 298 78 51" stroke="#657057" stroke-width="3"/><path d="M365 316v-30l15 4v18" fill="#505a44"/><path d="m350 372 22 9v27l-22-9Zm36 15 12 5v27l-12-5Z" fill="#ecc58a"/><path d="m431 380 22-11v26l-22 11Z" fill="#ce9c5d"/><path d="M361 377v26m-11-17 22 8" stroke="#6b5c3c" stroke-width="2"/><path class="smoke" d="M372 281q-19-24 1-40t-4-43" fill="none" stroke="#bcc4aa" opacity=".18" stroke-width="9" filter="url(#blur)"/></g>` : ""}
  ${unlocked.includes(1) ? `<g class="mill" transform="translate(650 284)"><path d="m-26 105 12-92h35l14 91-29 14Z" fill="#615f47"/><path d="m-22 14 24-33 27 32Z" fill="#25392b"/><g class="sails" style="transform-origin:4px 32px"><path d="M4 32-50-20M4 32 57 84M4 32 56-22M4 32-48 86" stroke="#c2b993" stroke-width="4"/><path d="m-43-22-12 11 40 35 9-10ZM57 72l-12 12-34-41 11-9Zm-6-89 11 11-39 34-9-9Zm-94 89-12-11 40-35 9 10Z" fill="#819376"/></g><path d="M0 82v22h12V82" fill="#e0bc7c"/></g>` : ""}
  ${unlocked.includes(2) ? `<g class="barn" transform="translate(586 465)"><path d="m-59-33 55-26 55 32v54l-55 23-55-26Z" fill="#645c42"/><path d="m-70-31 43-52 30 22 59 34-66 26Z" fill="#273b2c"/><path d="M-34-10v44l30 12V2" fill="#334433"/><path d="M11 5v14l21-8V-5Z" fill="#c0a66c"/></g>` : ""}
  ${unlocked.includes(3) ? `<g class="bonfire" transform="translate(740 480)"><ellipse rx="65" ry="38" fill="url(#glow)"/><path d="m-22 9 43 14m-41 0L19 7" stroke="#58452c" stroke-width="9"/><path class="flame" d="M-17 12Q-27-4-7-24q-2 14 7 14Q11-17 9-33q28 38 9 50Z" fill="#d5a35d"/><path d="M-7 14Q-14 0 2-7q-2 7 8 14v10Z" fill="#f3d291"/></g>` : ""}
  ${unlocked.includes(4) ? `<g class="orchard" transform="translate(262 470)">${[[-42,8,1],[0,-6,1.15],[40,10,.95]].map(([x,y,k])=>`<g transform="translate(${x} ${y}) scale(${k})"><path d="M-3 0h6v34h-6Z" fill="#4a3f2c"/><circle cy="-8" r="26" fill="#2f4a33"/><circle cx="-10" cy="-14" r="15" fill="#3c5a3a"/><circle cx="-9" cy="-2" r="3.2" fill="#d58a4a"/><circle cx="10" cy="-12" r="3.2" fill="#e0a85a"/><circle cx="4" cy="6" r="3" fill="#c9733f"/></g>`).join("")}<circle cx="-18" cy="44" r="3" fill="#c9733f"/><circle cx="22" cy="47" r="2.8" fill="#d58a4a"/><path d="M-60 52q60-10 120 0" stroke="#8a6a3c" stroke-opacity=".35" stroke-width="3" fill="none"/></g>` : ""}
  ${unlocked.includes(5) ? `<g class="well" transform="translate(508 528)"><ellipse cy="26" rx="34" ry="11" fill="#0e241e" opacity=".5"/><path d="M-26 0v24q26 12 52 0V0" fill="#6a6a58"/><ellipse rx="26" ry="9" fill="#1b2b26"/><path d="M-26 8q26 10 52 0M-26 16q26 10 52 0" stroke="#4d4f42" stroke-width="2" fill="none"/><path d="M-22-2v-44M22-2v-44" stroke="#5a4a32" stroke-width="5"/><path d="m-32-44 32-20 32 20Z" fill="#273b2c"/><path d="M-22-32h44" stroke="#7b6a48" stroke-width="4"/><path d="M0-32v18" stroke="#c2b993" stroke-width="1.5"/><path d="M-6-14h12l-2 10h-8Z" fill="#8a6a3c"/></g>` : ""}
  ${unlocked.includes(6) ? `<g class="bathhouse" transform="translate(318 528)"><ellipse cx="4" cy="22" rx="80" ry="34" fill="url(#glow)" opacity=".7"/><path d="M-40 -6v34l40 16 40-18V-8L0-24Z" fill="#5d5139"/><path d="m-48-4 46-34 50 28-48 22Z" fill="#22352a"/><path d="M28-30v-16h9v20" fill="#4b4a3c"/><path class="smoke" d="M32-50q-14-18 2-30t-4-32" fill="none" stroke="#bcc4aa" opacity=".16" stroke-width="7" filter="url(#blur)"/><path d="m10 6 16-7v14l-16 7Z" fill="#ecc58a"/><path d="M-26 4v22l12 5V9Z" fill="#3a3a2c"/></g>` : ""}
  ${unlocked.includes(7) ? `<g class="jetty" transform="translate(786 424)"><path d="M-58 6 34-4l6 7-90 11Z" fill="#6b5b3f"/><path d="M-40 18v14M-10 14v14M20 10v14" stroke="#4a3f2c" stroke-width="4"/><path d="M-20 34q30 12 62 0l-6 9q-24 8-50 0Z" fill="#3e4831"/><path d="M-14 34q24 6 50 0" stroke="#7b6a48" stroke-width="2" fill="none"/><path d="M30 6v-16" stroke="#4a3f2c" stroke-width="3"/><path d="M26-12h8v7h-8Z" fill="#ecc58a" opacity=".85"/><path d="M-60 52q60 6 120 0" stroke="#a8c4b8" stroke-opacity=".18" stroke-width="2" fill="none"/></g>` : ""}
  ${unlocked.includes(8) ? `<g class="apiary" transform="translate(528 352) scale(.85)">${[[-34,0],[0,-6],[34,1]].map(([x,y])=>`<g transform="translate(${x} ${y})"><path d="M-12-2h24v20h-24Z" fill="#7a6a4a"/><path d="M-12 6h24" stroke="#5c4f36" stroke-width="2"/><path d="m-16-2 16-10 16 10Z" fill="#2f4130"/><path d="M-3 13h6v5h-6Z" fill="#2a2a20"/><path d="M-12 18v6M12 18v6" stroke="#4a3f2c" stroke-width="3"/></g>`).join("")}<circle cx="-50" cy="-36" r="1.6" fill="#e8d48a" opacity=".8"/><circle cx="46" cy="-28" r="1.4" fill="#e8d48a" opacity=".7"/></g>` : ""}
  <g class="fog" opacity=".12" filter="url(#blur)"><ellipse cx="300" cy="450" rx="280" ry="14" fill="#b7c8bb"/><ellipse cx="780" cy="355" rx="230" ry="13" fill="#b7c8bb"/></g>
  ${Array.from({length:3},(_,group)=>`<g class="particle-group particles-${group}" style="animation-delay:-${group*1.7}s">${Array.from({length:5},(_,j)=>{const i=group*5+j;return `<circle class="firefly" cx="${200+((i*97)%620)}" cy="${360+((i*43)%220)}" r="1.7" fill="#dce3a5"/>`;}).join('')}</g>`).join('')}

  <path d="M0 571Q130 503 264 590T562 572T800 600T1000 542V640H0" fill="#102d24"/>
  ${tree(18, 551, 2.1)}${tree(973, 552, 2)}
  </svg>`;
  landscapes.set(key,scene);
  return scene;
}
