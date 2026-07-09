import Anthropic from '@anthropic-ai/sdk';

// Серверный клиент Claude — только для /api/* маршрутов, ключ не должен
// попасть в браузер. Используется в /api/match-exercise для подбора
// упражнения под зафиксированную ситуацию на столе.
export function getAnthropic() {
  return new Anthropic();
}
