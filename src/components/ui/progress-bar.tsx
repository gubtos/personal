export function ProgressBar({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={label}
        className="bg-muted relative h-2 w-full overflow-hidden rounded-full"
      >
        <div className="animate-progress-slide bg-primary absolute inset-y-0 left-0 w-1/3 rounded-full" />
      </div>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}
