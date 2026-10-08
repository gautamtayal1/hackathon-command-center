import { describeError, logger } from "@/lib/logger";

export type LumaHackathonInput = {
  lumaUrl: string;
  name?: string;
  startsAt?: string | null;
};

export type LumaHackathonDetails = {
  lumaUrl: string;
  name: string;
  startsAt: Date | null;
};

type LumaMetadata = {
  name: string;
  startsAt: Date | null;
};

export function normalizeLumaUrl(rawUrl: string) {
  const withProtocol = rawUrl.trim().match(/^https?:\/\//)
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;

  let url: URL;

  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Paste a valid Luma link.");
  }

  const host = url.hostname.toLowerCase();

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Paste a valid Luma link.");
  }

  if (host !== "lu.ma" && !host.endsWith(".lu.ma") && host !== "luma.com") {
    throw new Error("Use a Luma link, like https://lu.ma/your-event.");
  }

  return url.toString();
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function extractMeta(html: string, name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedName}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedName}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

function cleanLumaTitle(title: string) {
  return title
    .replace(/\s*[·|-]\s*Luma\s*$/i, "")
    .replace(/\s*on\s+Luma\s*$/i, "")
    .trim();
}

function extractTitle(html: string) {
  const metaTitle =
    extractMeta(html, "og:title") || extractMeta(html, "twitter:title");

  if (metaTitle) {
    return cleanLumaTitle(metaTitle);
  }

  const jsonTitle = extractStructuredValue(html, ["name", "title"]);

  if (jsonTitle) {
    return cleanLumaTitle(jsonTitle);
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

  if (titleMatch?.[1]) {
    return cleanLumaTitle(decodeHtml(titleMatch[1]));
  }

  return "";
}

function parseDateValue(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? null : date;
}

function extractDate(html: string) {
  const dateValue =
    extractMeta(html, "event:start_time") ||
    extractMeta(html, "startDate") ||
    extractMeta(html, "article:published_time") ||
    extractStructuredValue(html, ["startDate", "startTime", "start_time"]) ||
    html.match(/"startDate"\s*:\s*"([^"]+)"/i)?.[1] ||
    html.match(/"start_time"\s*:\s*"([^"]+)"/i)?.[1] ||
    "";

  return dateValue ? parseDateValue(dateValue) : null;
}

function extractStructuredValue(html: string, keys: string[]) {
  const scripts = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const script of scripts ?? []) {
    const jsonText = script
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    const value = extractValueFromJsonText(jsonText, keys);

    if (value) {
      return value;
    }
  }

  const nextDataMatch = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );

  if (nextDataMatch?.[1]) {
    return extractValueFromJsonText(nextDataMatch[1], keys);
  }

  return "";
}

function extractValueFromJsonText(jsonText: string, keys: string[]) {
  try {
    return extractValueFromJson(JSON.parse(jsonText), keys);
  } catch {
    return "";
  }
}

function extractValueFromJson(value: unknown, keys: string[]): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractValueFromJson(item, keys);

      if (found) {
        return found;
      }
    }

    return "";
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (keys.includes(key) && typeof nestedValue === "string") {
      return nestedValue;
    }

    const found = extractValueFromJson(nestedValue, keys);

    if (found) {
      return found;
    }
  }

  return "";
}

export function nameFromLumaUrl(lumaUrl: string) {
  const url = new URL(lumaUrl);
  const slug = url.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.replace(/[-_]+/g, " ")
    .trim();

  if (!slug) {
    return "New hackathon";
  }

  return slug.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function extractLumaMetadataFromHtml(html: string): LumaMetadata {
  return {
    name: extractTitle(html),
    startsAt: extractDate(html),
  };
}

export async function readLumaMetadata(lumaUrl: string): Promise<LumaMetadata> {
  let response: Response;

  try {
    response = await fetch(lumaUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "Mozilla/5.0 (compatible; HackathonAdmin/1.0; +https://localhost)",
      },
    });
  } catch (error) {
    logger.error("luma_metadata_fetch_failed", {
      lumaUrl,
      reason: "fetch_error",
      ...describeError(error),
    });

    return { name: "", startsAt: null };
  }

  if (!response.ok) {
    logger.error("luma_metadata_fetch_failed", {
      lumaUrl,
      reason: "not_ok",
      status: response.status,
    });

    return { name: "", startsAt: null };
  }

  try {
    return extractLumaMetadataFromHtml(await response.text());
  } catch (error) {
    logger.error("luma_metadata_fetch_failed", {
      lumaUrl,
      reason: "parse_error",
      ...describeError(error),
    });

    return { name: "", startsAt: null };
  }
}

export function cleanHackathonInput(input: LumaHackathonInput) {
  const lumaUrl = normalizeLumaUrl(input.lumaUrl);
  const name = input.name?.trim() ?? "";
  const startsAt = input.startsAt
    ? new Date(`${input.startsAt}T00:00:00.000Z`)
    : null;

  if (startsAt && Number.isNaN(startsAt.valueOf())) {
    throw new Error("Hackathon date is not valid.");
  }

  return { lumaUrl, name, startsAt };
}

export async function resolveLumaHackathonDetails(
  input: LumaHackathonInput,
): Promise<LumaHackathonDetails> {
  const cleaned = cleanHackathonInput(input);
  const metadata = await readLumaMetadata(cleaned.lumaUrl);

  return {
    lumaUrl: cleaned.lumaUrl,
    name:
      cleaned.name || metadata.name || nameFromLumaUrl(cleaned.lumaUrl),
    startsAt: cleaned.startsAt ?? metadata.startsAt,
  };
}
