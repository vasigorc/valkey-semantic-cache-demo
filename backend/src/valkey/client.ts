import { GlideClient, Logger } from "@valkey/valkey-glide";

const VALKEY_HOST = process.env.VALKEY_HOST || "localhost";
const VALKEY_PORT = parseInt(process.env.VALKEY_PORT || "6379");
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

let client: GlideClient | null = null;

// sleep helper for retry delays
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectToValkey(): Promise<GlideClient> {
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(
        `Attempting to connect to Valkey at ${VALKEY_HOST}:${VALKEY_PORT} (attempt ${attempts + 1}/${MAX_RETRIES}`,
      );

      client = await GlideClient.createClient({
        addresses: [
          {
            host: VALKEY_HOST,
            port: VALKEY_PORT,
          },
        ],
        clientName: "airline-helpdesk-backend",
        requestTimeout: 5000,
      });

      const pong = await client.ping();
      console.log(`✅ Connected to Valkey successfully: ${pong}`);

      return client;
    } catch (error) {
      attempts++;
      console.error(
        `❌ Failed to connect to Valkey (attempt ${attempts + 1}/${MAX_RETRIES})`,
      );

      if (attempts >= MAX_RETRIES) {
        throw new Error(
          `Failed to connect to Valkey after ${MAX_RETRIES} attempts`,
        );
      }

      console.log(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error("Failed to connect to Valkey");
}

export function getValkeyClient(): GlideClient {
  if (!client) {
    throw new Error(
      "Valkey client not initializeid. Vall connectToValkey() first.",
    );
  }
  return client;
}

export async function checkValkeyHealth(): Promise<{
  status: "healthy" | "unhealthy";
  latencyMs?: number;
  error?: string;
}> {
  if (!client) {
    return {
      status: "unhealthy",
      error: "Client not initializeid",
    };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;

    return {
      status: "healthy",
      latencyMs,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function closeValkeyConnection(): Promise<void> {
  if (client) {
    client.close();
    client = null;
    console.log("Valkey connection closed");
  }
}
