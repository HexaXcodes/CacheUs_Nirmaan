// Icon library — clean line icons, 1.75 stroke
// All accept { size, color, fill }

const Icon = ({ children, size = 24, color = 'currentColor', strokeWidth = 1.75, fill = 'none', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const IconHeartPulse = (p) => <Icon {...p}>
  <path d="M3.5 12h3l2-4 3 8 2-5 1.5 2H20" />
  <path d="M20 11.2c1.3-1.4 1.3-3.5 0-4.8a3.3 3.3 0 00-4.8 0L14 7.6l-1.2-1.2a3.3 3.3 0 00-4.8 0c-1 1-1.2 2.4-.7 3.6" />
</Icon>;

const IconBrain = (p) => <Icon {...p}>
  <path d="M9 5a3 3 0 00-3 3v0a3 3 0 00-2 5 3 3 0 002 5v0a3 3 0 003 3h0a3 3 0 003-3V5a3 3 0 00-3 0z" />
  <path d="M15 5a3 3 0 013 3v0a3 3 0 012 5 3 3 0 01-2 5v0a3 3 0 01-3 3h0a3 3 0 01-3-3V5a3 3 0 013 0z" />
  <path d="M9 11h1M14 11h1M9 14h1M14 14h1" />
</Icon>;

const IconMic = (p) => <Icon {...p}>
  <rect x="9" y="3" width="6" height="11" rx="3" />
  <path d="M5 11a7 7 0 0014 0" />
  <path d="M12 18v3" />
</Icon>;

const IconDocSpark = (p) => <Icon {...p}>
  <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
  <path d="M14 3v5h5" />
  <path d="M9 13h4M9 16h6" />
  <path d="M16.5 5.5l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7z" fill="currentColor" stroke="none" />
</Icon>;

const IconUsers = (p) => <Icon {...p}>
  <circle cx="9" cy="8" r="3" />
  <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
  <circle cx="17" cy="6" r="2.5" />
  <path d="M15 13c3.3 0 6 2.2 6 5" />
</Icon>;

const IconShield = (p) => <Icon {...p}>
  <path d="M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6l8-3z" />
  <path d="M9 12l2 2 4-4" />
</Icon>;

const IconArrowRight = (p) => <Icon {...p}>
  <path d="M5 12h14M13 6l6 6-6 6" />
</Icon>;

const IconChevronRight = (p) => <Icon {...p}>
  <path d="M9 6l6 6-6 6" />
</Icon>;

const IconClose = (p) => <Icon {...p}>
  <path d="M6 6l12 12M18 6l-12 12" />
</Icon>;

const IconBack = (p) => <Icon {...p}>
  <path d="M15 6l-6 6 6 6" />
</Icon>;

const IconGlobe = (p) => <Icon {...p}>
  <circle cx="12" cy="12" r="9" />
  <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
</Icon>;

const IconHelp = (p) => <Icon {...p}>
  <circle cx="12" cy="12" r="9" />
  <path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" />
  <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
</Icon>;

const IconCheck = (p) => <Icon {...p}>
  <path d="M5 12l4 4 10-10" />
</Icon>;

const IconUser = (p) => <Icon {...p}>
  <circle cx="12" cy="8" r="4" />
  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
</Icon>;

const IconStethoscope = (p) => <Icon {...p}>
  <path d="M6 3v5a4 4 0 008 0V3" />
  <path d="M10 14v2a4 4 0 008 0v-2" />
  <circle cx="18" cy="11" r="2" />
</Icon>;

const IconBag = (p) => <Icon {...p}>
  <path d="M5 9h14l-1 11a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z" />
  <path d="M9 9V6a3 3 0 016 0v3" />
  <path d="M12 14v3" />
</Icon>;

const IconDroplet = (p) => <Icon {...p}>
  <path d="M12 3s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z" />
</Icon>;

const IconActivity = (p) => <Icon {...p}>
  <path d="M3 12h4l2-7 4 14 2-7h6" />
</Icon>;

const IconBell = (p) => <Icon {...p}>
  <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
  <path d="M10 19a2 2 0 004 0" />
</Icon>;

const IconCalendar = (p) => <Icon {...p}>
  <rect x="3" y="5" width="18" height="16" rx="2" />
  <path d="M3 9h18M8 3v4M16 3v4" />
</Icon>;

const IconPlay = (p) => <Icon {...p}>
  <path d="M7 5l12 7-12 7V5z" fill="currentColor" />
</Icon>;

const IconSparkle = (p) => <Icon {...p}>
  <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" fill="currentColor" stroke="none" />
  <path d="M19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill="currentColor" stroke="none" opacity="0.5" />
</Icon>;

const IconMenu = (p) => <Icon {...p}>
  <path d="M4 7h16M4 12h16M4 17h16" />
</Icon>;

const IconSettings = (p) => <Icon {...p}>
  <circle cx="12" cy="12" r="3" />
  <path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.5-2.4.8a7 7 0 00-2-1.2L14 3h-4l-.5 2.4a7 7 0 00-2 1.2L5 5.8 3 9.3l2 1.5A7 7 0 005 12a7 7 0 00.1 1.2l-2 1.5 2 3.5 2.4-.8a7 7 0 002 1.2L10 21h4l.5-2.4a7 7 0 002-1.2l2.4.8 2-3.5-2-1.5c.07-.4.1-.8.1-1.2z" />
</Icon>;

const IconLogout = (p) => <Icon {...p}>
  <path d="M10 3H6a2 2 0 00-2 2v14a2 2 0 002 2h4" />
  <path d="M16 8l4 4-4 4" />
  <path d="M20 12H10" />
</Icon>;

const IconPill = (p) => <Icon {...p}>
  <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" />
  <path d="M9 9l6 6" transform="rotate(-30 12 12)" />
</Icon>;

const IconLeaf = (p) => <Icon {...p}>
  <path d="M5 21c0-8 6-14 16-14 0 8-6 14-16 14z" />
  <path d="M5 21c4-6 8-9 14-12" />
</Icon>;

const IconQR = (p) => <Icon {...p}>
  <rect x="3" y="3" width="7" height="7" />
  <rect x="14" y="3" width="7" height="7" />
  <rect x="3" y="14" width="7" height="7" />
  <path d="M14 14h3v3M20 14v3M14 18v3M17 21h4v-3" />
</Icon>;

const IconHistory = (p) => <Icon {...p}>
  <path d="M3 12a9 9 0 109-9c-3 0-6 1.5-7.8 4M3 4v4h4" />
  <path d="M12 7v5l3 2" />
</Icon>;

Object.assign(window, {
  IconHeartPulse, IconBrain, IconMic, IconDocSpark, IconUsers, IconShield,
  IconArrowRight, IconChevronRight, IconClose, IconBack, IconGlobe, IconHelp,
  IconCheck, IconUser, IconStethoscope, IconBag, IconDroplet, IconActivity,
  IconBell, IconCalendar, IconPlay, IconSparkle,
  IconMenu, IconSettings, IconLogout, IconPill, IconLeaf, IconQR, IconHistory,
});
