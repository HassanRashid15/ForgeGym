import { FormSkeleton } from "@/components/loading/FormSkeleton";

export default function LoginLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <FormSkeleton />
    </div>
  );
}
