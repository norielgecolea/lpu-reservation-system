import { AuthUser, ServiceCode } from '../../../core/auth/auth.models';
import { effectiveServices } from '../../../core/auth/roles';
import { UiSelectOption } from '../../../shared/ui';
import { EquipmentRow, Facility } from './equipments.models';

/** Facilities that don't host equipment and must be hidden from equipment dropdowns. */
const EXCLUDED_FACILITIES = new Set(['van']);

/** Facility row id for each equipment-bearing service. Van has no equipment. */
export const EQUIPMENT_FACILITY_ID: Partial<Record<ServiceCode, number>> = {
  FLT: 1,
  NEXUS: 3,
  BOARDROOM: 4,
  GYMNASIUM: 5,
  CONFERENCE: 6,
};

/** Facility ids this role may manage equipment for. */
export function equipmentFacilityIdsForUser(user: AuthUser | null | undefined): Set<number> {
  const ids = new Set<number>();
  for (const service of effectiveServices(user)) {
    const id = EQUIPMENT_FACILITY_ID[service];
    if (id != null) ids.add(id);
  }
  return ids;
}

/** Build facility options limited to services assigned to the current role. */
export function toFacilityOptions(
  rows: Array<EquipmentRow | Facility>,
  allowedFacilityIds: ReadonlySet<number>,
): UiSelectOption[] {
  const seen = new Map<number, string>();

  for (const row of rows) {
    const id = 'facilityId' in row ? row.facilityId : row.id;
    const name = row.facilityName?.trim();

    if (!allowedFacilityIds.has(id)) {
      continue;
    }

    if (name && !EXCLUDED_FACILITIES.has(name.toLowerCase()) && !seen.has(id)) {
      seen.set(id, name);
    }
  }

  return [...seen].map(([id, name]) => ({ value: String(id), label: name }));
}
