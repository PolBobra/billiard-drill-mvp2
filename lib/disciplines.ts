// Закрытый список дисциплин бильярда — не растущий пользователями справочник
// (в отличие от clubs/coaches), поэтому просто константа, а не таблица.
export const DISCIPLINES = [
  { value: 'pool', label: 'Пул' },
  { value: 'snooker', label: 'Снукер' },
  { value: 'karambol', label: 'Карамболь' },
  { value: 'pyramid', label: 'Пирамида' },
  { value: 'china_8', label: 'Китайская 8' },
] as const;

export type DisciplineValue = (typeof DISCIPLINES)[number]['value'];

export function disciplineLabel(value: string): string {
  return DISCIPLINES.find((d) => d.value === value)?.label || value;
}
