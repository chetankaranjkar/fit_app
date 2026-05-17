type LocationPreviewMapProps = {
  latitude: number
  longitude: number
  /** Bumps map when coords change (e.g. after geolocation). */
  refreshKey?: string | number
  className?: string
}

/** Map preview: static image on HTTP (IP-only VPS); iframe embed on HTTPS. */
export function LocationPreviewMap({
  latitude,
  longitude,
  refreshKey,
  className = '',
}: LocationPreviewMapProps) {
  const externalHref = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
  const staticMapSrc = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=640x280&markers=${latitude},${longitude},red-pushpin`
  const useEmbed = typeof window !== 'undefined' && window.isSecureContext
  const delta = 0.012
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(',')
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`
  const mapKey = refreshKey ?? `${latitude},${longitude}`

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 ${className}`}>
      {useEmbed ? (
        <iframe
          key={mapKey}
          title="Location preview map"
          src={embedSrc}
          className="h-56 w-full border-0 sm:h-64"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <a href={externalHref} target="_blank" rel="noopener noreferrer" className="block">
          <img
            key={mapKey}
            src={staticMapSrc}
            alt="Branch location on map"
            className="h-56 w-full object-cover sm:h-64"
            loading="lazy"
          />
        </a>
      )}
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
