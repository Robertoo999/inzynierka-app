export type Health = { status: string; service: string; version: string }
export type Role = 'TEACHER' | 'STUDENT'
export type LessonListItem = {
    id: string
    title: string
    createdAt: string
    blocksCount: number
    tasksCount: number
    quizzesCount: number
    maxPoints: number
}

export type Task = { id: string; title: string; description: string; maxPoints: number }
export type PublicTask = {
    id: string
    lessonId: string | null
    title: string
    description: string
    maxPoints: number
    createdAt: string
    type: string
    language: string
    starterCode?: string | null
    maxAttempts?: number | null
    allowRunBeforeSubmit?: boolean | null
    lockAfterSubmit?: boolean | null
    // teacherSolution is never sent in public task responses (student endpoints)
    teacherSolution?: string | null
}

export type ActivityType = 'CONTENT' | 'TASK' | 'QUIZ'
export type ContentBlock =
    | { type: 'markdown'; md: string }
    | { type: 'image'; src: string; alt?: string }
    | { type: 'embed'; url: string }
    | { type: 'code'; lang?: string; code: string }
export type ActivityBody = { blocks: ContentBlock[] }
export type LessonActivity = {
    id: string; type: ActivityType; title: string; orderIndex: number;
    body?: string | null; taskId?: string | null; createdAt: string;
}

export type LessonDetail = {
    id: string; title: string; content: string; createdAt: string;
    tasks: Task[]; activities: LessonActivity[];
};

export type Classroom = { id: number; name: string; joinCode?: string|null; createdAt?: string }

export type SubmissionStatus = 'SUBMITTED' | 'GRADED' | 'REJECTED' | string
export type Submission = {
    id: string
    taskId: string
    studentId: string
    content: string
    status: SubmissionStatus
    points: number | null
    feedback: string | null
    gradedAt: string | null
    gradedBy: string | null
    createdAt: string
    code: string
    autoScore: number | null
    stdout: string | null
    testReport: string | null
    attemptNumber?: number | null
    manualScore?: number | null
    teacherComment?: string | null
    maxAttempts?: number | null
    maxPoints?: number | null
    effectiveScore?: number | null
}

export type StudentLessonSummary = { studentId: string; email?: string | null; totalPoints: number; maxPoints: number; tasksCompleted: number; totalTasks: number }
export type LessonSummaryDto = { lessonId: string; totalTasks: number; totalMaxPoints: number; students: StudentLessonSummary[] }

export type ClassProgressTask = {
    taskId: string
    title: string
    maxPoints: number | null
    type: 'TASK' | 'QUIZ'
    lessonId: string
    lessonTitle: string
    activityId: string
}

export type ClassProgressResult = {
    studentId: string
    taskId: string
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | string
    points: number | null
}

export type ClassProgressDto = {
    classId: number
    lessonId: string | null
    students: Array<{ studentId: string; email?: string | null; firstName?: string | null; lastName?: string | null }>
    tasks: ClassProgressTask[]
    results: ClassProgressResult[]
}

export type ClassSubmission = {
    submission: Submission
    lessonId: string | null
    lessonTitle: string | null
    taskTitle: string | null
    studentEmail?: string | null
    studentFirstName?: string | null
    studentLastName?: string | null
}

const inferredBase = (() => {
    if (typeof window === 'undefined') return 'http://localhost:8080'
    const origin = window.location.origin
    if (origin.includes('localhost:5173')) return 'http://localhost:8080'
    return origin
})()

export const API_BASE = (import.meta.env.VITE_API_BASE && String(import.meta.env.VITE_API_BASE).trim().length > 0)
    ? String(import.meta.env.VITE_API_BASE)
    : inferredBase

