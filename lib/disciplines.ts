// Закрытый список дисциплин бильярда — не растущий пользователями справочник
// (в отличие от clubs/coaches), поэтому просто константа, а не таблица.
export const DISCIPLINES = [
  { value: 'pool_8', label: 'Пул 8' },
  { value: 'pool_9', label: 'Пул 9' },
  { value: 'pool_14_1', label: 'Пул 14.1' },
  { value: 'russian_pyramid', label: 'Русская пирамида' },
  { value: 'snooker', label: 'Снукер' },
  { value: 'karambol', label: 'Карамболь' },
] as const;

export type DisciplineValue = (typeof DISCIPLINES)[number]['value'];

export function disciplineLabel(value: string): string {
  return DISCIPLINES.find((d) => d.value === value)?.label || value;
}
