function CutsToNotchs(panel) {
    if (!panel || !Model.Selected || Model.Selected.Count === 0) {
        MessageBox.Show("Выберите панель с разрезами!");
        return;
    }

    // Границы панели
    var panelMinY = 0;
    var panelMaxY = +panel.GSize.z.toFixed(2);
    var panelMinX = 0;
    var panelMaxX = +panel.GSize.x.toFixed(2);

    var extensionLength = 6; // Вынос за границу панели в мм
    var tolerance = 0.01;
    var needsRebuild = false;

    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        // Обрабатываем только разрезы (тип 2), превращая их в выемки
        if (panel.Cuts[i].CutType != 2) continue;

        var originalTraj = panel.Cuts[i].Trajectory;
        if (originalTraj.Count === 0) continue;

        var extendedTraj = NewContour();

        // Копируем исходную траекторию во временный контейнер
        for (var k = 0; k < originalTraj.Count; ++k) {
            var obj = originalTraj.Objects[k];
            var objStr = String(obj);
            if (objStr.indexOf('T2DLine') !== -1) {
                extendedTraj.AddLine(obj.Pos1, obj.Pos2);
            } else if (objStr.indexOf('T2DArc') !== -1) {
                extendedTraj.AddArc3(obj.Pos1, obj.ArcCenter(), obj.Pos2);
            } else if (objStr.indexOf('T2DCircle') !== -1) {
                extendedTraj.AddCircle(obj.Center.x, obj.Center.y, obj.CirRadius);
            }
        }

        if (extendedTraj.Count === 0) continue;

        // Определяем границы текущего паза
        var cutMinX = +panel.Cuts[i].Contour.Min.x.toFixed(2);
        var cutMaxX = +panel.Cuts[i].Contour.Max.x.toFixed(2);
        var cutMinY = +panel.Cuts[i].Contour.Min.y.toFixed(2);
        var cutMaxY = +panel.Cuts[i].Contour.Max.y.toFixed(2);

        // Флаги касания границ
        var isEdgeBottom = (cutMinY <= panelMinY + tolerance);
        var isEdgeTop = (cutMaxY >= panelMaxY - tolerance);
        var isEdgeLeft = (cutMinX <= panelMinX + tolerance);
        var isEdgeRight = (cutMaxX >= panelMaxX - tolerance);

        // Логика удлинения траектории перед построением выемки
        // Если паз у края, вытягиваем его траекторию за границу перед созданием эквидистанты

        // 1. Проверка по длине (ось Y) - нижний край
        if (isEdgeBottom && extendedTraj.Count > 0) {
            var firstObj = extendedTraj.Objects[0];
            var firstObjStr = String(firstObj);
            if (firstObjStr.indexOf('T2DLine') !== -1) {
                var p1 = firstObj.Pos1;
                var p2 = firstObj.Pos2;
                var dx = p1.x - p2.x;
                var dy = p1.y - p2.y;
                var len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0.001) {
                    firstObj.Pos1.x -= (dx / len) * extensionLength;
                    firstObj.Pos1.y -= (dy / len) * extensionLength;
                } else {
                    firstObj.Pos1.y -= extensionLength;
                }
            } else if (firstObjStr.indexOf('T2DArc') !== -1) {
                firstObj.Pos1.y -= extensionLength;
            }
        }

        // 1. Проверка по длине (ось Y) - верхний край
        if (isEdgeTop && extendedTraj.Count > 0) {
            var lastIdx = extendedTraj.Count - 1;
            var lastObj = extendedTraj.Objects[lastIdx];
            var lastObjStr = String(lastObj);
            if (lastObjStr.indexOf('T2DLine') !== -1) {
                var p1 = lastObj.Pos1;
                var p2 = lastObj.Pos2;
                var dx = p2.x - p1.x;
                var dy = p2.y - p1.y;
                var len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0.001) {
                    lastObj.Pos2.x += (dx / len) * extensionLength;
                    lastObj.Pos2.y += (dy / len) * extensionLength;
                } else {
                    lastObj.Pos2.y += extensionLength;
                }
            } else if (lastObjStr.indexOf('T2DArc') !== -1) {
                lastObj.Pos2.y += extensionLength;
            }
        }

        // 2. Проверка по ширине (ось X) - левый край
        if (isEdgeLeft && extendedTraj.Count > 0) {
            var firstObj = extendedTraj.Objects[0];
            var firstObjStr = String(firstObj);
            if (firstObjStr.indexOf('T2DLine') !== -1) {
                var p1 = firstObj.Pos1;
                var p2 = firstObj.Pos2;
                var dx = p1.x - p2.x;
                var dy = p1.y - p2.y;
                var len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0.001) {
                    firstObj.Pos1.x -= (dx / len) * extensionLength;
                    firstObj.Pos1.y -= (dy / len) * extensionLength;
                } else {
                    firstObj.Pos1.x -= extensionLength;
                }
            }
        }

        // 2. Проверка по ширине (ось X) - правый край
        if (isEdgeRight && extendedTraj.Count > 0) {
            var lastIdx = extendedTraj.Count - 1;
            var lastObj = extendedTraj.Objects[lastIdx];
            var lastObjStr = String(lastObj);
            if (lastObjStr.indexOf('T2DLine') !== -1) {
                var p1 = lastObj.Pos1;
                var p2 = lastObj.Pos2;
                var dx = p2.x - p1.x;
                var dy = p2.y - p1.y;
                var len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0.001) {
                    lastObj.Pos2.x += (dx / len) * extensionLength;
                    lastObj.Pos2.y += (dy / len) * extensionLength;
                } else {
                    lastObj.Pos2.x += extensionLength;
                }
            }
        }

        // Построение контуров выемки на основе (возможно удлиненной) траектории
        var traj1_1 = NewContour();
        var traj1_2 = NewContour();
        var traj_pos1 = undefined;
        var traj_pos2 = undefined;

        traj1_1.AddEquidistant(extendedTraj, panel.Cuts[i].Contour.Min.x, false, false);
        traj1_2.AddEquidistant(extendedTraj, panel.Cuts[i].Contour.Max.x, false, false);

        // Глубину выемки не трогаем - оставляем как есть
        // panel.Cuts[i].Thickness остается без изменений

        panel.Cuts[i].Contour.Clear();
        for (var t = 0; t < traj1_1.Count; ++t) {
            var obj1 = traj1_1.Objects[t];
            var obj2 = traj1_2.Objects[t];
            var obj1Str = String(obj1);
            
            if (obj1Str.indexOf('T2DLine') !== -1) {
                panel.Cuts[i].Contour.AddLine(obj1.Pos1, obj1.Pos2);
                panel.Cuts[i].Contour.AddLine(obj2.Pos1, obj2.Pos2);
                if (!traj_pos1) {
                    traj_pos1 = { p1: obj1.Pos1, p2: obj2.Pos1 };
                }
                traj_pos2 = { p1: obj1.Pos2, p2: obj2.Pos2 };
            }
            if (obj1Str.indexOf('T2DArc') !== -1) {
                panel.Cuts[i].Contour.AddArc3(obj1.Pos1, obj1.ArcCenter(), obj1.Pos2);
                panel.Cuts[i].Contour.AddArc3(obj2.Pos1, obj2.ArcCenter(), obj2.Pos2);
                if (!traj_pos1) {
                    traj_pos1 = { p1: obj1.Pos1, p2: obj2.Pos1 };
                }
                traj_pos2 = { p1: obj1.Pos2, p2: obj2.Pos2 };
            }
        }
        
        if (traj_pos1 && traj_pos2) {
            panel.Cuts[i].Contour.AddLine(traj_pos1.p1, traj_pos1.p2);
            panel.Cuts[i].Contour.AddLine(traj_pos2.p1, traj_pos2.p2);
        }
        
        panel.Cuts[i].CutType = 3; // Меняем тип на выемку
        panel.Cuts[i].Trajectory.Clear();
        panel.Cuts[i].Name = 'выемка';
        panel.Cuts[i].Sign = 'выемка';
        panel.Cuts[i].DeleteParams();
        
        needsRebuild = true;
    }

    if (needsRebuild) {
        panel.Build();
        Model.Refresh();
    }
}

//***************************************************************************//

if (Model.Selected && Model.Selected.Count > 0) {
    CutsToNotchs(Model.Selected[0]);
    alert('ok');
} else {
    MessageBox.Show("Выберите панель!");
}