// api/ui capability gating (frontend only)
export const LANG_CAPS = {
    javascript: {
        eval: true,
        io: true,
        sample: `// Funkcja solve dostaje tekst wejściowy w parametrze input\n// Zwróć wynik jako string\nfunction solve(input) {\n  // TODO: tu uczeń pisze swoje rozwiązanie\n  return input;\n}`,
        sampleIO: `function solve(input) {\n  // TODO: tu uczeń pisze swoje rozwiązanie\n  // input - cały tekst wejścia jako string\n  return input;\n}\n\n// ----- Kod systemowy - NIE ZMIENIAJ PONIŻEJ -----\nconst fs = require('fs');\nconst data = fs.readFileSync(0, 'utf8').trim();\nprocess.stdout.write(String(solve(data)));`,
        evalSignatureHint: 'JS EVAL: function solve(input: string): string'
    },
    python: {
        eval: false,
        io: true,
        // short IO starter with minimal structure
        sample: `import sys\n\ndef solve(text):\n    # TODO: tu uczeń pisze swoje rozwiązanie\n    # text - cały tekst wejścia jako string\n    return text\n\n# ----- Kod systemowy - NIE ZMIENIAJ PONIŻEJ -----\nif __name__ == "__main__":\n    data = sys.stdin.read().strip()\n    print(solve(data))`,
        evalSignatureHint: 'PY IO: czytaj ze stdin (sys.stdin.read) i wypisz wynik na stdout (print)'
    },
} as const

