import { NextRequest, NextResponse } from "next/server";
import { generateAICompletion, getAvailableModels, isAIProviderConfigured, type AIProvider } from "@/lib/ai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SpeedTestResult {
  provider: string;
  model: string;
  responseTime: number;
  status: "success" | "error" | "pending" | "in-progress";
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  progress?: number;
}

interface CachedResults {
  results: SpeedTestResult[];
  timestamp: number;
}

const TEST_PROMPT = "Respond with exactly: 'Test successful'";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

let cachedResults: CachedResults | null = null;

async function testModel(provider: AIProvider, model: string, onProgress?: (result: SpeedTestResult) => void): Promise<SpeedTestResult> {
  const result: SpeedTestResult = {
    provider,
    model,
    responseTime: 0,
    status: "in-progress",
    progress: 0,
  };

  if (onProgress) {
    onProgress({ ...result });
  }

  // Simulate progress updates during the test
  let progress = 0;
  const startTime = performance.now();
  const progressInterval = setInterval(() => {
    progress += 10;
    if (progress < 90) {
      result.progress = progress;
      result.responseTime = performance.now() - startTime;
      if (onProgress) {
        onProgress({ ...result });
      }
    }
  }, 100);

  try {
    const completion = await generateAICompletion(
      [{ role: "user", content: TEST_PROMPT }],
      { provider, model, maxTokens: 10 }
    );
    const endTime = performance.now();

    clearInterval(progressInterval);
    result.responseTime = endTime - startTime;
    result.status = "success";
    result.progress = 100;
    result.usage = completion.usage;
  } catch (error) {
    clearInterval(progressInterval);
    result.responseTime = performance.now() - startTime;
    result.status = "error";
    result.progress = 100;
    result.error = error instanceof Error ? error.message : "Unknown error";
  }

  if (onProgress) {
    onProgress({ ...result });
  }

  return result;
}

