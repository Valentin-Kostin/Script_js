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
            var isTouchingMin = (+panel.Cuts[i].Contour.Min.y.toFixed(2) <= 0);
            var isTouchingMax = (+panel.Cuts[i].Contour.Max.y.toFixed(2) >= +panel.GSize.z.toFixed(2));
            
            if (isTouchingMin && !isTouchingMax) {
                // Паз начинается от 0 и не доходит до края: толщина равна Max.y
                panel.Cuts[i].Thickness = panel.Cuts[i].Contour.Max.y;
            } else if (!isTouchingMin && isTouchingMax) {
                // Паз начинается не от 0 и доходит до края: толщина отрицательная (дополнение до края)
                panel.Cuts[i].Thickness = -(panel.GSize.z - panel.Cuts[i].Contour.Min.y);
            } else {
                // Паз сквозной или касается обоих краев: толщина = 0
                panel.Cuts[i].Thickness = 0;
            }
            
            // Если паз касается границы панели, добавляем выступ 6 мм за пределы
            var extension = 0;
            if (isTouchingMin || isTouchingMax) {
                extension = 6;
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
                var startX1 = traj_pos1.p1.x;
                var startY1 = traj_pos1.p1.y;
                var startX2 = traj_pos1.p2.x;
                var startY2 = traj_pos1.p2.y;
                var endX1 = traj_pos2.p1.x;
                var endY1 = traj_pos2.p1.y;
                var endX2 = traj_pos2.p2.x;
                var endY2 = traj_pos2.p2.y;
                
                // Если паз касается границы, добавляем выступ 6 мм
                if (extension > 0) {
                    // Вычисляем направление траектории для удлинения
                    var dx = endX1 - startX1;
                    var dy = endY1 - startY1;
                    var length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length > 0) {
                        var unitX = dx / length;
                        var unitY = dy / length;
                        
                        // Удлиняем начало в обратном направлении
                        startX1 -= unitX * extension;
                        startY1 -= unitY * extension;
                        startX2 -= unitX * extension;
                        startY2 -= unitY * extension;
                        
                        // Удлиняем конец в прямом направлении
                        endX1 += unitX * extension;
                        endY1 += unitY * extension;
                        endX2 += unitX * extension;
                        endY2 += unitY * extension;
                    }
                }
                
                panel.Cuts[i].Contour.AddLine(startX1, startY1, startX2, startY2);
                panel.Cuts[i].Contour.AddLine(endX1, endY1, endX2, endY2);
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
}
//***************************************************************************//

// Вызов функции для выбранного объекта модели
CutsToNotchs(Model.Selected);

// Сообщение об успешном выполнении
alert('ok');