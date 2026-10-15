import { json } from "@/lib/server/backend";
export async function GET() { return json({ aiEnabled: process.env.OPENAI_ENABLED === "true" }); }
