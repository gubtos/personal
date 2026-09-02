import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { evaluationsApi, membersApi, paymentsApi, settingsApi } from "@/lib/tauri-commands";
import type {
  Evaluation,
  EvaluationInput,
  Member,
  MemberInput,
  MemberListItem,
  MemberListMode,
  Payment,
  Settings,
  SettingsInput,
} from "@/types";

export const queryKeys = {
  members: ["members"] as const,
  member: (id: string) => ["members", id] as const,
  membersSorted: (mode: MemberListMode, active: boolean) =>
    ["members", "sorted", mode, active] as const,
  memberNextEvaluationDate: (id: string) => ["members", id, "nextEvaluationDate"] as const,
  evaluations: (memberId: string) => ["evaluations", memberId] as const,
  evaluation: (id: string) => ["evaluation", id] as const,
  settings: ["settings"] as const,
  payments: (memberId: string) => ["payments", memberId] as const,
};

export function useMembers() {
  return useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
}

export function useMembersSorted(mode: MemberListMode, active: boolean) {
  return useQuery<MemberListItem[]>({
    queryKey: queryKeys.membersSorted(mode, active),
    queryFn: () => membersApi.listSorted(mode, active),
  });
}

export function useSetMemberActive(): UseMutationResult<
  Member,
  Error,
  { id: string; active: boolean }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      membersApi.setActive(id, active),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.setQueryData(queryKeys.member(member.id), member);
    },
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.member(id ?? ""),
    queryFn: () => membersApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useNextEvaluationDate(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.memberNextEvaluationDate(id ?? ""),
    queryFn: () => membersApi.nextEvaluationDate(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateMember(): UseMutationResult<Member, Error, MemberInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => membersApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useUpdateMember(
  id: string,
): UseMutationResult<Member, Error, MemberInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => membersApi.update(id, input),
    onSuccess: (member) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.setQueryData(queryKeys.member(id), member);
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(id) });
    },
  });
}

export function useDeleteMember(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => membersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useEvaluations(memberId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.evaluations(memberId ?? ""),
    queryFn: () => evaluationsApi.list(memberId as string),
    enabled: Boolean(memberId),
  });
}

export function useCreateEvaluation(
  memberId: string,
): UseMutationResult<Evaluation, Error, EvaluationInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EvaluationInput) => evaluationsApi.create(memberId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluations(memberId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useUpdateEvaluation(
  memberId: string,
  evaluationId: string,
): UseMutationResult<Evaluation, Error, EvaluationInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EvaluationInput) =>
      evaluationsApi.update(evaluationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluations(memberId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useDeleteEvaluation(
  memberId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => evaluationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluations(memberId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: settingsApi.get });
}

export function useUpdateSettings(): UseMutationResult<Settings, Error, SettingsInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SettingsInput) => settingsApi.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}

export function usePayments(memberId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments(memberId ?? ""),
    queryFn: () => paymentsApi.list(memberId as string),
    enabled: Boolean(memberId),
  });
}

export function useSetPaymentPaid(
  memberId: string,
): UseMutationResult<Payment, Error, { id: string; paid: boolean }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      paymentsApi.setPaid(id, paid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(memberId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
  });
}
