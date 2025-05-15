import { Request, Response, NextFunction } from "express";
import { WhatsappService } from "./whatsapp.service.js";

// Using a proper RequestHandler type that doesn't complain about return types
type AsyncRequestHandler = (
	req: Request,
	res: Response,
	next?: NextFunction,
) => Promise<void>;

// Create an instance of the WhatsappService
const whatsappService = new WhatsappService();

export class WhatsappController {
	// Use arrow functions to preserve 'this' context
	verifyWebhook: AsyncRequestHandler = async (req, res) => {
		try {
			const mode = req.query["hub.mode"];
			const challenge = req.query["hub.challenge"];
			const token = req.query["hub.verify_token"];

			const verificationToken =
				process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

			if (!mode || !token) {
				res.status(400).send("Error verifying token");
				return;
			}

			if (mode === "subscribe" && token === verificationToken) {
				res.status(200).send(challenge);
				return;
			}

			res.status(403).send("Verification failed");
		} catch (error) {
			console.error("Error verifying webhook:", error);
			res.status(500).send("Error verifying webhook");
		}
	};

	handleIncomingMessage: AsyncRequestHandler = async (req, res) => {
		try {
			const { messages } = req.body?.entry?.[0]?.changes?.[0].value ?? {};

			if (!messages) {
				res.status(200).send("No messages to process");
				return;
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

			res.status(200).send("Message processed");
		} catch (error) {
			console.error("Error processing webhook:", error);
			// Always return 200 to WhatsApp even if there's an error
			res.status(200).send("Webhook received");
		}
	};

	register: AsyncRequestHandler = async (req, res) => {
		// Implementation of register method
	};
}
