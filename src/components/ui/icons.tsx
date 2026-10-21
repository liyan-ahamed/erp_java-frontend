import { SVGProps } from 'react';

/**
 * Forma icon set (frontend.md §6): 24×24 view box, no fill, currentColor stroke 1.5, round caps/joins.
 * Paths marked "Forma" are copied exactly from the reference. The rest are drawn in the same style for
 * ERP actions the reference has no icon for. Components keep the names the pages already used, so a
 * page swaps its icon import without touching markup. Size with Tailwind (`w-4 h-4`); default is 18 px.
 */
const PATHS = {
  // ---- Forma (exact) ----
  grid: 'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4z M20 4h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  calendar: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 M7 14h2 M15 14h2 M7 18h2',
  check: 'm5 12 4 4L19 6 M21 12a9 9 0 1 1-6-8.5',
  chart: 'M4 3v17h17 M8 15v-4 M13 15V7 M18 15v-6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
  award: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M9 12l-2 9 5-3 5 3-2-9',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M7 7h10 M7 11h7',
  settings: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  clock: 'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  sun: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  moon: 'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0 m-2 5 6 6',
  spark: 'm12 3 2 6 6 3-6 2-2 6-2-6-6-2 6-3z M20 2v4 M18 4h4',
  arrow: 'm9 5 7 7-7 7',
  down: 'm8 10 4 4 4-4',
  plus: 'M12 5v14 M5 12h14',
  filter: 'M3 6h18 M3 12h18 M3 18h18 M8 4v4 M16 10v4 M10 16v4',
  download: 'M12 3v12 m-4-4 4 4 4-4 M4 16v4h16v-4',
  edit: 'm15 4 5 5 M4 20l4-1L21 6l-4-4L4 15z',
  logout: 'M9 4H4v16h5 M12 12h9 m-4-4 4 4-4 4',
  help: 'M12 17h.01 M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  close: 'm6 6 12 12 M6 18 18 6',
  cap: 'm2 9 10-5 10 5-10 5z M6 11v6c4 3 8 3 12 0v-6 M22 9v7',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z m-4 9 3 3 5-6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  code: 'm8 6-6 6 6 6 M16 6l6 6-6 6 M14 3l-4 18',

  // ---- Same style, added for the ERP ----
  tick: 'm5 12 4 4L19 6',
  ticks: 'm2 12 4 4L16 6 M12 15l1 1L23 6',
  back: 'm15 5-7 7 7 7',
  arrowLeft: 'M19 12H5 m6-6-6 6 6 6',
  arrowUp: 'M12 19V5 m-6 6 6-6 6 6',
  arrowDown: 'M12 5v14 m-6-6 6 6 6-6',
  alert: 'M12 8v5 M12 16h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  warning: 'M12 4 2.5 20h19z M12 10v4 M12 17h.01',
  info: 'M12 11v5 M12 8h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  calendarCheck: 'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 m4 12 2 2 4-4',
  fileCheck: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 m-11 7 2 2 4-4',
  calculator: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 M8 6h8v4H8z M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01 M16 18h.01',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff: 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9 M6.6 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  rupee: 'M6 4h12 M6 9h12 M9 4c6 0 6 9 0 9H6l8 7',
  layers: 'm12 3 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1 M8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1 m-1 1 9 7 9-7',
  printer: 'M7 9V3h10v6 M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M7 14h10v7H7z',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z M9 8h6 M9 12h6 M9 16h3',
  refresh: 'M20 11a8 8 0 0 0-14.9-3 M4 4v4h4 M4 13a8 8 0 0 0 14.9 3 M20 20v-4h-4',
  save: 'M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 M7 3v5h8 M7 21v-7h10v7',
  send: 'M22 2 11 13 M22 2l-7 20-4-9-9-4z',
  shieldAlert: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M12 8v4 M12 15h.01',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13 M9 7V4h6v3',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21a8 8 0 0 1 16 0',
  userCheck: 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2 M16 11l2 2 4-4',
  userPlus: 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2 M19 8v6 M16 11h6',
  userX: 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2 M17 8l5 5 M22 8l-5 5',
  wallet: 'M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6 M17 14h.01',
} as const;

