export const config = {
	port: process.env.PORT || 3000,
	nodeEnv: process.env.NODE_ENV || "development",
	whatsapp: {
		phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
		accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
		webhookVerificationToken:
			process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN,
	},
};
