"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  useCreateStudentSchedule,
  useScheduleAudience,
  useStudentSchedules,
  useSubmitPollResponse,
} from "@/hooks/useSchedule";
import { StudentSchedule, StudentScheduleType } from "@/types/schedule";
import { PageContainer } from "@/components/common/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function PollResponseOptions({ item }: { item: StudentSchedule }) {
  const { hasRole } = useAuth();
  const [selected, setSelected] = useState<number | null>(
    item.selected_option_index,
  );
  const submitResponse = useSubmitPollResponse();
  const canRespond = hasRole("ROLE_STUDENT") && !item.responded;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {item.options.map((option, index) => (
          <label
            key={index}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selected === index ? "border-[#111111]" : "border-[#E8E8E8]"} ${canRespond ? "cursor-pointer" : ""}`}
          >
            {hasRole("ROLE_STUDENT") && (
              <input
                type="radio"
                name={`poll-${item.id}`}
                checked={selected === index}
                disabled={!canRespond}
                onChange={() => setSelected(index)}
              />
            )}
            {option}
          </label>
        ))}
      </div>
      {item.responded && hasRole("ROLE_STUDENT") && (
        <p className="text-sm text-green-700">
          Response submitted. Reminders have stopped.
        </p>
      )}
      {canRespond && (
        <Button
          size="sm"
          disabled={selected === null || submitResponse.isPending}
          onClick={() =>
            selected !== null &&
            submitResponse.mutate({ pollId: item.id, optionIndex: selected })
          }
        >
          {submitResponse.isPending ? "Submitting..." : "Submit response"}
        </Button>
      )}
      {submitResponse.isError && (
        <p className="text-sm text-red-600">
          {submitResponse.error instanceof Error
            ? submitResponse.error.message
            : "Unable to submit response."}
        </p>
      )}
    </div>
  );
}

export function StudentSchedulePage({ type }: { type: StudentScheduleType }) {
  const { hasRole, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const isStaff = hasRole("ROLE_STAFF");
  const allowed = isStaff || hasRole("ROLE_HOD") || hasRole("ROLE_STUDENT");
  const { data: items = [], isLoading } = useStudentSchedules(
    type,
    !authLoading && allowed,
  );
  const { data: audience } = useScheduleAudience(isStaff);
  const create = useCreateStudentSchedule();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sectionIds, setSectionIds] = useState<number[]>([]);
  const [studentIds, setStudentIds] = useState<number[]>([]);
  const [optionCount, setOptionCount] = useState(2);
  const [options, setOptions] = useState(["", ""]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authLoading && !allowed) router.push("/dashboard");
  }, [allowed, authLoading, router]);
  if (authLoading || !allowed) return null;

  const toggle = (
    id: number,
    values: number[],
    setter: (v: number[]) => void,
  ) =>
    setter(
      values.includes(id)
        ? values.filter((value) => value !== id)
        : [...values, id],
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    create.mutate(
      {
        type,
        title,
        details,
        due_date: date || undefined,
        due_time: time || undefined,
        section_ids: sectionIds,
        student_ids: studentIds,
        options: type === "POLL" ? options : undefined,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDetails("");
          setDate("");
          setTime("");
          setSectionIds([]);
          setStudentIds([]);
          setOptions(["", ""]);
          setOptionCount(2);
          setMessage(`${type === "POLL" ? "Poll" : "Deadline"} created.`);
        },
        onError: (error) =>
          setMessage(
            error instanceof Error ? error.message : "Unable to create item.",
          ),
      },
    );
  };

  return (
    <PageContainer
      title={
        isStaff
          ? `Set ${type === "POLL" ? "Poll" : "Deadline"}`
          : `View ${type === "POLL" ? "Poll" : "Deadline"}`
      }
      description={
        isStaff
          ? `Create ${type.toLowerCase()}s for classes or selected students`
          : `${type === "POLL" ? "Polls" : "Deadlines"} assigned to students`
      }
    >
      <div className="space-y-6">
        {isStaff && (
          <Card>
            <CardHeader>
              <CardTitle>New {type === "POLL" ? "Poll" : "Deadline"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium">
                    {type === "POLL" ? "Question / title" : "Title"}
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Details</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="mt-2 min-h-24 w-full rounded-lg border border-[#E8E8E8] p-3 text-sm"
                  />
                </div>
                {type === "DEADLINE" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">
                        Deadline date
                      </label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Time (optional)
                      </label>
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {type === "POLL" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">
                        Number of options
                      </label>
                      <Input
                        type="number"
                        min={2}
                        max={10}
                        value={optionCount}
                        onChange={(e) => {
                          const count = Math.max(
                            2,
                            Math.min(10, Number(e.target.value)),
                          );
                          setOptionCount(count);
                          setOptions((old) =>
                            Array.from(
                              { length: count },
                              (_, i) => old[i] || "",
                            ),
                          );
                        }}
                      />
                    </div>
                    {options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        required
                        placeholder={`Option ${index + 1}`}
                        onChange={(e) =>
                          setOptions((old) =>
                            old.map((value, i) =>
                              i === index ? e.target.value : value,
                            ),
                          )
                        }
                      />
                    ))}
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm font-medium">Classes</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {audience?.classes.map((item) => (
                      <label
                        key={item.id}
                        className="flex gap-2 rounded-lg border border-[#E8E8E8] p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={sectionIds.includes(item.id)}
                          onChange={() =>
                            toggle(item.id, sectionIds, setSectionIds)
                          }
                        />
                        {item.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">
                    Specific students (optional)
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-[#E8E8E8] p-2">
                    {audience?.students.map((item) => (
                      <label key={item.id} className="flex gap-2 p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={studentIds.includes(item.id)}
                          onChange={() =>
                            toggle(item.id, studentIds, setStudentIds)
                          }
                        />
                        <span>
                          {item.name}{" "}
                          <span className="text-[#9A9A9A]">
                            ({item.registerNumber})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {message && (
                  <p
                    className={`text-sm ${create.isError ? "text-red-600" : "text-green-700"}`}
                  >
                    {message}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={
                    create.isPending ||
                    (!sectionIds.length && !studentIds.length)
                  }
                >
                  {create.isPending
                    ? "Creating..."
                    : `Create ${type === "POLL" ? "Poll" : "Deadline"}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{type === "POLL" ? "Polls" : "Deadlines"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Spinner size="lg" />
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#666666]">
                No {type.toLowerCase()}s found.
              </p>
            ) : (
              <div className="divide-y divide-[#F0F0F0]">
                {items.map((item) => (
                  <article id={`poll-${item.id}`} key={item.id} className="space-y-2 p-5 scroll-mt-24">
                    <div className="flex justify-between gap-4">
                      <h3 className="font-semibold">{item.title}</h3>
                      <span className="text-xs text-[#9A9A9A]">
                        By {item.created_by_name}
                      </span>
                    </div>
                    {item.details && (
                      <p className="text-sm text-[#666666]">{item.details}</p>
                    )}
                    {item.due_date && (
                      <p className="text-sm">
                        Due: {item.due_date}
                        {item.due_time ? ` at ${item.due_time}` : ""}
                      </p>
                    )}
                    {item.options?.length > 0 && (
                      <PollResponseOptions item={item} />
                    )}
                    <p className="text-xs text-[#9A9A9A]">
                      {[...item.classes, ...item.students].join(", ")}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
