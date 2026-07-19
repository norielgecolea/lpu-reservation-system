import { UiSelectOption } from '../ui/select/select';

export const DEPARTMENTS = [
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
  'EXTERNAL',
] as const;

export const DEPARTMENT_SELECT_OPTIONS: UiSelectOption[] = DEPARTMENTS.map(department => ({
  value: department,
  label: department,
}));
