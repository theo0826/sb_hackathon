import { database, failure, json, owner, readBody } from "@/lib/server/backend";
export async function POST(request: Request) {
  try {
    await readBody(request);
    database();
    await owner(true);
    return json({ ready: true });
  } catch (error) { return failure(error); }
}
