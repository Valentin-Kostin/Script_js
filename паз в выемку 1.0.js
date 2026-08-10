function CutsToNotchs(panel) {
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
            if ((+panel.Cuts[i].Contour.Min.y.toFixed(2) <= 0) && (+panel.Cuts[i].Contour.Max.y.toFixed(2) < +panel.GSize.z.toFixed(2))) {
                panel.Cuts[i].Thickness = panel.Cuts[i].Contour.Max.y;
            } else if ((+panel.Cuts[i].Contour.Min.y.toFixed(2) > 0) && (+panel.Cuts[i].Contour.Max.y.toFixed(2) >= +panel.GSize.z.toFixed(2))) {
                panel.Cuts[i].Thickness = -(panel.GSize.z - panel.Cuts[i].Contour.Min.y);
            } else {
                panel.Cuts[i].Thickness = 0;
            }
            panel.Cuts[i].Contour.Clear();
            for (var t = 0; t < traj1_1.Count; ++t) {
                if (traj1_1.Objects[t] == '[object T2DLine]') {
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
                if (traj1_1.Objects[t] == '[object T2DArc]') {
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
                if (traj1_1.Objects[t] == '[object T2DCircle]') {
                    panel.Cuts[i].Contour.AddCircle(traj2_1.Objects[t].Center.x, traj2_1.Objects[t].Center.y, traj2_1.Objects[t].CirRadius);
                    panel.Cuts[i].Contour.AddCircle(traj2_2.Objects[t].Center.x, traj2_2.Objects[t].Center.y, traj2_2.Objects[t].CirRadius);
                }
            }
            if ((traj_pos1) && (traj_pos2)) {
                panel.Cuts[i].Contour.AddLine(traj_pos1.p1.x, traj_pos1.p1.y, traj_pos1.p2.x, traj_pos1.p2.y, );
                panel.Cuts[i].Contour.AddLine(traj_pos2.p1.x, traj_pos2.p1.y, traj_pos2.p2.x, traj_pos2.p2.y, );
            }
            panel.Cuts[i].CutType = 2;
            panel.Cuts[i].Trajectory.Clear();
            panel.Cuts[i].Name = 'выемка';
            panel.Cuts[i].Sign = 'выемка';
            panel.Cuts[i].DeleteParams();
            panel.Build();
        }
    }
}
//***************************************************************************//

CutsToNotchs(Model.Selected);

alert('ok');