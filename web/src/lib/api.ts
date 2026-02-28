export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const tg = (window as any).Telegram?.WebApp;
    const initData = tg?.initData || '';

    const headers = {
        ...options.headers,
        'x-telegram-init-data': initData,
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    return response;
};

export const api = {
    getUserData: () => fetchWithAuth('/api/user-data'),
    analyzeAudio: (formData: FormData) => fetchWithAuth('/api/analyze-audio', {
        method: 'POST',
        body: formData,
    }),
    textToSpeech: (text: string) => fetchWithAuth('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    }),
    getTestWords: (type: string = 'word') => fetchWithAuth(`/api/test-words?type=${type}`),
    getRandomWord: (type: string = 'word') => fetchWithAuth(`/api/random-word?type=${type}`),
    getLeaderboard: () => fetchWithAuth('/api/leaderboard'),
    getUserAssessments: () => fetchWithAuth('/api/assessments'),
    getMaterials: () => fetchWithAuth('/api/materials'),
};
