import { Request, Response, NextFunction } from "express";
import { WhatsappService } from "./whatsapp.service.js";

// Create an instance of the WhatsappService
const whatsappService = new WhatsappService();

export class WhatsappController {
	// Use arrow functions to preserve 'this' context
	verifyWebhook = async (req: Request, res: Response, next: NextFunction) => {
		try {
			const mode = req.query["hub.mode"];
			const challenge = req.query["hub.challenge"];
			const token = req.query["hub.verify_token"];

			const verificationToken =
				process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

			if (!mode || !token) {
				return res.status(400).send("Error verifying token");
			}

			if (mode === "subscribe" && token === verificationToken) {
				return res.status(200).send(challenge);
			}

			return res.status(403).send("Verification failed");
		} catch (error) {
			next(error);
		}
	};

	handleIncomingMessage = async (
		req: Request,
		res: Response,
		next: NextFunction,
	) => {
		try {
			const { messages } = req.body?.entry?.[0]?.changes?.[0].value ?? {};

			if (!messages) {
				return res.status(200).send("No messages to process");
			}

			const message = messages[0];
			const messageSender = message.from;
			const messageID = message.id;

			// Mark message as read
			await whatsappService.markMessageAsRead(messageID);

			switch (message.type) {
				case "text":
					const text = message.text.body;
					// For now, just echo the message back
					await whatsappService.sendMessage(
						messageSender,
						`Echo: ${text}`,
						messageID,
					);
					break;

				// Add more message type handlers as needed
				default:
					await whatsappService.sendMessage(
						messageSender,
						"I received your message but can only process text messages for now.",
						messageID,
					);
			}

			return res.status(200).send("Message processed");
		} catch (error) {
			console.error("Error processing webhook:", error);
			// Always return 200 to WhatsApp even if there's an error
			return res.status(200).send("Webhook received");
		}
	};
}
