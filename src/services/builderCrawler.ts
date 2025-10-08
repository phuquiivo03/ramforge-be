import { Builder } from "../models/builder.model";
import { geocodeAddressToXY } from "./geocoding";

type TalentProfile = {
  bio?: string;
  builder_score?: { last_calculated_at?: string; points?: number; slug?: string };
  calculating_score?: boolean;
  created_at?: string;
  display_name?: string;
  human_checkmark?: boolean;
  id?: string;
  image_url?: string;
  location?: string;
  name: string;
  scores?: { last_calculated_at?: string; points?: number; slug?: string }[];
  tags?: string[];
  verified_nationality?: boolean;
  talent_protocol_id?: number;
};

export async function crawlTalentBuilders(
  apiKey: string,
  opts?: { startPage?: number; endPage?: number; perPage?: number; delayMs?: number },
) {
  const startPage = opts?.startPage ?? 1;
  const endPage = opts?.endPage ?? 400;
  const perPage = opts?.perPage ?? 25;
  const delayMs = opts?.delayMs ?? 200; // small delay to be polite to API

  const baseUrl =
    "https://api.talentprotocol.com/search/advanced/profiles?query=%7B%7D&sort=%7B%22score%22%3A%7B%22order%22%3A%22desc%22%2C%22scorer%22%3A%22Builder+Score%22%7D%7D";

  let totalFetched = 0;
  let upserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: { page: number; name?: string; error: string }[] = [];

  for (let page = startPage; page <= endPage; page++) {
    const url = `${baseUrl}&page=${page}&per_page=${perPage}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
        },
      });
      if (!resp.ok) {
        failed++;
        errors.push({ page, error: `status ${resp.status}` });
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      const json = (await resp.json()) as { profiles?: TalentProfile[] };
      const profiles = json?.profiles ?? [];
      totalFetched += profiles.length;

      for (const p of profiles) {
        try {
          // Transform
          const payload: any = {
            bio: p.bio ?? undefined,
            builder_score: p.builder_score
              ? {
                  slug: p.builder_score.slug ?? "builder_score",
                  points: Number(p.builder_score.points ?? 0),
                  last_calculated_at: p.builder_score.last_calculated_at
                    ? new Date(p.builder_score.last_calculated_at)
                    : undefined,
                }
              : undefined,
            calculating_score: Boolean(p.calculating_score ?? false),
            created_at: p.created_at ? new Date(p.created_at) : new Date(),
            display_name: p.display_name ?? undefined,
            human_checkmark: Boolean(p.human_checkmark ?? false),
            image_url: p.image_url ?? undefined,
            name: p.name,
            scores: Array.isArray(p.scores)
              ? p.scores.map((s) => ({
                  slug: s.slug ?? "",
                  points: Number(s.points ?? 0),
                  last_calculated_at: s.last_calculated_at
                    ? new Date(s.last_calculated_at)
                    : undefined,
                }))
              : [],
            tags: Array.isArray(p.tags) ? p.tags : [],
            verified_nationality: Boolean(p.verified_nationality ?? false),
          };

          // Geocode location string -> [x,y]
          if (p.location && typeof p.location === "string" && p.location.trim().length > 0) {
            const xy = await geocodeAddressToXY(p.location);
            if (xy) payload.location = xy;
          }

          // Upsert by unique name
          const result = await Builder.findOneAndUpdate(
            { name: p.name },
            { $set: payload },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          ).lean();

          if (result) {
            // Heuristic: if it existed, updated++ else upserted++.
            // findOneAndUpdate with upsert can't easily distinguish here; do a light extra check
            const existed = await Builder.exists({ name: p.name });
            if (existed) updated++;
            else upserted++;
          } else {
            upserted++;
          }
        } catch (err: any) {
          failed++;
          errors.push({ page, name: p?.name, error: String(err?.message ?? err) });
        }
      }
    } catch (err: any) {
      failed++;
      errors.push({ page, error: String(err?.message ?? err) });
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  return { totalFetched, upserted, updated, failed, errors };
}
