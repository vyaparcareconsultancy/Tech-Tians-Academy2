// Applies the saved (or system) colour theme before React renders, so the
// page never flashes the wrong theme.
(function () {
  try {
    var t = localStorage.getItem('tta-theme')
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    if (t === 'light') document.documentElement.classList.add('light')
  } catch (e) {
    /* storage blocked: keep dark */
  }
})()
