/**
 * создать панель из списка.js
 *
 * Скрипт для БАЗИС-Мебельщик (BazisScript).
 * Читает список фанерованных панелей ТОЛЬКО из текстового файла .txt
 * (например "1933м1 Фанерование.txt" — «БЛАНК ЗАКАЗА ФАНЕРОВАНЫХ ПАНЕЛЕЙ»)
 * и создаёт горизонтальные панели по каждой позиции списка.
 *
 * ТОЛЩИНА ПАНЕЛИ берётся из столбца «Основа» (МДФ/ДСП): 8, 12, 16, 18, 22 мм.
 * Столбец «Толщина» (готовая панель со шпоном: 9,2 / 13,2 / 17,2 / 19,2 / 23,2)
 * НЕ используется.
 *
 * Формат .txt: поля разделены табуляцией, строки — CRLF; часть полей заключена
 * в кавычки и содержит переносы строк («Шпонир. МДФ 9.2 мм - Дуб\nЕвропейский,
 * тангенциальный»), поэтому файл разбивается на записи с учётом кавычек.
 * Кодировка определяется автоматически: UTF-16LE/BE или ANSI (Windows-1251).
 *
 * Столбцы бланка (нумерация с 0):
 *   0 — примечание («текстура под углом 45град.», «Подбор»)
 *   1 — ОСНОВА, мм            <-- толщина создаваемой панели
 *   2 — готовая толщина, мм   (не используется)
 *   3 — шпон стороны «А»
 *   4 — Длина (направление волокон шпона), мм
 *   5 — Ширина, мм
 *   6 — Количество штук
 *   7 — Количество фанерованных сторон (1 или 2)
 *   8 — М²
 *   9 — сторона «В» (чистовой/черновой шпон)
 * Номера столбцов дополнительно уточняются по строке заголовков.
 *
 * Строки шапки, итоговая строка и позиции без числовых размеров
 * («Фасады с ручкой J в массиве») пропускаются.
 *
 * Панели создаются рядами: длина — вдоль оси X, ширина — вдоль оси Z,
 * толщина — по оси Y. Между панелями шаг = размер + отступ (Gap).
 */

// ==== НАСТРОЙКИ =====================================================================
var FileName    = '1933м1 Фанерование.txt';    // ожидаемый .txt рядом со скриптом
var ColBase     = 1;   // столбец «Основа» — толщина панели, мм (8, 12, 16, 18, 22)
var ColLength   = 4;   // столбец «Длина (направление волокон шпона)», мм
var ColWidth    = 5;   // столбец «Ширина», мм
var ColQty      = 6;   // столбец «Количество штук»
var AllowedBase = [8, 10, 12, 16, 18, 19, 22]; // допустимые толщины основы, мм
var Gap         = 100; // отступ между панелями при раскладке, мм
var MaxPerRow   = 5;   // максимум панелей в одном ряду (дальше — новый ряд)
var PanelName   = 'фанерованная';              // имя создаваемых панелей
// ====================================================================================

// ---- Выбор файла -------------------------------------------------------------------
if (!fileExists(FileName)) {
    var msg = 'Файл "' + FileName + '" не найден рядом со скриптом.\n\n' +
              'Скрипт читает только текстовые файлы .txt\n' +
              '(выгрузку бланка заказа «... Фанерование.txt»).\n' +
              'Выберите файл .txt вручную.';
    if (!confirm(msg)) {
        alert('Скрипт остановлен.');
        throw '';
    }
    FileName = askReadTextFile('txt');
    if (!FileName) {
        alert('Файл не выбран. Скрипт остановлен.');
        throw '';
    }
}

// ---- Чтение файла и определение кодировки ------------------------------------------
// readTextFile может вернуть содержимое либо уже как Unicode-текст, либо «как есть»
// побайтово (каждый байт — символ с кодом 0..255). Во втором случае текст нужно
// декодировать: UTF-8, UTF-16LE/BE или Windows-1251 (ANSI).
function IsCyrCode(c) {
    return (c >= 0x0410 && c <= 0x044F) || c == 0x0401 || c == 0x0451;
}

function CountCyr(s) {
    var n = 0;
    for (var i = 0; i < s.length; ++i) if (IsCyrCode(s.charCodeAt(i))) ++n;
    return n;
}

// Число «плохих» символов (управляющие, кроме табуляции/CR/LF)
function BadCount(s) {
    var n = 0;
    for (var i = 0; i < s.length; ++i) {
        var c = s.charCodeAt(i);
        if (c == 9 || c == 10 || c == 13) continue;
        if (c < 32) ++n;
    }
    return n;
}

