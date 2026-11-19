const paths = {
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  file: <><path d="M13 2.8H6.5A2.5 2.5 0 0 0 4 5.3v13.4a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5V9.8Z" /><path d="M13 2.8v7h7M8 14h8M8 17.5h6" /></>,
  sparkle: <><path d="m12 2.5 1.45 5.05L18.5 9l-5.05 1.45L12 15.5l-1.45-5.05L5.5 9l5.05-1.45L12 2.5Z" /><path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14ZM5 14l.65 1.85L7.5 16.5l-1.85.65L5 19l-.65-1.85L2.5 16.5l1.85-.65L5 14Z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 2" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /><path d="M16 7h3v3" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  down: <path d="m7 10 5 5 5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.35 2.35 0 1 1 3.95 1.7c-1.2 1.05-1.65 1.55-1.65 3M12 17.2v.1" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <path d="M20.4 15.3A8.5 8.5 0 0 1 8.7 3.6 8.7 8.7 0 1 0 20.4 15.3Z" />,
  upload: <><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  download: <><path d="M12 4v12m0 0 4.5-4.5M12 16l-4.5-4.5" /><path d="M4 17v3h16v-3" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  arrowUp: <><path d="M7 17 17 7M7 7h10v10" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  filePlus: <><path d="M13 2.8H6.5A2.5 2.5 0 0 0 4 5.3v13.4a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5V9.8Z" /><path d="M13 2.8v7h7M12 13v5m-2.5-2.5h5" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.1l-.1.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8L7.3 15v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.5l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1l.1-.1h3.6l.1.2a1.7 1.7 0 0 0 1.5 1l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.1.1V15Z" /></>,
  creditCard: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  eye: <><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 6.2A10.4 10.4 0 0 1 12 6c6.3 0 9.5 6 9.5 6a15 15 0 0 1-3 3.5M6.2 6.5C3.8 8.2 2.5 12 2.5 12s3.2 6 9.5 6c1.3 0 2.4-.3 3.4-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
}

export function Icon({ name, size = 18, strokeWidth = 1.7, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.sparkle}
    </svg>
  )
}
