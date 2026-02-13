/**
 * Парсер форматирования текста в стиле Telegram/WhatsApp.
 *
 * Синтаксис:
 *   *жирный*       → bold
 *   _курсив_       → italic (не срабатывает внутри слов: my_var_name)
 *   ~зачёркнутый~  → strikethrough
 *   `код`          → code (без вложенного форматирования)
 *   ||спойлер||    → spoiler (скрытый текст)
 *
 * Вложенность до 3 уровней. Экранирование: \* \_ \~ \` \|
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type FormatType = 'bold' | 'italic' | 'strikethrough' | 'code' | 'spoiler';

export interface TextNode {
  type: 'text';
  text: string;
}

export interface FormattedNode {
  type: 'formatted';
  formatType: FormatType;
  children: FormattingNode[];
}

export type FormattingNode = TextNode | FormattedNode;

// ─── Escape helpers ─────────────────────────────────────────────────────────

const SENTINEL = '\uFEFF'; // Zero-width no-break space as sentinel

/** Заменяет \* \_ \~ \` \| на sentinel+символ перед парсингом */
export function preProcessEscapes(text: string): string {
  return text.replace(/\\([*_~`|])/g, (_, char) => SENTINEL + char);
}

/** Восстанавливает sentinel+символ обратно в литеральный символ */
export function postProcessEscapes(text: string): string {
  return text.replace(new RegExp(SENTINEL + '([*_~`|])', 'g'), '$1');
}

// ─── Marker definitions ────────────────────────────────────────────────────

interface MarkerDef {
  type: FormatType;
  regex: RegExp;
  /** Содержимое code не парсится рекурсивно */
  terminal: boolean;
}

/**
 * Порядок важен: code и spoiler первыми (multi-char delimiters),
 * затем bold, strikethrough, italic.
 *
 * Italic использует word-boundary чтобы _внутри_слов_ не срабатывало.
 * Sentinel (\uFEFF) исключён из содержимого чтобы escaped markers не ломали парсинг.
 */
function getMarkers(): MarkerDef[] {
  return [
    { type: 'code',          regex: /`([^`\uFEFF]+)`/g,                                terminal: true  },
    { type: 'spoiler',       regex: /\|\|([^|\uFEFF]+)\|\|/g,                           terminal: false },
    { type: 'bold',          regex: /\*([^*\uFEFF]+)\*/g,                                terminal: false },
    { type: 'strikethrough', regex: /~([^~\uFEFF]+)~/g,                                  terminal: false },
    { type: 'italic',        regex: /(?<![a-zA-Z0-9а-яА-ЯёЁ])_([^_\uFEFF]+)_(?![a-zA-Z0-9а-яА-ЯёЁ])/g, terminal: false },
  ];
}

// ─── Parser ─────────────────────────────────────────────────────────────────

const MAX_DEPTH = 3;

/**
 * Рекурсивно парсит текст, возвращая дерево FormattingNode.
 * На каждом уровне пробуем маркеры в порядке приоритета.
 * Первый маркер, у которого есть совпадения, «забирает» весь текст.
 */
export function parseFormatting(input: string, depth: number = 0): FormattingNode[] {
  if (!input) return [];
  if (depth > MAX_DEPTH) return [{ type: 'text', text: input }];

  const markers = getMarkers();

  for (const marker of markers) {
    // Reset regex lastIndex
    marker.regex.lastIndex = 0;

    // Собираем все совпадения
    const matches: { start: number; end: number; inner: string }[] = [];
    let m: RegExpExecArray | null;

    while ((m = marker.regex.exec(input)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        inner: m[1],
      });
    }

    if (matches.length === 0) continue;

    // Убираем пересекающиеся
    const filtered: typeof matches = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start >= lastEnd) {
        filtered.push(match);
        lastEnd = match.end;
      }
    }

    // Строим результат
    const result: FormattingNode[] = [];
    let cursor = 0;

    for (const match of filtered) {
      // Текст перед совпадением — рекурсивно парсим (тот же depth, другие маркеры)
      if (match.start > cursor) {
        const gap = input.slice(cursor, match.start);
        result.push(...parseFormatting(gap, depth));
      }

      // Содержимое совпадения
      const children: FormattingNode[] = marker.terminal
        ? [{ type: 'text', text: match.inner }]
        : parseFormatting(match.inner, depth + 1);

      result.push({
        type: 'formatted',
        formatType: marker.type,
        children,
      });

      cursor = match.end;
    }

    // Текст после последнего совпадения
    if (cursor < input.length) {
      const tail = input.slice(cursor);
      result.push(...parseFormatting(tail, depth));
    }

    return result;
  }

  // Ни один маркер не сработал
  return [{ type: 'text', text: input }];
}

// ─── Strip formatting ───────────────────────────────────────────────────────

/**
 * Убирает маркеры форматирования из текста.
 * Используется для превью в списке чатов, пиннед-баннерах и т.д.
 */
export function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    // Spoiler (двойная палка, обрабатываем первым т.к. multi-char)
    .replace(/\|\|([^|]+)\|\|/g, '$1')
    // Code
    .replace(/`([^`]+)`/g, '$1')
    // Bold
    .replace(/\*([^*]+)\*/g, '$1')
    // Strikethrough
    .replace(/~([^~]+)~/g, '$1')
    // Italic (с word boundary для кириллицы и латиницы)
    .replace(/(?<![a-zA-Z0-9а-яА-ЯёЁ])_([^_]+)_(?![a-zA-Z0-9а-яА-ЯёЁ])/g, '$1')
    // Escaped markers
    .replace(/\\([*_~`|])/g, '$1');
}
