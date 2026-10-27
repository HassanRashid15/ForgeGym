import AISpeedPageClient from "./AISpeedPageClient";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getCachedResults() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const supabase = await createSupabaseCookieClient();
    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${baseUrl}/api/ai-speed`, {
      cache: 'no-store',
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      return {
        results: data.results || [],
        isCached: data.cached || false,
        cacheAge: data.cacheAge || 0,
      };
    }
  } catch (error) {
    console.error("Error fetching cached results:", error);
  }
  return {
    results: [],
    isCached: false,
    cacheAge: 0,
  };
}

async function getConfiguredProviders() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/ai-speed?providers=true`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json();
      return data.providers || [];
    }
  } catch (error) {
    console.error("Error fetching configured providers:", error);
  }
  return [];
}

async function getDisabledModels() {
  try {
    const supabase = await createSupabaseCookieClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data: disabledModels } = await supabase
      .from("ai_models")
      .select("provider, model")
      .eq("user_id", user.id)
      .eq("is_disabled", true);

    const modelKeys = disabledModels?.map((m) => `${m.provider}/${m.model}`) || [];
    console.log("Server-side disabled models:", modelKeys);
    return modelKeys;
  } catch (error) {
    console.error("Error fetching disabled models:", error);
  }
  return [];
}

async function isAiSpeedEnabled() {
  try {
    const supabase = await createSupabaseCookieClient();
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_speed_enabled")
      .single();

    const enabled = data?.value === "true";
    console.log("AI Speed enabled check:", { data, enabled });
    return enabled;
  } catch (error) {
    console.error("Error checking AI Speed enabled status:", error);
    return true; // Default to enabled if error
  }
}

export default async function AISpeedPage() {
  // Check if AI Speed is enabled in platform settings
  const enabled = await isAiSpeedEnabled();
  console.log("AI Speed page access check:", enabled);
  
  // Temporarily disable redirect to allow access for testing
  // if (!enabled) {
  //   redirect("/dashboard");
  // }

  const { results, isCached, cacheAge } = await getCachedResults();
  const configuredProviders = await getConfiguredProviders();
  const initialDisabledModels = await getDisabledModels();

  return (
    <AISpeedPageClient
      initialResults={results}
      isCached={isCached}
      cacheAge={cacheAge}
      configuredProviders={configuredProviders}
      initialDisabledModels={initialDisabledModels}
    />
  );
}
