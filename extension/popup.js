const DEFAULTS = { enabled: true, theme: "auto", accent: "sea", calm: false, hero: true };
const $ = (s) => document.querySelector(s);

function render(s) {
  $("#enabled").checked = s.enabled;
  document.body.classList.toggle("off", !s.enabled);
  document.querySelectorAll("#theme button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.theme));
  document.querySelectorAll("#accent button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.accent));
  $("#hero").checked = s.hero;
  $("#calm").checked = s.calm;
}

chrome.storage.sync.get(DEFAULTS, (s) => {
  render(s);
  const save = (patch) => { Object.assign(s, patch); chrome.storage.sync.set(patch); render(s); };
  $("#enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));
  $("#hero").addEventListener("change", (e) => save({ hero: e.target.checked }));
  $("#calm").addEventListener("change", (e) => save({ calm: e.target.checked }));
  document.querySelectorAll("#theme button").forEach((b) => b.addEventListener("click", () => save({ theme: b.dataset.v })));
  document.querySelectorAll("#accent button").forEach((b) => b.addEventListener("click", () => save({ accent: b.dataset.v })));
});
