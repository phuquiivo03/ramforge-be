import { Router } from "express";
import { Builder } from "../models/builder.model";
import { geocodeAddressToXY } from "../services/geocoding";
import { crawlTalentBuilders } from "../services/builderCrawler";
import { SocialConnect } from "../models/socialConnect.model";
import { XService } from "../services/x.service";
import { randomBytes, createHash } from "crypto";
import { generateCodeChallenge } from "../services/utils";
const router = Router();

// Search builders with pagination
router.get("/", async (req, res) => {
  try {
    const { search, page = "1", limit = "10" } = req.query;

    // Parse pagination parameters
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build search query
    let query: any = {};
    if (search && typeof search === "string" && search.trim().length > 0) {
      // Case-insensitive search by name
      query.name = { $regex: search.trim(), $options: "i" };
    }

    // Execute search with pagination
    const [builders, total] = await Promise.all([
      Builder.find(query).skip(skip).limit(limitNum).lean(),
      Builder.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      builders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Failed to search builders",
      error: err?.message,
    });
  }
});

// Get one by id (Mongo _id)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const builder = await Builder.findById(id).lean();
  if (!builder) return res.status(404).json({ message: "Not found" });
  res.json(builder);
});

// Create
router.post("/", async (req, res) => {
  try {
    const payload = req.body;

    // Normalize dates
    if (payload?.builder_score?.last_calculated_at)
      payload.builder_score.last_calculated_at = new Date(payload.builder_score.last_calculated_at);
    if (Array.isArray(payload?.scores)) {
      payload.scores = payload.scores.map((s: any) => ({
        ...s,
        last_calculated_at: s.last_calculated_at ? new Date(s.last_calculated_at) : undefined,
      }));
    }
    if (payload?.created_at) payload.created_at = new Date(payload.created_at);

    // Geocode location string -> [x, y]
    if (typeof payload?.location === "string" && payload.location.trim().length > 0) {
      const xy = await geocodeAddressToXY(payload.location);
      if (!xy) return res.status(400).json({ message: "Failed to geocode location" });
      payload.location = xy;
    }

    const created = await Builder.create(payload);
    res.status(201).json(created.toObject());
  } catch (err: any) {
    res.status(400).json({ message: err?.message || "Invalid payload" });
  }
});

export default router;

// Crawl from Talent Protocol (requires x-api-key header)
router.post("/crawl", async (req, res) => {
  const apiKey = req.header("x-api-key");
  if (!apiKey) return res.status(400).json({ message: "x-api-key header required" });
  const { startPage, endPage, perPage } = req.query as any;
  const result = await crawlTalentBuilders(apiKey, {
    startPage: startPage ? Number(startPage) : undefined,
    endPage: endPage ? Number(endPage) : undefined,
    perPage: perPage ? Number(perPage) : undefined,
  });
  res.json(result);
});

// Update profile by id (Mongo _id)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    // Normalize dates
    if (payload?.builder_score?.last_calculated_at)
      payload.builder_score.last_calculated_at = new Date(payload.builder_score.last_calculated_at);
    if (Array.isArray(payload?.scores)) {
      payload.scores = payload.scores.map((s: any) => ({
        ...s,
        last_calculated_at: s.last_calculated_at ? new Date(s.last_calculated_at) : undefined,
      }));
    }
    if (payload?.created_at) payload.created_at = new Date(payload.created_at);

    // Geocode location string -> [x, y]
    if (typeof payload?.location === "string" && payload.location.trim().length > 0) {
      const xy = await geocodeAddressToXY(payload.location);
      if (!xy) return res.status(400).json({ message: "Failed to geocode location" });
      payload.location = xy;
    }

    const updated = await Builder.findByIdAndUpdate(id, { $set: payload }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ message: err?.message || "Invalid payload" });
  }
});

