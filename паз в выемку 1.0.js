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
function CutsToNotchs(panel) {
    // Проверяем, что панель выбрана
    if (!panel || !panel.Cuts) {
        alert('Ошибка: выберите панель с пазами');
        return;
    }
    
    // Обрабатываем все пазы панели (в обратном порядке для безопасного удаления)
    for (var i = panel.Cuts.Count - 1; i >= 0; --i) {
        var cut = panel.Cuts[i];
        
        // Получаем исходные данные паза
        var trajectory = cut.Trajectory;  // Contour2D - траектория паза
        var profile = cut.Contour;        // Contour2D - профиль/сечение паза
        
        // Пропускаем, если нет траектории или профиля
        if (!trajectory || !profile) {
            continue;
        }
        
        // Определяем толщину выемки из профиля (ширина сечения)
        var cutThickness = 0;
        if (profile.Count > 0) {
            // Получаем габариты профиля для определения толщины
            var minPoint = {x: 0, y: 0};
            var maxPoint = {x: 0, y: 0};
            profile.Gabarits(minPoint, maxPoint);
            cutThickness = Math.abs(maxPoint.y - minPoint.y);
        }
        
        // Если толщина не определена, используем значение из параметров
        if (cutThickness <= 0 && cut.Params) {
            cutThickness = Math.abs(cut.Params.Width || cut.Params.Depth || 10);
        }
        
        // Сохраняем текущие точки траектории для построения контура
        var contourPoints = [];
        var refObj = { value: { x: 0, y: 0 } };
        
        // Проходим по всем элементам траектории и собираем точки
        for (var t = 0; t < trajectory.Count; ++t) {
            var elem = trajectory.Objects[t];
            
            if (elem && elem.IsLine && elem.IsLine()) {
                var line = elem;
                // Добавляем начальную точку линии
                if (t === 0 || contourPoints.length === 0) {
                    var startPt = { x: 0, y: 0 };
                    elem.PointOn(0, startPt);
                    contourPoints.push({ x: startPt.x, y: startPt.y, type: 'line_start' });
                }
                // Добавляем конечную точку линии
                var endPt = { x: 0, y: 0 };
                elem.PointOn(1, endPt);
                contourPoints.push({ x: endPt.x, y: endPt.y, type: 'line_end' });
            }
            else if (elem && elem.IsArc && elem.IsArc()) {
                var arc = elem;
                // Для дуг добавляем ключевые точки
                if (t === 0 || contourPoints.length === 0) {
                    var startPt = { x: 0, y: 0 };
                    elem.PointOn(0, startPt);
                    contourPoints.push({ x: startPt.x, y: startPt.y, type: 'arc_start' });
                }
                // Средняя точка дуги
                var midPt = { x: 0, y: 0 };
                elem.PointOn(0.5, midPt);
                contourPoints.push({ x: midPt.x, y: midPt.y, type: 'arc_mid' });
                // Конечная точка дуги
                var endPt = { x: 0, y: 0 };
                elem.PointOn(1, endPt);
                contourPoints.push({ x: endPt.x, y: endPt.y, type: 'arc_end' });
            }
        }
        
        // Очищаем старый контур
        cut.Contour.Clear();
        
        // Строим замкнутый контур выемки на основе точек траектории
        // Создаём прямоугольную выемку по bounding box траектории
        if (contourPoints.length > 0) {
            // Находим минимальные и максимальные координаты
            var minX = contourPoints[0].x;
            var maxX = contourPoints[0].x;
            var minY = contourPoints[0].y;
            var maxY = contourPoints[0].y;
            
            for (var p = 1; p < contourPoints.length; ++p) {
                if (contourPoints[p].x < minX) minX = contourPoints[p].x;
                if (contourPoints[p].x > maxX) maxX = contourPoints[p].x;
                if (contourPoints[p].y < minY) minY = contourPoints[p].y;
                if (contourPoints[p].y > maxY) maxY = contourPoints[p].y;
            }
            
            // Добавляем небольшой отступ для корректности
            var offset = 0.5;
            minX -= offset;
            maxX += offset;
            minY -= offset;
            maxY += offset;
            
            // Создаём замкнутый прямоугольный контур
            cut.Contour.AddRectangle(minX, minY, maxX, maxY);
        }
        
        // Устанавливаем тип паза как "выемка" (extrusion)
        // Согласно документации: panelOperations.cutType.extrusion
        if (typeof panelOperations !== 'undefined' && panelOperations.cutType) {
            cut.CutType = panelOperations.cutType.extrusion;
        }
        
        // Устанавливаем толщину выемки (глубину)
        // Знак определяет сторону: положительный - от мин.глубины, отрицательный - от макс.
        cut.Thickness = -Math.abs(cutThickness);
        
        // Обновляем имя и обозначение
        cut.Name = 'Выемка (из паза)';
        cut.Sign = 'Выемка';
        
        // Очищаем траекторию - для выемки она не используется
        if (cut.Trajectory) {
            cut.Trajectory.Clear();
        }
        
        // Создаём параметры паза заново для типа extrusion
        if (cut.CreateParams) {
            cut.CreateParams();
        }
    }
    
    // Перестраиваем панель для применения изменений
    panel.Build();
}

//***************************************************************************//
// Основная программа
//***************************************************************************//

// Проверяем наличие выбранной панели
if (Model.Selected && Model.Selected.Cuts && Model.Selected.Cuts.Count > 0) {
    CutsToNotchs(Model.Selected);
    alert('Пазы успешно преобразованы в выемки!');
} else {
    alert('Ошибка: Выберите панель с пазами для преобразования');
}