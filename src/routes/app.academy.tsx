import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, CheckCircle2, GraduationCap, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/academy")({ component: Academy });

function Academy() {
  const { profile, user, hasAnyRole } = useAuth();
  const qc = useQueryClient();
  const canManage = hasAnyRole(["clinic_admin", "super_admin"]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", duration: "20" });
  const [newLesson, setNewLesson] = useState({ title: "", body: "" });

  const courses = useQuery({
    queryKey: ["academy-courses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("academy_courses")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessons = useQuery({
    queryKey: ["academy-lessons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("academy_lessons")
        .select("*")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
  });

  const progress = useQuery({
    queryKey: ["academy-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("academy_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completedIds = new Set((progress.data ?? []).map((item: any) => item.lesson_id));
  const lessonsFor = (courseId: string) => (lessons.data ?? []).filter((lesson: any) => lesson.course_id === courseId);
  const courseProgress = (courseId: string) => {
    const list = lessonsFor(courseId);
    if (!list.length) return 0;
    const done = list.filter((lesson: any) => completedIds.has(lesson.id)).length;
    return Math.round((done / list.length) * 100);
  };

  const toggleLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) throw new Error("Session expired");
      if (completedIds.has(lessonId)) {
        const { error } = await (supabase as any)
          .from("academy_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("academy_progress")
          .insert({ user_id: user.id, lesson_id: lessonId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["academy-progress", user?.id] }),
    onError: (error: any) => toast.error(error.message ?? "Could not update progress"),
  });

  const createCourse = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("academy_courses").insert({
        tenant_id: profile?.tenant_id ?? null,
        title: newCourse.title.trim(),
        description: newCourse.description.trim() || null,
        duration_minutes: Number(newCourse.duration || 20),
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course created");
      setNewCourse({ title: "", description: "", duration: "20" });
      qc.invalidateQueries({ queryKey: ["academy-courses"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not create the course"),
  });

  const createLesson = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) throw new Error("Select a course");
      const position = lessonsFor(selectedCourse).length + 1;
      const { error } = await (supabase as any).from("academy_lessons").insert({
        course_id: selectedCourse,
        title: newLesson.title.trim(),
        body: newLesson.body.trim() || null,
        position,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson added");
      setNewLesson({ title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["academy-lessons"] });
    },
    onError: (error: any) => toast.error(error.message ?? "Could not add the lesson"),
  });

  const activeCourse = (courses.data ?? []).find((course: any) => course.id === selectedCourse) ?? null;
  const totalLessons = lessons.data?.length ?? 0;
  const totalDone = (lessons.data ?? []).filter((lesson: any) => completedIds.has(lesson.id)).length;

  return (
    <>
      <PageHeader
        title="Caregiver Academy"
        subtitle="Practical courses with real progress by lesson. Global platform content and courses from your organization."
        action={<Pill tone="olive">Progress saved</Pill>}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Courses" value={courses.data?.length ?? "-"} sub="Available to you" tone="olive" />
        <Stat label="Completed lessons" value={`${totalDone}/${totalLessons}`} sub="Your progress" tone="moss" />
        <Stat
          label="Overall completion"
          value={`${totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0}%`}
          sub="All tracks"
          tone="gold"
        />
      </div>

      {canManage && (
        <Card className="mt-6">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-olive" />
            <h2 className="text-lg font-semibold text-foreground">New course</h2>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <input value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })} placeholder="Course title *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
            <input value={newCourse.duration} onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value.replace(/\D/g, "") })} placeholder="Duration (min)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <button onClick={() => createCourse.mutate()} disabled={!newCourse.title.trim() || createCourse.isPending} className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">Create course</button>
            <input value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })} placeholder="Description" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-4" />
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {(courses.data ?? []).map((course: any) => {
            const pct = courseProgress(course.id);
            const active = selectedCourse === course.id;
            return (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(course.id)}
                className={`w-full rounded-2xl border p-4 text-left shadow-soft backdrop-blur-xl transition ${
                  active ? "border-olive/40 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-olive/10 text-olive">
                    <GraduationCap className="h-4.5 w-4.5" />
                  </span>
                  <Pill tone={pct === 100 ? "moss" : "muted"}>{pct}%</Pill>
                </div>
                <p className="mt-3 font-semibold text-foreground">{course.title}</p>
                {course.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{course.description}</p>}
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-olive transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {lessonsFor(course.id).length} lessons · ~{course.duration_minutes} min {course.tenant_id ? "· from your organization" : "· Care Kranich"}
                </p>
              </button>
            );
          })}
          {(courses.data ?? []).length === 0 && (
            <EmptyState title="No courses available" hint="Administrators can create courses above." />
          )}
        </div>

        <Card>
          {activeCourse ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Course</p>
                  <h2 className="mt-1 text-2xl font-semibold text-foreground">{activeCourse.title}</h2>
                </div>
                <Pill tone={courseProgress(activeCourse.id) === 100 ? "moss" : "gold"}>
                  {courseProgress(activeCourse.id) === 100 ? "Completed" : `${courseProgress(activeCourse.id)}% completed`}
                </Pill>
              </div>
              {activeCourse.description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeCourse.description}</p>}

              <div className="mt-5 space-y-3">
                {lessonsFor(activeCourse.id).map((lesson: any) => {
                  const done = completedIds.has(lesson.id);
                  return (
                    <div key={lesson.id} className={`rounded-2xl border p-4 ${done ? "border-moss/30 bg-moss/5" : "border-white/70 bg-white/50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${done ? "bg-moss text-ivory" : "bg-olive/10 text-olive"}`}>
                            {lesson.position}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{lesson.title}</p>
                            {lesson.body && <p className="mt-1 text-sm leading-6 text-foreground/75">{lesson.body}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleLesson.mutate(lesson.id)}
                          disabled={toggleLesson.isPending}
                          className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            done ? "border border-moss/40 bg-white/60 text-moss" : "bg-olive text-ivory hover:opacity-90"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {done ? "Completed" : "Mark completed"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
                {lessonsFor(activeCourse.id).length === 0 && (
                  <p className="text-sm text-muted-foreground">This course has no lessons yet.</p>
                )}
              </div>

              {canManage && (
                <div className="mt-6 rounded-2xl border border-dashed border-olive/30 bg-baby/10 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Add lesson to this course</p>
                  <div className="mt-3 grid gap-3">
                    <input value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} placeholder="Lesson title *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                    <textarea value={newLesson.body} onChange={(e) => setNewLesson({ ...newLesson, body: e.target.value })} rows={3} placeholder="Lesson content" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
                    <button onClick={() => createLesson.mutate()} disabled={!newLesson.title.trim() || createLesson.isPending} className="justify-self-start rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-50">
                      Add lesson
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid place-items-center py-20 text-center">
              <BookOpen className="h-10 w-10 text-olive/50" />
              <p className="mt-4 text-lg font-semibold text-foreground">Choose a course on the side</p>
              <p className="mt-1 text-sm text-muted-foreground">Your progress is saved lesson by lesson.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
