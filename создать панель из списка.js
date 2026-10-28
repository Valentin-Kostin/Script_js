/**
 * создать панель из списка.js
 *
 * Скрипт для БАЗИС-Мебельщик (BazisScript).
 * Читает список фанерованных панелей из файла "1933м1 Фанерование.xlsx"
 * и создаёт горизонтальные панели по каждой позиции списка.
 *
 * Столбцы таблицы:
 *   B — Толщина панели, мм
 *   E — Длина панели, мм
 *   F — Ширина панели, мм
 *   G — Количество штук
 * Данные начинаются с строки 6 (строки 1..5 — шапка бланка заказа).
 * Пустые/некорректные строки пропускаются.
 *
 * ВАЖНО: среда BazisScript не умеет читать .xlsx напрямую, поэтому перед
 * запуском скрипта файл нужно сохранить в CSV (разделитель «;», кодировка
 * UTF-8 или ANSI-Windows): Excel → «Сохранить как» → «CSV (разделители -
 * точкой с запятой)» → рядом с этим скриптом положить файл
 * "1933м1 Фанерование.csv". Если CSV не найден, скрипт предложит выбрать
 * любой текстовый/Excel-файл (для Excel запросит пересохранение в CSV).
 *
 * Панели создаются рядами: длина — вдоль оси X, ширина — вдоль оси Z,
 * толщина — по оси Y. Между панелями шаг = размер + отступ (Gap).
 */

// ==== НАСТРОЙКИ =====================================================================
var FileName = '1933м1 Фанерование.csv'; // ожидаемый CSV рядом со скриптом
var FirstDataRow = 6;                    // номер первой строки с данными (нумерация Excel, 1-based)
var ColThickness = 2;                    // столбец B — толщина
var ColLength = 5;                       // столбец E — длина
var ColWidth = 6;                        // столбец F — ширина
var ColQty = 7;                          // столбец G — количество
var Gap = 100;                           // отступ между панелями при раскладке, мм
var MaxPerRow = 5;                       // максимум панелей в одном ряду (дальше — новый ряд)
var PanelName = 'фанерованная';          // имя создаваемых панелей
// ====================================================================================

// Проверка наличия подготовленного CSV; если его нет — предлагаем выбрать файл
if (!fileExists(FileName)) {
    var msg = 'Файл "' + FileName + '" не найден рядом со скриптом.\n\n' +
              'Среда BazisScript не читает .xlsx напрямую.\n' +
              'Пожалуйста, пересохраните "1933м1 Фанерование.xlsx" в CSV\n' +
              '(разделитель «;», кодировка UTF-8), либо выберите файл вручную.';
    if (!confirm(msg)) {
        alert('Скрипт остановлен.');
        throw '';
    }
    FileName = askReadTextFile('csv;txt');
    if (!FileName) {
        alert('Файл не выбран. Скрипт остановлен.');
        throw '';
    }
}

// ---- Чтение и разбор текста ---------------------------------------------------------
var text = readTextFile(FileName);
if (text === undefined || text === null || text == '') {
    alert('Не удалось прочитать файл: ' + FileName);
    throw '';
}

// Удаляем BOM и нормализуем переводы строк
text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
var lines = text.split('\n');

// Определение разделителя (по первой непустой строке с данным)
var delim = ';';
for (var d = 0; d < lines.length; ++d) {
    if (lines[d].indexOf(';') >= 0) { delim = ';'; break; }
    if (lines[d].indexOf('\t') >= 0) { delim = '\t'; break; }
    if (lines[d].indexOf(',') >= 0) { delim = ','; break; }
}

// Кандидат на десятичную точку: если в тексте много «,» внутри чисел вида 1,5 —
// считаем запятую десятичным разделителем (аккуратно: при delim == ',' это маловероятно)
var decimalComma = false;
if (delim != ',') {
    decimalComma = /[\d],[\d]/.test(text);
}

