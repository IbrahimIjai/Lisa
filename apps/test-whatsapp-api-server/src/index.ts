import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import morgan from "morgan";
import { config } from "./config/index.js";
import { routes } from "./routes/index.js";

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Register all routes
app.use("/api", routes);

// Error handling middleware
app.use(
	(
		err: any,
		req: express.Request,
		res: express.Response,
		next: express.NextFunction,
	) => {
		console.error(err);
		res.status(err.status || 500).json({
			message: err.message || "Internal Server Error",
			...(process.env.NODE_ENV === "development" && { stack: err.stack }),
		});
	},
);

// Start server
const PORT = config.port || 3005;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

export default app;
