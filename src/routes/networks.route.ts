import { Router } from "express";
import { NetworksController } from "../controllers/networks.controller";

const router = Router();

router.get("/", NetworksController.list);
router.post("/connect", NetworksController.connectBuilder);
router.get("/:builderId", NetworksController.getOne);
router.get("/:builderId/onchainFiends", NetworksController.getOnchainFriends);
router.get("/pending/received/:userId", NetworksController.getPendingReceivedForUser);
router.post("/", NetworksController.create);
router.put("/:builderId/connections", NetworksController.setConnections);
router.post("/:builderId/connections", NetworksController.addConnections);
router.delete("/:builderId/connections", NetworksController.removeConnections);

export default router;
