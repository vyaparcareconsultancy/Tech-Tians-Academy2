import { describe, it, expect } from 'vitest'
import { getVideoEmbedUrl } from '../video.js'

describe('getVideoEmbedUrl', () => {
  it('handles YouTube watch, short and youtu.be links', () => {
    const want = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'
    expect(getVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(want)
    expect(getVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe(want)
    expect(getVideoEmbedUrl('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(want)
    expect(getVideoEmbedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x')).toBe(want)
  })

  it('handles public and unlisted Vimeo links', () => {
    expect(getVideoEmbedUrl('https://vimeo.com/123456789')).toBe('https://player.vimeo.com/video/123456789')
    expect(getVideoEmbedUrl('https://vimeo.com/123456789/abc123def')).toBe('https://player.vimeo.com/video/123456789?h=abc123def')
  })

  it('rejects empty and unsupported links', () => {
    expect(getVideoEmbedUrl('')).toBeNull()
    expect(getVideoEmbedUrl(null)).toBeNull()
    expect(getVideoEmbedUrl('not a url')).toBeNull()
    expect(getVideoEmbedUrl('https://example.com/video.mp4')).toBeNull()
  })
})
