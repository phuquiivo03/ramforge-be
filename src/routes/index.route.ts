import { Router } from "express";
import { geocodeAddressToObject } from "../services/geocoding";
import healthRoute from "./health.route";
import buildersRoute from "./builders.route";
import networksRoute from "./networks.route";
import requestsRoute from "./requests.route";
import authRoute from "./auth.route";

const router = Router();

router.use("/health", healthRoute);
router.use("/auth", authRoute);
router.use("/builders", buildersRoute);
router.use("/networks", networksRoute);
router.use("/requests", requestsRoute);

router.get("/:location", async (req, res) => {
  const { location } = req.params;
  const xy = await geocodeAddressToObject(location);
  return res.json({ location, xy });
});
export default router;