// Побайтовое декодирование строки в UTF-16 (littleEndian — порядок FF FE)
function DecodeUtf16(str, littleEndian, from) {
    var s = '';
    for (var i = from; i + 1 < str.length; i += 2) {
        var b0 = str.charCodeAt(i);
        var b1 = str.charCodeAt(i + 1);
        s += String.fromCharCode(littleEndian ? (b0 | (b1 << 8)) : ((b0 << 8) | b1));
    }
    return s;
}

// Байты 0xC0..0xFF -> кириллица Windows-1251, прочие — по таблице
function Cp1251Char(code) {
    if (code >= 0xE0) return code + 0x400 - 0x20; // 0xE0..0xFF -> а..я
    if (code >= 0xC0) return code + 0x400 - 0x40; // 0xC0..0xDF -> А..Я
    switch (code) {
        case 0xA8: return 0x0401; case 0xB8: return 0x0451; // Ё ё
        case 0x80: return 0x0402; case 0x90: return 0x0452;
        case 0x81: return 0x0403; case 0x83: return 0x0453;
        case 0x8A: return 0x0409; case 0x9A: return 0x0459;
        case 0x8C: return 0x040A; case 0x9C: return 0x045A;
        case 0x8E: return 0x040B; case 0x9E: return 0x045B;
        case 0x88: return 0x0408; case 0x98: return 0x0458;
        case 0x85: return 0x2026; case 0x93: return 0x201C;
        case 0x94: return 0x201D; case 0x91: return 0x2018;
        case 0x92: return 0x2019; case 0x96: return 0x2013;
        case 0x97: return 0x2014; case 0x95: return 0x2022;
        default:   return code;
    }
}

function DecodeCp1251(str) {
    var s = '';
    for (var i = 0; i < str.length; ++i) s += String.fromCharCode(Cp1251Char(str.charCodeAt(i)));
    return s;
}

// Побайтовое декодирование UTF-8 (2..4 байта); неверные последовательности -> '?'
function DecodeUtf8(str) {
    var s = '';
    var i = 0;
    while (i < str.length) {
        var b = str.charCodeAt(i);
        if (b < 0x80) { s += String.fromCharCode(b); ++i; continue; }
        var need = 0, cp = 0;
        if ((b & 0xE0) == 0xC0) { need = 1; cp = b & 0x1F; }
        else if ((b & 0xF0) == 0xE0) { need = 2; cp = b & 0x0F; }
        else if ((b & 0xF8) == 0xF0) { need = 3; cp = b & 0x07; }
        else { s += '?'; ++i; continue; }
        var ok = true, c = cp;
        for (var k = 1; k <= need; ++k) {
            if (i + k >= str.length) { ok = false; break; }
            var bk = str.charCodeAt(i + k);
            if ((bk & 0xC0) != 0x80) { ok = false; break; }
            c = (c << 6) | (bk & 0x3F);
        }
        if (!ok) { s += '?'; ++i; continue; }
        s += String.fromCharCode(c);
        i += need + 1;
    }
    return s;
}

var raw = readTextFile(FileName);
if (raw === undefined || raw === null || '' + raw == '') {
    alert('Не удалось прочитать файл: ' + FileName);
    throw '';
}

var text = '' + raw;

// Если есть символы с кодом > 0xFF — Bazis уже декодировал файл, трогать не нужно
var hasWide = false;
for (var ci = 0; ci < text.length; ++ci) {
    if (text.charCodeAt(ci) > 0xFF) { hasWide = true; break; }
}

if (!hasWide && text.length > 0) {
    // Содержимое получено побайтово — подбираем кодировку
    var b0 = text.charCodeAt(0);
    var b1 = text.length > 1 ? text.charCodeAt(1) : 0;
    var candidates;
    if (b0 == 0xFF && b1 == 0xFE)      candidates = [DecodeUtf16(text, true, 2)];   // UTF-16LE BOM
    else if (b0 == 0xFE && b1 == 0xFF) candidates = [DecodeUtf16(text, false, 2)];  // UTF-16BE BOM
    else if (b0 == 0xEF && text.charCodeAt(1) == 0xBB && text.charCodeAt(2) == 0xBF)
                                       candidates = [DecodeUtf8(text.slice(3))];    // UTF-8 BOM
    else {
        candidates = [DecodeCp1251(text)];                                // ANSI (Windows-1251)
        if (text.length % 2 == 0) candidates.push(DecodeUtf16(text, true, 0)); // UTF-16 без BOM
        candidates.push(DecodeUtf8(text));                                // UTF-8 без BOM
    }
    var best = text, bestScore = -1;
    for (var v = 0; v < candidates.length; ++v) {
        // Кириллица даёт очки, управляющие символы — штрафы
        var score = 3 * CountCyr(candidates[v]) - 5 * BadCount(candidates[v]);
        if (score > bestScore) { bestScore = score; best = candidates[v]; }
    }
    text = best;
}

