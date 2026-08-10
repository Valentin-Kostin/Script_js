function CutsToNotchs(panel) {
    if (!panel) return;

    var panelMinY = 0;
    var panelMaxY = +panel.GSize.z.toFixed(2);
    var extensionLength = 6; // Вынос за границу панели в мм

    for (var i = panel.Cuts.Count - 1; i > -1; --i) {
        if (panel.Cuts[i].CutType != 2) {
            var traj1_1 = NewContour();
            var traj1_2 = NewContour();
            var traj2_1 = NewContour();
            var traj2_2 = NewContour();
            var traj_pos1 = undefined;
            var traj_pos2 = undefined;
            
            traj1_1.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Min.x, false, false);
            traj1_2.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Max.x, false, false);
            traj2_1.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Min.x, false, false);
            traj2_2.AddEquidistant(panel.Cuts[i].Trajectory, panel.Cuts[i].Contour.Max.x, false, false);

            var cutMinY = +panel.Cuts[i].Contour.Min.y.toFixed(2);
            var cutMaxY = +panel.Cuts[i].Contour.Max.y.toFixed(2);
            var isEdgeBottom = (cutMinY <= panelMinY);
            var isEdgeTop = (cutMaxY >= panelMaxY);

            // Расчет толщины и вынос за границу при необходимости
            if (isEdgeBottom && !isEdgeTop) {
                panel.Cuts[i].Thickness = panel.Cuts[i].Contour.Max.y;
                // Вынос за нижнюю границу: сдвигаем контур на -6мм по Y
                var shiftY = -extensionLength;
                for (var t = 0; t < traj1_1.Count; ++t) {
                    if (traj1_1.Objects[t] == '[object T2DLine]') {
                        traj1_1.Objects[t].Pos1.y += shiftY;
                        traj1_1.Objects[t].Pos2.y += shiftY;
                        traj1_2.Objects[t].Pos1.y += shiftY;
                        traj1_2.Objects[t].Pos2.y += shiftY;
                    }
                    if (traj1_1.Objects[t] == '[object T2DArc]') {
                        traj1_1.Objects[t].Pos1.y += shiftY;
                        traj1_1.Objects[t].Pos2.y += shiftY;
                        traj1_2.Objects[t].Pos1.y += shiftY;
                        traj1_2.Objects[t].Pos2.y += shiftY;
                        // Центр дуги тоже нужно сдвинуть
                        var center = traj1_1.Objects[t].ArcCenter();
                        // В API бисера нет прямого setter для центра, перестроим через AddArc3 со смещенными точками
                    }
                }
            } else if (!isEdgeBottom && isEdgeTop) {
                panel.Cuts[i].Thickness = -(panel.GSize.z - panel.Cuts[i].Contour.Min.y);
                // Вынос за верхнюю границу: сдвигаем контур на +6мм по Y
                var shiftY = extensionLength;
                for (var t = 0; t < traj1_1.Count; ++t) {
                    if (traj1_1.Objects[t] == '[object T2DLine]') {
                        traj1_1.Objects[t].Pos1.y += shiftY;
                        traj1_1.Objects[t].Pos2.y += shiftY;
                        traj1_2.Objects[t].Pos1.y += shiftY;
                        traj1_2.Objects[t].Pos2.y += shiftY;
                    }
                    if (traj1_1.Objects[t] == '[object T2DArc]') {
                        traj1_1.Objects[t].Pos1.y += shiftY;
                        traj1_1.Objects[t].Pos2.y += shiftY;
                        traj1_2.Objects[t].Pos1.y += shiftY;
                        traj1_2.Objects[t].Pos2.y += shiftY;
                    }
                }
            } else {
                panel.Cuts[i].Thickness = 0;
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