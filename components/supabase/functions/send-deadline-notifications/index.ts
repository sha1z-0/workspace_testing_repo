// Finova Workspace — Deadline Notification Edge Function
// Runs every 5 minutes via Supabase cron
// Queries overdue unapproved tasks, sends emails via SendGrid

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as SendGrid from "https://esm.sh/@sendgrid/mail@8.1.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;
const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@finovasolutions.tech";

const supabase = createClient(supabaseUrl, serviceRoleKey);
SendGrid.setApiKey(sendgridApiKey);

interface OverdueTask {
  id: string;
  title: string;
  due_datetime: string;
  assigned_by: string;
  assigned_by_name: string;
  assignee_ids: string[];
  assignee_names: string[];
  submission_status: string;
}

Deno.serve(async (_req: Request) => {
  try {
    // Find overdue, unapproved, not-yet-notified tasks
    const { data: overdueTasks, error: queryError } = await supabase
      .from("tasks")
      .select("id,title,due_datetime,assigned_by,assigned_by_name,assignee_ids,assignee_names,submission_status")
      .lt("due_datetime", new Date().toISOString())
      .neq("submission_status", "approved")
      .eq("notified", false);

    if (queryError) {
      console.error("Query error:", queryError.message);
      return new Response(JSON.stringify({ error: queryError.message }), { status: 500 });
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No overdue tasks" }));
    }

    const tasks = overdueTasks as OverdueTask[];
    console.log(`Found ${tasks.length} overdue tasks`);

    let processed = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        // Collect email recipients: assignee emails + assigner email
        const recipientIds = [...new Set([task.assigned_by, ...task.assignee_ids])];

        // Get emails for all recipients
        const { data: users, error: userError } = await supabase
          .from("users")
          .select("uid,email,name")
          .in("uid", recipientIds);

        if (userError || !users) {
          console.error(`Failed to get users for task ${task.id}`);
          failed++;
          continue;
        }

        const emails = users.map((u: { email: string }) => u.email).filter(Boolean);

        if (emails.length === 0) {
          console.log(`No emails found for task ${task.id}`);
          failed++;
          continue;
        }

        const dueDate = new Date(task.due_datetime).toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Send email via SendGrid
        await SendGrid.send({
          to: emails,
          from: fromEmail,
          subject: `Overdue Task: "${task.title}"`,
          text: `
Task "${task.title}" is overdue.

Due: ${dueDate}
Status: ${task.submission_status}
Assigned by: ${task.assigned_by_name}

This is an automated notification from Finova Workspace.
          `.trim(),
          html: `
<h2>Task Overdue</h2>
<p><strong>Task:</strong> ${task.title}</p>
<p><strong>Due:</strong> ${dueDate}</p>
<p><strong>Status:</strong> ${task.submission_status}</p>
<p><strong>Assigned by:</strong> ${task.assigned_by_name}</p>
<hr>
<p><em>Automated notification from Finova Workspace.</em></p>
          `.trim(),
        });

        // Mark as notified
        await supabase
          .from("tasks")
          .update({ notified: true })
          .eq("id", task.id);

        processed++;
        console.log(`Notified ${emails.length} recipients for task "${task.title}"`);
      } catch (err) {
        console.error(`Failed to process task ${task.id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: tasks.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
