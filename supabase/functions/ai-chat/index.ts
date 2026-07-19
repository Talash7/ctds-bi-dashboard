import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.71.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---- Read-only tools. The model can only ever call one of these — it never
// sees or produces raw SQL, and every query below is built with parameterized
// PostgREST filters, not string concatenation. ----

const tools: Anthropic.Tool[] = [
  {
    name: "get_student",
    description: "Look up a single student by their student code, including GPA and enrollment status.",
    input_schema: {
      type: "object",
      properties: { student_code: { type: "string" } },
      required: ["student_code"],
    },
  },
  {
    name: "count_students",
    description: "Count students, optionally filtered by level (1, 2, or 3) and/or a prefix of enrollment_status (e.g. 'Active', 'Graduated', 'Probation').",
    input_schema: {
      type: "object",
      properties: {
        level: { type: "integer", enum: [1, 2, 3] },
        status_prefix: { type: "string" },
      },
    },
  },
  {
    name: "average_gpa",
    description: "Average GPA of graduated students, optionally filtered by level (1, 2, or 3).",
    input_schema: {
      type: "object",
      properties: { level: { type: "integer", enum: [1, 2, 3] } },
    },
  },
  {
    name: "at_risk_students",
    description: "List students who have failed at least min_fails courses (default 2), most fails first.",
    input_schema: {
      type: "object",
      properties: { min_fails: { type: "integer" } },
    },
  },
  {
    name: "course_stats",
    description: "Average grade points and fail rate for a single course, looked up by course code.",
    input_schema: {
      type: "object",
      properties: { course_code: { type: "string" } },
      required: ["course_code"],
    },
  },
  {
    name: "grade_distribution",
    description: "Counts of each grade letter (A, B, C, D, F, Abs) across all results, optionally filtered by level.",
    input_schema: {
      type: "object",
      properties: { level: { type: "integer", enum: [1, 2, 3] } },
    },
  },
  {
    name: "pass_rate",
    description: "Overall pass rate (% of results with status Passed), optionally filtered by level.",
    input_schema: {
      type: "object",
      properties: { level: { type: "integer", enum: [1, 2, 3] } },
    },
  },
  {
    name: "deans_list",
    description: "Top N level-3 graduated students ranked by GPA descending (the Dean's List).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer" } },
    },
  },
  {
    name: "program_summary",
    description: "Summary of each academic program: name, total students, and overall pass rate.",
    input_schema: { type: "object", properties: {} },
  },
];

