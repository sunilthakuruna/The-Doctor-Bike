/* Saved application appearance preference. The selector previews immediately;
   the existing Save All Settings action persists it with the workspace data. */
(function () {
  const applyTheme = value => {
    document.documentElement.dataset.theme = value === 'dark' ? 'dark' : 'light';
  };

  const originalSettingsPage = settingsPage;
  settingsPage = function () {
    const savedTheme = db.settings?.appearanceTheme === 'dark' ? 'dark' : 'light';
    const appearancePanel = `<section class="panel appearanceThemePanel">
      <div class="panelhead"><h2>Appearance</h2></div>
      <div class="panelbody appearanceThemeBody">
        <label class="field" for="appearanceTheme">
          <span>COLOR THEME</span>
          <select id="appearanceTheme" name="appearanceTheme" aria-label="Color theme">
            <option value="light" ${savedTheme === 'light' ? 'selected' : ''}>Light theme</option>
            <option value="dark" ${savedTheme === 'dark' ? 'selected' : ''}>Dark theme</option>
          </select>
        </label>
        <p>Preview a theme here, then choose <strong>Save All Settings</strong> to keep it across the application.</p>
      </div>
    </section>`;
    return originalSettingsPage().replace('<div class="toolbar" style="margin-top:20px">', `${appearancePanel}<div class="toolbar" style="margin-top:20px">`);
  };

  const originalBindPage = bindPage;
  bindPage = function () {
    originalBindPage();
    const selector = document.getElementById('appearanceTheme');
    if (selector) selector.addEventListener('change', () => applyTheme(selector.value));
  };

  const originalRender = render;
  render = function (...args) {
    const result = originalRender(...args);
    applyTheme(db.settings?.appearanceTheme);
    return result;
  };

  applyTheme(db.settings?.appearanceTheme);
})();
