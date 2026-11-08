"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { parseDay } from "@/lib/dates";
import { parseNumber, round2, text } from "@/lib/form";
import { buildTemplateTasks } from "@/lib/template";
import type { ActionResult, MutationResult, ProjectStatus, TaskStatus } from "@/lib/types";

function refresh(projectId?: string) {
  revalidatePath("/");
  revalidatePath("/obras");
  if (projectId) revalidatePath(`/obras/${projectId}`);
}

// ---------- Obra ----------

export async function createProject(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const name = text(formData.get("name"));
  const location = text(formData.get("location"));
  const powerKwp = parseNumber(formData.get("powerKwp"));
  const startDate = parseDay(formData.get("startDate"));
  const expectedEnd = parseDay(formData.get("expectedEnd"));
  const leadName = text(formData.get("leadName"));
  const useTemplate = formData.get("useTemplate") === "on";

  if (!name) return { error: "Informe o nome da obra." };
  if (powerKwp !== null && powerKwp < 0) return { error: "A potência não pode ser negativa." };
  if (startDate && expectedEnd && expectedEnd < startDate) {
    return { error: "A previsão de término não pode ser antes do início." };
  }

  let id = "";
  try {
    const project = await prisma.project.create({
      data: {
        name,
        location: location || null,
        powerKwp: powerKwp === null ? null : round2(powerKwp),
        startDate,
        expectedEnd,
        team: leadName ? { create: { name: leadName, role: "LEAD" } } : undefined,
        tasks: useTemplate ? { create: buildTemplateTasks() } : undefined,
      },
    });
    id = project.id;
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível criar a obra. Tente novamente." };
  }

  refresh();
  redirect(`/obras/${id}`);
}

export async function setProjectStatus(
  projectId: string,
  status: ProjectStatus,
): Promise<MutationResult> {
  await requireAdmin();
  if (!["ACTIVE", "ON_HOLD", "DONE"].includes(status)) return { error: "Status inválido." };

  try {
    await prisma.project.update({ where: { id: projectId }, data: { status } });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível alterar o status." };
  }
  refresh(projectId);
  return { success: true };
}

export async function deleteProject(projectId: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    // Tarefas e equipe saem junto; lançamentos e notas ficam, só perdem o vínculo com a obra.
    await prisma.project.delete({ where: { id: projectId } });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível excluir a obra." };
  }
  refresh();
  redirect("/obras");
}

// ---------- Checklist ----------

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<MutationResult> {
  const user = await requireUser();
  if (!["TODO", "DOING", "DONE"].includes(status)) return { error: "Status inválido." };

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status, updatedById: user.id },
      select: { projectId: true },
    });
    refresh(task.projectId);
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível atualizar a tarefa." };
  }
  return { success: true };
}

export async function addTask(formData: FormData): Promise<MutationResult> {
  await requireAdmin();

  const projectId = text(formData.get("projectId"));
  const stage = text(formData.get("stage"));
  const title = text(formData.get("title"));

  if (!projectId) return { error: "Obra não encontrada." };
  if (!stage || !title) return { error: "Informe a etapa e o nome da tarefa." };

  try {
    const last = await prisma.task.aggregate({
      where: { projectId },
      _max: { position: true },
    });
    await prisma.task.create({
      data: { projectId, stage, title, position: (last._max.position ?? -1) + 1 },
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível adicionar a tarefa." };
  }
  refresh(projectId);
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    const task = await prisma.task.delete({ where: { id: taskId }, select: { projectId: true } });
    refresh(task.projectId);
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível remover a tarefa." };
  }
  return { success: true };
}

// ---------- Equipe ----------

export async function addMember(formData: FormData): Promise<MutationResult> {
  await requireAdmin();

  const projectId = text(formData.get("projectId"));
  const name = text(formData.get("name"));
  const jobTitle = text(formData.get("jobTitle"));
  const role = text(formData.get("role")) === "LEAD" ? "LEAD" : "MEMBER";

  if (!projectId) return { error: "Obra não encontrada." };
  if (!name) return { error: "Informe o nome." };

  try {
    await prisma.teamMember.create({
      data: { projectId, name, role, jobTitle: jobTitle || null },
    });
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível adicionar à equipe." };
  }
  refresh(projectId);
  return { success: true };
}

export async function removeMember(memberId: string): Promise<MutationResult> {
  await requireAdmin();

  try {
    const m = await prisma.teamMember.delete({
      where: { id: memberId },
      select: { projectId: true },
    });
    refresh(m.projectId);
  } catch (e) {
    console.error(e);
    return { error: "Não foi possível remover." };
  }
  return { success: true };
}
