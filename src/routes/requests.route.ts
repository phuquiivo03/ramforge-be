import { Router } from "express";
import { RequestsController } from "../controllers/requests.controller";

const router = Router();

router.get("/", RequestsController.list);
router.post("/", RequestsController.create);
router.get("/:id", RequestsController.getOne);
router.patch("/:id/status", RequestsController.updateStatus);

export default router;


