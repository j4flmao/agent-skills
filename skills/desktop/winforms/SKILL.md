---
name: desktop-winforms
description: >
  Use when the user asks about Windows Forms (WinForms) development, .NET desktop UI, WinForms controls, GDI+ drawing, or legacy Windows app maintenance. Do NOT use for: WPF (desktop-wpf), WinUI 3 (desktop-winui3), or UWP (desktop-uwp).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, winforms, windows, dotnet]
---

# Windows Forms (WinForms)

## Purpose
Build and maintain Windows desktop applications using Windows Forms — .NET's mature, rapid-application-development UI framework with designer-driven development, rich control set, and direct GDI+ drawing capabilities.

## Agent Protocol

### Trigger
Exact user phrases: "WinForms", "Windows Forms", "Windows Forms app", "winforms", "Form designer", "GDI+", "System.Windows.Forms", "WinForms designer", "Button Click", "DataGridView".

### Input Context
- .NET version (.NET 6+, .NET Framework 4.8.x)
- Visual Studio version (2022 recommended)
- App type (line-of-business, data-entry, utility, legacy migration)
- UI control needs (DataGridView, ListView, TreeView, custom painting, charts)
- Data source (SQL Server, Entity Framework, XML, JSON, web service)
- Deployment (ClickOnce, MSI, XCOPY, MSIX)

### Output Artifact
WinForms application architecture with form hierarchy, event wiring, data binding, and custom drawing strategy.

### Completion Criteria
- [ ] Form hierarchy designed (MDI parent, child forms, dialog forms)
- [ ] Control layout strategy (TableLayoutPanel, FlowLayoutPanel, anchors/docks)
- [ ] Event wiring pattern established (designer vs programmatic)
- [ ] Data binding configuration (BindingSource, BindingNavigator, DataGridView)
- [ ] Data access layer defined (Entity Framework, ADO.NET, Dapper)
- [ ] Custom painting implemented (if needed: OnPaint, GDI+)
- [ ] Validation strategy (ErrorProvider, Validating event, CausesValidation)
- [ ] UI threading (Control.Invoke, BackgroundWorker, async/await)
- [ ] Application settings (Settings.settings, .config file)
- [ ] Deployment method selected (ClickOnce, MSI, MSIX)

### Max Response Length
250 lines.

## Framework/Methodology

### WinForms Architecture Decision Tree
```
What is the app complexity?
├── Simple data entry (CRUD, forms-over-data)
│   → Data-bound controls with BindingSource
│   → TableLayoutPanel for layout, ErrorProvider for validation
├── Moderate complexity (multi-form, reports, printing)
│   → MDI parent with child forms
│   → DataSet/DataTable for offline data, PrintDocument for reports
├── Complex LOB (dashboards, charts, real-time updates)
│   → Custom user controls, UserControl composition
│   → BackgroundWorker for async, Chart control or custom GDI+
└── Legacy migration target (modernizing WinForms)
    → Gradual migration to WinUI 3 via hosting
    → WebView2 for modern UI sections
```

### WinForms Event-Driven Architecture
```
User Action (Click, KeyPress, TextChanged)
   ↓
Event Handler (Form_ButtonClick, TextBox_TextChanged)
   ↓
Business Logic Layer (validate, process, save)
   ↓
Data Access Layer (Entity Framework, ADO.NET, Dapper)
   ↓
UI Update (data binding refresh, status bar, validation results)
```

## Workflow

### Step 1: Set Up .NET WinForms Project

```csharp
// Program.cs (.NET 6+ with top-level statements)
using MyApp;
using MyApp.Data;

ApplicationConfiguration.Initialize();
Application.Run(new MainForm());
```

```csharp
// MainForm.cs
public partial class MainForm : Form
{
    private readonly IDataService _dataService;
    private readonly BindingSource _itemsBindingSource = new();

    public MainForm()
    {
        InitializeComponent();
        _dataService = new DataService();
        SetupDataBinding();
        SetupEventHandlers();
    }

    private void SetupDataBinding()
    {
        _itemsBindingSource.DataSource = typeof(List<Item>);
        dataGridView1.DataSource = _itemsBindingSource;
        bindingNavigator1.BindingSource = _itemsBindingSource;
    }

    private async void SetupEventHandlers()
    {
        Load += async (s, e) => await LoadDataAsync();
        saveButton.Click += SaveButton_Click;
    }

    private async Task LoadDataAsync()
    {
        var items = await _dataService.GetItemsAsync();
        _itemsBindingSource.DataSource = items;
    }
}
```

### Step 2: Layout Management

