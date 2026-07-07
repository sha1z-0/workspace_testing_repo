import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@finovasolutions.com';

function buildEmailHtml(
  meeting: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location: string;
    meetingLink?: string;
    organizer: string;
    organizerEmail: string;
  }
): string {
  const formattedDate = new Date(meeting.startTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const startFormatted = new Date(meeting.startTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endFormatted = new Date(meeting.endTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const joinButton = meeting.meetingLink
    ? `
      <a href="${meeting.meetingLink}"
         style="color: #ffffff; background-color: #000000;
                padding: 14px 32px; border-radius: 8px;
                text-decoration: none; font-weight: 600; font-size: 16px;
                display: inline-block; font-family: Arial, sans-serif;">
        Join Meeting
      </a>
      <p style="margin-top: 16px; color: #888; font-size: 13px;">
        Or copy and paste this link into your browser:<br>
        <span style="color: #555;">${meeting.meetingLink}</span>
      </p>`
    : '<p style="color: #888; font-style: italic;">No meeting link provided.</p>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f5f7;">
  <div style="background: #ffffff; border-radius: 12px; padding: 36px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
    <div style="margin-bottom: 24px;">
      <img src="https://finovasolutions.com/finova-icon.png" alt="Finova" style="height: 36px;">
    </div>

    <h2 style="margin: 0 0 8px; color: #1a1a2e; font-size: 22px;">${meeting.title}</h2>
    <p style="margin: 0 0 24px; color: #555;">
      <strong>${meeting.organizer}</strong> has invited you to a meeting
    </p>

    <table style="width: 100%; margin: 24px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; color: #888; width: 80px; font-size: 14px;">Date</td>
        <td style="padding: 10px 0; color: #1a1a2e; font-weight: 600; font-size: 14px;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #888; font-size: 14px;">Time</td>
        <td style="padding: 10px 0; color: #1a1a2e; font-weight: 600; font-size: 14px;">${startFormatted} - ${endFormatted}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #888; font-size: 14px;">Location</td>
        <td style="padding: 10px 0; color: #1a1a2e; font-weight: 600; font-size: 14px;">${meeting.location || 'Not specified'}</td>
      </tr>
    </table>

    ${meeting.description ? `<div style="background: #f8f9fb; border-radius: 8px; padding: 16px; margin: 16px 0;"><p style="margin: 0; color: #444; font-size: 14px; line-height: 1.6;">${meeting.description.replace(/\n/g, '<br>')}</p></div>` : ''}

    <div style="text-align: center; margin: 32px 0 16px;">
      ${joinButton}
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">

    <p style="color: #999; font-size: 12px; text-align: center;">
      This is an automated invitation from <strong>Finova Workspace</strong>.<br>
      Please do not reply to this email.
    </p>
  </div>
</body>
</html>`;
}

function generateICSContent(meeting: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  organizer: string;
  organizerEmail: string;
}) {
  const startDate = new Date(meeting.startTime);
  const endDate = new Date(meeting.endTime);

  const formatDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Finova//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@finova.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${meeting.title}`,
    `DESCRIPTION:${meeting.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${meeting.location}`,
    `ORGANIZER;CN=${meeting.organizer}:mailto:${meeting.organizerEmail}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    const { to, cc, subject, meetingDetails } = requestData;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid "to" field' }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: 'Missing "subject" field' }, { status: 400 });
    }

    if (!meetingDetails || !meetingDetails.title || !meetingDetails.startTime || !meetingDetails.endTime) {
      return NextResponse.json(
        { error: 'Missing meetingDetails or required fields (title, startTime, endTime)' },
        { status: 400 }
      );
    }

    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured. Please set SENDGRID_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    const details = {
      title: meetingDetails.title,
      description: meetingDetails.description || '',
      startTime: meetingDetails.startTime,
      endTime: meetingDetails.endTime,
      location: meetingDetails.location || 'Not specified',
      meetingLink: meetingDetails.meetingLink || '',
      organizer: meetingDetails.organizer || 'Unknown',
      organizerEmail: meetingDetails.organizerEmail || SENDGRID_FROM_EMAIL,
    };

    const icsContent = generateICSContent(details);

    const baseMsg = {
      from: SENDGRID_FROM_EMAIL,
      subject,
      html: buildEmailHtml(details),
      attachments: [
        {
          content: Buffer.from(icsContent).toString('base64'),
          filename: 'invite.ics',
          type: 'text/calendar; method=REQUEST',
          disposition: 'attachment',
        },
      ],
    };

    const allRecipients = [...to, ...(cc || [])];

    const results = await Promise.allSettled(
      allRecipients.map((email: string) =>
        sgMail.send({ ...baseMsg, to: email })
      )
    );

    const failures = results
      .map((r, i) =>
        r.status === 'rejected'
          ? { email: allRecipients[i], error: String(r.reason) }
          : null
      )
      .filter(Boolean);

    if (failures.length > 0) {
      console.error('Some emails failed to send:', JSON.stringify(failures));
      return NextResponse.json(
        {
          success: true,
          sent: allRecipients.length - failures.length,
          failed: failures.length,
          failures,
        },
        { status: 200 }
      );
    }

    console.log(`All ${allRecipients.length} invitation emails sent successfully for "${meetingDetails.title}"`);
    return NextResponse.json({ success: true, sent: allRecipients.length }, { status: 200 });
  } catch (error) {
    console.error('Error sending meeting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to send email invitations', details: (error as Error).message },
      { status: 500 }
    );
  }
}
