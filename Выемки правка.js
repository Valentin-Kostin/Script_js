/**
 * Скрипт "Выемки правка.js" для БАЗИС-Мебельщик
 * 
 * Назначение: Обработка нескольких выбранных панелей.
 * Для каждой панели последовательно применяются:
 * 1. Преобразование пазов в выемки (логика из "паз в выемку 0.js")
 * 2. Расширение выемок на 6 мм при касании краёв панели (логика из "выемка +6мм.js")
 * 
 * Применение:
 * - Выделите несколько панелей в модели
 * - Запустите скрипт
 * - Все пазы в выбранных панелях будут преобразованы в выемки и расширены при необходимости
 */

/**
 * Функция преобразования пазов в выемки
 * @param {Object} panel - Объект панели, содержащей пазы для обработки
 */
function CutsToNotchs(panel) {
    // Цикл обработки пазов в обратном порядке (от последнего к первому)
    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        // Обрабатываем только пазы с типом != 2 (то есть не выемки)
        if (panel.Cuts[i].CutType != 2) {
            // Создание вспомогательных контуров для построения геометрии выемки
            var traj1_1 = NewContour();
            var traj1_2 = NewContour();
            var traj2_1 = NewContour();
            var traj2_2 = NewContour();
            var traj_pos1 = undefined;
            var traj_pos2 = undefined;
            
            // Построение эквидистантных траекторий (параллельных контуров)
            traj1_1.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Min.x, false, false);
            traj1_2.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Max.x, false, false);
            traj2_1.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Min.x, false, false);
            traj2_2.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Max.x, false, false);
            
            // Определение толщины выемки в зависимости от положения паза относительно габаритов панели
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
            if ((traj_pos1) && (traj_pos2)) {
                panel.Cuts[i].Contour.AddLine(traj_pos1.p1.x, traj_pos1.p1.y, traj_pos1.p2.x, traj_pos1.p2.y);
                panel.Cuts[i].Contour.AddLine(traj_pos2.p1.x, traj_pos2.p1.y, traj_pos2.p2.x, traj_pos2.p2.y);
            }
            
            // Финализация выемки
            panel.Cuts[i].CutType = 2;
            panel.Cuts[i].Trajectory.Clear();
            panel.Cuts[i].Name = 'выемка';
            panel.Cuts[i].Sign = 'выемка';
            panel.Cuts[i].DeleteParams();
            // Перестроение геометрии панели
            panel.Build();
        }
    }
}

/**
 * Функция расширения выемок на 6 мм при касании краёв панели
 * @param {Object} panel - Объект панели, содержащей выемки для обработки
 */
