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
    
    //alert(panelMsg);
    
    // Считаем и выводим выемки, а также расширяем их за пределы панели
    var notchCount = 0;
    var pocketMsg = "Выемки:\n";
    
    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
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
            
            //alert(panelMsg+pocketMsg);
            
            // Допуск для проверки касания края (0.1 мм)
            var tolerance = 0.1;
            var extendDist = 6.0; // Расстояние расширения в мм
            var extendLeft = false;
            var extendRight = false;
            var extendBottom = false;
            var extendTop = false;
            // Флаги для отслеживания изменений
            var modified = false;
            
            // Проверяем касание левого края (x = 0)
            if (Math.abs(pocked_Min_x - shirina_P_Min) < tolerance) {
                extendLeft = true;
                alert('extendLeft ok');
            }
            // Проверяем касание правого края (x = panel.GSize.x)
            if (Math.abs(pocked_Max_x - shirina_P_Max) < tolerance) {
                extendRight = true;
                alert('extendRight ok');
            }
            // Проверяем касание нижнего края (y = 0)
            if (Math.abs(pocked_Min_y - dlina_P_Min) < tolerance) {
                extendBottom = true;
                alert('extendBottom ok');
            }
            // Проверяем касание верхнего края (y = panel.GSize.z)
            if (Math.abs(pocked_Max_y - dlina_P_Max) < tolerance) {
                extendTop = true;
                alert('extendTop ok');
            }
            
            // Если выемка касается любого края (одного, двух, трех или четырех), 
            // расширяем её в сторону касающихся краев
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
                        // Проверяем касание границ ПАНЕЛИ напрямую, а не границ контура
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
    
    //if (notchCount === 0) {pocketMsg += "Выемки не найдены.";}
    
    //alert(pocketMsg);
}
