/**
 * Скрипт расширения выемок за пределы панели на 6 мм для БАЗИС-Мебельщик
 * 
 * Назначение: Если в выделенной панели есть выемка, которая касается края панели
 * (одного, двух, трех или всех четырех краев), то выемка расширяется за пределы 
 * панели на 6 мм в сторону каждого касающегося края.
 * 
 * Используемые объекты и методы BAZIS-Script:
 * - panel.Cuts: Список пазов/выемок панели
 * - panel.Cuts[i].CutType: Тип паза (2 = выемка)
 * - panel.Cuts[i].Contour: Контур выемки
 * - panel.GSize.x: Габаритный размер панели по оси X (ширина)
 * - panel.GSize.z: Габаритный размер панели по оси Z (толщина)
 * - NewContour(): Создание нового контура
 * - AddLine(): Добавление линии в контур
 * - panel.Build(): Перестроение геометрии панели
 * - Model.Selected: Выбранный объект в модели
 * 
 * Логика работы:
 * - Проверяет каждую выемку на касание краев панели с точностью 0.1 мм
 * - Если выемка касается левого края (x=0), расширяется влево на 6 мм
 * - Если выемка касается правого края (x=panel.GSize.x), расширяется вправо на 6 мм
 * - Если выемка касается нижнего края (y=0), расширяется вниз на 6 мм
 * - Если выемка касается верхнего края (y=panel.GSize.z), расширяется вверх на 6 мм
 * - Поддерживает касание любого количества краев (1, 2, 3 или 4)
 */

/**
 * Основная функция расширения выемок за пределы панели
 * @param {Object} panel - Объект панели, содержащей выемки для обработки
 */
function ExtendNotchsBeyondPanel(panel) {
    // Проверка выемок на касание краев панели и добавление вылета за пределы
    // Если выемка касается края панели с точностью 0.1, расширяем её на 6 мм ЗА край панели
    // Логика: если выемка касается одного, двух, трех или четырех краев, 
    // она расширяется в сторону каждого касающегося края
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
            
            // Если выемка касается любого края (одного, двух, трех или четырех), 
            // расширяем её в сторону касающихся краев
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
ExtendNotchsBeyondPanel(Model.Selected);

// Сообщение об успешном выполнении
alert('ok');
