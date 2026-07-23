import { UiSelectOption } from '../ui/select/select';
import { DEPARTMENTS } from './department-options';

export const VAN_DEPARTMENTS = DEPARTMENTS.filter((department) => department !== 'EXTERNAL');

export const VAN_DEPARTMENT_SELECT_OPTIONS: UiSelectOption[] = VAN_DEPARTMENTS.map((department) => ({
  value: department,
  label: department,
}));
