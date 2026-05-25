# WinForms Architecture Reference

## Event-Driven Model

```
User Action → Windows Message → WinForms Event → Handler
Button Click → WM_LBUTTONDOWN → Click event → OnButtonClick()
Text Change → WM_COMMAND → TextChanged → OnTextChanged()
```

```csharp
public partial class MainForm : Form
{
    public MainForm()
    {
        InitializeComponent();
        WireEvents();
    }

    private void WireEvents()
    {
        btnSave.Click += OnSaveClick;
        txtSearch.TextChanged += OnSearchChanged;
        dgvCustomers.SelectionChanged += OnSelectionChanged;
        this.Load += OnFormLoad;
        this.FormClosing += OnFormClosing;
    }

    private async void OnSaveClick(object sender, EventArgs e)
    {
        await SaveDataAsync();
    }
}
```

## Custom Controls

```csharp
// Extended control with rendering
public class ColorPickerButton : Button
{
    public Color SelectedColor
    {
        get => _color;
        set { _color = value; Invalidate(); }
    }
    private Color _color = Color.White;

    public ColorPickerButton()
    {
        SetStyle(ControlStyles.AllPaintingInWmPaint |
                 ControlStyles.UserPaint |
                 ControlStyles.OptimizedDoubleBuffer |
                 ControlStyles.ResizeRedraw, true);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var rect = new Rectangle(4, 4, Width - 8, Height - 8);
        using var brush = new SolidBrush(_color);
        e.Graphics.FillRectangle(brush, rect);
        e.Graphics.DrawRectangle(Pens.Black, rect);
    }
}

// Composite control
public partial class AddressControl : UserControl
{
    public string Street
    {
        get => txtStreet.Text;
        set => txtStreet.Text = value;
    }

    public string City
    {
        get => txtCity.Text;
        set => txtCity.Text = value;
    }

    public AddressControl()
    {
        InitializeComponent();
        SetupLayout();
    }
}
```

## Data Binding

```csharp
// Simple binding
txtName.DataBindings.Add("Text", customer, "Name");
chkActive.DataBindings.Add("Checked", customer, "IsActive");

// BindingSource for lists
var bs = new BindingSource();
bs.DataSource = db.Customers.ToList();
dgvCustomers.DataSource = bs;

// Binding navigation
var navigator = new BindingNavigator(true);
navigator.BindingSource = bs;
this.Controls.Add(navigator);

// Formatting and validation
txtPrice.DataBindings.Add("Text", product, "Price", true,
    DataSourceUpdateMode.OnValidation, null, "C2");
```

## MDI (Multiple Document Interface)

```csharp
// Set parent as MDI container
public partial class MainForm : Form
{
    public MainForm()
    {
        IsMdiContainer = true;
        MenuStrip ms = new MenuStrip();
        // ...
    }

    private void OpenChildForm()
    {
        var child = new DocumentForm();
        child.MdiParent = this;
        child.Show();
    }

    private void CascadeWindows() => LayoutMdi(MdiLayout.Cascade);
    private void TileWindows() => LayoutMdi(MdiLayout.TileHorizontal);
}

// Child form event
protected override void OnFormClosing(FormClosingEventArgs e)
{
    if (HasUnsavedChanges)
    {
        var result = MessageBox.Show("Save changes?", "Unsaved",
            MessageBoxButtons.YesNoCancel);
        if (result == DialogResult.Cancel) e.Cancel = true;
    }
}
```

## GDI+ Drawing

```csharp
public class ChartControl : Control
{
    public float[] DataPoints { get; set; }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.Clear(BackColor);

        if (DataPoints == null || DataPoints.Length == 0) return;

        int barWidth = (Width - 8) / DataPoints.Length - 2;

        using var barBrush = new LinearGradientBrush(
            ClientRectangle, Color.DodgerBlue, Color.Navy,
            LinearGradientMode.Vertical);

        for (int i = 0; i < DataPoints.Length; i++)
        {
            float barHeight = DataPoints[i] * (Height - 20);
            float x = 4 + i * (barWidth + 2);
            float y = Height - 8 - barHeight;
            g.FillRectangle(barBrush, x, y, barWidth, barHeight);
        }
    }
}
```

## Designer Patterns

```csharp
// Designer serialization support
[DefaultProperty("Text")]
[DefaultEvent("Click")]
[ToolboxBitmap(typeof(MyControl), "MyControl.bmp")]
[Description("Custom button control with icon support")]
public class MyControl : Control { }

// Type converter for custom properties
[TypeConverter(typeof(ExpandableObjectConverter))]
public class LayoutSettings
{
    public int Margin { get; set; }
    public int Padding { get; set; }
}

// Smart tag (designer actions)
[Designer("System.Windows.Forms.Design.ControlDesigner, System.Design")]
public class SmartControl : Control { }
```

## Key Patterns

- Event handlers delegate to service layer — no business logic in form
- TableLayoutPanel / FlowLayoutPanel for responsive layouts
- SuspendLayout/ResumeLayout for batch UI updates
- DoubleBuffered = true for flicker-free rendering
- async void only for event handlers (fire-and-forget)
- ErrorProvider for validation, StatusStrip for user feedback
- Control.Invoke/BeginInvoke for cross-thread UI access
