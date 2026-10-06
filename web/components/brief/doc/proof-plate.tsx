import { emphasiseNumbers, isProofPoint, splitCustomer, splitMetric } from "@/lib/brief-doc";
import type { DocStory } from "@/lib/brief-types";
import { cn } from "@/lib/cn";

interface ProofPlateProps {
  story: DocStory;
  labels: Record<string, string>;
  /** Said under a knowledge-base figure, so it is never read as a customer's result. */
  noStoryNote: string;
  className?: string;
}

// A column: when the plate is taller than its content (it fills the row beside the angle's
// title), the label stays at the top and the statement sits at the foot.
const PLATE = "relative isolate flex flex-col overflow-hidden rounded-[14px] p-5 sm:p-6";
const STATEMENT = "mt-auto pt-4";

/** A named customer's result: the dark plate, the customer's name the largest type in the card. */
function StoryPlate({ story, label, className }: { story: DocStory; label: string; className?: string }) {
  const customer = splitCustomer(story.customer);

  return (
    <div className={cn(PLATE, "on-ambient bg-ambient text-on-ambient", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 110% at 100% 0%, rgb(var(--accent-rgb) / 0.5), transparent 68%)," +
            "radial-gradient(50% 70% at 0% 100%, rgb(var(--accent-soft-rgb) / 0.12), transparent 70%)",
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[14px] ring-1 ring-inset ring-white/10" />
      <h4 className="text-[11px] font-semibold uppercase leading-none tracking-[0.09em] text-accent-soft">{label}</h4>
      <div className={STATEMENT}>
        {customer.name ? (
          <p className="text-[clamp(1.5rem,1.25rem+0.9vw,1.875rem)] font-semibold leading-[1.1] tracking-display [overflow-wrap:anywhere]">
            {customer.name}
          </p>
        ) : null}
        {customer.qualifier ? <p className="mt-1.5 text-[13px] font-medium text-on-ambient-2">{customer.qualifier}</p> : null}
        {story.result ? (
          <p className="mt-3 text-base leading-relaxed text-on-ambient/85 sm:text-[17px]">
            {emphasiseNumbers(story.result).map((part, index) =>
              part.strong ? (
                <strong key={index} className="font-semibold text-accent-soft">
                  {part.text}
                </strong>
              ) : (
                part.text
              ),
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** A knowledge-base figure: a lighter, hatched plate with the number large and no customer named. */
function MetricPlate({ story, label, note, className }: { story: DocStory; label: string; note: string; className?: string }) {
  // `note` is empty for a result that simply has no customer attached.
  const metric = splitMetric(story.result);

  return (
    <div className={cn(PLATE, "bg-sunken", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: "repeating-linear-gradient(135deg, rgb(var(--ink-rgb) / 0.045) 0 1px, transparent 1px 9px)",
          maskImage: "linear-gradient(to left, black, transparent 78%)",
          WebkitMaskImage: "linear-gradient(to left, black, transparent 78%)",
        }}
      />
      <h4 className="micro-label">{label}</h4>
      <div className={STATEMENT}>
        {metric.figure ? (
          <>
            <p className="num text-[44px] font-semibold leading-none tracking-display text-ink sm:text-[56px]">{metric.figure}</p>
            <p className="mt-3 text-[15px] font-medium leading-snug text-ink">{metric.name}</p>
            {metric.rest ? <p className="mt-1 text-sm leading-relaxed text-ink-2">{metric.rest}</p> : null}
          </>
        ) : (
          <p className="text-base leading-relaxed text-ink">{metric.rest}</p>
        )}
        {note ? <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-ink-2">{note}</p> : null}
      </div>
    </div>
  );
}

/** What Alkira has done for someone else: the most prominent thing in an angle card. */
export function ProofPlate({ story, labels, noStoryNote, className }: ProofPlateProps) {
  if (!story.customer.trim() && !story.result.trim()) return null;

  const isFigure = isProofPoint(story);
  if (isFigure || !story.customer.trim()) {
    const note = isFigure ? noStoryNote : "";
    return <MetricPlate story={story} label={labels.proof_point ?? "Proof point"} note={note} className={className} />;
  }
  return <StoryPlate story={story} label={labels.customer_story ?? "Customer story"} className={className} />;
}