// Get social connections for a builder
router.get("/:id/social", async (req, res) => {
  const { id } = req.params;
  const doc = await SocialConnect.findOne({ builder: id }).lean();
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
});

// Create or update social connections for a builder (upsert)
router.put("/:id/social", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = {
      builder: id,
      discord: req.body?.discord,
      x: req.body?.x,
      telegram: req.body?.telegram,
      github: req.body?.github,
      google: req.body?.google,
      farcaster: req.body?.farcaster,
      wallet: req.body?.wallet,
    } as any;

    const doc = await SocialConnect.findOneAndUpdate(
      { builder: id },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ message: err?.message || "Invalid payload" });
  }
});

// Connect X (Twitter) for a builder (upsert only the x field)
router.put("/:id/social/x", async (req, res) => {
  try {
    const { id } = req.params;
    const x = (req.body?.x as string) || "";
    if (typeof x !== "string" || x.trim().length === 0)
      return res.status(400).json({ message: "x is required" });

    const doc = await SocialConnect.findOneAndUpdate(
      { builder: id },
      { $set: { builder: id, x: x.trim() } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    res.json(doc);
  } catch (err: any) {
    res.status(400).json({ message: err?.message || "Invalid payload" });
  }
});

// Start X OAuth: returns authorization URL (PKCE: client provides codeChallenge & state)
router.get("/:id/social/x/auth-url", async (req, res) => {
  const { id } = req.params;
  const state = (req.query.state as string) || id; // tie to builder
  const challenge = generateCodeChallenge();
  const url = XService.getAuthUrl(state, challenge);
  res.redirect(url);
});

// Complete X OAuth: exchange code and link to builder
router.post("/:id/social/x/oauth", async (req, res) => {
  try {
    const { id } = req.params;
    const code = req.body?.code as string;
    const codeVerifier = req.body?.code_verifier as string;
    if (!code || !codeVerifier)
      return res.status(400).json({ message: "code and code_verifier required" });

    // Exchange authorization code for tokens
    const token = await XService.exchangeCodeForToken(code, codeVerifier);

    // Fetch X user profile
    const me = await XService.getMe(token.access_token);
    const xUserId = me?.data?.id;

    // Persist link
    const doc = await SocialConnect.findOneAndUpdate(
      { builder: id },
      {
        $set: {
          builder: id,
          xAccessToken: token.access_token,
          xRefreshToken: token.refresh_token ?? undefined,
          xUserId: xUserId ?? undefined,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    res.json({ linked: Boolean(xUserId), xUserId, socials: doc });
  } catch (err: any) {
    res.status(400).json({ message: err?.message || "Failed to connect X" });
  }
});

// Redirect URI callback handler for X OAuth (server-side exchange if secret configured)
router.get("/social/x/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // we expect builderId here if you used default state
    if (!code) return res.status(400).json({ message: "code missing" });

    // If we have a client secret configured, do a confidential exchange on server
    if (process.env.X_CLIENT_SECRET) {
      const token = await XService.exchangeCodeForTokenWithSecret(code);
      const me = await XService.getMe(token.access_token);
      const xUserId = me?.data?.id;
      if (!state) return res.status(200).json({ linked: Boolean(xUserId), xUserId });

      // Persist if state is builderId
      const doc = await SocialConnect.findOneAndUpdate(
        { builder: state },
        {
          $set: {
            builder: state,
            xAccessToken: token.access_token,
            xRefreshToken: token.refresh_token ?? undefined,
            xUserId: xUserId ?? undefined,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      ).lean();

      return res.status(200).json({ linked: Boolean(xUserId), xUserId, socials: doc });
    }

    // Otherwise instruct clients to POST to /:id/social/x/oauth with code_verifier
    return res.status(200).json({
      message: "Use POST /builders/:id/social/x/oauth with code_verifier to complete PKCE exchange",
      code,
      state,
    });
  } catch (err: any) {
    res.status(400).json({ message: err?.message || "Callback failed" });
  }
});
