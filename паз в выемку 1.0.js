/**
 * Преобразует пазы в панелях в выемки (карманы)
 * Согласно документации Базис-Мебельщик 24
 * 
 * Логика работы согласно официальной документации:
 * - Паз типа "extrusion" (выемка) использует только Contour (замкнутый контур)
 * - Trajectory для выемки не используется
 * - Thickness определяет глубину и сторону выемки:
 *   * Положительное значение: выемка строится по направлению +Z от минимальной глубины
 *   * Отрицательное значение: выемка строится по направлению -Z от максимальной глубины
 * - CutType должен быть установлен в panelOperations.cutType.extrusion
 */

// Проверка выделения
if (!Model.Selected || Model.Selected.Count === 0) {
    alert('Ошибка: Выберите панель с разрезами!');
} else {
    var panel = Model.Selected[0];

    // Проверка типа объекта
    if (panel.Type != ObjectType.otPanel) {
        alert('Ошибка: Выбранный объект не является панелью!');
    } else {
        // Получение размеров панели (Локальные координаты: X - толщина, Y - ширина, Z - длина)
        var pLength = panel.Length;   // Ось Z
        var pWidth = panel.Width;     // Ось Y
        
        var extendDist = 6.0;         // Вынос за границу (мм)
        var tolerance = 0.5;          // Допуск для определения касания края (мм)

        // Проход по разрезам в обратном порядке (чтобы индексы не сбились при удалении)
        for (var i = panel.Cuts.Count - 1; i >= 0; i--) {
            var cut = panel.Cuts[i];

            // Обрабатываем только пазы (Тип 2 - Slot / Протяженный вырез)
            if (cut.Type != 2) continue;

            // Проверка на наличие траектории и точек
            if (!cut.Trajectory || cut.Trajectory.Count < 2) continue;

            // Получаем глубину паза (абсолютное значение, знак важен для стороны)
            var depth = cut.Thickness;
            if (Math.abs(depth) < 0.1) continue; // Игнорируем нулевую глубину

            // --- Анализ траектории для определения габаритов ---
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
            contour.AddLine(minY, minZ);
            contour.AddLine(maxY, minZ);
            contour.AddLine(maxY, maxZ);
            contour.AddLine(minY, maxZ);
            contour.AddLine(minY, minZ); // Замыкаем контур

            // Создаем новый разрез
            var newCut = panel.Cuts.Add();
            
            // Устанавливаем тип: Вырез (выемка)
            newCut.Type = 3; 
            
            // Присваиваем созданный контур
            newCut.Contour.Assign(contour);
            
            // Устанавливаем глубину (сохраняем знак оригинального паза для стороны выреза)
            newCut.Thickness = depth;
        }

        // Перестройка геометрии
        panel.Build();
        alert('Преобразование завершено успешно!\nПазы конвертированы в выемки.');
    }
}