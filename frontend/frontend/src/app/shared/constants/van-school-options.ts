export const VAN_SCHOOL_OPTIONS = [
  { value: 'LPU-L', label: 'LPU-L (Laguna)' },
  { value: 'LPU-SC', label: 'LPU-SC (St. Cabrini)' },
] as const;

export type VanSchoolValue = (typeof VAN_SCHOOL_OPTIONS)[number]['value'];
