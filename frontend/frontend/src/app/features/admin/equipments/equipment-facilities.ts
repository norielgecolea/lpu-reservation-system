import { UiSelectOption } from '../../../shared/ui';
import { EquipmentRow, Facility } from './equipments.models';
import { EquipmentScope } from './equipments.service';

/** Facilities that don't host equipment and must be hidden from equipment dropdowns. */
const EXCLUDED_FACILITIES = new Set(['van']);

/** FLT and Gymnasium only — facilities admin equipment scope. */
const FACILITIES_ADMIN_FACILITY_IDS = new Set([1, 5]);

/** Build distinct facility (service) options from facility or equipment rows. */
export function toFacilityOptions(
  rows: Array<EquipmentRow | Facility>,
  scope: EquipmentScope = 'admin',
): UiSelectOption[] {
  const seen = new Map<number, string>();

  for (const row of rows) {
    const id = 'facilityId' in row ? row.facilityId : row.id;
    const name = row.facilityName?.trim();

    if (scope === 'facilities' && !FACILITIES_ADMIN_FACILITY_IDS.has(id)) {
      continue;
    }

    if (name && !EXCLUDED_FACILITIES.has(name.toLowerCase()) && !seen.has(id)) {
      seen.set(id, name);
    }
  }

  return [...seen].map(([id, name]) => ({ value: String(id), label: name }));
}
