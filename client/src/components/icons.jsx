// Compact, dependency-free line icon set (Feather-style, 24x24, stroke-based).
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Icon({ children, className = 'w-5 h-5' }) {
  return (
    <svg {...base} className={className}>
      {children}
    </svg>
  );
}

export function IconDashboard(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  );
}

export function IconUsers(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.8 14.7c2.4.4 4.1 2.1 4.7 4.8" />
    </Icon>
  );
}

export function IconClipboard(props) {
  return (
    <Icon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
      <path d="M8.5 11h7M8.5 15h7M8.5 19h4" />
    </Icon>
  );
}

export function IconIdCard(props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
      <circle cx="8" cy="12" r="2" />
      <path d="M5 16.2c.5-1.4 1.6-2.2 3-2.2s2.5.8 3 2.2" />
      <path d="M14 9.5h5M14 13h5M14 16.5h3.2" />
    </Icon>
  );
}

export function IconWhistle(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="14.5" r="5.5" />
      <path d="M13.2 10.7 21 4M17.5 4h3.5v3.5" />
      <path d="M9 12.2v2.6h2.4" />
    </Icon>
  );
}

export function IconDumbbell(props) {
  return (
    <Icon {...props}>
      <path d="M4 9v6M2 10v4M20 9v6M22 10v4M7 12h10" />
      <path d="M7 8a2 2 0 0 1 2-2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2a2 2 0 0 1-2-2Z" />
      <path d="M13 8a2 2 0 0 1 2-2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2a2 2 0 0 1-2-2Z" />
    </Icon>
  );
}

export function IconFlame(props) {
  return (
    <Icon {...props}>
      <path d="M12 2.5c1 3-3 4.2-3 8a3 3 0 0 0 6 0c1.3.9 2 2.4 2 4a5 5 0 0 1-10 0c0-4.8 3.6-6.4 5-12Z" />
    </Icon>
  );
}

export function IconCalendarCheck(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M16 2.5v4M8 2.5v4M3 9.5h18" />
      <path d="m8.5 14 2 2 4.5-4.5" />
    </Icon>
  );
}

export function IconCard(props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h4" />
    </Icon>
  );
}

export function IconChart(props) {
  return (
    <Icon {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Icon>
  );
}

export function IconLogout(props) {
  return (
    <Icon {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 16l4-4-4-4M20 12H9" />
    </Icon>
  );
}

export function IconSearch(props) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </Icon>
  );
}

export function IconPlus(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconClock(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  );
}

export function IconTrendUp(props) {
  return (
    <Icon {...props}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 6h6v6" />
    </Icon>
  );
}

export function IconSparkles(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="m6 6 2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
    </Icon>
  );
}

export function IconChevronRight(props) {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function IconRupee(props) {
  return (
    <Icon {...props}>
      <path d="M6 4h11M6 9h11M8 4c4 0 6.5 1.6 6.5 4.5S12 13 8 13h-1l7.5 7" />
    </Icon>
  );
}

export function IconBox(props) {
  return (
    <Icon {...props}>
      <path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" />
      <path d="M3.5 7.5V16l8.5 4 8.5-4V7.5" />
      <path d="M12 11.5V20" />
    </Icon>
  );
}

export function IconMail(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="m4 6.5 8 6 8-6" />
    </Icon>
  );
}

export function IconPhone(props) {
  return (
    <Icon {...props}>
      <path d="M6.6 10.8c1.3 2.6 3.5 4.8 6.1 6.1l2-2a1.2 1.2 0 0 1 1.2-.3c1.1.4 2.3.6 3.6.6.7 0 1.2.5 1.2 1.2V20c0 .7-.5 1.2-1.2 1.2C10.3 21.2 2.8 13.7 2.8 4.5c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2 0 1.3.2 2.5.6 3.6.1.4 0 .9-.3 1.2Z" />
    </Icon>
  );
}

export function IconUserCheck(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.8 3.4-5.8 6.5-5.8s5.7 2 6.5 5.8" />
      <path d="m15.5 10 2 2 3.5-3.5" />
    </Icon>
  );
}

export function IconTarget(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconReceipt(props) {
  return (
    <Icon {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Icon>
  );
}

export function IconTrendDown(props) {
  return (
    <Icon {...props}>
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </Icon>
  );
}

export function IconBriefcase(props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="7.5" width="19" height="12.5" rx="2" />
      <path d="M8 7.5V5.5A2 2 0 0 1 10 3.5h4a2 2 0 0 1 2 2v2" />
      <path d="M2.5 13h19M10.5 13v1.5h3V13" />
    </Icon>
  );
}

export function IconHistory(props) {
  return (
    <Icon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4.5h4.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function IconShieldCheck(props) {
  return (
    <Icon {...props}>
      <path d="M12 2.5 4.5 5.5v6c0 5 3.2 8 7.5 10 4.3-2 7.5-5 7.5-10v-6L12 2.5Z" />
      <path d="m8.5 12 2.3 2.3L15.5 9.5" />
    </Icon>
  );
}
