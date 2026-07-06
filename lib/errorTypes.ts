export const ERROR_TYPES = [
  { value: 'недокрут', label: 'Недорез' },
  { value: 'перекрут', label: 'Перерез' },
  { value: 'слабый_удар', label: 'Слабо' },
  { value: 'сильный_удар', label: 'Сильно' },
  { value: 'винт', label: 'Ошибка из-за винта' },
  { value: 'плохой_выход', label: 'Плохой выход' },
  { value: 'ошибка_позиции', label: 'Ошибка позиции' },
];

export function errorLabel(value: string) {
  return ERROR_TYPES.find((t) => t.value === value)?.label ?? value;
}
