export const getEnv = (key: string, defaultValue?: string): string => {
    // 1. Runtime Env (injected by nginx entrypoint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeEnv = (window as any).__ENV__;
    if (runtimeEnv && runtimeEnv[key]) {
        return runtimeEnv[key];
    }

    // 2. Build-time Env (vite)
    const buildTimeEnv = import.meta.env[key];
    if (buildTimeEnv) {
        return buildTimeEnv;
    }

    // 3. Default
    return defaultValue || '';
};

export const API_BASE_URL = getEnv('VITE_API_BASE_URL', 'http://localhost:9920');
export const HOCUSPOCUS_URL = getEnv('VITE_HOCUSPOCUS_URL', 'ws://localhost:9930');