```csharp
// TableLayoutPanel for form layout
private void InitializeComponent()
{
    var mainLayout = new TableLayoutPanel
    {
        Dock = DockStyle.Fill,
        ColumnCount = 2,
        RowCount = 3,
        Padding = new Padding(12),
        CellBorderStyle = TableLayoutPanelCellBorderStyle.None
    };

    mainLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 30F));
    mainLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 70F));

    // Labels column (col 0)
    mainLayout.Controls.Add(new Label { Text = "Name:", TextAlign = ContentAlignment.MiddleRight }, 0, 0);
    mainLayout.Controls.Add(new Label { Text = "Description:", TextAlign = ContentAlignment.MiddleRight }, 0, 1);

    // Inputs column (col 1)
    var nameTextBox = new TextBox { Dock = DockStyle.Fill };
    var descTextBox = new TextBox { Dock = DockStyle.Fill, Multiline = true, Height = 80 };

    mainLayout.Controls.Add(nameTextBox, 1, 0);
    mainLayout.Controls.Add(descTextBox, 1, 1);

    // Buttons row (span both columns)
    var buttonPanel = new FlowLayoutPanel
    {
        Dock = DockStyle.Fill,
        FlowDirection = FlowDirection.RightToLeft
    };
    buttonPanel.Controls.Add(new Button { Text = "Save", DialogResult = DialogResult.OK });
    buttonPanel.Controls.Add(new Button { Text = "Cancel", DialogResult = DialogResult.Cancel });

    mainLayout.Controls.Add(buttonPanel, 0, 2);
    mainLayout.SetColumnSpan(buttonPanel, 2);

    Controls.Add(mainLayout);
}
```

### Step 3: DataGridView Configuration

```csharp
// Configure DataGridView for performance and usability
private void ConfigureDataGridView()
{
    dataGridView1.AutoGenerateColumns = false;
    dataGridView1.AllowUserToAddRows = false;
    dataGridView1.AllowUserToDeleteRows = true;
    dataGridView1.ReadOnly = false;
    dataGridView1.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
    dataGridView1.MultiSelect = false;
    dataGridView1.RowHeadersWidthSizeMode = DataGridViewRowHeadersWidthSizeMode.AutoSizeToAllHeaders;

    // Virtual mode for large datasets (1000+ rows)
    dataGridView1.VirtualMode = true;
    dataGridView1.RowCount = 100000;
    dataGridView1.CellValueNeeded += DataGridView1_CellValueNeeded;

    // Configure columns
    dataGridView1.Columns.Add(new DataGridViewTextBoxColumn
    {
        Name = "Id",
        DataPropertyName = "Id",
        HeaderText = "ID",
        Width = 50,
        ReadOnly = true
    });

    dataGridView1.Columns.Add(new DataGridViewTextBoxColumn
    {
        Name = "Name",
        DataPropertyName = "Name",
        HeaderText = "Name",
        Width = 200
    });

    dataGridView1.Columns.Add(new DataGridViewCheckBoxColumn
    {
        Name = "IsActive",
        DataPropertyName = "IsActive",
        HeaderText = "Active",
        Width = 60
    });
}

// Virtual mode callback for large datasets
private void DataGridView1_CellValueNeeded(object? sender, DataGridViewCellValueEventArgs e)
{
    e.Value = _cache.GetValue(e.RowIndex, e.ColumnIndex);
}
```

### Step 4: Async Data Operations

```csharp
// Async loading with progress
private async Task LoadDataAsync()
{
    using var scope = new Progress<LoadProgress>(progress =>
    {
        toolStripProgressBar1.Value = progress.Percent;
        statusLabel.Text = $"Loading... {progress.Percent}%";
    });

    try
    {
        var data = await Task.Run(() => _dataService.GetLargeDataSet());
        _itemsBindingSource.DataSource = data;
        statusLabel.Text = $"Loaded {data.Count} items";
    }
    catch (Exception ex)
    {
        MessageBox.Show($"Failed to load data: {ex.Message}", "Error",
            MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
}

// Thread-safe UI updates from background threads
private void BackgroundWorker_DoWork(object? sender, DoWorkEventArgs e)
{
    // Long-running operation
    for (int i = 0; i < 100; i++)
    {
        Thread.Sleep(100);
        // Report progress (invoke on UI thread)
        BeginInvoke(() => progressBar1.Value = i + 1);
    }
}
```

### Step 5: Validation

