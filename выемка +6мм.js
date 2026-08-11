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
    panelMsg += "Ширина (GSize.x): " + panel.GSize.x + " мм\n";
    panelMsg += "Длина (GSize.y): " + panel.GSize.y + " мм\n";
    panelMsg += "Толщина (GSize.z): " + panel.GSize.z + " мм\n";
    alert(panelMsg);
    panelMsg += "Min X: " + panel.GMin.x + ", Max X: " + panel.GMax.x + "\n";
    panelMsg += "Min Y: " + panel.GMin.y + ", Max Y: " + panel.GMax.y + "\n";
    panelMsg += "Min Z: " + panel.GMin.z + ", Max Z: " + panel.GMax.z + "\n";
    
    alert(panelMsg);
    
    // Считаем и выводим выемки
    var notchCount = 0;
    var notchesMsg = "Выемки:\n";
    
    for (var i = 0; i < panel.Cuts.Count; i++) {
        if (panel.Cuts[i].CutType == 2) { // Проверяем только выемки
            notchCount++;
            var cut = panel.Cuts[i];
            
            notchesMsg += "\nВыемка #" + (i + 1) + ":\n";
            notchesMsg += "Min X: " + cut.Contour.Min.x.toFixed(2) + ", Max X: " + cut.Contour.Max.x.toFixed(2) + "\n";
            notchesMsg += "Min Y: " + cut.Contour.Min.y.toFixed(2) + ", Max Y: " + cut.Contour.Max.y.toFixed(2) + "\n";
            
            // Выводим точки контура
            notchesMsg += "Точки контура:\n";
            for (var t = 0; t < cut.Contour.Count; t++) {
                var obj = cut.Contour.Objects[t];
                if (obj == '[object T2DLine]') {
                    notchesMsg += "  Линия: (" + obj.Pos1.x.toFixed(2) + ", " + obj.Pos1.y.toFixed(2) + ") -> (" + 
                                  obj.Pos2.x.toFixed(2) + ", " + obj.Pos2.y.toFixed(2) + ")\n";
                }
            }
        }
    }
    
    if (notchCount === 0) {
        notchesMsg += "Выемки не найдены.";
    }
    
    alert(panelMsg+notchesMsg);
}
