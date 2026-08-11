/**
 * Скрипт отладки: вывод координат панели и выемок для БАЗИС-Мебельщик
 * 
 * Назначение: Выводит на экран координаты выделенной панели, 
 * затем координаты всех выемок в этой панели.
 */

// Получаем выделенную панель
var panel = Model.Selected;

if (!panel) {
    alert("Ошибка: Не выбрана панель!");
} else {
    // Формируем сообщение с координатами панели
    var panelMsg = "Панель:\n";
    //находим актуальные координты панели
    var shirina_P_Min = panel.GMin.x;
    var shirina_P_Max = panel.GMax.x;
    var dlina_P_Min = panel.GMin.y;
    var dlina_P_Max = panel.GMax.y;
    var Tolchina = panel.GSize.z;
    panelMsg += "Ширина (GSize.x): " + panel.GSize.x + " мм\n";
    panelMsg += "Длина (GSize.y): " + panel.GSize.y + " мм\n";
    panelMsg += "Толщина (GSize.z): " + panel.GSize.z + " мм\n";
    panelMsg += "Min X: " + shirina_P_Min + ", Max X: " + shirina_P_Max + "\n";
    panelMsg += "Min Y: " + dlina_P_Min + ", Max Y: " + dlina_P_Max + "\n";
    
    alert(panelMsg);
    
    // Считаем и выводим выемки, а также расширяем их за пределы панели
    var notchCount = 0;
    var pocketMsg = "Выемки:\n";
    
    for (var i = 0; i < panel.Cuts.Count; i++) {
        if (panel.Cuts[i].CutType == 2) { // Проверяем только выемки
            notchCount++;
            var cut = panel.Cuts[i];
            
            pocketMsg += "\nВыемка #" + (i + 1) + ":\n";
            //находим актуальные координаты выемки
            var pocked_Min_x = cut.Contour.Min.x.toFixed(2);
            var pocked_Max_x = cut.Contour.Max.x.toFixed(2);
            var pocked_Min_y = cut.Contour.Min.y.toFixed(2);
            var pocked_Max_y = cut.Contour.Max.y.toFixed(2);

            pocketMsg += "Min X: " + pocked_Min_x + ", Max X: " + pocked_Max_x + "\n";
            pocketMsg += "Min Y: " + pocked_Min_y + ", Max Y: " + pocked_Max_y + "\n";
            
            // Выводим точки контура и выполняем расширение
            pocketMsg += "Точки контура:\n";
            
            // Допуск для проверки касания края (0.1 мм)
            var tolerance = 0.1;
            var extendDist = 6.0; // Расстояние расширения в мм
            
            // Флаги для отслеживания изменений
            var modified = false;
            
            for (var t = 0; t < cut.Contour.Count; t++) {
                var obj = cut.Contour.Objects[t];
                if (obj == '[object T2DLine]') {
                    var x1 = obj.Pos1.x;
                    var y1 = obj.Pos1.y;
                    var x2 = obj.Pos2.x;
                    var y2 = obj.Pos2.y;
                    
                    pocketMsg += "  Линия: (" + x1.toFixed(2) + ", " + y1.toFixed(2) + ") -> (" + 
                                  x2.toFixed(2) + ", " + y2.toFixed(2) + ")";
                    
                    // Проверяем, лежит ли сегмент на границе панели
                    // Границы панели
                    var minX = shirina_P_Min;
                    var maxX = shirina_P_Max;
                    var minY = dlina_P_Min;
                    var maxY = dlina_P_Max;
                    
                    // Определяем направление нормали для расширения
                    // Проверяем касание левой или правой границы (по X)
                    var isOnLeftEdge = Math.abs(x1 - minX) < tolerance && Math.abs(x2 - minX) < tolerance;
                    var isOnRightEdge = Math.abs(x1 - maxX) < tolerance && Math.abs(x2 - maxX) < tolerance;
                    
                    // Проверяем касание нижней или верхней границы (по Y)
                    var isOnBottomEdge = Math.abs(y1 - minY) < tolerance && Math.abs(y2 - minY) < tolerance;
                    var isOnTopEdge = Math.abs(y1 - maxY) < tolerance && Math.abs(y2 - maxY) < tolerance;
                    
                    var newP1 = {x: x1, y: y1};
                    var newP2 = {x: x2, y: y2};
                    
                    if (isOnLeftEdge) {
                        // Расширяем влево (уменьшаем X)
                        newP1.x -= extendDist;
                        newP2.x -= extendDist;
                        pocketMsg += " [Расширено влево на 6мм]";
                        modified = true;
                    } else if (isOnRightEdge) {
                        // Расширяем вправо (увеличиваем X)
                        newP1.x += extendDist;
                        newP2.x += extendDist;
                        pocketMsg += " [Расширено вправо на 6мм]";
                        modified = true;
                    } else if (isOnBottomEdge) {
                        // Расширяем вниз (уменьшаем Y)
                        newP1.y -= extendDist;
                        newP2.y -= extendDist;
                        pocketMsg += " [Расширено вниз на 6мм]";
                        modified = true;
                    } else if (isOnTopEdge) {
                        // Расширяем вверх (увеличиваем Y)
                        newP1.y += extendDist;
                        newP2.y += extendDist;
                        pocketMsg += " [Расширено вверх на 6мм]";
                        modified = true;
                    }
                    
                    pocketMsg += "\n";
                    
                    // Применяем изменения к траектории
                    if (modified) {
                        obj.Pos1.x = newP1.x;
                        obj.Pos1.y = newP1.y;
                        obj.Pos2.x = newP2.x;
                        obj.Pos2.y = newP2.y;
                        modified = false; // Сбрасываем флаг после применения
                    }
                }
            }
        }
    }
    
    if (notchCount === 0) {
        pocketMsg += "Выемки не найдены.";
    }
    
    alert(panelMsg+pocketMsg);
}
