import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.post("/", AuthController.authenticate);

export default router;


