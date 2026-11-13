type Cue = { start: number; end: number; text: string };
type Question = { id: string; prompt: string; options: string[]; answer: string; explanation: string; cueIndex: number };
const input = "w-full rounded border border-input bg-background p-2";
const action = "rounded border border-border px-3 py-2 text-sm";

export function ListeningFields({ cues, questions, change }: {
  cues: Cue[]; questions: Question[]; change: (field: string, value: unknown) => void;
}) {
  function updateQuestion(index: number, data: Partial<Question>) {
    change("questions", questions.map((question, i) => i === index ? { ...question, ...data } : question));
  }

  return <div className="space-y-4">
    <fieldset className="space-y-2">
      <legend className="font-semibold">Transcript</legend>
      {cues.map((cue, index) => <div key={index} className="grid gap-2 rounded-lg border border-border p-3">
        <div className="grid grid-cols-2 gap-2">
          {(["start", "end"] as const).map((key) => <label key={key} className="text-sm">{key === "start" ? "Start (sec)" : "End (sec)"}<input className={input} type="number" step="0.01" min={0} value={cue[key]} onChange={(event) => change("transcript", cues.map((entry, i) => i === index ? { ...entry, [key]: Number(event.target.value) } : entry))} /></label>)}
        </div>
        <label className="text-sm">Spoken text<textarea className={input} value={cue.text} onChange={(event) => change("transcript", cues.map((entry, i) => i === index ? { ...entry, text: event.target.value } : entry))} /></label>
        <button type="button" className={action} onClick={() => {
          change("transcript", cues.filter((_, i) => i !== index));
          change("questions", questions.map((q) => ({ ...q, cueIndex: q.cueIndex > index ? q.cueIndex - 1 : Math.min(q.cueIndex, Math.max(0, cues.length - 2)) })));
        }}>Remove cue</button>
      </div>)}
      <button type="button" className={action} onClick={() => {
        const start = cues.at(-1)?.end ?? 0;
        change("transcript", [...cues, { start, end: start + 5, text: "" }]);
      }}>Add transcript cue</button>
    </fieldset>
    <fieldset className="space-y-2">
      <legend className="font-semibold">Comprehension questions</legend>
      {questions.map((question, index) => <div key={question.id} className="grid gap-2 rounded-lg border border-border p-3">
        <label className="text-sm">Prompt<input className={input} value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} /></label>
        <label className="text-sm">Options (one per line)<textarea className={input} value={question.options.join("\n")} onChange={(event) => updateQuestion(index, { options: event.target.value.split("\n") })} /></label>
        <label className="text-sm">Correct answer<select className={input} value={question.answer} onChange={(event) => updateQuestion(index, { answer: event.target.value })}><option value="">Choose an answer</option>{question.options.filter(Boolean).map((option, i) => <option key={i}>{option}</option>)}</select></label>
        <label className="text-sm">Explanation<textarea className={input} value={question.explanation} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} /></label>
        <label className="text-sm">Evidence cue<select className={input} value={question.cueIndex} onChange={(event) => updateQuestion(index, { cueIndex: Number(event.target.value) })}>{cues.map((cue, i) => <option key={i} value={i}>{i + 1}. {cue.text.slice(0, 60)}</option>)}</select></label>
        <div className="flex flex-wrap gap-2">
          {[-1, 1].map((direction) => <button key={direction} type="button" className={action} disabled={index + direction < 0 || index + direction >= questions.length} onClick={() => {
            const ordered = [...questions];
            [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
            change("questions", ordered);
          }}>{direction < 0 ? "Move up" : "Move down"}</button>)}
          <button type="button" className={action} onClick={() => change("questions", questions.filter((_, i) => i !== index))}>Remove question</button>
        </div>
      </div>)}
      <button type="button" className={action} onClick={() => change("questions", [...questions, { id: crypto.randomUUID(), prompt: "", options: ["", ""], answer: "", explanation: "", cueIndex: 0 }])}>Add question</button>
    </fieldset>
  </div>;
}
