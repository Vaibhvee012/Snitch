import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { config } from "./src/config/config.js";

const port = config.PORT;

async function startServer() {
  try {
    await connectDB();

    await new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        console.info(`Server is listening on port ${port}`);
        resolve();
      });
      server.once("error", reject);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();