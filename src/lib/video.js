/**
 * Turns a YouTube or Vimeo page URL into an embeddable player URL.
 * Returns null when the URL is missing or not from a supported host.
 *
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function getVideoEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null
  let u
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')

  // YouTube: watch?v=ID, youtu.be/ID, /embed/ID, /shorts/ID, /live/ID
  let ytId = null
  if (host === 'youtu.be') ytId = u.pathname.slice(1).split('/')[0]
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') ytId = u.searchParams.get('v')
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([^/?#]+)/)
      if (m) ytId = m[2]
    }
  }
  if (ytId && /^[A-Za-z0-9_-]{6,20}$/.test(ytId)) {
    return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`
  }

  // Vimeo: vimeo.com/ID or vimeo.com/ID/HASH (unlisted), player.vimeo.com/video/ID
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/)
    if (m) {
      const hash = m[2] || u.searchParams.get('h')
      return `https://player.vimeo.com/video/${m[1]}${hash ? `?h=${hash}` : ''}`
    }
  }
  return null
}
