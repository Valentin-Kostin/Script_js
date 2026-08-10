(function() {
    // 1. Проверка выделения
    if (!Model.Selected || Model.Selected.Count === 0) {
        MessageBox.Show("Ошибка: Выберите панель с разрезами!");
        return;
    }

    var panel = Model.Selected[0];

    // 2. Проверка типа объекта
    if (panel.Type != ObjectType.otPanel) {
        MessageBox.Show("Ошибка: Выбранный объект не является панелью!");
        return;
    }

    // 3. Получение размеров панели
    // В Базис-Мебельщик локальные координаты развертки обычно:
    // Length -> ось Z (длина)
    // Width  -> ось Y (ширина)
    // Thickness -> ось X (толщина)
    var pLength = panel.Length;
    var pWidth = panel.Width;

    var extendDist = 6.0;   // Вынос за границу
    var tolerance = 0.5;    // Допуск для определения касания края
    var needsRebuild = false;

    // 4. Проход по разрезам в обратном порядке (чтобы индексы не сбились при удалении)
    for (var i = panel.Cuts.Count - 1; i >= 0; i--) {
        var cut = panel.Cuts[i];

        // Обрабатываем только пазы (Тип 2)
        if (cut.Type != 2) continue;

        // Проверка на наличие точек
        if (cut.Points.Count < 2) continue;

        // Получаем глубину паза
        var depth = cut.Thickness;

        // Получаем начальную и конечную точки траектории
        // Мы игнорируем промежуточные точки и дуги, строя прямоугольную выемку по габаритам траектории
        var startPt = cut.Points[0];
        var endPt = cut.Points[cut.Points.Count - 1];

        var startY = startPt.Y;
        var startZ = startPt.Z;
        var endY = endPt.Y;
        var endZ = endPt.Z;

        // --- Логика выноса за границы ---

        // Проверка по оси Z (Длина)
        if (Math.abs(startZ) < tolerance) {
            startZ = -extendDist;
        } else if (Math.abs(startZ - pLength) < tolerance) {
            startZ = pLength + extendDist;
        }

        if (Math.abs(endZ) < tolerance) {
            endZ = -extendDist;
        } else if (Math.abs(endZ - pLength) < tolerance) {
            endZ = pLength + extendDist;
        }

        // Проверка по оси Y (Ширина)
        if (Math.abs(startY) < tolerance) {
            startY = -extendDist;
        } else if (Math.abs(startY - pWidth) < tolerance) {
            startY = pWidth + extendDist;
        }

        if (Math.abs(endY) < tolerance) {
            endY = -extendDist;
        } else if (Math.abs(endY - pWidth) < tolerance) {
            endY = pWidth + extendDist;
        }

        // Удаляем старый паз
        panel.Cuts.RemoveAt(i);

        // 5. Создание новой выемки (Тип 3)
        var contour = panel.Modeler.NewContour();

        // Строим замкнутый прямоугольный контур
        // Порядок точек важен для корректной нормали и булевой операции
        // Точки задаются в формате (Y, Z, X_глубина) относительно плоскости панели
        
        // Точка 1: Начало, поверхность (0)
        contour.AddLine(startY, startZ, 0);
        
        // Точка 2: Конец, поверхность (0)
        contour.AddLine(endY, endZ, 0);
        
        // Точка 3: Конец, полная глубина
        contour.AddLine(endY, endZ, depth);
        
        // Точка 4: Начало, полная глубина
        contour.AddLine(startY, startZ, depth);
        
        // Точка 5: Замыкание (Начало, поверхность)
        contour.AddLine(startY, startZ, 0);

        var newCut = panel.Cuts.Add();
        newCut.Type = 3; // Тип: Вырез (выемка)
        newCut.Contour.Assign(contour);
        newCut.Thickness = depth; // Сохраняем исходную глубину
        
        needsRebuild = true;
    }

    // 6. Перестройка геометрии только если были изменения
    if (needsRebuild) {
        panel.Build();
        Model.Refresh();
        MessageBox.Show("Преобразование завершено успешно!");
    } else {
        MessageBox.Show("Подходящие разрезы (пазы) не найдены.");
    }
})();