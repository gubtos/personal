import { invoke } from "@tauri-apps/api/core";
import type {
  Evaluation,
  EvaluationInput,
  Member,
  MemberInput,
  MemberListItem,
  Settings,
  SettingsInput,
} from "@/types";

export const membersApi = {
  list: () => invoke<Member[]>("members_list"),
  listWithNextEvaluation: () =>
    invoke<MemberListItem[]>("members_list_with_next_evaluation"),
  nextEvaluationDate: (id: string) =>
    invoke<string>("members_next_evaluation_date", { id }),
  get: (id: string) => invoke<Member>("members_get", { id }),
  create: (input: MemberInput) => invoke<Member>("members_create", { input }),
  update: (id: string, input: MemberInput) =>
    invoke<Member>("members_update", { id, input }),
  delete: (id: string) => invoke<void>("members_delete", { id }),
};

export const settingsApi = {
  get: () => invoke<Settings>("settings_get"),
  update: (input: SettingsInput) => invoke<Settings>("settings_update", { input }),
};

export const evaluationsApi = {
  list: (memberId: string) =>
    invoke<Evaluation[]>("evaluations_list", { memberId }),
  get: (id: string) => invoke<Evaluation>("evaluations_get", { id }),
  create: (memberId: string, input: EvaluationInput) =>
    invoke<Evaluation>("evaluations_create", { memberId, input }),
  update: (id: string, input: EvaluationInput) =>
    invoke<Evaluation>("evaluations_update", { id, input }),
  delete: (id: string) => invoke<void>("evaluations_delete", { id }),
};
