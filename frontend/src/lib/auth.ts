export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export const setToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('nids_token', token);
    }
};

export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('nids_token');
    }
    return null;
};

export const removeToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('nids_token');
    }
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = getToken();

    if (!token) {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('No authentication token found');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(url, {
        ...options,
        headers,
    });


    if (response.status === 401 || response.status === 403) {
        removeToken();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        throw new Error('Authentication failed / Session expired');
    }

    return response;
};
