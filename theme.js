// theme.js
const html = document.documentElement;
const themeToggleDesktop = document.getElementById('toggleThemeDesktop');
const themeToggleMobile = document.getElementById('toggleThemeMobile');

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icons = document.querySelectorAll('.theme-toggle-btn i');
  icons.forEach(icon => {
    icon.className = theme === 'dark' ? 'ti ti-sun' : 'ti ti-moon';
  });
}

// Inisialisasi dari localStorage
const savedTheme = localStorage.getItem('theme') || 'light';
setTheme(savedTheme);

function handleThemeToggle() {
  const current = html.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}

themeToggleDesktop.addEventListener('click', handleThemeToggle);
themeToggleMobile.addEventListener('click', () => {
  handleThemeToggle();
  document.getElementById('hamburgerDropdown').style.display = 'none';
  document.getElementById('hamburgerBtn').classList.remove('open');
});
