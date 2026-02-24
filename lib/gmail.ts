import { google, gmail_v1 } from "googleapis";

/**
 * Creates an authenticated Gmail API client using OAuth2 service account credentials.
 * 
 * Required env vars:
 *   GMAIL_CLIENT_EMAIL    – service account client email
 *   GMAIL_PRIVATE_KEY     – service account private key (PEM, with \n line breaks)
 *   GMAIL_USER_EMAIL      – the Gmail address to impersonate (your personal Gmail)
 */
function getGmailClient(): gmail_v1.Gmail {
  const auth = new google.auth.JWT({
    email: process.env.GMAIL_CLIENT_EMAIL!,
    key: (process.env.GMAIL_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/gmail.modify"],
    subject: process.env.GMAIL_USER_EMAIL!,
  });

  return google.gmail({ version: "v1", auth });
}

export interface RawEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  body: string;
}

/**
 * Fetches unread emails from Chase and Capital One.
 * Query:  is:unread from:(chase.com OR capitalone.com)
 * After fetching, each message is marked as read.
 */
export async function fetchUnreadBankEmails(): Promise<RawEmail[]> {
  const gmail = getGmailClient();

  const query = "is:unread (from:chase.com OR from:capitalone.com)";

  // 1. List matching message IDs
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100,
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) return [];

  // 2. Fetch full message for each ID
  const emails: RawEmail[] = [];

  for (const msg of messageIds) {
    const full = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "full",
    });

    const headers = full.data.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: { name?: string | null; value?: string | null }) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const body = extractBody(full.data.payload);

    emails.push({
      id: msg.id!,
      threadId: msg.threadId || "",
      from: getHeader("From"),
      subject: getHeader("Subject"),
      date: getHeader("Date"),
      body,
    });

    // 3. Mark as read by removing UNREAD label
    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id!,
      requestBody: {
        removeLabelIds: ["UNREAD"],
      },
    });
  }

  return emails;
}

/**
 * Recursively extracts the text/plain or text/html body from a Gmail message payload.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  // If body data exists directly on this part
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Recurse into parts – prefer text/plain, fall back to text/html
  if (payload.parts && payload.parts.length > 0) {
    // Try text/plain first
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fall back to text/html
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Recurse deeper (multipart/alternative, multipart/mixed, etc.)
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }

  return "";
}

/**
 * Decodes a base64url-encoded string (Gmail's encoding).
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}
