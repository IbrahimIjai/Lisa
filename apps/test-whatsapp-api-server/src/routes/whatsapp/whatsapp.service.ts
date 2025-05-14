import axios from "axios";

export class WhatsappService {
	private readonly apiUrl: string;
	private readonly phoneNumberId: string;
	private readonly accessToken: string;

	constructor() {
		this.apiUrl = "https://graph.facebook.com/v18.0";
		this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
		this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";

		if (!this.phoneNumberId || !this.accessToken) {
			console.warn("WhatsApp API credentials not properly configured");
		}
	}

	/**
	 * Mark a message as read
	 */
	async markMessageAsRead(messageId: string): Promise<boolean> {
		try {
			if (!this.phoneNumberId || !this.accessToken) {
				console.error("WhatsApp API credentials not configured");
				return false;
			}

			const response = await axios.post(
				`${this.apiUrl}/${this.phoneNumberId}/messages`,
				{
					messaging_product: "whatsapp",
					status: "read",
					message_id: messageId,
				},
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			return response.status === 200;
		} catch (error) {
			console.error("Error marking message as read:", error);
			return false;
		}
	}

	/**
	 * Send a text message to a WhatsApp user
	 */
	async sendMessage(
		to: string,
		text: string,
		replyToMessageId?: string,
	): Promise<boolean> {
		try {
			if (!this.phoneNumberId || !this.accessToken) {
				console.error("WhatsApp API credentials not configured");
				return false;
			}

			const payload: any = {
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to,
				type: "text",
				text: {
					body: text,
				},
			};

			// Add context for message reply if messageId is provided
			if (replyToMessageId) {
				payload.context = {
					message_id: replyToMessageId,
				};
			}

			const response = await axios.post(
				`${this.apiUrl}/${this.phoneNumberId}/messages`,
				payload,
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			return response.status === 200;
		} catch (error) {
			console.error("Error sending WhatsApp message:", error);
			return false;
		}
	}

	/**
	 * Download media from WhatsApp
	 */
	async downloadMedia(
		mediaId: string,
	): Promise<{ status: string; data?: Buffer }> {
		try {
			if (!this.accessToken) {
				console.error("WhatsApp API credentials not configured");
				return { status: "error" };
			}

			// First, get the media URL
			const mediaUrlResponse = await axios.get(`${this.apiUrl}/${mediaId}`, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
				},
			});

			if (!mediaUrlResponse.data || !mediaUrlResponse.data.url) {
				return { status: "error" };
			}

			// Then download the media
			const mediaDownloadResponse = await axios.get(mediaUrlResponse.data.url, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
				},
				responseType: "arraybuffer",
			});

			return {
				status: "success",
				data: Buffer.from(mediaDownloadResponse.data),
			};
		} catch (error) {
			console.error("Error downloading media:", error);
			return { status: "error" };
		}
	}

	/**
	 * Send an image by URL
	 */
	async sendImageByUrl(
		to: string,
		imageUrl: string,
		replyToMessageId?: string,
	): Promise<boolean> {
		try {
			if (!this.phoneNumberId || !this.accessToken) {
				console.error("WhatsApp API credentials not configured");
				return false;
			}

			const payload: any = {
				messaging_product: "whatsapp",
				recipient_type: "individual",
				to,
				type: "image",
				image: {
					link: imageUrl,
				},
			};

			// Add context for message reply if messageId is provided
			if (replyToMessageId) {
				payload.context = {
					message_id: replyToMessageId,
				};
			}

			const response = await axios.post(
				`${this.apiUrl}/${this.phoneNumberId}/messages`,
				payload,
				{
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
				},
			);

			return response.status === 200;
		} catch (error) {
			console.error("Error sending image:", error);
			return false;
		}
	}
}
