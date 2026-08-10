(function() {
    // Проверка выделения
    if (!Model.Selected || Model.Selected.Count === 0) {
        MessageBox.Show("Ошибка: Выберите панель с разрезами!");
        return;
    }

    var panel = Model.Selected[0];

    // Проверка типа объекта
    if (panel.Type != ObjectType.otPanel) {
        MessageBox.Show("Ошибка: Выбранный объект не является панелью!");
        return;
    }

    // Получение размеров панели (Локальные координаты: X - толщина, Y - ширина, Z - длина)
    var pLength = panel.Length;   // Ось Z
    var pWidth = panel.Width;     // Ось Y
    
    var extendDist = 6.0;         // Вынос за границу (мм)
    var tolerance = 0.5;          // Допуск для определения касания края (мм)
    var needsRebuild = false;

    // Проход по разрезам в обратном порядке (чтобы индексы не сбились при удалении)
    for (var i = panel.Cuts.Count - 1; i >= 0; i--) {
        var cut = panel.Cuts[i];

        // Обрабатываем только пазы (Тип 2 - Slot / Протяженный вырез)
        // В новом API можно использовать cut.CutType == panelOperations.cutType.slot, 
        // но числовое значение 2 сохраняется для совместимости
        if (cut.Type != 2) continue;

        // Проверка на наличие траектории и точек
        if (!cut.Trajectory || cut.Trajectory.Count < 2) continue;

        // Получаем глубину паза (абсолютное значение, знак важен для стороны)
        var depth = cut.Thickness;
        if (Math.abs(depth) < 0.1) continue; // Игнорируем нулевую глубину

        // --- Анализ траектории для определения габаритов ---
        // Для выемки нам нужен замкнутый 2D контур. 
        // Исходный паз может быть дугой или сложной линией. 
        // Преобразуем его в прямоугольную выемку по bounding box траектории.
        
        var minY = Infinity, maxY = -Infinity;
        var minZ = Infinity, maxZ = -Infinity;

        // Проходим по всем точкам траектории паза
        for (var j = 0; j < cut.Trajectory.Count; j++) {
            var pt = cut.Trajectory[j];
            if (pt.Y < minY) minY = pt.Y;
            if (pt.Y > maxY) maxY = pt.Y;
            if (pt.Z < minZ) minZ = pt.Z;
            if (pt.Z > maxZ) maxZ = pt.Z;
        }

        // --- Логика выноса за границы ---
        // Если граница паза совпадает с границей панели (с учетом допуска),
        // выносим контур выемки за габарит панели для корректного булевого вычитания
        
        // Проверка по оси Z (Длина)
        if (Math.abs(minZ) < tolerance) {
            minZ = -extendDist;
        } else if (Math.abs(minZ - pLength) < tolerance) {
            minZ = pLength + extendDist;
        }

        if (Math.abs(maxZ) < tolerance) {
            maxZ = -extendDist;
        } else if (Math.abs(maxZ - pLength) < tolerance) {
            maxZ = pLength + extendDist;
        }

        // Проверка по оси Y (Ширина)
        if (Math.abs(minY) < tolerance) {
            minY = -extendDist;
        } else if (Math.abs(minY - pWidth) < tolerance) {
            minY = pWidth + extendDist;
        }

        if (Math.abs(maxY) < tolerance) {
            maxY = -extendDist;
        } else if (Math.abs(maxY - pWidth) < tolerance) {
            maxY = pWidth + extendDist;
        }

        // Удаляем старый паз
        panel.Cuts.RemoveAt(i);

        // --- Создание новой выемки (Тип 3 - Extrusion / Вырез по контуру) ---
        
        // Создаем новый пустой контур
        var contour = panel.Modeler.NewContour();
        
        // Формируем замкнутый прямоугольный контур в плоскости панели (Y, Z)
        // Порядок обхода против часовой стрелки для внешней грани (стандарт CAD)
        // Точки задаются только в 2D (Y, Z), глубина задается свойством Thickness
        
        // Угол 1 (minY, minZ)
        contour.AddLine(minY, minZ);
        // Угол 2 (maxY, minZ)
        contour.AddLine(maxY, minZ);
        // Угол 3 (maxY, maxZ)
        contour.AddLine(maxY, maxZ);
        // Угол 4 (minY, maxZ)
        contour.AddLine(minY, maxZ);
        // Замыкаем контур (возврат к первому углу)
        contour.AddLine(minY, minZ);

        // Создаем новый разрез
        var newCut = panel.Cuts.Add();
        
        // Устанавливаем тип: Вырез (выемка)
        // Тип 3 соответствует panelOperations.cutType.extrusion
        newCut.Type = 3; 
        
        // Присваиваем созданный контур
        // Важно: Assign копирует геометрию контура в разрез
        newCut.Contour.Assign(contour);
        
        // Устанавливаем глубину (сохраняем знак оригинального паза для стороны выреза)
        newCut.Thickness = depth;
        
        // Опционально: можно задать имя или комментарий
        // newCut.Name = "Выемка (из паза)";

        needsRebuild = true;
    }

    // Перестройка геометрии только если были изменения
    if (needsRebuild) {
        // В современных версиях Базис перестройка часто происходит автоматически,
        // но явный вызов Refresh гарантирует обновление графики
        Model.Refresh();
        MessageBox.Show("Преобразование завершено успешно!\nПазы конвертированы в выемки.");
    } else {
        MessageBox.Show("Подходящие разрезы (пазы) не найдены.");
    }
})();