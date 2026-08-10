/**
 * Скрипт преобразования пазов в выемки для БАЗИС-Мебельщик
 * 
 * Назначение: Автоматическое преобразование пазов (вырезов) панели в выемки.
 * Изменяет тип существующих вырезов с обычных пазов на выемки, корректируя их геометрию и параметры.
 * 
 * Используемые объекты и методы BAZIS-Script:
 * - panel.Cuts: Список пазов панели
 * - panel.Cuts[i].CutType: Тип паза (2 = выемка)
 * - panel.Cuts[i].Trajectory: Траектория паза
 * - panel.Cuts[i].Contour: Контур паза
 * - panel.GSize.z: Габаритный размер панели по оси Z
 * - NewContour(): Создание нового контура
 * - AddEquidistant(): Построение эквидистанты (параллельного контура)
 * - AddLine(): Добавление линии в контур
 * - panel.Build(): Перестроение геометрии панели
 * - Model.Selected: Выбранный объект в модели
 * 
 * Применение:
 * - Массовое преобразование пазов в выемки
 * - Автоматизация обработки типовых элементов мебели
 * - Корректировка геометрии вырезов под технологические требования
 * 
 * Особенности реализации:
 * - Обработка идёт в обратном порядке циклов для корректной работы с индексами при изменении коллекции
 * - Используется точное сравнение координат с округлением до 2 знаков (toFixed(2))
 * - Поддерживает только линейную геометрию (линии)
 */

/**
 * Основная функция преобразования пазов в выемки
 * @param {Object} panel - Объект панели, содержащей пазы для обработки
 */
