/** Minimum fields needed to determine if a maintenance block is still upcoming. */
export interface MaintenanceBlockTiming {
  blockDate: string;
  endTime: string;
}

/** True if block end (blockDate + endTime) is still in the future. */
export function isUpcomingMaintenanceBlock(block: MaintenanceBlockTiming, now = new Date()): boolean {
  const end = blockEndDate(block);
  return end.getTime() >= now.getTime();
}

export function countUpcomingMaintenanceBlocks(blocks: MaintenanceBlockTiming[], now = new Date()): number {
  return blocks.filter(b => isUpcomingMaintenanceBlock(b, now)).length;
}

function blockEndDate(block: MaintenanceBlockTiming): Date {
  const [y, m, d] = block.blockDate.split('-').map(Number);
  const [hh, mm] = (block.endTime || '23:59').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}
