"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/loading/DashboardSkeleton";
import { Loader2, Zap, Clock, AlertCircle, CheckCircle2, RefreshCw, PowerOff, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

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
  disabled?: boolean;
}

interface AISpeedPageClientProps {
  initialResults: SpeedTestResult[];
  isCached: boolean;
  cacheAge: number;
  configuredProviders: string[];
  initialDisabledModels?: string[];
}

export default function AISpeedPageClient({
  initialResults,
  isCached: initialIsCached,
  cacheAge: initialCacheAge,
  configuredProviders: initialConfiguredProviders,
  initialDisabledModels = [],
}: AISpeedPageClientProps) {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SpeedTestResult[]>(initialResults);
  const [progress, setProgress] = useState(0);
  const [hasRunOnce, setHasRunOnce] = useState(initialResults.length > 0);
  const [isCached, setIsCached] = useState(initialIsCached);
  const [cacheAge, setCacheAge] = useState(initialCacheAge);
  const [currentTest, setCurrentTest] = useState<string>("");
  const [disabledModels, setDisabledModels] = useState<Set<string>>(() => new Set(initialDisabledModels));
  const [showModelInfo, setShowModelInfo] = useState(false);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>(initialConfiguredProviders);
  const [hasAutoRun, setHasAutoRun] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  /** provider/model keys — model itself may contain slashes (e.g. groq/openai/gpt-oss-20b) */
  const parseModelKey = (modelKey: string) => {
    const i = modelKey.indexOf("/");
    if (i < 0) return { provider: modelKey, model: "" };
    return { provider: modelKey.slice(0, i), model: modelKey.slice(i + 1) };
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isSuperAdmin, router]);

  // Auto-run speed tests on page load only if no results exist
  useEffect(() => {
    if (!hasAutoRun && !isRunning && !hasRunOnce) {
      console.log("Auto-running speed tests on page load (no results exist)...");
      setHasAutoRun(true);
      runSpeedTests(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when idle with no results
  }, [hasAutoRun, isRunning, hasRunOnce]);

  const persistModelEnabled = async (provider: string, model: string, enabled: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No session available");
    }

    const response = await fetch("/api/ai-disabled-models", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, model, enabled }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Failed to update model");
    }
  };

  const toggleModel = async (provider: string, model: string) => {
    const key = `${provider}/${model}`;
    if (togglingKey || isRunning) return;

    const wasDisabled = disabledModels.has(key);
    const nextEnabled = wasDisabled;

    // Optimistic UI
    setTogglingKey(key);
    setDisabledModels((prev) => {
      const next = new Set(prev);
      if (wasDisabled) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      await persistModelEnabled(provider, model, nextEnabled);
    } catch (error) {
      console.error("Error toggling model:", error);
      // Revert on failure
      setDisabledModels((prev) => {
        const next = new Set(prev);
        if (wasDisabled) next.add(key);
        else next.delete(key);
        return next;
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const enableAllModels = async () => {
    if (togglingKey || isRunning || disabledModels.size === 0) return;

    const previous = new Set(disabledModels);
    const keys = Array.from(disabledModels);
    setDisabledModels(new Set());
    setTogglingKey("__all__");

    try {
      await Promise.all(
        keys.map((modelKey) => {
          const { provider, model } = parseModelKey(modelKey);
          return persistModelEnabled(provider, model, true);
        }),
      );
    } catch (error) {
      console.error("Error enabling all models:", error);
      setDisabledModels(previous);
    } finally {
      setTogglingKey(null);
    }
  };

  const isModelDisabled = (provider: string, model: string) => {
    return disabledModels.has(`${provider}/${model}`);
  };

  const isSaving = togglingKey !== null;

  const runSpeedTests = async (_forceRefresh = false) => {
    if (togglingKey) return;

    setIsRunning(true);
    setResults([]);
    setProgress(0);
    setIsCached(false);
    setCurrentTest("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/ai-speed", {
        method: "POST",
        headers,
        body: JSON.stringify({
          disabledModels: Array.from(disabledModels),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run speed tests");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              setProgress(data.progress);
              setCurrentTest(data.currentTest);
            } else if (data.type === 'result') {
              setResults((prev) => {
                const existingIndex = prev.findIndex(
                  (r) => r.provider === data.result.provider && r.model === data.result.model
                );
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = data.result;
                  return updated;
                }
                return [...prev, data.result];
              });
            } else if (data.type === 'complete') {
              setResults(data.results);
              setHasRunOnce(true);
              setIsCached(false);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error running speed tests:", error);
    } finally {
      setIsRunning(false);
      setProgress(100);
      setCurrentTest("");
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting…
      </div>
    );
  }

  const enabledResults = results.filter(
    (r) => !disabledModels.has(`${r.provider}/${r.model}`)
  );

  const fastestModel = enabledResults
    .filter((r) => r.status === "success")
    .sort((a, b) => a.responseTime - b.responseTime)[0];

  const averageTime =
    enabledResults.filter((r) => r.status === "success").length > 0
      ? enabledResults
          .filter((r) => r.status === "success")
          .reduce((sum, r) => sum + r.responseTime, 0) /
        enabledResults.filter((r) => r.status === "success").length
      : 0;

  const totalTokensUsed = enabledResults
    .filter((r) => r.status === "success" && r.usage)
    .reduce((sum, r) => sum + (r.usage?.totalTokens || 0), 0);

  const avgTokensPerRequest = enabledResults.filter((r) => r.status === "success" && r.usage).length > 0
    ? totalTokensUsed / enabledResults.filter((r) => r.status === "success" && r.usage).length
    : 0;

  const groupByProvider = (results: SpeedTestResult[]) => {
    const grouped: Record<string, SpeedTestResult[]> = {};
    results.forEach((result) => {
      if (!grouped[result.provider]) {
        grouped[result.provider] = [];
      }
      grouped[result.provider].push(result);
    });
    return grouped;
  };

  const groupedResults = groupByProvider(results);

  const formatCacheAge = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Speed Testing</h1>
          <p className="text-muted-foreground">
            Test response times across all configured AI models
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runSpeedTests(true)}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Tests
              </>
            )}
          </Button>
        </div>
      </div>

      {isCached && !isRunning && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">Cached</Badge>
          <span>Results from {formatCacheAge(cacheAge)}</span>
        </div>
      )}

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Testing models...</span>
                <span className="font-medium">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentTest && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{currentTest}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fastest Model</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {fastestModel ? `${fastestModel.provider}` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {fastestModel ? `${fastestModel.model}` : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageTime > 0 ? `${averageTime.toFixed(0)}ms` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {enabledResults.filter((r) => r.status === "success").length} successful tests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((enabledResults.filter((r) => r.status === "success").length / enabledResults.length) * 100).toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {enabledResults.filter((r) => r.status === "success").length} / {enabledResults.length} tests passed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Models Disabled</CardTitle>
                <PowerOff className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {disabledModels.size}
                </div>
                <p className="text-xs text-muted-foreground">
                  {results.length - disabledModels.size} enabled
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Token Usage</CardTitle>
              <CardDescription>
                Total tokens consumed by enabled models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalTokensUsed > 0 ? totalTokensUsed.toLocaleString() : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {avgTokensPerRequest > 0 ? `${avgTokensPerRequest.toFixed(0)} avg/request` : "No data"}
              </p>
              {totalTokensUsed > 0 && (
                <div className="mt-2">
                  <Progress value={Math.min((totalTokensUsed / 1000) * 100, 100)} className="h-1" />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {disabledModels.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Disabled Models</CardTitle>
                <CardDescription>
                  Models that are disabled in the database and won&apos;t be tested
                </CardDescription>
              </div>
              <Button
                onClick={enableAllModels}
                disabled={isRunning || isSaving}
                variant="outline"
                size="sm"
              >
                Enable All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const grouped: Record<string, string[]> = {};
                Array.from(disabledModels).forEach((modelKey) => {
                  const { provider, model } = parseModelKey(modelKey);
                  if (!grouped[provider]) grouped[provider] = [];
                  grouped[provider].push(model);
                });

                return Object.entries(grouped).map(([provider, models]) => (
                  <div key={provider}>
                    <div className="font-semibold text-sm mb-2">{provider.toUpperCase()}</div>
                    <div className="space-y-1">
                      {models.map((model) => {
                        const modelKey = `${provider}/${model}`;
                        return (
                          <div key={modelKey} className="flex items-center justify-between text-sm pl-4">
                            <span className="text-muted-foreground">{model}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Models</CardTitle>
              <CardDescription>
                Information about all AI models configured in the system
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModelInfo(!showModelInfo)}
            >
              {showModelInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showModelInfo && (
          <CardContent>
            <div className="space-y-4">
              {configuredProviders.length === 0 ? (
                <div className="text-left text-muted-foreground py-8">
                  No AI providers configured. Please set up API keys in your environment variables.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {configuredProviders.includes("openai") && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <h3 className="font-semibold">OpenAI</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Industry-leading AI models with strong reasoning capabilities
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>gpt-4o-mini</span>
                          <span className="text-muted-foreground">Fast, cost-effective</span>
                        </div>
                        <div className="flex justify-between">
                          <span>gpt-4o</span>
                          <span className="text-muted-foreground">Flagship model</span>
                        </div>
                        <div className="flex justify-between">
                          <span>gpt-4-turbo</span>
                          <span className="text-muted-foreground">High performance</span>
                        </div>
                        <div className="flex justify-between">
                          <span>gpt-3.5-turbo</span>
                          <span className="text-muted-foreground">Legacy model</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {configuredProviders.includes("xai") && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        <h3 className="font-semibold">xAI (Grok)</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Grok models with real-time knowledge access
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>grok-4.7</span>
                          <span className="text-muted-foreground">Latest model</span>
                        </div>
                        <div className="flex justify-between">
                          <span>grok-4.0</span>
                          <span className="text-muted-foreground">Previous version</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {configuredProviders.includes("groq") && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-orange-500" />
                        <h3 className="font-semibold">Groq</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Ultra-fast inference with optimized hardware
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>openai/gpt-oss-20b</span>
                          <span className="text-muted-foreground">20B parameter</span>
                        </div>
                        <div className="flex justify-between">
                          <span>openai/gpt-oss-120b</span>
                          <span className="text-muted-foreground">120B parameter</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {configuredProviders.includes("ollama") && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        <h3 className="font-semibold">Ollama</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Local inference with privacy and control
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>llama3.1</span>
                          <span className="text-muted-foreground">Local model</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {configuredProviders.includes("cohere") && (
                    <div className="rounded-lg border p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <h3 className="font-semibold">Cohere</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Enterprise-focused AI with RAG capabilities
                      </p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>command-a-03-2025</span>
                          <span className="text-muted-foreground">Latest model</span>
                        </div>
                        <div className="flex justify-between">
                          <span>command-r-plus-08-2024</span>
                          <span className="text-muted-foreground">Previous version</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Tips for optimal performance:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Disable expensive models to save tokens during testing</li>
                      <li>Use Groq for fastest response times (hardware-optimized)</li>
                      <li>Use OpenAI gpt-4o-mini for best cost-to-performance ratio</li>
                      <li>Ollama provides privacy with local inference</li>
                      <li>Response times vary based on server load and model size</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Response time comparison across all AI providers and models
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Response Time</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Error Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedResults).flatMap(([provider, providerResults]) => [
                  <TableRow key={`header-${provider}`} className="bg-muted/50">
                    <TableCell colSpan={8} className="font-bold">
                      {provider.toUpperCase()}
                    </TableCell>
                  </TableRow>,
                  ...providerResults.map((result, index) => {
                    const disabled = isModelDisabled(result.provider, result.model);
                    return (
                      <TableRow
                        key={`${provider}-${result.model}-${index}`}
                        className={disabled ? "opacity-50" : ""}
                      >
                        <TableCell className="pl-6 text-muted-foreground">
                          {result.provider}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{result.model}</TableCell>
                        <TableCell>
                          {disabled ? (
                            <Badge variant="secondary">
                              <PowerOff className="mr-1 h-3 w-3" />
                              Disabled
                            </Badge>
                          ) : result.status === "success" ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Success
                            </Badge>
                          ) : result.status === "error" ? (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Error
                            </Badge>
                          ) : result.status === "in-progress" ? (
                            <Badge variant="secondary">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Testing
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="w-32">
                          {result.status === "in-progress" ? (
                            <div className="flex items-center gap-2">
                              <Progress value={result.progress || 0} className="h-2" />
                              <span className="text-xs text-muted-foreground w-8">
                                {Math.round(result.progress || 0)}%
                              </span>
                            </div>
                          ) : result.status === "success" ? (
                            <Progress value={100} className="h-2" />
                          ) : result.status === "error" ? (
                            <Progress value={100} className="h-2" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {result.status === "success" ? (
                            <span className={result === fastestModel ? "font-bold text-green-600" : ""}>
                              {result.responseTime.toFixed(0)}ms
                            </span>
                          ) : result.status === "in-progress" ? (
                            <span className="text-muted-foreground">
                              {result.responseTime > 0 ? `${result.responseTime.toFixed(0)}ms` : "-"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {result.usage ? (
                            <span className="text-sm text-muted-foreground">
                              {result.usage.totalTokens}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={!isModelDisabled(result.provider, result.model)}
                            onCheckedChange={() => toggleModel(result.provider, result.model)}
                            disabled={
                              isRunning ||
                              togglingKey === `${result.provider}/${result.model}` ||
                              togglingKey === "__all__"
                            }
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {result.error || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ])}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-semibold mb-2">No test results yet</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Refresh Tests" to benchmark all configured AI models
                </p>
              </div>
              {configuredProviders.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Available Models</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead className="text-right">Enabled</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configuredProviders.map((provider) => {
                        const models: Record<string, string[]> = {
                          openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
                          xai: ["grok-4.7", "grok-4.0"],
                          groq: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"],
                          ollama: ["llama3.1"],
                          cohere: ["command-a-03-2025", "command-r-plus-08-2024"],
                        };
                        return models[provider]?.map((model) => (
                          <TableRow key={`${provider}-${model}`}>
                            <TableCell className="pl-6 text-muted-foreground">
                              {provider}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{model}</TableCell>
                            <TableCell className="text-right">
                              <Switch
                                checked={!isModelDisabled(provider, model)}
                                onCheckedChange={() => toggleModel(provider, model)}
                                disabled={
                                  isRunning ||
                                  togglingKey === `${provider}/${model}` ||
                                  togglingKey === "__all__"
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ));
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
