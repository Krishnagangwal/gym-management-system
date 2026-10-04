import {
  IconDashboard, IconUsers, IconClipboard, IconIdCard, IconWhistle,
  IconDumbbell, IconFlame, IconCalendarCheck, IconCard, IconChart,
  IconReceipt, IconTrendDown, IconTrendUp, IconClock, IconHistory, IconShieldCheck,
  IconBriefcase, IconRupee,
} from './components/icons.jsx';

const STAFF_ROLES = ['admin', 'staff'];
const ADMIN_ONLY = ['admin'];

export const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard, group: 'Overview', roles: STAFF_ROLES },
  { to: '/members', label: 'Members', icon: IconUsers, group: 'People', roles: STAFF_ROLES },
  { to: '/trainers', label: 'Trainers', icon: IconWhistle, group: 'People', roles: STAFF_ROLES },
  { to: '/membership-plans', label: 'Membership Plans', icon: IconClipboard, group: 'Memberships', roles: STAFF_ROLES },
  { to: '/memberships', label: 'Memberships', icon: IconIdCard, group: 'Memberships', roles: STAFF_ROLES },
  { to: '/workout-plans', label: 'Workout Plans', icon: IconDumbbell, group: 'Training', roles: STAFF_ROLES },
  { to: '/exercises', label: 'Exercises', icon: IconFlame, group: 'Training', roles: STAFF_ROLES },
  { to: '/attendance', label: 'Attendance', icon: IconCalendarCheck, group: 'Operations', roles: STAFF_ROLES },
  { to: '/payments', label: 'Payments', icon: IconCard, group: 'Operations', roles: STAFF_ROLES },
  { to: '/reports', label: 'Reports', icon: IconChart, group: 'Operations', roles: STAFF_ROLES },
  { to: '/expenses', label: 'Expenses', icon: IconTrendDown, group: 'Finance', roles: ADMIN_ONLY },
  { to: '/invoices', label: 'Invoices', icon: IconReceipt, group: 'Finance', roles: ADMIN_ONLY },
  { to: '/receivables', label: 'Receivables', icon: IconClock, group: 'Finance', roles: ADMIN_ONLY },
  { to: '/profit-loss', label: 'Profit & Loss', icon: IconTrendUp, group: 'Finance', roles: ADMIN_ONLY },
  { to: '/audit-log', label: 'Audit Log', icon: IconHistory, group: 'Compliance', roles: ADMIN_ONLY },
  { to: '/approvals', label: 'Approvals', icon: IconShieldCheck, group: 'Compliance', roles: ADMIN_ONLY },
  { to: '/employees', label: 'Employees', icon: IconBriefcase, group: 'HR & Payroll', roles: ADMIN_ONLY },
  { to: '/staff-attendance', label: 'Staff Attendance', icon: IconCalendarCheck, group: 'HR & Payroll', roles: ADMIN_ONLY },
  { to: '/leave-requests', label: 'Leave Requests', icon: IconClock, group: 'HR & Payroll', roles: ADMIN_ONLY },
  { to: '/payroll', label: 'Payroll Runs', icon: IconRupee, group: 'HR & Payroll', roles: ADMIN_ONLY },
  { to: '/trainer/members', label: 'My Members', icon: IconUsers, group: 'My Portal', roles: ['trainer'] },
  { to: '/trainer/performance', label: 'My Performance', icon: IconChart, group: 'My Portal', roles: ['trainer'] },
  { to: '/member/dashboard', label: 'Dashboard', icon: IconDashboard, group: 'My Account', roles: ['member'] },
  { to: '/member/membership', label: 'My Membership', icon: IconIdCard, group: 'My Account', roles: ['member'] },
  { to: '/member/workout-plan', label: 'My Workout Plan', icon: IconDumbbell, group: 'My Account', roles: ['member'] },
  { to: '/member/today-workout', label: "Today's Workout", icon: IconFlame, group: 'My Account', roles: ['member'] },
  { to: '/member/progress', label: 'My Progress', icon: IconTrendUp, group: 'My Account', roles: ['member'] },
  { to: '/member/attendance', label: 'My Attendance', icon: IconCalendarCheck, group: 'My Account', roles: ['member'] },
  { to: '/member/payments', label: 'My Payments', icon: IconCard, group: 'My Account', roles: ['member'] },
];

export function navLinksFor(role) {
  return navLinks.filter((l) => l.roles.includes(role));
}

export function navLinkFor(pathname) {
  return navLinks.find((l) => pathname.startsWith(l.to));
}
