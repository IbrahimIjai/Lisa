import express, { Router } from "express";
import { WhatsappController } from "./whatsapp.controller.js";

// Create an instance of the WhatsappController
const whatsappController = new WhatsappController();

// Create a new router instance
const router = Router();

// Define webhook routes
router.get("/webhook", whatsappController.verifyWebhook);

router.post("/webhook", whatsappController.handleIncomingMessage);

// Export the router
export const whatsappRoutes = router;
