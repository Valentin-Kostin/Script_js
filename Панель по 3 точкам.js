while (true)
{
p1 = GetPoint("Укажите точку 1");
p2 = GetPoint("Укажите точку 2");
p3 = GetPoint("Укажите точку 3");
p1 = new Vector(p1.x, p1.y, p1.z);
p2 = new Vector(p2.x, p2.y, p2.z);
p3 = new Vector(p3.x, p3.y, p3.z);
v1 = p1.subtract(p2);
v2 = p1.subtract(p3);
normal = v1.cross(v2);
panel = AddHorizPanel(0, 0, 10, 10, 0);
panel.Orient(normal, v1);
panel.Contour.Clear();
panel.Position = p1;
p2 = panel.ToObject(p2);
p3 = panel.ToObject(p3);
panel.Contour.AddLine(0, 0, p2.x, p2.y);
panel.Contour.AddLine(p2.x, p2.y, p3.x, p3.y);
panel.Contour.AddLine(p3.x, p3.y, 0, 0);
//panel.Thickness = 1;
panel.Build();
Action.Commit();
}