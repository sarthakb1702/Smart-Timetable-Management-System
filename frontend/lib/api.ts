import { createClient } from '@/utils/supabase/client'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL || 'http://localhost:8000'

export const API_V1 = `${BACKEND_URL}/api/v1`

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
    this.name = 'ApiError'
  }
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new ApiError(401, 'Not authenticated')
  }

  return session.access_token
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  token?: string
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, token, headers, ...rest } = options

  const authToken = token ?? (await getAccessToken())

  const isFormData = body instanceof FormData

  const response = await fetch(`${API_V1}${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${authToken}`,
      ...headers,
    },
    body:
      body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  })

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const detail =
      (payload && typeof payload.detail === 'string' && payload.detail) ||
      (Array.isArray(payload?.detail)
        ? payload.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : null) ||
      `Request failed with status ${response.status}`

    throw new ApiError(response.status, detail, payload?.detail)
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
}