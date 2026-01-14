import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

// Check if user is admin
async function isAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email || !(await isAdmin(session.user.email))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { provider } = await req.json();

    if (!provider || !["openai", "anthropic", "google"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Get API key for the provider
    const keyMap: Record<string, string> = {
      openai: SETTING_KEYS.OPENAI_API_KEY,
      anthropic: SETTING_KEYS.ANTHROPIC_API_KEY,
      google: SETTING_KEYS.GOOGLE_AI_API_KEY,
    };

    const apiKey = await getSetting(keyMap[provider]);

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "API key not configured",
      });
    }

    // Test each provider
    let result: { success: boolean; error?: string; model?: string };

    switch (provider) {
      case "openai":
        result = await testOpenAI(apiKey);
        break;
      case "anthropic":
        result = await testAnthropic(apiKey);
        break;
      case "google":
        result = await testGoogle(apiKey);
        break;
      default:
        result = { success: false, error: "Unknown provider" };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test API key error:", error);
    return NextResponse.json(
      { success: false, error: "Test failed" },
      { status: 500 }
    );
  }
}

async function testOpenAI(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const hasGPT4 = data.data?.some((m: any) => m.id.includes("gpt-4"));
      return {
        success: true,
        model: hasGPT4 ? "GPT-4 available" : "GPT-3.5 only",
      };
    }

    const error = await response.json();
    return {
      success: false,
      error: error.error?.message || "Invalid API key",
    };
  } catch (error) {
    return { success: false, error: "Connection failed" };
  }
}

async function testAnthropic(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    // Make a minimal API call to verify the key
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    if (response.ok) {
      return { success: true, model: "Claude available" };
    }

    // Check for specific error types
    const error = await response.json();

    if (response.status === 401) {
      return { success: false, error: "Invalid API key" };
    }

    if (response.status === 400 && error.error?.message?.includes("credit")) {
      return { success: true, model: "Key valid (no credits)" };
    }

    return {
      success: false,
      error: error.error?.message || "API key validation failed",
    };
  } catch (error) {
    return { success: false, error: "Connection failed" };
  }
}

async function testGoogle(apiKey: string): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    // List available models to verify the key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      const hasGemini = data.models?.some((m: any) => m.name?.includes("gemini"));
      return {
        success: true,
        model: hasGemini ? "Gemini available" : "Models available",
      };
    }

    const error = await response.json();
    return {
      success: false,
      error: error.error?.message || "Invalid API key",
    };
  } catch (error) {
    return { success: false, error: "Connection failed" };
  }
}