async function j<T>(path: string, init: RequestInit = {}): Promise<T> {
    // notify global loading start
    try { (window as any).dispatchEvent(new CustomEvent('api:loading:start')) } catch {}
    const headers: Record<string, string> = { Accept: 'application/json' }
    const hasBody = init.body != null
    if (hasBody) headers['Content-Type'] = 'application/json'
    if (init.headers) Object.assign(headers, init.headers as any)

    let res: Response
    let text: string = ''
    try {
        const runtimeBase = (typeof API_BASE === 'string' && API_BASE && API_BASE.startsWith('http')) ? API_BASE : inferredBase
        const sanitizedBase = runtimeBase.endsWith('/') ? runtimeBase.slice(0, -1) : runtimeBase
        const normalizedPath = path.startsWith('/') ? path : `/${path}`
        const url = path.match(/^https?:\/\//) ? path : `${sanitizedBase}${normalizedPath}`
        res = await fetch(url, { ...init, headers })
        text = await res.text().catch(() => '')
    } finally {
        // notify global loading end
        try { (window as any).dispatchEvent(new CustomEvent('api:loading:end')) } catch {}
    }

    if (!res.ok) {
        let detail = text
        let code: string | undefined
        let fields: Record<string,string> | undefined
        try {
            const j = JSON.parse(text)
            detail = j.detail || j.message || text
            code = j.code
            if (j.fields && typeof j.fields === 'object') fields = j.fields
        } catch {}
        const msg = detail || res.statusText
        const full = code ? `${msg}${fields ? '' : ' ('+code+')'}` : msg
        throw new ApiError(full, { status: res.status, code, fields })
    }
    if (!text) return undefined as unknown as T
    try { return JSON.parse(text) as T } catch { return undefined as unknown as T }
}

export const api = {
    // health
    health: () => j<Health>('/api/health'),

    // auth
    register: (p: { email: string; password: string; role: Role; firstName?: string; lastName?: string }) =>
        j<{ token: string; email: string; role: Role; firstName?: string | null; lastName?: string | null }>('/api/auth/register', { method: 'POST', body: JSON.stringify(p) }),
    login: (p: { email: string; password: string }) =>
        j<{ token: string; email: string; role: Role; firstName?: string | null; lastName?: string | null }>('/api/auth/login', { method: 'POST', body: JSON.stringify(p) }),
    changePassword: (token: string, p: { oldPassword: string; newPassword: string }) =>
        j<{ token: string; email: string; role: Role; firstName?: string | null; lastName?: string | null }>('/api/auth/change-password', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),

    // lessons (public + in class)
    getLesson: (lessonId: string) => j<LessonDetail>(`/api/lessons/${lessonId}`),
    listLessonsInClass: (token: string, classId: number) =>
        j<LessonListItem[]>(`/api/classes/${classId}/lessons`, { headers: { Authorization: `Bearer ${token}` } }),
    createLessonInClass: (token: string, classId: number, p: { title: string; content?: string }) =>
        j<LessonListItem>(`/api/classes/${classId}/lessons`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    createLessonWithActivities: (token: string, classId: number, p: { title: string; content?: string; activities?: any[] }) =>
        j<LessonListItem>(`/api/classes/${classId}/lessons/with-activities`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    submitQuiz: (token: string | null, activityId: string, p: { answers: number[] }) =>
        j<{
            correct: number; total: number; points: number; percent: number
        }>(`/api/activities/${activityId}/quiz/submit`, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {} ) }, body: JSON.stringify(p) }),
    getActivityAttempts: (token: string, activityId: string) =>
        j<Array<{ id: string; studentId: string; correct: number; total: number; points: number; createdAt: string }>>(
            `/api/activities/${activityId}/attempts`, { headers: { Authorization: `Bearer ${token}` } }
        ),
    getMyAttempts: (token: string, activityId: string) =>
        j<Array<{ id: string; correct: number; total: number; points: number; createdAt: string }>>(
            `/api/activities/${activityId}/attempts/me`, { headers: { Authorization: `Bearer ${token}` } }
        ),
    updateLessonInClass: (token: string, classId: number, lessonId: string, p: { title?: string; content?: string }) =>
        j<LessonListItem>(`/api/classes/${classId}/lessons/${lessonId}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    deleteLessonInClass: (token: string, classId: number, lessonId: string) =>
        j<void>(`/api/classes/${classId}/lessons/${lessonId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),

    // tasks
    createTask: (token: string, lessonId: string, p: {
        title: string; description: string; maxPoints: number; starterCode?: string; tests?: string; language?: string; teacherSolution?: string;
    }) => j<Task>(`/api/lessons/${lessonId}/tasks`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p)
    }),
    getPublicTask: (taskId: string, token?: string) => j<PublicTask>(`/api/tasks/${taskId}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
    // teacher-only full task details including hidden solution
    getTeacherTask: (token: string, taskId: string) => j<PublicTask>(`/api/tasks/${taskId}/teacher`, { headers: { Authorization: `Bearer ${token}` } }),
    updateTask: (token: string, taskId: string, p: Partial<{ title: string; description: string; maxPoints: number; starterCode: string; tests: string; gradingMode: string; language: string }>) =>
        j<Task>(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    updateTaskWithSolution: (token: string, taskId: string, p: Partial<{ title: string; description: string; maxPoints: number; starterCode: string; tests: string; gradingMode: string; language: string; teacherSolution: string }>) =>
        j<Task>(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    deleteTask: (token: string, taskId: string) =>
        j<void>(`/api/tasks/${taskId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),

    // activities
    createActivity: (token: string, lessonId: string, p: { type: 'CONTENT'|'TASK'; title: string; orderIndex?: number; body?: string; taskId?: string }) =>
        j<LessonActivity>(`/api/lessons/${lessonId}/activities`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    createActivityWithTask: (token: string, lessonId: string, p: { type: 'CONTENT'|'TASK'; title: string; orderIndex?: number; body?: string; task?: { title: string; description?: string; maxPoints?: number; starterCode?: string; tests?: string; language?: string } }) =>
        j<LessonActivity>(`/api/lessons/${lessonId}/activities-with-task`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    moveActivity: (token: string, lessonId: string, activityId: string, p: { newIndex: number }) =>
        j<LessonActivity[]>(`/api/lessons/${lessonId}/activities/${activityId}/move`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    updateActivity: (token: string, id: string, p: { title?: string; orderIndex?: number; body?: string }) =>
        j<LessonActivity>(`/api/activities/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    deleteActivity: (token: string, id: string) =>
        j<void>(`/api/activities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),

    // submissions
    submit: (token: string, taskId: string, p: { content: string; code: string }) =>
        j<Submission>(`/api/tasks/${taskId}/submissions`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    // runTask: returns grader result or an object with `error` when the run is not supported/failed
    runTask: async (token: string, taskId: string, p: { code: string; language?: string }) => {
        try {
            return await j<any>(`/api/tasks/${taskId}/run`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) })
        } catch (err:any) {
            // Normalize errors into an object so UI can handle run failures gracefully
            const msg = err?.message ? String(err.message) : String(err)
            return { error: msg }
        }
    },
    // teacher-only demo run uses stored teacherSolution; body is optional
    runTaskDemo: async (token: string, taskId: string) => {
        try {
            return await j<any>(`/api/tasks/${taskId}/run-demo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
        } catch (err:any) {
            const msg = err?.message ? String(err.message) : String(err)
            return { error: msg }
        }
    },
    // programming test cases (new)
    getTests: (taskId: string, token?: string) => j<any[]>(`/api/tasks/${taskId}/tests`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }),
    createTest: (token: string, taskId: string, p: { input?: string; expected?: string; visible?: boolean; points?: number; ordering?: number; mode?: string }) =>
        j<any>(`/api/tasks/${taskId}/tests`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    updateTest: (token: string, taskId: string, id: string, p: { input?: string; expected?: string; visible?: boolean; points?: number; ordering?: number; mode?: string }) =>
        j<any>(`/api/tasks/${taskId}/tests/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    deleteTest: (token: string, taskId: string, id: string) =>
        j<void>(`/api/tasks/${taskId}/tests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    mySubmissions: (token: string) =>
        j<Submission[]>('/api/my/submissions', { headers: { Authorization: `Bearer ${token}` } }),
    mySubmissionForTask: (token: string, taskId: string) =>
        j<Submission>(`/api/tasks/${taskId}/submissions/me`, { headers: { Authorization: `Bearer ${token}` } }),
    lessonSummary: (token: string, lessonId: string) => j<LessonSummaryDto>(`/api/lessons/${lessonId}/summary`, { headers: { Authorization: `Bearer ${token}` } }),
    listSubmissions: (token: string, taskId: string) =>
        j<Submission[]>(`/api/tasks/${taskId}/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
    gradeSubmission: (token: string, id: string, p: { manualScore?: number | null; teacherComment?: string | null }) =>
        j<Submission>(`/api/submissions/${id}/grade`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                manualScore: p.manualScore ?? null,
                teacherComment: p.teacherComment ?? ''
            })
        }),

    // classes
    myClasses: (token: string) =>
        j<Classroom[]>('/api/classes/me', { headers: { Authorization: `Bearer ${token}` } }),
    createClass: (token: string, p: { name: string }) =>
        j<Classroom>('/api/classes', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(p) }),
    joinClass: (token: string, p: { code: string }) =>
        j<Classroom>('/api/classes/join', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ code: p.code.trim().toUpperCase() }) }),
    getClassMembers: (token: string, classId: number) =>
        j<Array<{ id: string; email: string; firstName?: string | null; lastName?: string | null; role: string; joinedAt: string }>>(`/api/classes/${classId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
    deleteClassMember: (token: string, classId: number, userId: string) =>
        j<void>(`/api/classes/${classId}/members/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    // delete entire class (teacher only)
    deleteClass: (token: string, classId: number) =>
        j<void>(`/api/classes/${classId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    // allow current user to leave the class
    leaveClass: (token: string, classId: number) =>
        j<void>(`/api/classes/${classId}/members/me`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }),
    // class progress matrix for a lesson or whole class (lessonId optional)
    classProgress: (token: string, classId: number, lessonId?: string) => {
        const path = lessonId ? `/api/classes/${classId}/progress?lessonId=${lessonId}` : `/api/classes/${classId}/progress`
        return j<ClassProgressDto>(path, { headers: { Authorization: `Bearer ${token}` } })
    },
    classSubmissions: (token: string, classId: number) =>
        j<ClassSubmission[]>(`/api/classes/${classId}/submissions`, { headers: { Authorization: `Bearer ${token}` } }),
    // class-wide overview: students x lessons summary
    classProgressOverview: (token: string, classId: number) =>
        j<{ classId: number; lessons: Array<{ lessonId: string; title: string; totalTasks: number; totalMaxPoints: number }>; students: Array<{ studentId: string; email?: string | null; firstName?: string | null; lastName?: string | null }>; results: Array<{ studentId: string; lessonId: string; tasksCompleted: number; totalTasks: number; pointsEarned: number; maxPoints: number }> }>(`/api/classes/${classId}/progress/overview`, { headers: { Authorization: `Bearer ${token}` } }),
}

// Structured API error with optional field validation map
export class ApiError extends Error {
    status?: number
    code?: string
    fields?: Record<string,string>
    constructor(message: string, opts?: { status?: number; code?: string; fields?: Record<string,string> }) {
        super(message)
        if (opts) Object.assign(this, opts)
    }
}
