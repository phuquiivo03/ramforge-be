import { Router } from "express";
import { geocodeAddressToObject } from "../services/geocoding";
import healthRoute from "./health.route";
import buildersRoute from "./builders.route";
import networksRoute from "./networks.route";

const router = Router();

router.use("/health", healthRoute);
router.use("/builders", buildersRoute);
router.use("/networks", networksRoute);

router.get("/:location", async (req, res) => {
  const { location } = req.params;
  const xy = await geocodeAddressToObject(location);
  return res.json({ location, xy });
});
export default router;
