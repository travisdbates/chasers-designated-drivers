import type { APIRoute } from "astro";
import jwt from "jsonwebtoken";
import { config } from "dotenv";

// Load environment variables
config();

export const prerender = false;

const CHATBASE_SECRET = process.env.CHATBASE_SECRET_KEY;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check if secret is configured
    if (!CHATBASE_SECRET) {
      console.error("CHATBASE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Chatbase not configured",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { user_id, email, name, custom_attributes } = body;

    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "user_id is required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create JWT payload
    const payload: any = {
      user_id: user_id,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
    };

    // Add optional fields
    if (email) payload.email = email;
    if (name) payload.name = name;
    if (custom_attributes) payload.custom_attributes = custom_attributes;

    // Sign the token
    const token = jwt.sign(payload, CHATBASE_SECRET, { algorithm: "HS256" });

    console.log("Chatbase JWT token generated successfully for user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        token: token,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating Chatbase token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to generate token",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
