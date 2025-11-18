import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LoginInput, SignupInput, LoginResult } from '../lib/api'
import { login as loginRequest, signup as signupRequest, logout as logoutRequest } from '../lib/api'

export interface AuthTokens {
  sessionId: string
  accountId: string
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  refreshTokenExpiresAt: string
}

interface AuthContextValue {
  tokens: AuthTokens | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<LoginResult>
  signup: (input: SignupInput) => Promise<LoginResult>
  logout: () => Promise<void>
  logoutMessage: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'tiptap-example-auth'

const readStoredTokens = (): AuthTokens | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as AuthTokens
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => readStoredTokens())
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (tokens) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [tokens])

  const login = useCallback(async (input: LoginInput) => {
    const result = await loginRequest(input)
    setTokens({
      sessionId: result.sessionId,
      accountId: result.accountId,
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    })
    setLogoutMessage(null)
    return result
  }, [])

  const signup = useCallback(
    async (input: SignupInput) => {
      await signupRequest(input)
    const result = await login({ email: input.email, password: input.password })
    setLogoutMessage(null)
    return result
    },
    [login],
  )

  const accessToken = tokens?.accessToken

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await logoutRequest(accessToken)
      }
    } catch {
      // ignore failures, still clear local state
    } finally {
      setTokens(null)
      setLogoutMessage(null)
    }
  }, [accessToken])

  useEffect(() => {
    const handleExpired = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail
      setLogoutMessage(detail?.message ?? '세션이 만료되어 로그아웃되었습니다.')
      setTokens(null)
    }
    window.addEventListener('tiptap-auth-expired', handleExpired)
    return () => {
      window.removeEventListener('tiptap-auth-expired', handleExpired)
    }
  }, [])

  const value = useMemo(
    () => ({
      tokens,
      isAuthenticated: Boolean(tokens?.accessToken),
      login,
      signup,
      logout,
      logoutMessage,
    }),
    [tokens, login, signup, logout, logoutMessage],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
