import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("API error", error);
  return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
}

export class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const privateJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
