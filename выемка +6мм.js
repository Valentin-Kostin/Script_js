/**
 * Скрипт расширения выемок за пределы панели на 6 мм для БАЗИС-Мебельщик
 *
 * Назначение: Если в выделенной панели есть выемка, которая касается края панели
 * (одного, двух, трех или всех четырех краев), то выемка расширяется за пределы
 * панели на 6 мм в сторону каждого касающегося края.
 *
 * Логика работы:
 * 1. Считаем границы панели и запоминаем координаты углов (0,0) и (GSize.x, GSize.y)
 * 2. Проверяем каждую выемку в панели
 * 3. Считываем координаты границ выемки (Min.x, Max.x, Min.y, Max.y)
 * 4. Если границы выемки пересекаются или касаются границы панели (точность 0.1 мм),
 *    вытягиваем границу выемки за границу панели на 6 мм
 * 5. Если выемка касается нескольких сторон, вытягиваем во все касающиеся стороны
 */

function ExtendNotches(panel) {
    if (!panel || !panel.Cuts) return;

    // 1. Границы панели
    var pWidth = panel.GSize.x;   // Правая граница по X
    var pDepth = panel.GSize.y;   // Верхняя граница по Y
    
    var eps = 0.1;        // Точность определения касания (мм)
    var extendVal = 6.0;  // Величина вылета за край (мм)

    // Проходим по всем пазам в обратном порядке
    for (var i = panel.Cuts.Count - 1; i >= 0; i--) {
        var cut = panel.Cuts.Item(i);
        
        // Обрабатываем только выемки (тип 2)
        if (cut.CutType != 2) continue;

        var contour = cut.Contour;
        if (!contour || contour.Count == 0) continue;

        // 2. Получаем габариты выемки (Min/Max уже есть в объекте Contour)
        var minX = contour.Min.x;
        var maxX = contour.Max.x;
        var minY = contour.Min.y;
        var maxY = contour.Max.y;

        // 3. Определяем, каких краев касается выемка (с точностью 0.1 мм)
        var touchLeft   = Math.abs(minX - 0) < eps;
        var touchRight  = Math.abs(maxX - pWidth) < eps;
        var touchBottom = Math.abs(minY - 0) < eps;
        var touchTop    = Math.abs(maxY - pDepth) < eps;

        // Если ни одного края не касается, пропускаем
        if (!touchLeft && !touchRight && !touchBottom && !touchTop) continue;

        // 4. Создаем новый контур с расширенными границами
        var newContour = NewContour();
        
        for (var k = 0; k < contour.Count; k++) {
            var obj = contour.Item(k);
            
            if (obj.TypeName == "T2DLine") {
                var p1 = {x: obj.Pos1.x, y: obj.Pos1.y};
                var p2 = {x: obj.Pos2.x, y: obj.Pos2.y};

                // Функция сдвига точки в зависимости от того, какого края она касается
                function shiftPoint(p) {
                    var np = {x: p.x, y: p.y};
                    
                    // Проверяем каждую координату точки на касание соответствующего края
                    if (touchLeft && Math.abs(p.x - 0) < eps) {
                        np.x -= extendVal;  // Сдвигаем влево за край
                    }
                    if (touchRight && Math.abs(p.x - pWidth) < eps) {
                        np.x += extendVal;  // Сдвигаем вправо за край
                    }
                    if (touchBottom && Math.abs(p.y - 0) < eps) {
                        np.y -= extendVal;  // Сдвигаем вниз за край
                    }
                    if (touchTop && Math.abs(p.y - pDepth) < eps) {
                        np.y += extendVal;  // Сдвигаем вверх за край
                    }
                    
                    return np;
                }

                var np1 = shiftPoint(p1);
                var np2 = shiftPoint(p2);

                newContour.AddLine(np1.x, np1.y, np2.x, np2.y);
            
            } else if (obj.TypeName == "T2DArc") {
                // Для дуги определяем её экстремумы и сдвигаем центр
                var cx = obj.Center.x;
                var cy = obj.Center.y;
                var r = obj.Radius;
                var startAngle = obj.StartAngle;
                var endAngle = obj.EndAngle;

                var shiftX = 0, shiftY = 0;
                
                // Проверяем, касается ли дуга краев по своим экстремальным точкам
                if (touchLeft && Math.abs((cx - r) - 0) < eps) shiftX -= extendVal;
                if (touchRight && Math.abs((cx + r) - pWidth) < eps) shiftX += extendVal;
                if (touchBottom && Math.abs((cy - r) - 0) < eps) shiftY -= extendVal;
                if (touchTop && Math.abs((cy + r) - pDepth) < eps) shiftY += extendVal;
                
                newContour.AddArc(cx + shiftX, cy + shiftY, r, startAngle, endAngle);

            } else if (obj.TypeName == "T2DCircle") {
                var cx = obj.Center.x;
                var cy = obj.Center.y;
                var r = obj.Radius;
                
                var shiftX = 0, shiftY = 0;
                
                if (touchLeft && Math.abs((cx - r) - 0) < eps) shiftX -= extendVal;
                if (touchRight && Math.abs((cx + r) - pWidth) < eps) shiftX += extendVal;
                if (touchBottom && Math.abs((cy - r) - 0) < eps) shiftY -= extendVal;
                if (touchTop && Math.abs((cy + r) - pDepth) < eps) shiftY += extendVal;
                
                newContour.AddCircle(cx + shiftX, cy + shiftY, r);
            }
        }

        // 5. Заменяем старый контур на новый
        cut.Contour.Clear();
        for (var m = 0; m < newContour.Count; m++) {
            var srcObj = newContour.Item(m);
            if (srcObj.TypeName == "T2DLine") {
                cut.Contour.AddLine(srcObj.Pos1.x, srcObj.Pos1.y, srcObj.Pos2.x, srcObj.Pos2.y);
            } else if (srcObj.TypeName == "T2DArc") {
                cut.Contour.AddArc(srcObj.Center.x, srcObj.Center.y, srcObj.Radius, srcObj.StartAngle, srcObj.EndAngle);
            } else if (srcObj.TypeName == "T2DCircle") {
                cut.Contour.AddCircle(srcObj.Center.x, srcObj.Center.y, srcObj.Radius);
            }
        }
    }
    
    // Перестраиваем панель для применения изменений
    panel.Build();
}

// Запуск для выбранной панели
if (Model.Selected && Model.Selected.TypeName == "TPanel") {
    ExtendNotches(Model.Selected);
    alert("Выемки расширены на 6 мм за края панели там, где было касание.");
} else {
    alert("Пожалуйста, выберите панель (TPanel) для обработки.");
}