// Разбор числового значения ячейки ("9,2" / "9.2" / " 600 ") -> Number или NaN
function ParseNum(s) {
    if (s === undefined || s === null) return NaN;
    s = ('' + s).trim().replace(/["']/g, '');
    if (decimalComma) s = s.replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? NaN : n;
}

// Разбор строки CSV с учётом кавычек -> массив полей
function SplitCSVLine(line, dl) {
    var res = [];
    var cur = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; ++i) {
        var ch = line.charAt(i);
        if (inQuotes) {
            if (ch == '"') {
                if (i + 1 < line.length && line.charAt(i + 1) == '"') { cur += '"'; ++i; }
                else inQuotes = false;
            } else cur += ch;
        } else {
            if (ch == '"') inQuotes = true;
            else if (ch == dl) { res.push(cur); cur = ''; }
            else cur += ch;
        }
    }
    res.push(cur);
    return res;
}

// ---- Сбор позиций ------------------------------------------------------------------
var items = []; // {thickness, length, width, qty, row}
var skipped = [];
for (var r = FirstDataRow - 1; r < lines.length; ++r) {
    var line = lines[r];
    if (!line.trim()) continue;
    var cells = SplitCSVLine(line, delim);
    var thickness = ParseNum(cells[ColThickness - 1]);
    var length    = ParseNum(cells[ColLength - 1]);
    var width     = ParseNum(cells[ColWidth - 1]);
    var qty       = ParseNum(cells[ColQty - 1]);

    // Строка должна содержать все четыре числа — иначе пропускаем
    // (это отсекает строки шапки, итоговую M-строку и строки вида
    //  «Фасады с ручкой J в массиве», где вместо размеров текст)
    if (isNaN(thickness) || isNaN(length) || isNaN(width) || isNaN(qty)) {
        skipped.push(r + 1);
        continue;
    }
    if (thickness <= 0 || length <= 0 || width <= 0 || qty <= 0) {
        skipped.push(r + 1);
        continue;
    }
    items.push({
        thickness: thickness,
        length: Math.round(length * 100) / 100,
        width: Math.round(width * 100) / 100,
        qty: Math.floor(qty + 0.5),
        row: r + 1
    });
}

if (items.length == 0) {
    alert('В файле не найдено ни одной корректной позиции.\n' +
          'Проверьте, что данные находятся со строки ' + FirstDataRow +
          ' и в столбцах B/E/F/G стоят числа.');
    throw '';
}

// Предпросмотр списка перед созданием
var preview = '';
var totalCount = 0;
for (var p = 0; p < items.length; ++p) {
    totalCount += items[p].qty;
    preview += 'Стр.' + items[p].row + ':  ' + items[p].length + ' x ' + items[p].width +
               ' x ' + items[p].thickness + ' мм  — ' + items[p].qty + ' шт\n';
}
preview += '\nИтого панелей: ' + totalCount;
if (skipped.length) preview += '\nПропущено строк (без полных данных): ' + skipped.join(', ');
if (!confirm('Создать панели по списку?\n\n' + preview)) {
    alert('Скрипт остановлен пользователем.');
    throw '';
}

// ---- Создание панелей (донор кода: "Панель по 3 точкам.js") ------------------------
var origin = new Vector(0, 0, 0);
var xAxis = new Vector(1, 0, 0);
var zAxis = new Vector(0, 0, 1);

var cursorX = 0;   // текущая позиция по длине (ось X)
var rowZ = 0;      // текущий ряд по ширине (ось Z)
var rowMaxW = 0;   // максимальная ширина в текущем ряду
var inRow = 0;     // счётчик панелей в ряду
var created = 0;

for (var i = 0; i < items.length; ++i) {
    var it = items[i];
    for (var q = 0; q < it.qty; ++q) {
        // Горизонтальная панель: rectangle (x1,z1)-(x2,z2) на высоте y=0
        var panel = AddHorizPanel(cursorX, rowZ, cursorX + it.length, rowZ + it.width, 0);

        // Ориентация: плоскость панели — XZ, нормаль — вверх (как в "Панель по 3 точкам.js")
        panel.Orient(zAxis, xAxis);
        panel.Position = origin;

        // Прямой прямоугольный контур Length x Width (заполняем явно, по образцу донора)
        panel.Contour.Clear();
        panel.Contour.AddLine(0, 0, it.length, 0);
        panel.Contour.AddLine(it.length, 0, it.length, it.width);
        panel.Contour.AddLine(it.length, it.width, 0, it.width);
        panel.Contour.AddLine(0, it.width, 0, 0);

        // Толщина из столбца B
        panel.Thickness = it.thickness;
        panel.Name = PanelName;
        panel.Build();

        created++;

        // Продвигаемся вдоль ряда
        cursorX += it.length + Gap;
        rowMaxW = Math.max(rowMaxW, it.width);
        inRow++;
        if (inRow >= MaxPerRow) {
            // Начинаем новый ряд
            cursorX = 0;
            rowZ += rowMaxW + Gap;
            rowMaxW = 0;
            inRow = 0;
        }
    }
}

Action.Commit();
alert('Готово! Создано панелей: ' + created + ' из ' + items.length + ' позиций списка.');
