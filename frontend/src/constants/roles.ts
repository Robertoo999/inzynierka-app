import type { Role } from '../api'

export const ROLE_LABELS_PL: Record<Role, string> = {
    STUDENT: 'Uczeń',
    TEACHER: 'Nauczyciel'
}

export function roleLabelPl(r: Role) { return ROLE_LABELS_PL[r] }
