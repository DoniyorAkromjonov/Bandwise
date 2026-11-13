import Link from "next/link";
import { ArrowRight, AudioLines, BookA, CalendarDays, FileText, Headphones, MessagesSquare, Search, TextCursor } from "lucide-react";
import { exerciseLabels, listeningKinds, readingKinds, type Kind } from "@/lib/exercises/shared";

const cards = {
  DAILY_ARTICLE: [CalendarDays, "Read a short article and check your understanding."],
  SYNONYM_HUNTER: [Search, "Find words with similar meanings in a passage."],
  CONTEXT_CLUES: [TextCursor, "Work out a word’s meaning from the sentences around it."],
  ACADEMIC_VOCABULARY: [BookA, "Study academic words and save them to your vocabulary."],
  SHORT_PODCAST: [Headphones, "Listen to a short episode and answer questions."],
  DAILY_CONVERSATION: [MessagesSquare, "Follow a conversation and listen for key details."],
  TRANSCRIPTION: [AudioLines, "Type what you hear and compare it with the transcript."],
} as const;

export function ExerciseCards({ skill }: { skill: "reading" | "listening" }) {
  const kinds: Kind[] = skill === "reading" ? readingKinds : listeningKinds;
  return (
    <section aria-labelledby={`${skill}-exercises`} className="mt-7">
      <h2 id={`${skill}-exercises`} className="text-lg font-semibold">Practice by activity</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.map((kind) => {
          const [Icon, description] = cards[kind];
          return <li key={kind}>
            <Link href={`/dashboard/exercises?skill=${skill}&kind=${kind}`} className="group flex h-full min-h-24 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-muted">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-primary"><Icon size={19} aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{exerciseLabels[kind]}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            </Link>
          </li>;
        })}
      </ul>
      {skill === "reading" && <Link href="/dashboard/vocabulary" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><FileText size={16} aria-hidden="true" />Personal Vocabulary</Link>}
    </section>
  );
}
