type LocationPreviewMapProps = {
  latitude: number
  longitude: number
  /** Bumps iframe when coords change (e.g. after geolocation). */
  refreshKey?: string | number
  className?: string
}

/** Lightweight map preview via OpenStreetMap embed (no API key). */
export function LocationPreviewMap({
  latitude,
  longitude,
  refreshKey,
  className = '',
}: LocationPreviewMapProps) {
  const delta = 0.012
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',')
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`
  const externalHref = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 ${className}`}>
      <iframe
        key={refreshKey ?? `${latitude},${longitude}`}
        title="Location preview map"
        src={embedSrc}
        className="h-56 w-full border-0 sm:h-64"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10">
        <p className="px-3 py-2 text-xs text-slate-400">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
        <a
          href={externalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 pb-2.5 text-xs font-medium text-sky-300 hover:text-sky-200"
        >
          Open full map →
        </a>
      </div>
    </div>
  )
}
