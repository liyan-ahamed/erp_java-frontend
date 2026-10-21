import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/api/user.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { CreateUserPayload, ManagedUser, UpdateUserPayload, UserListQuery } from '@/types/user-management';
import { fetchAllPages } from '@/lib/pagination';
import { SingleRole, primaryRole } from '@/lib/user-roles';

export const useUsers = (query: UserListQuery) =>
  useQuery({
    queryKey: [QUERY_KEYS.USERS, query],
    queryFn: () => userService.getUsers(query),
    placeholderData: keepPreviousData,
  });

/**
 * TEMPORARY: every account with the given single role (HOD = admins, STAFF = faculty).
 * The backend's GET /users has no role filter yet, so this loads all pages and filters here — acceptable
 * only while the user population is small. Replace the queryFn with a server-side `role` filter once the
 * backend supports it; callers don't need to change.
 */
export const useUsersWithRole = (role: Exclude<SingleRole, 'ROLE_STUDENT'>, enabled = true) =>
  useQuery({
    queryKey: [QUERY_KEYS.USERS, 'role', role],
    queryFn: async () => {
      const all = await fetchAllPages((page, size) => userService.getUsers({ page, size }));
      return all.filter((u) => primaryRole(u.roles) === role).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled,
  });

export const useUser = (id: number | null) =>
  useQuery({
    queryKey: [QUERY_KEYS.USER_DETAIL, id],
    queryFn: () => userService.getUser(id as number),
    enabled: id !== null,
  });

/** Refreshes the list and caches the returned user as the latest detail. */
const useUserMutation = <TVars>(mutationFn: (vars: TVars) => Promise<ManagedUser>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (user) => {
      queryClient.setQueryData([QUERY_KEYS.USER_DETAIL, user.id], user);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] });
    },
  });
};

export const useCreateUser = () => useUserMutation((payload: CreateUserPayload) => userService.createUser(payload));

export const useUpdateUser = () =>
  useUserMutation(({ id, payload }: { id: number; payload: UpdateUserPayload }) => userService.updateUser(id, payload));

export const useDeactivateUser = () => useUserMutation((id: number) => userService.deactivateUser(id));

export const useReactivateUser = () => useUserMutation((id: number) => userService.reactivateUser(id));
