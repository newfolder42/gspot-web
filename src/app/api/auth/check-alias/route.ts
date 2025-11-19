import { NextResponse } from "next/server";
import { userAliasTaken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { alias } = body;

    if (!alias || typeof alias !== "string") {
      return NextResponse.json({ error: "alias required" }, { status: 400 });
    }

    // Basic validation
    if (alias.length < 3 || alias.length > 30) {
      return NextResponse.json({ error: "Alias must be 3-30 characters" }, { status: 400 });
    }

    if (!/^[a-z0-9_-]+$/i.test(alias)) {
      return NextResponse.json({ error: "Alias can only contain letters, numbers, hyphens, and underscores" }, { status: 400 });
    }

    const taken = await userAliasTaken(alias);
    return NextResponse.json({ available: !taken });
  } catch (err) {
    console.error("check-alias error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
