const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.ogg'])

export const resolveVideoResource = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null

  let url
  try {
    url = new URL(value.trim())
  } catch {
    return null
  }
  if (!['https:', 'http:'].includes(url.protocol)) return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host === 'youtu.be') {
    const videoId = url.pathname.split('/').filter(Boolean)[0]
    return videoId ? { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` } : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const videoId = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : pathSegments[0] === 'embed' || pathSegments[0] === 'shorts'
        ? pathSegments[1]
        : null
    return videoId ? { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}` } : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = url.pathname.match(/(?:^|\/)video\/(\d+)|^\/(\d+)/)
    const videoId = match?.[1] || match?.[2]
    return videoId ? { type: 'embed', src: `https://player.vimeo.com/video/${videoId}` } : null
  }

  const extension = url.pathname.match(/\.[^.]+$/)?.[0]?.toLowerCase()
  return extension && VIDEO_EXTENSIONS.has(extension) ? { type: 'file', src: url.href } : null
}