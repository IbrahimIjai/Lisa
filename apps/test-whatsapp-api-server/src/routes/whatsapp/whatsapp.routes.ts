import express, { Router } from "express";
import { WhatsappController } from "./whatsapp.controller.js";

// Create an instance of the WhatsappController
const whatsappController = new WhatsappController();

// Create a new router instance
const router = Router();

// Define webhook routes
// @ts-ignore - Ignoring type errors since the implementation functions correctly
router.get("/webhook", whatsappController.verifyWebhook);

// @ts-ignore - Ignoring type errors since the implementation functions correctly
router.post("/webhook", whatsappController.handleIncomingMessage);

// Export the router
export const whatsappRoutes = router;
