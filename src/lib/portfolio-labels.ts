import { BadgeProps } from '@/components/ui/Badge';
import { PortfolioActivityType, PortfolioLevel, PortfolioStatus } from '@/types/portfolio';

// Display-only labels for backend enum values. API calls always use the raw values.

export const PORTFOLIO_STATUSES: PortfolioStatus[] = ['DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED'];

export const PORTFOLIO_STATUS_BADGE: Record<PortfolioStatus, { label: string; variant: BadgeProps['variant'] }> = {
  DRAFT: { label: 'Draft', variant: 'default' },
  SUBMITTED: { label: 'Pending Review', variant: 'info' },
  VERIFIED: { label: 'Verified', variant: 'success' },
  REJECTED: { label: 'Needs Changes', variant: 'error' },
};

export const ACTIVITY_TYPES: PortfolioActivityType[] = [
  'HACKATHON', 'CERTIFICATION', 'COMPETITION', 'WORKSHOP', 'INTERNSHIP', 'RESEARCH_PUBLICATION',
  'CONFERENCE', 'TECHNICAL_EVENT', 'PROJECT_SHOWCASE', 'CLUB_ACTIVITY', 'OTHER',
];

export const ACTIVITY_TYPE_LABELS: Record<PortfolioActivityType, string> = {
  HACKATHON: 'Hackathon',
  CERTIFICATION: 'Certification',
  COMPETITION: 'Competition',
  WORKSHOP: 'Workshop',
  INTERNSHIP: 'Internship',
  RESEARCH_PUBLICATION: 'Research Publication',
  CONFERENCE: 'Conference',
  TECHNICAL_EVENT: 'Technical Event',
  PROJECT_SHOWCASE: 'Project Showcase',
  CLUB_ACTIVITY: 'Club Activity',
  OTHER: 'Other',
};

export const LEVELS: PortfolioLevel[] = ['COLLEGE', 'INTER_COLLEGE', 'STATE', 'NATIONAL', 'INTERNATIONAL', 'ONLINE', 'OTHER'];

export const LEVEL_LABELS: Record<PortfolioLevel, string> = {
  COLLEGE: 'College',
  INTER_COLLEGE: 'Inter-College',
  STATE: 'State',
  NATIONAL: 'National',
  INTERNATIONAL: 'International',
  ONLINE: 'Online',
  OTHER: 'Other',
};

/** Matches the backend's submit rule (description must be 20+ characters). */
export const MIN_SUBMIT_DESCRIPTION_LENGTH = 20;
/** Matches the backend's reject rule. */
export const MIN_REJECTION_NOTE_LENGTH = 10;

/** True for absolute http(s) links with a host — the same rule the backend applies. */
export const isWebUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
};
