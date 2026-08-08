import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { evaluationsApi, membersApi } from "@/lib/tauri-commands";
import type { Evaluation, EvaluationInput, Member, MemberInput } from "@/types";

export const queryKeys = {
  members: ["members"] as const,
  member: (id: string) => ["members", id] as const,
  evaluations: (memberId: string) => ["evaluations", memberId] as const,
  evaluation: (id: string) => ["evaluation", id] as const,
};

export function useMembers() {
  return useQuery({ queryKey: queryKeys.members, queryFn: membersApi.list });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.member(id ?? ""),
    queryFn: () => membersApi.get(id as string),
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
    },
  });
}
