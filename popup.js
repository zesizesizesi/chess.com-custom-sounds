const THEME_KEY = "chessSoundsTheme";
const MODE_KEY = "soundMode";

function applyTheme(theme) {
  const body = document.body;
  const iconSpan = document.getElementById("theme-icon");

  if (theme === "dark") {
    body.classList.add("dark");
    if (iconSpan) iconSpan.textContent = "⚪";
  } else {
    body.classList.remove("dark");
    if (iconSpan) iconSpan.textContent = "⚫";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const radios = document.querySelectorAll('input[name="mode"]');
  const themeToggle = document.getElementById("theme-toggle");

  chrome.storage.sync.get([MODE_KEY, THEME_KEY], (data) => {
    applyTheme(data[THEME_KEY] || "light");

    const mode = data[MODE_KEY] || "custom1";
    const radio = document.querySelector(
      `input[name="mode"][value="${mode}"]`
    );
    if (radio) radio.checked = true;
  });

radios.forEach((radio) => {
  radio.addEventListener("change", () => {
    const mode = radio.value;

    chrome.storage.sync.set({ [MODE_KEY]: mode });

    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs) => {
        if (!tabs || !tabs.length) return;
        const tab = tabs[0];

        if (!tab.url || !tab.url.startsWith("https://www.chess.com/")) {
          return;
        }

        chrome.tabs.sendMessage(tab.id, {
          type: "SET_SOUND_MODE",
          mode,
        });
      }
    );
  });
});

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";
    applyTheme(newTheme);
    chrome.storage.sync.set({ [THEME_KEY]: newTheme });
  });
});
