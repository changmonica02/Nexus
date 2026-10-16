import { getSupabase } from "../../infrastructure/supabase/client";
import type { CharacterProfileData } from "../../lib/types";
import { snapshotCharacterTemplate } from "../../lib/characterWorkspace";
export interface CreationPost {
  id: string;
  owner_id: string;
  kind: "character" | "world";
  title: string;
  author_name: string;
  visibility: "draft" | "published" | "delisted" | "taken_down";
  official: boolean;
  allow_derivatives: boolean;
  latest_version: number;
  downloads: number;
  source_id: string | null;
  source_snapshot: unknown;
  updated_at: string;
}
export interface CreationDraft {
  template_id: string;
  owner_id: string;
  revision: number;
  title: string;
  structure: CharacterProfileData;
}
export interface CreationVersion {
  template_id: string;
  version: number;
  title: string;
  structure: CharacterProfileData;
  license_snapshot: unknown;
  created_at: string;
}
export interface CreationDownload {
  page_id: string;
  source_id: string;
  version: number;
  title: string;
  kind: "character" | "world";
  author_name: string;
  structure: CharacterProfileData;
  license_snapshot: unknown;
}
export class CreationTemplateLibrary {
  private client() {
    const c = getSupabase();
    if (!c)
      throw Error(
        "創作資源庫需要連線並登入。 / Sign in and connect to use the creation library.",
      );
    return c;
  }
  async capabilities() {
    const c = getSupabase();
    if (!c) return null;
    const { data, error } = await c.rpc("creation_template_capabilities");
    if (error || data?.version !== 1) return null;
    return data as { version: number; admin: boolean };
  }
  async owner() {
    const { data, error } = await this.client().auth.getUser();
    if (error || !data.user) throw Error("請先登入 / Sign in required");
    return data.user.id;
  }
  async list(
    kind: "character" | "world",
    filter: "all" | "official" | "submitted" | "mine",
    page: number,
    search = "",
  ) {
    let q = this.client()
      .from("creation_templates")
      .select("*", { count: "exact" })
      .eq("kind", kind);
    if (filter === "mine") q = q.eq("owner_id", await this.owner());
    else q = q.eq("visibility", "published");
    if (filter === "official") q = q.eq("official", true);
    if (filter === "submitted") q = q.eq("official", false);
    if (search.trim())
      q = q.ilike("title", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
    const { data, error, count } = await q
      .order("updated_at", { ascending: false })
      .order("id")
      .range((page - 1) * 24, page * 24 - 1);
    if (error) throw error;
    return { items: data as CreationPost[], count: count ?? 0 };
  }
  async post(id: string) {
    const { data, error } = await this.client()
      .from("creation_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw Error("找不到可存取的模板 / Template unavailable");
    return data as CreationPost;
  }
  async draft(id: string) {
    const { data, error } = await this.client()
      .from("creation_template_drafts")
      .select("*")
      .eq("template_id", id)
      .maybeSingle();
    if (error) throw error;
    return data as CreationDraft | null;
  }
  async versions(id: string, page = 1) {
    const { data, error } = await this.client()
      .from("creation_template_versions")
      .select("*")
      .eq("template_id", id)
      .order("version", { ascending: false })
      .range((page - 1) * 20, page * 20 - 1);
    if (error) throw error;
    return data as CreationVersion[];
  }
  async mutate<T = CreationPost>(
    action: string,
    input: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.client().rpc(
      "creation_template_mutate",
      { p_action: action, p_input: input },
    );
    if (error) throw error;
    return data as T;
  }
  async save(input: {
    id: string;
    revision: number;
    title: string;
    structure: CharacterProfileData;
    kind?: "character" | "world";
    author_name?: string;
    source_id?: string;
  }) {
    return this.mutate<CreationDraft>("save", {
      ...input,
      structure: snapshotCharacterTemplate(input.structure),
    });
  }
  async reports() {
    const { data, error } = await this.client()
      .from("creation_template_reports")
      .select("*")
      .eq("resolved", false)
      .order("created_at")
      .limit(100);
    if (error) throw error;
    return data as { id: string; template_id: string; reason: string }[];
  }
}
export const creationTemplateLibrary = new CreationTemplateLibrary();