// deno-lint-ignore no-explicit-any
async function runTool(supabase: any, name: string, input: Record<string, unknown>) {
  switch (name) {
    case "get_student": {
      const { data, error } = await supabase
        .from("students")
        .select("student_code, name, level, enrollment_status, gpa, programs(name)")
        .eq("student_code", input.student_code)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? { error: "No student found with that code" };
    }
    case "count_students": {
      let query = supabase.from("students").select("*", { count: "exact", head: true });
      if (typeof input.level === "number") query = query.eq("level", input.level);
      if (typeof input.status_prefix === "string") {
        query = query.ilike("enrollment_status", `${input.status_prefix}%`);
      }
      const { count, error } = await query;
      if (error) throw new Error(error.message);
      return { count };
    }
    case "average_gpa": {
      let query = supabase.from("students").select("gpa").not("gpa", "is", null);
      if (typeof input.level === "number") query = query.eq("level", input.level);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const values = (data ?? []).map((r: { gpa: number }) => r.gpa);
      const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
      return { average_gpa: avg, sample_size: values.length };
    }
    case "at_risk_students": {
      const minFails = typeof input.min_fails === "number" ? input.min_fails : 2;
      const { data, error } = await supabase
        .from("results")
        .select("student_id, status, students(student_code, name, level)")
        .eq("status", "Failed");
      if (error) throw new Error(error.message);
      const counts = new Map<string, { count: number; student: unknown }>();
      for (const r of data ?? []) {
        const key = r.student_id;
        const existing = counts.get(key);
        counts.set(key, { count: (existing?.count ?? 0) + 1, student: r.students });
      }
      const atRisk = Array.from(counts.values())
        .filter((c) => c.count >= minFails)
        .sort((a, b) => b.count - a.count)
        .map((c) => ({ ...(c.student as object), failed_courses: c.count }));
      return { at_risk_students: atRisk, count: atRisk.length };
    }
    case "course_stats": {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, code, name, level")
        .eq("code", input.course_code)
        .maybeSingle();
      if (courseError) throw new Error(courseError.message);
      if (!course) return { error: "No course found with that code" };
      const { data: results, error } = await supabase
        .from("results")
        .select("grade_points, status")
        .eq("course_id", course.id);
      if (error) throw new Error(error.message);
      const total = results?.length ?? 0;
      const sum = (results ?? []).reduce((a: number, r: { grade_points: number }) => a + r.grade_points, 0);
      const failed = (results ?? []).filter((r: { status: string }) => r.status === "Failed").length;
      return {
        course: { code: course.code, name: course.name, level: course.level },
        result_count: total,
        avg_grade_points: total ? sum / total : null,
        fail_rate_percent: total ? (failed / total) * 100 : null,
      };
    }
    case "grade_distribution": {
      let query = supabase.from("results").select("grade_letter");
      if (typeof input.level === "number") query = query.eq("level", input.level);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.grade_letter] = (counts[r.grade_letter] ?? 0) + 1;
      return counts;
    }
    case "pass_rate": {
      let query = supabase.from("results").select("status");
      if (typeof input.level === "number") query = query.eq("level", input.level);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const total = data?.length ?? 0;
      const passed = (data ?? []).filter((r: { status: string }) => r.status === "Passed").length;
      return { pass_rate_percent: total ? (passed / total) * 100 : null, total_results: total };
    }
    case "deans_list": {
      const limit = typeof input.limit === "number" ? input.limit : 10;
      const { data, error } = await supabase
        .from("students")
        .select("student_code, name, gpa, enrollment_status")
        .eq("level", 3)
        .ilike("enrollment_status", "Graduated%")
        .not("gpa", "is", null)
        .order("gpa", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return { deans_list: data };
    }
    case "program_summary": {
      const { data: programs, error: progError } = await supabase.from("programs").select("id, name");
      if (progError) throw new Error(progError.message);
      const { data: students, error: studError } = await supabase.from("students").select("id, program_id");
      if (studError) throw new Error(studError.message);
      const { data: results, error: resError } = await supabase.from("results").select("student_id, status");
      if (resError) throw new Error(resError.message);
      const studentProgram = new Map((students ?? []).map((s: { id: string; program_id: string }) => [s.id, s.program_id]));
      const summary: Record<string, { students: number; passed: number; total: number }> = {};
      for (const s of students ?? []) {
        summary[s.program_id] ??= { students: 0, passed: 0, total: 0 };
        summary[s.program_id].students++;
      }
      for (const r of results ?? []) {
        const pid = studentProgram.get(r.student_id);
        if (!pid) continue;
        summary[pid] ??= { students: 0, passed: 0, total: 0 };
        summary[pid].total++;
        if (r.status === "Passed") summary[pid].passed++;
      }
      return (programs ?? []).map((p: { id: string; name: string }) => {
        const s = summary[p.id] ?? { students: 0, passed: 0, total: 0 };
        return {
          name: p.name,
          students: s.students,
          pass_rate_percent: s.total ? (s.passed / s.total) * 100 : null,
        };
      });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'question' string in request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Uses the caller's own JWT, so every read still goes through the normal
    // RLS policies (authenticated-only) — the function has no elevated access.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const system =
      "You are a data assistant for the CTDS BI Dashboard, a university decision-support tool for the " +
      "Diploma of Information Technology program. Answer questions about students, courses, programs, and " +
      "results using ONLY the provided tools — never invent numbers. Always cite the actual figures returned " +
      "by the tools in your answer. If a question can't be answered with the available tools, say so plainly " +
      "and suggest what could be asked instead. Keep answers concise.";

    const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

    let finalText = "";
    for (let i = 0; i < 6; i++) {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system,
        tools,
        messages,
      });

      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      finalText = textBlocks.map((b) => b.text).join("\n");

      if (response.stop_reason !== "tool_use") break;

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        try {
          const result = await runTool(supabase, block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : "Tool execution failed",
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    return new Response(JSON.stringify({ answer: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
