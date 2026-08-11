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
    
    // Считаем и выводим выемки
    var notchCount = 0;
    var pocketMsg = "Выемки:\n";
    
    for (var i = 0; i < panel.Cuts.Count; i++) {
        if (panel.Cuts[i].CutType == 2) { // Проверяем только выемки
            notchCount++;
            var cut = panel.Cuts[i];
            
            pocketMsg += "\nВыемка #" + (i + 1) + ":\n";
            var pocked_Min_x = cut.Contour.Min.x.toFixed(2);
            var pocked_Max_x = cut.Contour.Max.x.toFixed(2);
            var pocked_Min_y = cut.Contour.Min.y.toFixed(2);
            var pocked_Max_y = cut.Contour.Max.y.toFixed(2);

            pocketMsg += "Min X: " + pocked_Min_x + ", Max X: " + pocked_Max_x + "\n";
            pocketMsg += "Min Y: " + pocked_Min_y + ", Max Y: " + pocked_Max_y + "\n";
            
            // Выводим точки контура
            pocketMsg += "Точки контура:\n";
            for (var t = 0; t < cut.Contour.Count; t++) {
                var obj = cut.Contour.Objects[t];
                if (obj == '[object T2DLine]') {
                    pocketMsg += "  Линия: (" + obj.Pos1.x.toFixed(2) + ", " + obj.Pos1.y.toFixed(2) + ") -> (" + 
                                  obj.Pos2.x.toFixed(2) + ", " + obj.Pos2.y.toFixed(2) + ")\n";
                }
            }
        }
    }
    
    if (notchCount === 0) {
        pocketMsg += "Выемки не найдены.";
    }
    
    alert(panelMsg+pocketMsg);
}
