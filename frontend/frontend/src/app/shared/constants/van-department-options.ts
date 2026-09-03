import { UiSelectOption } from '../ui/select/select';
import { DEPARTMENTS } from './department-options';

const VAN_ONLY_DEPARTMENTS = [
  'LPU SC - Laguna',
  'LPU SC - Santo Tomas',
] as const;

export const VAN_DEPARTMENTS = [
  ...DEPARTMENTS.filter((department) => department !== 'EXTERNAL'),
  ...VAN_ONLY_DEPARTMENTS,
];

export const VAN_DEPARTMENT_SELECT_OPTIONS: UiSelectOption[] = VAN_DEPARTMENTS.map((department) => ({
  value: department,
  label: department,
}));
