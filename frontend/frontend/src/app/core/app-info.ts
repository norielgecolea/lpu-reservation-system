export const APP_NAME = 'Reservation System';

export interface ReleaseNote {
  title: string;
  detail: string;
}

export interface Release {
  version: string;
  notes: ReleaseNote[];
}

/**
 * Newest first. Add a new `{ version, notes }` object at the top;
 * leave older releases in place so their patch notes stay on the page.
 */
export const RELEASES: Release[] = [
  {
    version: '1.0.0',
    notes: [
      {
        title: 'Multi-service booking',
        detail:
          'Reserve FLT Theater, University Van, and Gymnasium in one system—not FLT alone.',
      },
      {
        title: 'Remote access',
        detail: 'Reach the system off-campus through Cloudflare Tunneling.',
      },
      {
        title: 'Email OTP',
        detail:
          'Verify the requester by email before a booking goes through, so spam stays out.',
      },
      {
        title: 'Maintenance plotting',
        detail:
          'Block maintenance windows on the calendar so bookings don’t land on downtime.',
      },
      {
        title: 'Automatic form plotting',
        detail:
          'Approved requests plot onto the schedule for you—no manual calendar entry.',
      },
      {
        title: 'Rescheduling',
        detail: 'Move an existing booking when plans change, without starting over.',
      },
      {
        title: 'In-house email',
        detail: 'Send notifications from your own mail server.',
      },
      {
        title: 'Data analytics',
        detail: 'See usage and trends so capacity and scheduling decisions are clearer.',
      },
      {
        title: 'Modern UI',
        detail: 'Cleaner screens for customers and admins, on desktop and mobile.',
      },
    ],
  },
];

export const APP_VERSION = RELEASES[0]?.version ?? '1.0.0';
