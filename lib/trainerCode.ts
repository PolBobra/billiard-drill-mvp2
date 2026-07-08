// Генератор секретного кода тренера: 6 символов, без визуально похожих
// друг на друга букв/цифр (0/O, 1/I/L, 5/S, 8/B исключены), чтобы ученик
// не путался при вводе. Пространство ~387 млн комбинаций — этого достаточно
// при условии, что реальную защиту от подбора даёт рейтлимит на вводе, а не
// сама длина кода.
const CODE_ALPHABET = '234679ACDEFGHJKMNPQRTUVWXYZ';

export function generateTrainerCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
