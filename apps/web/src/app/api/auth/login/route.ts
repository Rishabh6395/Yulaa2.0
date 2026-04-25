import { login } from "@/modules/auth/auth.service";
import { handleError } from "@/utils/errors";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await login(body);

    const response = NextResponse.json(result);
    response.cookies.set("token", result.token, {
      path: "/",
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60, // 7 Days
    });

    return response;
  } catch (err) {
    return handleError(err);
  }
}
