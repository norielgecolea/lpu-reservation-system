import { UiSelectOption } from '../ui/select/select';

const INTERNAL_DEPARTMENTS = [
  'HRMDO',
  'ACCOUNTING',
  'TREASURY',
  'REGISTRAR',
  'MMO',
  'MARKETING',
  'RESEARCH',
  'ISRO',
  'MIS',
  'PURCHASING',
  'PALAESTRA',
  'SAFETY OFFICE',
  'PLANNING',
  'LIBRARY',
  'OSAS',
  'CAM',
  'CAS',
  'CBA',
  'CITHM',
  'COECS',
  'GUIDANCE',
  'GRADUATE SCHOOL',
  'HIGHSCHOOL',
  'MEDICINE',
  'FACILITIES',
  'CLINIC',
  'ETEEAP',
  'EXECUTIVE OFFICE',
  'VLE',
] as const;

export const DEPARTMENTS = ['EXTERNAL', ...INTERNAL_DEPARTMENTS] as const;

export const DEPARTMENT_SELECT_OPTIONS: UiSelectOption[] = DEPARTMENTS.map((department) => ({
  value: department,
  label: department,
}));

export const EXTERNAL_DEPARTMENT = 'EXTERNAL';

