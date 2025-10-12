import { Router } from "express";
import { Builder } from "../models/builder.model";
import { geocodeAddressToXY } from "../services/geocoding";
import { crawlTalentBuilders } from "../services/builderCrawler";

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
