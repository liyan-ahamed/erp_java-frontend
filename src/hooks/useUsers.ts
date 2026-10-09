import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/api/user.service';
import { QUERY_KEYS } from '@/constants/query-keys';
import { CreateUserPayload, ManagedUser, UpdateUserPayload, UserListQuery } from '@/types/user-management';

export const useUsers = (query: UserListQuery) =>
  useQuery({
    queryKey: [QUERY_KEYS.USERS, query],
    queryFn: () => userService.getUsers(query),
    placeholderData: keepPreviousData,
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
