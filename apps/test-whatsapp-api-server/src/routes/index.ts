import { Router } from "express";
import { whatsappRoutes } from "./whatsapp/whatsapp.routes.js";

const router = Router();

// Register the WhatsApp route module
router.use("/whatsapp", whatsappRoutes);

export const routes = router;