function ExtendNotchs(panel) {
    // Находим актуальные координаты панели
    var shirina_P_Min = panel.GMin.x;
    var shirina_P_Max = panel.GMax.x;
    var dlina_P_Min = panel.GMin.y;
    var dlina_P_Max = panel.GMax.y;
    
    // Считаем и выводим выемки, а также расширяем их за пределы панели
    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        if (panel.Cuts[i].CutType == 2) { // Проверяем только выемки
            var cut = panel.Cuts[i];
            
            // Находим актуальные координаты выемки
            var pocked_Min_x = cut.Contour.Min.x.toFixed(2);
            var pocked_Max_x = cut.Contour.Max.x.toFixed(2);
            var pocked_Min_y = cut.Contour.Min.y.toFixed(2);
            var pocked_Max_y = cut.Contour.Max.y.toFixed(2);
            
            // Допуск для проверки касания края (0.1 мм)
            var tolerance = 0.1;
            var extendDist = 6.0; // Расстояние расширения в мм
            var extendLeft = false;
            var extendRight = false;
            var extendBottom = false;
            var extendTop = false;
            
            // Проверяем касание левого края (x = 0)
            if (Math.abs(pocked_Min_x - shirina_P_Min) < tolerance) {
                extendLeft = true;
            }
            // Проверяем касание правого края (x = panel.GSize.x)
            else if (Math.abs(pocked_Max_x - shirina_P_Max) < tolerance) {
                extendRight = true;
            }
            // Проверяем касание нижнего края (y = 0)
            else if (Math.abs(pocked_Min_y - dlina_P_Min) < tolerance) {
                extendBottom = true;
            }
            // Проверяем касание верхнего края (y = panel.GSize.z)
            if (Math.abs(pocked_Max_y - dlina_P_Max) < tolerance) {
                extendTop = true;
            }
            
            // Если выемка касается любого края, расширяем её в сторону касающихся краев
            if (extendLeft || extendRight || extendBottom || extendTop) {
                var newContour = NewContour();
                
                // Проходим по всем объектам исходного контура и расширяем их
                for (var t = 0; t < cut.Contour.Count; ++t) {
                    var obj = cut.Contour.Objects[t];
                    
                    if (obj == '[object T2DLine]') {
                        var x1 = obj.Pos1.x;
                        var y1 = obj.Pos1.y;
                        var x2 = obj.Pos2.x;
                        var y2 = obj.Pos2.y;
                        
                        // --- Обработка точки 1 (Pos1) ---
                        var isP1OnLeft = (Math.abs(x1 - shirina_P_Min) < tolerance);
                        var isP1OnRight = (Math.abs(x1 - shirina_P_Max) < tolerance);
                        var isP1OnBottom = (Math.abs(y1 - dlina_P_Min) < tolerance);
                        var isP1OnTop = (Math.abs(y1 - dlina_P_Max) < tolerance);
                        
                        if (isP1OnLeft && extendLeft) { x1 -= extendDist; }
                        if (isP1OnRight && extendRight) { x1 += extendDist; }
                        if (isP1OnBottom && extendBottom) { y1 -= extendDist; }
                        if (isP1OnTop && extendTop) { y1 += extendDist; }
                        
                        // --- Обработка точки 2 (Pos2) ---
                        var isP2OnLeft = (Math.abs(x2 - shirina_P_Min) < tolerance);
                        var isP2OnRight = (Math.abs(x2 - shirina_P_Max) < tolerance);
                        var isP2OnBottom = (Math.abs(y2 - dlina_P_Min) < tolerance);
                        var isP2OnTop = (Math.abs(y2 - dlina_P_Max) < tolerance);
                        
                        if (isP2OnLeft && extendLeft) { x2 -= extendDist; }
                        if (isP2OnRight && extendRight) { x2 += extendDist; }
                        if (isP2OnBottom && extendBottom) { y2 -= extendDist; }
                        if (isP2OnTop && extendTop) { y2 += extendDist; }
                        
                        // Добавляем измененную линию в новый контур
                        newContour.AddLine(x1, y1, x2, y2);
                    }
                    // Дуги и окружности игнорируются — скрипт работает только с линейными сегментами
                }
                
                // Заменяем контур выемки на расширенный
                cut.Contour.Clear();
                for (var t = 0; t < newContour.Count; ++t) {
                    if (newContour.Objects[t] == '[object T2DLine]') {
                        cut.Contour.AddLine(newContour.Objects[t].Pos1, newContour.Objects[t].Pos2);
                    }
                }
                
                // Перестраиваем панель (траектория пересчитается автоматически)
                panel.Build();
            }
        }
    }
}

/**
 * Основная функция обработки выбранных панелей
 */
function ProcessSelectedPanels() {
    // Получаем коллекцию выбранных объектов
    var selectedObjects = Model.Selected;
    
    // Проверяем, что что-то выбрано
    if (!selectedObjects) {
        alert("Ошибка: Не выбраны панели!");
        return;
    }
    
    // Обработка случая, когда выбрана одна панель (не коллекция)
    if (!(selectedObjects instanceof Array) && selectedObjects.ClassName === "TBasePanel") {
        CutsToNotchs(selectedObjects);
        ExtendNotchs(selectedObjects);
        alert("Обработка завершена успешно!");
        return;
    }
    
    // Если выбрана коллекция объектов, обрабатываем каждую панель
    var panelCount = 0;
    for (var i = 0; i < selectedObjects.Count; i++) {
        var obj = selectedObjects.Item(i);
        
        // Проверяем, что объект является панелью
        if (obj && obj.ClassName === "TBasePanel") {
            // Применяем сначала преобразование пазов в выемки
            CutsToNotchs(obj);
            // Затем применяем расширение выемок
            ExtendNotchs(obj);
            panelCount++;
        }
    }
    
    if (panelCount > 0) {
        alert("Обработано панелей: " + panelCount + "\nОбработка завершена успешно!");
    } else {
        alert("В выделении нет панелей!");
    }
}

// Запуск основной функции
ProcessSelectedPanels();