```csharp
// Using ErrorProvider for validation
private void NameTextBox_Validating(object? sender, CancelEventArgs e)
{
    var textBox = sender as TextBox;
    if (string.IsNullOrWhiteSpace(textBox?.Text))
    {
        e.Cancel = true;
        errorProvider1.SetError(textBox!, "Name is required");
    }
    else if (textBox.Text.Length > 100)
    {
        e.Cancel = true;
        errorProvider1.SetError(textBox!, "Name exceeds 100 characters");
    }
    else
    {
        errorProvider1.SetError(textBox!, "");
    }
}

private void NameTextBox_Validated(object? sender, EventArgs e)
{
    errorProvider1.SetError(sender as Control, "");
}
```

### Step 6: Custom Painting (GDI+)

```csharp
// Custom UserControl with GDI+ painting
public class PieChartControl : Control
{
    public List<PieSlice> Slices { get; set; } = new();

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        var g = e.Graphics;
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;

        var rect = new Rectangle(Padding.Left, Padding.Top,
            Width - Padding.Horizontal, Height - Padding.Vertical);
        float totalAngle = Slices.Sum(s => s.Value);
        float startAngle = 0;

        foreach (var slice in Slices)
        {
            float sweepAngle = (slice.Value / totalAngle) * 360;
            using var brush = new SolidBrush(slice.Color);
            g.FillPie(brush, rect, startAngle, sweepAngle);

            // Draw label
            var midAngle = startAngle + sweepAngle / 2;
            var labelX = rect.X + rect.Width / 2 + (float)(rect.Width / 3 * Math.Cos(midAngle * Math.PI / 180));
            var labelY = rect.Y + rect.Height / 2 + (float)(rect.Height / 3 * Math.Sin(midAngle * Math.PI / 180));
            g.DrawString(slice.Label, Font, Brushes.Black, labelX, labelY);

            startAngle += sweepAngle;
        }
    }
}
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| UI thread blocking | Long operations freeze the form | Use async/await, never sync in event handlers |
| Cross-thread UI access | Control.InvokeRequired ignored | Always check InvokeRequired before cross-thread calls |
| DataGridView without VirtualMode | Loading 10K+ rows is slow | VirtualMode for large data, async loading with progress |
| Not disposing resources | GDI+ handles, SQL connections leak | Using blocks, Dispose pattern, Dispose(true) |
| Magic strings | Form names, control names hardcoded | Use nameof, constants, strongly-typed accessors |
| Missing double-buffering | Custom painting flickers | DoubleBuffered = true, use BufferedGraphics |
| No async in ClickOnce | Deployment missing prerequisites | Check prerequisite installer, log installation errors |
| Large .config files | Settings scattered in app.config | Use Settings.settings with typed accessors |
| AutoScaleMode mismatch | Forms scaled wrong on high-DPI | Set AutoScaleMode = Dpi, test at 100%, 150%, 200% |
| FormClosing without confirmation | Accidental data loss | Check IsDirty in FormClosing, prompt to save |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| TableLayoutPanel for layout | Resizable, maintainable, designer-friendly |
| Async void for event handlers, async Task for everything else | Fire-and-forget only for UI events |
| DataBinding over manual property assignment | Less code, automatic updates, separation of concerns |
| UserControl for reusable UI | Encapsulation, designer support, reusability |
| VirtualMode for large DataGridView | Handles millions of rows with minimal memory |
| DoubleBuffered = true for custom painting | Eliminates flicker |
| ErrorProvider for validation | Consistent validation UX, accessibility |
| Application.DoEvents only in progress bars | Can cause reentrancy bugs |
| Strong-name signed assemblies | Versioning, GAC deployment, ClickOnce trust |
| Dark mode awareness | Read Windows theme, adjust colors accordingly |

## Architecture Patterns

### MDI (Multiple Document Interface)
```csharp
// Set parent form as MDI container
IsMdiContainer = true;

// Create child form
var childForm = new ChildForm();
childForm.MdiParent = this;
childForm.Show();

// Tile/layout children
LayoutMdi(MdiLayout.TileHorizontal);
```

### Custom User Control with Events
```csharp
public class NumericStepper : UserControl
{
    [Browsable(true)]
    [Category("Action")]
    public event EventHandler<int>? ValueChanged;

    private int _value;
    public int Value
    {
        get => _value;
        set
        {
            _value = value;
            valueLabel.Text = value.ToString();
            ValueChanged?.Invoke(this, value);
        }
    }
}
```

## References
  - references/winforms-advanced.md — WinForms Advanced Topics
  - references/winforms-data-binding.md — WinForms Data Binding Reference
  - references/winforms-fundamentals.md — WinForms Fundamentals
  - references/winforms-performance.md — WinForms Performance Reference
## Handoff
Hand off to `desktop-winui3` for modern Windows UI migration. Hand off to `desktop-wpf` for richer UI capabilities.