async function saveResultsToDatabase(userId: string, results: SpeedTestResult[]) {
  try {
    for (const result of results) {
      // Never write results for disabled / skipped models — preserves is_disabled in DB
      if (
        result.error === "Model disabled by user" ||
        result.status === "pending" ||
        result.status === "in-progress"
      ) {
        continue;
      }

      const { data: existingModel } = await supabase
        .from("ai_models")
        .select("is_disabled")
        .eq("user_id", userId)
        .eq("provider", result.provider)
        .eq("model", result.model)
        .maybeSingle();

      if (existingModel?.is_disabled) {
        console.log(`Skipping test result for disabled model: ${result.provider}/${result.model}`);
        continue;
      }

      // Explicitly keep is_disabled=false so upserts never wipe an enable/disable flag
      await supabase.from("ai_models").upsert(
        {
          user_id: userId,
          provider: result.provider,
          model: result.model,
          is_disabled: false,
          response_time: Math.round(result.responseTime),
          status: result.status === "success" || result.status === "error" ? result.status : "pending",
          error_message: result.error ?? null,
          prompt_tokens: result.usage?.promptTokens ?? null,
          completion_tokens: result.usage?.completionTokens ?? null,
          total_tokens: result.usage?.totalTokens ?? null,
          last_tested_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,model" },
      );
    }
    console.log("Saved speed test results to database");
  } catch (error) {
    console.error("Error saving results to database:", error);
  }
}

async function getLatestResultsFromDatabase(userId: string): Promise<SpeedTestResult[] | null> {
  try {
    const { data, error } = await supabase
      .from("ai_models")
      .select("*")
      .eq("user_id", userId)
      .eq("is_disabled", false)
      .order("last_tested_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching results from database:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Group by provider and model, get the latest for each
    const latestByModel = new Map<string, SpeedTestResult>();
    for (const row of data) {
      const key = `${row.provider}/${row.model}`;
      if (!latestByModel.has(key)) {
        latestByModel.set(key, {
          provider: row.provider,
          model: row.model,
          responseTime: row.response_time,
          status: row.status as "success" | "error" | "pending",
          error: row.error_message,
          usage: row.total_tokens ? {
            promptTokens: row.prompt_tokens || 0,
            completionTokens: row.completion_tokens || 0,
            totalTokens: row.total_tokens,
          } : undefined,
        });
      }
    }

    return Array.from(latestByModel.values());
  } catch (error) {
    console.error("Error fetching results from database:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";
  const providers = searchParams.get("providers") === "true";

  if (providers) {
    const availableProviders: AIProvider[] = ["openai", "xai", "groq", "ollama", "cohere"];
    const configured = availableProviders.filter(isAIProviderConfigured);
    return NextResponse.json({ providers: configured });
  }

  // Try to get results from database first
  const authHeader = request.headers.get("authorization");
  if (authHeader && !forceRefresh) {
    try {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const dbResults = await getLatestResultsFromDatabase(user.id);
        if (dbResults && dbResults.length > 0) {
          return NextResponse.json({
            results: dbResults,
            cached: true,
            cacheAge: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error checking database for cached results:", error);
    }
  }

  // Fall back to in-memory cache
  if (!forceRefresh && cachedResults && Date.now() - cachedResults.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      results: cachedResults.results,
      cached: true,
      cacheAge: Math.floor((Date.now() - cachedResults.timestamp) / 1000),
    });
  }

  return NextResponse.json({ results: [], cached: false });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const disabledModels: string[] = body.disabledModels || [];
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    // Get user ID if authenticated
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error("Error getting user for speed test:", error);
      }
    }

    const providers: AIProvider[] = ["openai", "xai", "groq", "ollama", "cohere"];
    const configuredProviders = providers.filter(isAIProviderConfigured);

    if (configuredProviders.length === 0) {
      return NextResponse.json(
        { error: "No AI providers configured" },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const results: SpeedTestResult[] = [];
        let totalTests = 0;
        let completedTests = 0;

        for (const provider of configuredProviders) {
          const models = getAvailableModels(provider);
          totalTests += models.length;
        }

        for (const provider of configuredProviders) {
          const models = getAvailableModels(provider);
          for (const model of models) {
            const modelKey = `${provider}/${model}`;

            // Skip disabled models but add them to results with disabled status
            if (disabledModels.includes(modelKey)) {
              const disabledResult: SpeedTestResult = {
                provider,
                model,
                responseTime: 0,
                status: "error",
                error: "Model disabled by user",
                progress: 100,
              };
              results.push(disabledResult);
              const disabledData = {
                type: "result",
                result: disabledResult,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(disabledData)}\n\n`));
              completedTests++;
              continue;
            }

            // Send initial "in-progress" status
            const initialResult: SpeedTestResult = {
              provider,
              model,
              responseTime: 0,
              status: "in-progress",
              progress: 0,
            };
            const initialData = {
              type: "result",
              result: initialResult,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

            const result = await testModel(provider, model, (progressResult) => {
              // Send intermediate progress updates during the test
              const progressData = {
                type: "result",
                result: progressResult,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));
            });

            // Update results array with final result
            const existingIndex = results.findIndex(
              (r) => r.provider === result.provider && r.model === result.model
            );
            if (existingIndex >= 0) {
              results[existingIndex] = result;
            } else {
              results.push(result);
            }
            completedTests++;

            const progress = (completedTests / totalTests) * 100;
            const data = {
              type: "progress",
              progress,
              currentTest: `${provider}/${model}`,
              completed: completedTests,
              total: totalTests,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          }
        }

        // Save results to database if user is authenticated
        if (userId) {
          await saveResultsToDatabase(userId, results);
        }

        // Update in-memory cache
        cachedResults = {
          results,
          timestamp: Date.now(),
        };

        const finalData = {
          type: "complete",
          results,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalData)}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in AI speed test API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
