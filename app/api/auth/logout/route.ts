import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function POST(req: Request) { (await cookies()).delete("salon_session"); return NextResponse.redirect(new URL("/pt/planos", req.url), 303); }
