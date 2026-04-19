import { useEffect, useMemo, useState } from "react";
import { PencilIcon, PlayIcon, PlusIcon, WorkflowIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { WorkflowDialog } from "./workflow_dialog";
import { WorkflowStorage, type WorkflowRecord } from "./workflow_storage";

function createWorkflowId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createStorageKey(organizationSlug: string): string {
  return `companyhelm:${organizationSlug}:workflows:v1`;
}

/**
 * Provides the workflow management shell before backend workflow mutations exist. The page persists
 * locally and keeps run as a no-op so execution-specific behavior can be added independently.
 */
export function WorkflowsPage() {
  const organizationSlug = useCurrentOrganizationSlug();
  const storage = useMemo(() => new WorkflowStorage(createStorageKey(organizationSlug)), [organizationSlug]);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowRecord | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoaded, setLoaded] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);

  useEffect(() => {
    setWorkflows(storage.read());
    setLoaded(true);
  }, [storage]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    storage.write(workflows);
  }, [isLoaded, storage, workflows]);

  function openCreateDialog(): void {
    setEditingWorkflow(null);
    setDialogOpen(true);
  }

  function saveWorkflow(input: {
    description: string;
    inputs: WorkflowRecord["inputs"];
    instructions: string;
    name: string;
    steps: WorkflowRecord["steps"];
  }): void {
    const timestamp = new Date().toISOString();
    if (editingWorkflow) {
      setWorkflows((currentWorkflows) => currentWorkflows.map((workflow) => (
        workflow.id === editingWorkflow.id
          ? {
            ...workflow,
            description: input.description,
            inputs: input.inputs,
            instructions: input.instructions,
            name: input.name,
            steps: input.steps,
            updatedAt: timestamp,
          }
          : workflow
      )));
      setEditingWorkflow(null);
      setDialogOpen(false);
      return;
    }

    setWorkflows((currentWorkflows) => [
      {
        createdAt: timestamp,
        description: input.description,
        id: createWorkflowId(),
        inputs: input.inputs,
        instructions: input.instructions,
        name: input.name,
        steps: input.steps,
        updatedAt: timestamp,
      },
      ...currentWorkflows,
    ]);
    setDialogOpen(false);
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader className="flex flex-col gap-4 px-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <CardDescription>
              Manage workflow definitions, their required inputs, and ordered execution steps.
            </CardDescription>
          </div>
          <Button data-primary-cta="" onClick={openCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            Create workflow
          </Button>
        </CardHeader>

        <CardContent className="px-0">
          {workflows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
              <WorkflowIcon className="size-8 text-muted-foreground" />
              <div className="grid gap-1">
                <p className="text-sm font-medium text-foreground">No workflows yet</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Create a workflow to define the inputs and steps operators will use before execution is wired in.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Inputs</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{workflow.name}</span>
                        {workflow.description.length > 0 ? (
                          <span className="max-w-xl text-xs text-muted-foreground">{workflow.description}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No description</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{workflow.inputs.length} inputs</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{workflow.steps.length} steps</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(workflow.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Edit ${workflow.name}`}
                          onClick={() => {
                            setEditingWorkflow(workflow);
                            setDialogOpen(true);
                          }}
                          size="icon"
                          title={`Edit ${workflow.name}`}
                          type="button"
                          variant="ghost"
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          aria-label={`Run ${workflow.name}`}
                          onClick={() => undefined}
                          size="icon"
                          title="Workflow execution is not wired yet"
                          type="button"
                          variant="ghost"
                        >
                          <PlayIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WorkflowDialog
        isOpen={isDialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingWorkflow(null);
          }
        }}
        onSave={saveWorkflow}
        workflow={editingWorkflow}
      />
    </main>
  );
}
