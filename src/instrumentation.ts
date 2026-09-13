export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentry } = await import("@/lib/monitoring");
    await initSentry();
  }
}
