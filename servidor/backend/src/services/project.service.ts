import crypto from "crypto";
import { Pool } from "pg";
import { Project, ProjectWithConversations } from "../types";
import { CreateProjectInput, UpdateProjectInput } from "../schemas/project.schema";
import { NotFoundError } from "../utils/errors";
import { getDbPool } from "../config/database";
import { env } from "../config/env";
import { IConversationRepository } from "./conversation.service";

export interface IProjectRepository {
  createProject(userId: string, input: CreateProjectInput): Promise<Project>;
  listProjects(userId: string): Promise<Project[]>;
  getProject(userId: string, projectId: string): Promise<Project | null>;
  updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project>;
  deleteProject(userId: string, projectId: string): Promise<boolean>;
}

export class PostgresProjectRepository implements IProjectRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public async createProject(
    userId: string,
    input: CreateProjectInput
  ): Promise<Project> {
    const res = await this.pool.query(
      `INSERT INTO public.projects (user_id, name, description, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, input.name, input.description || null, input.color || "#3B82F6"]
    );
    return res.rows[0] as Project;
  }

  public async listProjects(userId: string): Promise<Project[]> {
    const res = await this.pool.query(
      `SELECT * FROM public.projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    return res.rows as Project[];
  }

  public async getProject(
    userId: string,
    projectId: string
  ): Promise<Project | null> {
    const res = await this.pool.query(
      `SELECT * FROM public.projects
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [projectId, userId]
    );
    if (!res.rowCount || res.rowCount === 0) return null;
    return res.rows[0] as Project;
  }

  public async updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    const fields: string[] = [];
    const values: unknown[] = [projectId, userId];
    let idx = 3;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.color !== undefined) {
      fields.push(`color = $${idx++}`);
      values.push(input.color);
    }

    if (fields.length === 0) {
      const existing = await this.getProject(userId, projectId);
      if (!existing) throw new NotFoundError("Projeto não encontrado");
      return existing;
    }

    fields.push(`updated_at = now()`);

    const query = `
      UPDATE public.projects
      SET ${fields.join(", ")}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const res = await this.pool.query(query, values);
    if (!res.rowCount || res.rowCount === 0) {
      throw new NotFoundError("Projeto não encontrado para atualização");
    }
    return res.rows[0] as Project;
  }

  public async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM public.projects
       WHERE id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export class InMemoryProjectRepository implements IProjectRepository {
  private projects: Map<string, Project> = new Map();

  public async createProject(
    userId: string,
    input: CreateProjectInput
  ): Promise<Project> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      user_id: userId,
      name: input.name,
      description: input.description || null,
      color: input.color || "#3B82F6",
      created_at: now,
      updated_at: now,
    };
    this.projects.set(id, project);
    return project;
  }

  public async listProjects(userId: string): Promise<Project[]> {
    const list: Project[] = [];
    for (const proj of this.projects.values()) {
      if (proj.user_id === userId) {
        list.push(proj);
      }
    }
    return list.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  public async getProject(
    userId: string,
    projectId: string
  ): Promise<Project | null> {
    const proj = this.projects.get(projectId);
    if (!proj || proj.user_id !== userId) return null;
    return proj;
  }

  public async updateProject(
    userId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    const proj = await this.getProject(userId, projectId);
    if (!proj) {
      throw new NotFoundError("Projeto não encontrado");
    }
    if (input.name !== undefined) proj.name = input.name;
    if (input.description !== undefined) proj.description = input.description;
    if (input.color !== undefined) proj.color = input.color;
    proj.updated_at = new Date().toISOString();
    this.projects.set(projectId, proj);
    return proj;
  }

  public async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const proj = await this.getProject(userId, projectId);
    if (!proj) return false;
    this.projects.delete(projectId);
    return true;
  }

  public clear(): void {
    this.projects.clear();
  }
}

export class ProjectService {
  private repository: IProjectRepository;

  constructor(repository?: IProjectRepository) {
    if (repository) {
      this.repository = repository;
    } else if (env.DATABASE_URL) {
      const pool = getDbPool();
      this.repository = pool
        ? new PostgresProjectRepository(pool)
        : new InMemoryProjectRepository();
    } else {
      this.repository = new InMemoryProjectRepository();
    }
  }

  public setRepositoryForTesting(repo: IProjectRepository): void {
    this.repository = repo;
  }

  public async create(userId: string, input: CreateProjectInput): Promise<Project> {
    return this.repository.createProject(userId, input);
  }

  public async list(userId: string): Promise<Project[]> {
    return this.repository.listProjects(userId);
  }

  public async getById(userId: string, projectId: string): Promise<Project> {
    const proj = await this.repository.getProject(userId, projectId);
    if (!proj) {
      throw new NotFoundError("Projeto não encontrado");
    }
    return proj;
  }

  public async update(
    userId: string,
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    return this.repository.updateProject(userId, projectId, input);
  }

  public async delete(userId: string, projectId: string): Promise<boolean> {
    const success = await this.repository.deleteProject(userId, projectId);
    if (!success) {
      throw new NotFoundError("Projeto não encontrado");
    }
    return true;
  }

  public async getWithConversations(
    userId: string,
    projectId: string,
    conversationRepo: IConversationRepository
  ): Promise<ProjectWithConversations> {
    const project = await this.getById(userId, projectId);
    const allConversations = await conversationRepo.listConversations(userId, projectId);
    return {
      ...project,
      conversations: allConversations,
    };
  }
}

export const defaultProjectService = new ProjectService();
