document.addEventListener('DOMContentLoaded', () => {
  const manifest = chrome.runtime.getManifest();
  document.getElementById('ext-name').textContent = manifest.name;
  document.getElementById('ext-version').textContent = `v${manifest.version}`;
});