text = text.replace(/^\uFEFF/, '');

// ---- Разбор записей бланка ---------------------------------------------------------
// Одна запись может занимать несколько физических строк, если поле в кавычках
// содержит перенос строки. Поэтому конец записи определяется переводом строки,
// находящимся ВНЕ кавычек.
function SplitRecords(t) {
    var recs = [];
    var cur = '';
    var i = 0;
    while (i < t.length) {
        var ch = t.charAt(i);
        // начало цитируемого поля: кавычка в начале строки или сразу после табуляции
        if (ch == '"' && (cur.length == 0 || cur.charAt(cur.length - 1) == '\t')) {
            var j = i + 1;
            var field = '"';
            while (j < t.length) {
                var cj = t.charAt(j);
                if (cj == '"') {
                    if (j + 1 < t.length && t.charAt(j + 1) == '"') { field += '""'; j += 2; continue; }
                    field += '"'; ++j; break;
                }
                field += cj; ++j;
            }
            cur += field;
            i = j;
            continue;
        }
        if (ch == '\r' || ch == '\n') {
            if (ch == '\r' && i + 1 < t.length && t.charAt(i + 1) == '\n') ++i;
            recs.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
        ++i;
    }
    if (cur.length) recs.push(cur);
    return recs;
}

// Разбор записи на поля (разделитель — табуляция; учитываются кавычки и "")
function SplitFields(rec) {
    var res = [];
    var cur = '';
    var inQ = false;
    for (var i = 0; i < rec.length; ++i) {
        var ch = rec.charAt(i);
        if (inQ) {
            if (ch == '"') {
                if (i + 1 < rec.length && rec.charAt(i + 1) == '"') { cur += '"'; ++i; }
                else inQ = false;
            } else cur += ch;
        } else {
            if (ch == '"') inQ = true;
            else if (ch == '\t') { res.push(cur); cur = ''; }
            else cur += ch;
        }
    }
    res.push(cur);
    return res;
}

// "9,2" / "9.2" / " 600 " -> Number; текст -> NaN
function ParseNum(s) {
    if (s === undefined || s === null) return NaN;
    s = ('' + s).replace(/["']/g, '').replace(/\s/g, '');
    if (s === '') return NaN;
    if (!/^[-+]?[0-9]*[.,]?[0-9]+$/.test(s)) return NaN;
    return parseFloat(s.replace(',', '.'));
}

function ParseInt(s) {
    var n = ParseNum(s);
    if (isNaN(n)) return NaN;
    return Math.floor(n + 0.5);
}

var records = SplitRecords(text);

// Номера столбцов по строке заголовков (если бланок другой формы)
var idxBase = ColBase, idxLen = ColLength, idxW = ColWidth, idxQty = ColQty;
for (var h = 0; h < Math.min(records.length, 10); ++h) {
    var hf = SplitFields(records[h]);
    var joined = '';
    for (var c0 = 0; c0 < hf.length; ++c0) joined += ' ' + hf[c0].toLowerCase().replace(/\s+/g, ' ');
    if (joined.indexOf('основа') >= 0 && joined.indexOf('толщина') >= 0) {
        for (var c = 0; c < hf.length; ++c) {
            var cell = hf[c].toLowerCase().replace(/\s+/g, ' ');
            if (cell.indexOf('основа') >= 0) idxBase = c;
            else if (cell.indexOf('длина') >= 0) idxLen = c;
            else if (cell.indexOf('ширин') >= 0) idxW = c;
            else if (cell.indexOf('количество штук') >= 0) idxQty = c;
        }
        break;
    }
}

function Field(f, idx) {
    return (idx < f.length) ? f[idx] : '';
}

// ---- Сбор позиций ------------------------------------------------------------------
var items = [];   // {thickness, length, width, qty, sides, note, no}
var skipped = [];

for (var r = 0; r < records.length; ++r) {
    var rec = records[r];
    if (!rec.trim()) continue;
    var f = SplitFields(rec);

    var thickness = ParseNum(Field(f, idxBase));
    var length    = ParseNum(Field(f, idxLen));
    var width     = ParseNum(Field(f, idxW));
    var qty       = ParseInt(Field(f, idxQty));

    // Нужны все четыре числа — иначе это шапка / итог / строка без размеров
    if (isNaN(thickness) || isNaN(length) || isNaN(width) || isNaN(qty)) {
        var txt = String(Field(f, idxLen));
        if (txt.trim() !== '' && !/^(длина|ширина|размер)/i.test(txt.trim())) skipped.push(r + 1);
        continue;
    }
    if (thickness <= 0 || length <= 0 || width <= 0 || qty <= 0) {
        skipped.push(r + 1);
        continue;
    }

    // Толщина = основа; сверяем с типовым рядом (приводим к ближайшему допустимому)
    var okBase = NaN;
    for (var a = 0; a < AllowedBase.length; ++a) {
        if (Math.abs(AllowedBase[a] - thickness) < 0.01) { okBase = AllowedBase[a]; break; }
    }
    if (isNaN(okBase)) {
        skipped.push(r + 1);
        continue;
    }

    items.push({
        thickness: okBase,
        length: Math.round(length * 100) / 100,
        width: Math.round(width * 100) / 100,
        qty: qty,
        sides: ParseInt(Field(f, idxQty + 1)),
        note: String(Field(f, 0)).trim(),
        no: r + 1
    });
}

if (items.length == 0) {
    alert('В файле не найдено ни одной корректной позиции.\n' +
          'Проверьте, что выбран бланк заказа в формате .txt и в столбцах\n' +
          '«Основа», «Длина», «Ширина», «Количество штук» стоят числа.');
    throw '';
}

// ---- Предпросмотр ------------------------------------------------------------------
var preview = '';
var totalCount = 0;
for (var p = 0; p < items.length; ++p) {
    totalCount += items[p].qty;
    preview += '#' + items[p].no + ':  ' + items[p].length + ' x ' + items[p].width +
               ' x ' + items[p].thickness + ' мм  — ' + items[p].qty + ' шт';
    if (items[p].note) preview += '   [' + items[p].note + ']';
    preview += '\n';
}
preview += '\nИтого панелей: ' + totalCount;
if (skipped.length) preview += '\nПропущено записей (без полных данных): ' + skipped.join(', ');
if (!confirm('Создать панели по списку (толщина = основа)?\n\n' + preview)) {
    alert('Скрипт остановлен пользователем.');
    throw '';
}

// ---- Создание панелей --------------------------------------------------------------
// Панель строится как горизонтальная: габаритный прямоугольник (x1,z1)-(x2,z2)
// задаётся уже с учётом раскладки, поэтому дополнительно двигать/переориентировать
// её не нужно. Длина — вдоль оси X, ширина — вдоль оси Z, толщина — по оси Y.
var cursorX = 0;   // текущая позиция по длине (ось X)
var rowZ = 0;      // текущий ряд по ширине (ось Z)
var rowMaxW = 0;   // максимальная ширина в текущем ряду
var inRow = 0;     // счётчик панелей в ряду
var created = 0;

for (var i = 0; i < items.length; ++i) {
    var it = items[i];
    for (var q = 0; q < it.qty; ++q) {
        var panel = AddHorizPanel(cursorX, rowZ, cursorX + it.length, rowZ + it.width, 0);

        // Толщина из столбца «Основа» (8, 12, 16, 18, 22 мм)
        panel.Thickness = it.thickness;
        panel.Name = PanelName;
        panel.Build();

        created++;
        log('Панель ' + it.length + ' x ' + it.width + ' x ' + it.thickness +
            ' мм (' + (q + 1) + '/' + it.qty + ')' + (it.note ? ' [' + it.note + ']' : ''));

        // Продвигаемся вдоль ряда
        cursorX += it.length + Gap;
        rowMaxW = Math.max(rowMaxW, it.width);
        inRow++;
        if (inRow >= MaxPerRow) {
            cursorX = 0;
            rowZ += rowMaxW + Gap;
            rowMaxW = 0;
            inRow = 0;
        }
    }
}

if (created > 0) Action.Commit();
alert('Готово! Создано панелей: ' + created + ' из ' + items.length + ' позиций списка.');