function CutsToNotchs(panel) {
    // Цикл обработки пазов в обратном порядке (от последнего к первому)
    // Обратный порядок необходим для корректной работы с индексами при изменении коллекции
    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        // Обрабатываем только пазы с типом != 2 (то есть не выемки)
        if (panel.Cuts[i].CutType != 2) {
            // Создание вспомогательных контуров для построения геометрии выемки
            // Создаётся 4 новых контура для формирования параллельных траекторий
            var traj1_1 = NewContour();
            var traj1_2 = NewContour();
            var traj2_1 = NewContour();
            var traj2_2 = NewContour();
            var traj_pos1 = undefined;
            var traj_pos2 = undefined;
            
            // Построение эквидистантных траекторий (параллельных контуров)
            // Смещение производится на значения Min.x и Max.x из контура паза
            traj1_1.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Min.x, false, false);
            traj1_2.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Max.x, false, false);
            traj2_1.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Min.x, false, false);
            traj2_2.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Max.x, false, false);
            
            // Определение толщины выемки в зависимости от положения паза относительно габаритов панели
            // Анализируется положение паза относительно panel.GSize.z
            if ((+panel.Cuts[i].Contour.Min.y.toFixed(2) <= 0) && (+panel.Cuts[i].Contour.Max.y.toFixed(2) < +panel.GSize.z.toFixed(2))) {
                // Паз начинается от 0 и не доходит до края: толщина равна Max.y
                panel.Cuts[i].Thickness = panel.Cuts[i].Contour.Max.y;
            } else if ((+panel.Cuts[i].Contour.Min.y.toFixed(2) > 0) && (+panel.Cuts[i].Contour.Max.y.toFixed(2) >= +panel.GSize.z.toFixed(2))) {
                // Паз начинается не от 0 и доходит до края: толщина отрицательная (дополнение до края)
                panel.Cuts[i].Thickness = -(panel.GSize.z - panel.Cuts[i].Contour.Min.y);
            } else {
                // Паз сквозной: толщина = 0
                panel.Cuts[i].Thickness = 0;
            }
            
            // Очистка старого контура паза перед формированием нового
            panel.Cuts[i].Contour.Clear();
            
            // Формирование нового контура выемки
            // Проход по всем объектам траектории и добавление их в новый контур
            // Обрабатываются только линии (дуги и окружности исключены)
            for (var t = 0; t < traj1_1.Count; ++t) {
                // Обработка линий (T2DLine)
                if (traj1_1.Objects[t] == '[object T2DLine]') {
                    // Добавление параллельных линий с обеих сторон
                    panel.Cuts[i].Contour.AddLine(traj1_1.Objects[t].Pos1, traj1_1.Objects[t].Pos2);
                    panel.Cuts[i].Contour.AddLine(traj1_2.Objects[t].Pos1, traj1_2.Objects[t].Pos2);
                    // Сохранение начальной позиции для замыкания контура
                    if (!traj_pos1) {
                        traj_pos1 = {
                            p1: traj1_1.Objects[t].Pos1,
                            p2: traj1_2.Objects[t].Pos1
                        };
                    }
                    // Сохранение конечной позиции для замыкания контура
                    traj_pos2 = {
                        p1: traj1_1.Objects[t].Pos2,
                        p2: traj1_2.Objects[t].Pos2
                    };
                }
            }
            
            // Замыкание контура выемки
            // Добавление соединительных линий между начальной и конечной точками параллельных траекторий
            if ((traj_pos1) && (traj_pos2)) {
                panel.Cuts[i].Contour.AddLine(traj_pos1.p1.x, traj_pos1.p1.y, traj_pos1.p2.x, traj_pos1.p2.y, );
                panel.Cuts[i].Contour.AddLine(traj_pos2.p1.x, traj_pos2.p1.y, traj_pos2.p2.x, traj_pos2.p2.y, );
            }
            
            // Финализация выемки
            // Установка типа паза в 2 (выемка)
            panel.Cuts[i].CutType = 2;
            // Очистка старой траектории
            panel.Cuts[i].Trajectory.Clear();
            // Присваивание имени и метки 'выемка'
            panel.Cuts[i].Name = 'выемка';
            panel.Cuts[i].Sign = 'выемка';
            // Удаление старых параметров
            panel.Cuts[i].DeleteParams();
            // Перестроение геометрии панели
            panel.Build();
        }
    }
    
    // Проверка выемок на касание краев панели и добавление вылета за пределы
    // Если выемка касается края панели с точностью 0.1, расширяем её на 6 мм ЗА край панели
    // Логика: если выемка касается одного, двух или трех краев, она расширяется в сторону каждого касающегося края
    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        if (panel.Cuts[i].CutType == 2) { // Проверяем только выемки
            var cut = panel.Cuts[i];
            var tolerance = 0.1;
            var extendLength = 6.0;
            var extendLeft = false;
            var extendRight = false;
            var extendBottom = false;
            var extendTop = false;
            
            // Получаем габариты контура выемки
            var minX = +cut.Contour.Min.x.toFixed(2);
            var maxX = +cut.Contour.Max.x.toFixed(2);
            var minY = +cut.Contour.Min.y.toFixed(2);
            var maxY = +cut.Contour.Max.y.toFixed(2);
            
            // Габариты панели
            var panelWidth = +panel.GSize.x.toFixed(2);
            var panelThickness = +panel.GSize.z.toFixed(2);
            
            // Проверяем касание левого края (x = 0)
            if (Math.abs(minX - 0) < tolerance) {
                extendLeft = true;
            }
            // Проверяем касание правого края (x = panel.GSize.x)
            if (Math.abs(maxX - panelWidth) < tolerance) {
                extendRight = true;
            }
            // Проверяем касание нижнего края (y = 0)
            if (Math.abs(minY - 0) < tolerance) {
                extendBottom = true;
            }
            // Проверяем касание верхнего края (y = panel.GSize.z)
            if (Math.abs(maxY - panelThickness) < tolerance) {
                extendTop = true;
            }
            
            // Если выемка касается любого края (одного, двух или трех), расширяем её в сторону касающихся краев
            if (extendLeft || extendRight || extendBottom || extendTop) {
                var newContour = NewContour();
                // Расширяем контур только в стороны касающихся краев
                var extendedMinX = extendLeft ? minX - extendLength : minX;
                var extendedMaxX = extendRight ? maxX + extendLength : maxX;
                var extendedMinY = extendBottom ? minY - extendLength : minY;
                var extendedMaxY = extendTop ? maxY + extendLength : maxY;
                
                // Строим новый расширенный контур (прямоугольник)
                newContour.AddLine(extendedMinX, extendedMinY, extendedMaxX, extendedMinY);
                newContour.AddLine(extendedMaxX, extendedMinY, extendedMaxX, extendedMaxY);
                newContour.AddLine(extendedMaxX, extendedMaxY, extendedMinX, extendedMaxY);
                newContour.AddLine(extendedMinX, extendedMaxY, extendedMinX, extendedMinY);
                
                // Заменяем контур выемки на расширенный
                cut.Contour.Clear();
                for (var t = 0; t < newContour.Count; ++t) {
                    if (newContour.Objects[t] == '[object T2DLine]') {
                        cut.Contour.AddLine(newContour.Objects[t].Pos1, newContour.Objects[t].Pos2);
                    }
                }
                
                // Обновляем траекторию и перестраиваем панель
                cut.Trajectory.Clear();
                panel.Build();
            }
        }
    }
}
//***************************************************************************//

// Вызов функции для выбранного объекта модели
CutsToNotchs(Model.Selected);

// Сообщение об успешном выполнении
alert('ok');