export type IconName = keyof typeof PATHS;
export type IconProps = SVGProps<SVGSVGElement>;

export function Icon({ name, className = '', ...props }: IconProps & { name: IconName }) {
  const labelled = props['aria-label'] !== undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      className={`f-icon ${className}`}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

const named = (name: IconName, displayName: string) => {
  const Component = (props: IconProps) => <Icon {...props} name={name} />;
  Component.displayName = displayName;
  return Component;
};

// Names match the icons the pages imported before, mapped onto the Forma vocabulary.
export const AlertCircle = named('alert', 'AlertCircle');
export const AlertTriangle = named('warning', 'AlertTriangle');
export const ArrowDown = named('arrowDown', 'ArrowDown');
export const ArrowLeft = named('arrowLeft', 'ArrowLeft');
export const ArrowUp = named('arrowUp', 'ArrowUp');
export const Award = named('award', 'Award');
export const BarChart3 = named('chart', 'BarChart3');
export const Bell = named('bell', 'Bell');
export const BookOpen = named('book', 'BookOpen');
export const Calculator = named('calculator', 'Calculator');
export const Calendar = named('calendar', 'Calendar');
export const CalendarCheck = named('calendarCheck', 'CalendarCheck');
export const CalendarDays = named('calendar', 'CalendarDays');
export const Check = named('tick', 'Check');
export const CheckCheck = named('ticks', 'CheckCheck');
export const CheckCircle2 = named('check', 'CheckCircle2');
export const ChevronDown = named('down', 'ChevronDown');
export const ChevronLeft = named('back', 'ChevronLeft');
export const ChevronRight = named('arrow', 'ChevronRight');
export const ClipboardCheck = named('check', 'ClipboardCheck');
export const ClipboardList = named('file', 'ClipboardList');
export const Clock = named('clock', 'Clock');
export const Code2 = named('code', 'Code2');
export const Download = named('download', 'Download');
export const ExternalLink = named('external', 'ExternalLink');
export const Eye = named('eye', 'Eye');
export const EyeOff = named('eyeOff', 'EyeOff');
export const FileCheck2 = named('fileCheck', 'FileCheck2');
export const FileEdit = named('edit', 'FileEdit');
export const GraduationCap = named('cap', 'GraduationCap');
export const Grid = named('grid', 'Grid');
export const HelpCircle = named('help', 'HelpCircle');
export const IndianRupee = named('rupee', 'IndianRupee');
export const Info = named('info', 'Info');
export const Layers = named('layers', 'Layers');
export const LayoutDashboard = named('grid', 'LayoutDashboard');
export const Lock = named('lock', 'Lock');
export const LogOut = named('logout', 'LogOut');
export const Mail = named('mail', 'Mail');
export const Menu = named('menu', 'Menu');
export const MessageSquareText = named('message', 'MessageSquareText');
export const Moon = named('moon', 'Moon');
export const NotebookPen = named('file', 'NotebookPen');
export const Pencil = named('edit', 'Pencil');
export const Plus = named('plus', 'Plus');
export const Printer = named('printer', 'Printer');
export const ReceiptText = named('receipt', 'ReceiptText');
export const RefreshCw = named('refresh', 'RefreshCw');
export const Save = named('save', 'Save');
export const Search = named('search', 'Search');
export const Send = named('send', 'Send');
export const Settings = named('settings', 'Settings');
export const Shield = named('shield', 'Shield');
export const ShieldAlert = named('shieldAlert', 'ShieldAlert');
export const ShieldCheck = named('shield', 'ShieldCheck');
export const Sun = named('sun', 'Sun');
export const Trash2 = named('trash', 'Trash2');
export const Trophy = named('award', 'Trophy');
export const UserCheck = named('userCheck', 'UserCheck');
export const UserPlus = named('userPlus', 'UserPlus');
export const UserRound = named('user', 'UserRound');
export const UserX = named('userX', 'UserX');
export const Users = named('users', 'Users');
export const Wallet = named('wallet', 'Wallet');
export const X = named('close', 'X');
