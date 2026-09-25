"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useAction } from "@/components/hooks/use-action";
import { saveLessonNotes, setLessonComplete } from "@/server/actions/academy";

export function CompleteButton({ lessonId, complete, nextHref }: { lessonId: string; complete: boolean; nextHref: string }) {
  const router = useRouter();
  const { exec, pending } = useAction();
  return complete ? (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-[13px] font-medium text-success">
        <CheckCircle2 className="size-4" /> Lesson complete
      </p>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => exec(() => setLessonComplete(lessonId, false))} loading={pending}>
        <Circle /> Mark incomplete
      </Button>
    </div>
  ) : (
    <Button
      className="w-full"
      loading={pending}
      onClick={async () => {
        if (await exec(() => setLessonComplete(lessonId, true))) router.push(nextHref);
      }}
    >
      <CheckCircle2 /> Mark complete & continue
    </Button>
  );
}

/** Autosaving personal notes for a lesson. */
export function LessonNotes({ lessonId, initial }: { lessonId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex w-full items-center justify-between text-sm">
          Lesson notes
          <span className="flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
            {state === "saving" && <Loader2 className="size-3 animate-spin" />}
            {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Private to you"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          rows={6}
          value={value}
          placeholder="Write down your ICP, offer ideas, or tasks from this lesson…"
          onChange={(e) => {
            setValue(e.target.value);
            setState("saving");
            if (timer.current) clearTimeout(timer.current);
            const v = e.target.value;
            timer.current = setTimeout(async () => {
              await saveLessonNotes(lessonId, v);
              setState("saved");
            }, 700);
          }}
        />
      </CardContent>
    </Card>
  );
}
