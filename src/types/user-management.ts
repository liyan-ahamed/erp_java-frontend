// Shapes for the /users API. Deliberately separate from the /auth/me `User`
// in contexts/auth-context.tsx — the two endpoints return different fields.

/** GET/POST/PUT/PATCH /users responses (UserDetailResponse). */
export interface ManagedUser {
  id: number;
  username: string;
  name: string;
  email: string;
  staff_code: string | null;
  phone: string | null;
  designation: string | null;
  active: boolean;
  roles: string[];
  permissions: string[];
  created_at: string | null;
  updated_at: string | null;
}

/** POST /users body (CreateUserRequest). Request fields are camelCase. */
export interface CreateUserPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  staffCode?: string;
  designation?: string;
  roles: string[];
}

/** PUT /users/{id} body (UpdateUserRequest). Blank text fields are ignored by the backend. */
export type UpdateUserPayload = Omit<CreateUserPayload, 'password'>;

export interface UserListQuery {
  page: number;
  size: number;
  search?: string;
  active?: boolean;
}
