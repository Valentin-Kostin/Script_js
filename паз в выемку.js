function CutsToNotchs(panel) {
    if (!panel || !Model.Selected) return;

    // Границы панели
    var panelMinY = 0;
    var panelMaxY = +panel.GSize.z.toFixed(2);
    var panelMinX = 0;
    var panelMaxX = +panel.GSize.x.toFixed(2);
    
    var extensionLength = 6; // Вынос за границу панели в мм

    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        if (panel.Cuts[i].CutType != 2) {
            var originalTraj = panel.Cuts[i].Trajectory;
            var extendedTraj = NewContour();
            
            // Копируем исходную траекторию во временный контейнер для возможного удлинения
            for (var k = 0; k < originalTraj.Count; ++k) {
                if (originalTraj.Objects[k] == '[object T2DLine]') {
                    extendedTraj.AddLine(originalTraj.Objects[k].Pos1, originalTraj.Objects[k].Pos2);
                } else if (originalTraj.Objects[k] == '[object T2DArc]') {
                    extendedTraj.AddArc3(originalTraj.Objects[k].Pos1, originalTraj.Objects[k].ArcCenter(), originalTraj.Objects[k].Pos2);
                } else if (originalTraj.Objects[k] == '[object T2DCircle]') {
                    extendedTraj.AddCircle(originalTraj.Objects[k].Center.x, originalTraj.Objects[k].Center.y, originalTraj.Objects[k].CirRadius);
                }
            }

            // Определяем границы текущего паза
            var cutMinX = +panel.Cuts[i].Contour.Min.x.toFixed(2);
            var cutMaxX = +panel.Cuts[i].Contour.Max.x.toFixed(2);
            var cutMinY = +panel.Cuts[i].Contour.Min.y.toFixed(2);
            var cutMaxY = +panel.Cuts[i].Contour.Max.y.toFixed(2);

            // Флаги касания границ
            var isEdgeBottom = (cutMinY <= panelMinY + 0.01); // С небольшим допуском
            var isEdgeTop = (cutMaxY >= panelMaxY - 0.01);
            var isEdgeLeft = (cutMinX <= panelMinX + 0.01);
            var isEdgeRight = (cutMaxX >= panelMaxX - 0.01);

            // Логика удлинения траектории перед построением выемки
            // Если паз у края, мы должны "вытянуть" его траекторию за границу перед созданием эквидистанты
            
            // 1. Проверка по длине (ось Y)
            if (isEdgeBottom) {
                // Удлиняем начало траектории вниз (в минус Y)
                // Находим первую точку траектории
                if (extendedTraj.Count > 0 && extendedTraj.Objects[0] == '[object T2DLine]') {
                    var p1 = extendedTraj.Objects[0].Pos1;
                    var p2 = extendedTraj.Objects[0].Pos2;
                    // Вектор направления от p2 к p1 (начало)
                    var dx = p1.x - p2.x;
                    var dy = p1.y - p2.y;
                    var len = Math.sqrt(dx*dx + dy*dy);
                    if (len > 0.001) {
                        extendedTraj.Objects[0].Pos1.x -= (dx / len) * extensionLength;
                        extendedTraj.Objects[0].Pos1.y -= (dy / len) * extensionLength;
                    } else {
                        // Если длина 0 или точка, просто сдвигаем точку
                        extendedTraj.Objects[0].Pos1.y -= extensionLength;
                    }
                } else if (extendedTraj.Count > 0 && extendedTraj.Objects[0] == '[object T2DArc]') {
                     // Для дуги сложнее, просто сдвинем начало дуги по касательной или радиусу, 
                     // но для простоты в базовом случае сдвигаем Pos1 по Y, если дуга вертикальная
                     extendedTraj.Objects[0].Pos1.y -= extensionLength;
                }
            }
            
            if (isEdgeTop) {
                // Удлиняем конец траектории вверх (в плюс Y)
                var lastIdx = extendedTraj.Count - 1;
                if (lastIdx >= 0 && extendedTraj.Objects[lastIdx] == '[object T2DLine]') {
                    var p1 = extendedTraj.Objects[lastIdx].Pos1;
                    var p2 = extendedTraj.Objects[lastIdx].Pos2;
                    var dx = p2.x - p1.x;
                    var dy = p2.y - p1.y;
                    var len = Math.sqrt(dx*dx + dy*dy);
                    if (len > 0.001) {
                        extendedTraj.Objects[lastIdx].Pos2.x += (dx / len) * extensionLength;
                        extendedTraj.Objects[lastIdx].Pos2.y += (dy / len) * extensionLength;
                    } else {
                        extendedTraj.Objects[lastIdx].Pos2.y += extensionLength;
                    }
                } else if (lastIdx >= 0 && extendedTraj.Objects[lastIdx] == '[object T2DArc]') {
                     extendedTraj.Objects[lastIdx].Pos2.y += extensionLength;
                }
            }

            // 2. Проверка по ширине (ось X) - аналогично
            if (isEdgeLeft) {
                 if (extendedTraj.Count > 0 && extendedTraj.Objects[0] == '[object T2DLine]') {
                    var p1 = extendedTraj.Objects[0].Pos1;
                    var p2 = extendedTraj.Objects[0].Pos2;
                    var dx = p1.x - p2.x;
                    var dy = p1.y - p2.y;
                    var len = Math.sqrt(dx*dx + dy*dy);
                    if (len > 0.001) {
                        extendedTraj.Objects[0].Pos1.x -= (dx / len) * extensionLength;
                        extendedTraj.Objects[0].Pos1.y -= (dy / len) * extensionLength;
                    } else {
                        extendedTraj.Objects[0].Pos1.x -= extensionLength;
                    }
                }
            }

            if (isEdgeRight) {
                var lastIdx = extendedTraj.Count - 1;
                if (lastIdx >= 0 && extendedTraj.Objects[lastIdx] == '[object T2DLine]') {
                    var p1 = extendedTraj.Objects[lastIdx].Pos1;
                    var p2 = extendedTraj.Objects[lastIdx].Pos2;
                    var dx = p2.x - p1.x;
                    var dy = p2.y - p1.y;
                    var len = Math.sqrt(dx*dx + dy*dy);
                    if (len > 0.001) {
                        extendedTraj.Objects[lastIdx].Pos2.x += (dx / len) * extensionLength;
                        extendedTraj.Objects[lastIdx].Pos2.y += (dy / len) * extensionLength;
                    } else {
                        extendedTraj.Objects[lastIdx].Pos2.x += extensionLength;
                    }
                }
            }

            // Построение контуров выемки на основе (возможно удлиненной) траектории
            var traj1_1 = NewContour();
            var traj1_2 = NewContour();
            var traj2_1 = NewContour();
            var traj2_2 = NewContour();
            var traj_pos1 = undefined;
            var traj_pos2 = undefined;
            
            // Используем extendedTraj вместо оригинальной
            traj1_1.AddEquidistant(extendedTraj, panel.Cuts[i].Contour.Min.x, false, false);
            traj1_2.AddEquidistant(extendedTraj, panel.Cuts[i].Contour.Max.x, false, false);
            traj2_1.AddEquidistant(extendedTraj, panel.Cuts[i].Contour.Min.x, false, false);
            traj2_2.AddEquidistant(extendedTraj, panel.Cuts[i].Contour.Max.x, false, false);

            // Расчет толщины (глубины) выемки
            // Если выемка сквозная или у края, толщина может рассчитываться иначе, 
            // но по ТЗ "глубину выемки не трогай", поэтому оставляем расчет как был или ставим 0 если не край
            // Однако, если мы вынесли за границу, логика Thickness может потребовать обновления координат границы,
            // но само значение глубины (расстояние до дна) остается прежним.
            
            if (isEdgeBottom && !isEdgeTop) {
                panel.Cuts[i].Thickness = panel.Cuts[i].Contour.Max.y; // Пример логики из старого кода
            } else if (!isEdgeBottom && isEdgeTop) {
                panel.Cuts[i].Thickness = -(panel.GSize.z - panel.Cuts[i].Contour.Min.y);
            } else if (isEdgeBottom && isEdgeTop) {
                 panel.Cuts[i].Thickness = panel.GSize.z; // Сквозная
            } else {
                panel.Cuts[i].Thickness = 0; // Или оставляем старое значение, если оно было задано
            }

            panel.Cuts[i].Contour.Clear();

            // Построение нового контура
            for (var t = 0; t < traj1_1.Count; ++t) {
                var obj = traj1_1.Objects[t];
                
                if (obj === '[object T2DLine]') {
                    panel.Cuts[i].Contour.AddLine(traj1_1.Objects[t].Pos1, traj1_1.Objects[t].Pos2);
                    panel.Cuts[i].Contour.AddLine(traj1_2.Objects[t].Pos1, traj1_2.Objects[t].Pos2);
                    
                    if (!traj_pos1) {
                        traj_pos1 = {
                            p1: traj1_1.Objects[t].Pos1,
                            p2: traj1_2.Objects[t].Pos1
                        };
                    }
                    traj_pos2 = {
                        p1: traj1_1.Objects[t].Pos2,
                        p2: traj1_2.Objects[t].Pos2
                    };
                }
                
                if (obj === '[object T2DArc]') {
                    panel.Cuts[i].Contour.AddArc3(traj1_1.Objects[t].Pos1, traj1_1.Objects[t].ArcCenter(), traj1_1.Objects[t].Pos2);
                    panel.Cuts[i].Contour.AddArc3(traj1_2.Objects[t].Pos1, traj1_2.Objects[t].ArcCenter(), traj1_2.Objects[t].Pos2);
                    
                    if (!traj_pos1) {
                        traj_pos1 = {
                            p1: traj1_1.Objects[t].Pos1,
                            p2: traj1_2.Objects[t].Pos1
                        };
                    }
                    traj_pos2 = {
                        p1: traj1_1.Objects[t].Pos2,
                        p2: traj1_2.Objects[t].Pos2
                    };
                }
                
                if (obj === '[object T2DCircle]') {
                    panel.Cuts[i].Contour.AddCircle(traj2_1.Objects[t].Center.x, traj2_1.Objects[t].Center.y, traj2_1.Objects[t].CirRadius);
                    panel.Cuts[i].Contour.AddCircle(traj2_2.Objects[t].Center.x, traj2_2.Objects[t].Center.y, traj2_2.Objects[t].CirRadius);
                }
            }
            if ((traj_pos1) && (traj_pos2)) {
                panel.Cuts[i].Contour.AddLine(traj_pos1.p1.x, traj_pos1.p1.y, traj_pos1.p2.x, traj_pos1.p2.y);
                panel.Cuts[i].Contour.AddLine(traj_pos2.p1.x, traj_pos2.p1.y, traj_pos2.p2.x, traj_pos2.p2.y);
            }

            // Обновление параметров выемки
            panel.Cuts[i].CutType = 2;
            panel.Cuts[i].Trajectory.Clear();
            panel.Cuts[i].Name = 'выемка';
            panel.Cuts[i].Sign = 'выемка';
            panel.Cuts[i].DeleteParams();
            
            // Флаг необходимости перестроения панели
            needsRebuild = true;
        }
    }

    // Перестроение панели один раз после всех изменений
    if (needsRebuild && panel.Build) {
        panel.Build();
    }
}

//***************************************************************************//

if (Model && Model.Selected) {
    CutsToNotchs(Model.Selected);
    alert('ok');
} else {
    alert('Ошибка: панель не выбрана');
}