import { createFileRoute } from "@tanstack/react-router";
import { QuoteWorkspace } from "@/components/app/QuoteWorkspace";

export const Route = createFileRoute("/app/exam-quotes")({ component: ExamQuotes });

function ExamQuotes() {
  return (
    <QuoteWorkspace
      scope="clinic"
      title="Exam quotes"
      subtitle="Build clinic exam estimates with editable PDF blocks, values, contact fields and full CRUD."
    />
  );
}
