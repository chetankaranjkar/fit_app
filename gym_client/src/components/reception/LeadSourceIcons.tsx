import type { LeadSourceIconKey } from '../../lib/leadSources'

const cls = 'size-4 shrink-0'

export function LeadSourceIcon({ name }: { name: LeadSourceIconKey }) {
  switch (name) {
    case 'facebook':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#1877F2"
            d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
          />
        </svg>
      )
    case 'instagram':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="ig-grad-lead-source" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f09433" />
              <stop offset="25%" stopColor="#e6683c" />
              <stop offset="50%" stopColor="#dc2743" />
              <stop offset="75%" stopColor="#cc2366" />
              <stop offset="100%" stopColor="#bc1888" />
            </linearGradient>
          </defs>
          <path
            fill="url(#ig-grad-lead-source)"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.35 3.608 1.325.975.975 1.263 2.242 1.325 3.608.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.062 1.366-.35 2.633-1.325 3.608-.975.975-2.242 1.263-3.608 1.325-1.265.058-1.645.069-4.85.069s-3.584-.011-4.85-.069c-1.366-.062-2.633-.35-3.608-1.325-.975-.975-1.263-2.242-1.325-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.35-2.633 1.325-3.608C4.533 3.567 5.8 3.279 7.166 3.217 8.432 3.159 8.812 3.148 12 3.148zm0-2.163C8.741 0 8.332.014 7.053.072 5.775.132 4.602.425 3.62 1.407 2.638 2.389 2.345 3.562 2.285 4.84 2.227 6.119 2.213 6.528 2.213 12c0 5.472.014 5.881.072 7.16.06 1.278.353 2.451 1.335 3.433.982.982 2.155 1.275 3.433 1.335 1.279.058 1.688.072 7.16.072s5.881-.014 7.16-.072c1.278-.06 2.451-.353 3.433-1.335.982-.982 1.275-2.155 1.335-3.433.058-1.279.072-1.688.072-7.16s-.014-5.881-.072-7.16c-.06-1.278-.353-2.451-1.335-3.433C21.451 2.353 20.278 2.06 19 2.002 17.721 1.944 17.312 1.93 12 1.93z"
          />
          <path
            fill="url(#ig-grad-lead-source)"
            d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
          />
        </svg>
      )
    case 'google':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      )
    case 'youtube':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      )
    case 'whatsapp':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#25D366"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 002.893 6.994c-1.395 1.355-3.297 2.094-5.32 2.094m.004-17.893c-6.369 0-11.548 5.179-11.548 11.547 0 2.578.842 4.977 2.271 6.915L2.5 22.495l3.909-1.182a11.56 11.56 0 006.108 1.738h.005c6.368 0 11.547-5.178 11.547-11.545 0-3.077-1.196-5.97-3.374-8.14a11.51 11.51 0 00-8.14-3.373"
          />
        </svg>
      )
    case 'friend':
      return (
        <svg className={`${cls} text-cyan-300`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M17 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 10a4 4 0 100-8 4 4 0 000 8zm6-1a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      )
    case 'walkin':
      return (
        <svg className={`${cls} text-violet-300`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243M15 11a3 3 0 10-6 0 3 3 0 006 0z" />
        </svg>
      )
    case 'banner':
      return (
        <svg className={`${cls} text-fuchsia-300`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8M4 18h5" />
        </svg>
      )
    case 'website':
      return (
        <svg className={`${cls} text-sky-300`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18" />
        </svg>
      )
    case 'trainer':
      return (
        <svg className={`${cls} text-emerald-300`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'member':
      return (
        <svg className={`${cls} text-amber-300`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 19h14a1 1 0 001-1v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2a1 1 0 001 1z" />
        </svg>
      )
    default:
      return (
        <svg className={`${cls} text-slate-400`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
        </svg>
      )
  }
}
