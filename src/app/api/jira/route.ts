import { NextRequest, NextResponse } from "next/server";

function getJiraConfig() {
  const site = process.env.JIRA_SITE_URL || "";
  const email = process.env.JIRA_EMAIL || "";
  const token = process.env.JIRA_API_TOKEN || "";
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  return {
    site,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };
}

async function jiraFetch(path: string, options: RequestInit = {}) {
  const { site, headers } = getJiraConfig();
  const url = path.startsWith("http") ? path : `${site}${path}`;
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API ${res.status}: ${text}`);
  }
  // 204 No Content (e.g. DELETE, sprint move)
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return {};
  }
  return res.json();
}

// GET — list projects, sprints, or issues
export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action");

    if (action === "projects") {
      const projects = await jiraFetch("/rest/api/3/project");
      return NextResponse.json({
        projects: projects.map((p: { key: string; name: string; id: string }) => ({
          key: p.key,
          name: p.name,
          id: p.id,
        })),
      });
    }

    if (action === "sprints") {
      const projectKey = req.nextUrl.searchParams.get("project");
      if (!projectKey) return NextResponse.json({ error: "project is required" }, { status: 400 });

      // Get board for project
      const boards = await jiraFetch(`/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}`);
      if (!boards.values?.length) return NextResponse.json({ sprints: [] });

      const boardId = boards.values[0].id;
      const sprints = await jiraFetch(`/rest/agile/1.0/board/${boardId}/sprint`);
      return NextResponse.json({
        sprints: (sprints.values || []).map((s: { id: number; name: string; state: string }) => ({
          id: s.id,
          name: s.name,
          state: s.state,
        })),
      });
    }

    if (action === "issueTypes") {
      const projectKey = req.nextUrl.searchParams.get("project");
      if (!projectKey) return NextResponse.json({ error: "project is required" }, { status: 400 });

      const project = await jiraFetch(`/rest/api/3/project/${encodeURIComponent(projectKey)}`);
      return NextResponse.json({
        issueTypes: (project.issueTypes || []).map((t: { id: string; name: string; subtask: boolean }) => ({
          id: t.id,
          name: t.name,
          subtask: t.subtask || false,
        })),
      });
    }

    return NextResponse.json({ error: "action param required (projects, sprints, issueTypes)" }, { status: 400 });
  } catch (err) {
    console.error("Jira GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — create issues (epic, story, subtask, or a full set)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Create a single issue
    if (action === "createIssue") {
      const { projectKey, issueType, summary, description, parentKey, sprintId } = body;
      const issue = await createIssue({ projectKey, issueType, summary, description, parentKey, sprintId });
      return NextResponse.json({ success: true, issue });
    }

    // Create a full set: epic → story → subtask, all linked
    if (action === "createSet") {
      const { projectKey, sprintId, epic, story, subtask } = body;

      // 1. Create Epic
      const epicIssue = await createIssue({
        projectKey,
        issueType: "Epic",
        summary: epic?.summary || "Epic",
        description: epic?.description,
      });

      // 2. Create Story under Epic, in Sprint
      const storyIssue = await createIssue({
        projectKey,
        issueType: "Story",
        summary: story?.summary || "Story",
        description: story?.description,
        parentKey: epicIssue.key,
        sprintId,
      });

      // 3. Create Subtask under Story, in Sprint
      const subtaskIssue = await createIssue({
        projectKey,
        issueType: "Subtask",
        summary: subtask?.summary || "Subtask",
        description: subtask?.description,
        parentKey: storyIssue.key,
        sprintId,
      });

      return NextResponse.json({
        success: true,
        epic: epicIssue,
        story: storyIssue,
        subtask: subtaskIssue,
      });
    }

    // Move issues to a sprint
    if (action === "moveToSprint") {
      const { issueKeys, sprintId } = body;
      if (!issueKeys?.length) return NextResponse.json({ error: "issueKeys required" }, { status: 400 });
      const sid = sprintId || 244;
      await jiraFetch(`/rest/agile/1.0/sprint/${sid}/issue`, {
        method: "POST",
        body: JSON.stringify({ issues: issueKeys }),
      });
      return NextResponse.json({ success: true, moved: issueKeys, sprintId: sid });
    }

    // Delete issues
    if (action === "deleteIssues") {
      const { issueKeys } = body;
      if (!issueKeys?.length) return NextResponse.json({ error: "issueKeys required" }, { status: 400 });
      const results: { key: string; deleted: boolean; error?: string }[] = [];
      for (const key of issueKeys) {
        try {
          await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(key)}`, { method: "DELETE" });
          results.push({ key, deleted: true });
        } catch (err) {
          results.push({ key, deleted: false, error: String(err) });
        }
      }
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ error: "action required (createIssue, createSet, moveToSprint, deleteIssues)" }, { status: 400 });
  } catch (err) {
    console.error("Jira POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

interface CreateIssueParams {
  projectKey: string;
  issueType: string;
  summary: string;
  description?: string;
  parentKey?: string;
  sprintId?: number;
}

async function createIssue(params: CreateIssueParams) {
  const { projectKey, issueType, summary, description, parentKey, sprintId } = params;

  // Get issue type ID by name
  const project = await jiraFetch(`/rest/api/3/project/${encodeURIComponent(projectKey)}`);
  const typeObj = project.issueTypes.find(
    (t: { name: string }) => t.name.toLowerCase() === issueType.toLowerCase()
  );
  if (!typeObj) throw new Error(`Issue type "${issueType}" not found in project ${projectKey}`);

  const fields: Record<string, unknown> = {
    project: { key: projectKey },
    issuetype: { id: typeObj.id },
    summary,
  };

  if (description) {
    fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: description }],
        },
      ],
    };
  }

  // Parent (for stories under epics, subtasks under stories)
  if (parentKey) {
    fields.parent = { key: parentKey };
  }

  const created = await jiraFetch("/rest/api/3/issue", {
    method: "POST",
    body: JSON.stringify({ fields }),
  });

  // Move to sprint if specified (not applicable for Epics)
  if (sprintId && issueType.toLowerCase() !== "epic") {
    try {
      await jiraFetch(`/rest/agile/1.0/sprint/${sprintId}/issue`, {
        method: "POST",
        body: JSON.stringify({ issues: [created.key] }),
      });
    } catch (err) {
      console.warn("Failed to move to sprint:", err);
    }
  }

  return {
    key: created.key,
    id: created.id,
    url: `${getJiraConfig().site}/browse/${created.key}`,
    summary,
    type: issueType,
  };
}
