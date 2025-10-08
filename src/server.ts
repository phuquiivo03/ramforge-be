import app from "./app";
import { env } from "./config/env";
import { connectToDatabase } from "./config/db";

async function main(): Promise<void> {
  await connectToDatabase();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhostx:${env.port}`);
  });
}

void main();
