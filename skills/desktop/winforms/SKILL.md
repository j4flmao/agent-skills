---
name: winforms
description: >
  Use this skill when building rapid Windows desktop forms with Windows Forms (.NET) — drag-drop designer, event-driven UI, data-bound controls, .NET Framework/Core. Do NOT use for: modern UIs needing XAML, cross-platform apps, WinUI 3 or WPF projects, web-based UIs.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [desktop, windows, winforms, dotnet, phase-4]
---

# Windows Forms

## Purpose
Build rapid Windows desktop forms applications using Windows Forms designer, event-driven patterns, and data-bound controls on .NET.

## Agent Protocol

### Trigger
User request includes: `winforms`, `windows forms`, `system.windows.forms`, `winforms app`, `form designer`, `.net desktop forms`, `winforms control`.

### Input Context
- .NET version (.NET 8+, .NET Framework 4.8)
- Project type (CRUD app, utility tool, admin panel)
- Data source (SQL Server, Entity Framework, in-memory)
- Third-party controls (DevExpress, Telerik, ComponentOne, none)
- Deployment (ClickOnce, MSI, xcopy)

### Output Artifact
A markdown document containing:
- Form class structure
- Control layout with TableLayoutPanel/FlowLayoutPanel
- Event handler wiring
- Data binding to DataGridView
- Input validation pattern
- CRUD operations with Entity Framework
- Error handling and logging

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Form designed with proper layout containers (TableLayoutPanel, FlowLayoutPanel).
- Event handlers attached to controls (Click, TextChanged, SelectedIndexChanged).
- DataGridView bound to BindingSource with CRUD operations.
- Input validation with ErrorProvider.
- Database operations wrapped in try/catch with user feedback.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Scaffold Project
```bash
dotnet new winforms -n MyApp
cd MyApp
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
```

### Step 2: Main Form Layout
```csharp
// Forms/MainForm.cs
public partial class MainForm : Form
{
    private DataGridView dgv;
    private BindingSource bs;
    private Panel toolbar;
    private Button btnAdd, btnEdit, btnDelete, btnSave;
    private StatusStrip statusBar;
    private ToolStripStatusLabel statusLabel;

    public MainForm()
    {
        InitializeComponent();
        SetupLayout();
        LoadData();
    }

    private void SetupLayout()
    {
        this.Text = "Customer Manager";
        this.Size = new Size(1000, 700);
        this.StartPosition = FormStartPosition.CenterScreen;

        toolbar = new Panel { Dock = DockStyle.Top, Height = 48, Padding = new Padding(8) };

        btnAdd = new Button { Text = "Add", Width = 80 };
        btnEdit = new Button { Text = "Edit", Width = 80, Left = 90 };
        btnDelete = new Button { Text = "Delete", Width = 80, Left = 180 };
        btnSave = new Button { Text = "Save", Width = 80, Left = 270, Enabled = false };

        toolbar.Controls.AddRange(new Control[] { btnAdd, btnEdit, btnDelete, btnSave });

        dgv = new DataGridView
        {
            Dock = DockStyle.Fill,
            AllowUserToAddRows = false,
            AllowUserToDeleteRows = false,
            ReadOnly = true,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            MultiSelect = false,
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
        };

        bs = new BindingSource();

        statusBar = new StatusStrip();
        statusLabel = new ToolStripStatusLabel("Ready");
        statusBar.Items.Add(statusLabel);

        this.Controls.AddRange(new Control[] { dgv, toolbar, statusBar });
    }

    private void LoadData()
    {
        using var db = new AppDbContext();
        bs.DataSource = db.Customers.ToList();
        dgv.DataSource = bs;
        statusLabel.Text = $"Loaded {bs.Count} records";
    }
}
```

### Step 3: CRUD Operations
```csharp
// Forms/MainForm.cs
private void AddClick(object sender, EventArgs e)
{
    var dialog = new CustomerDialog();
    if (dialog.ShowDialog() == DialogResult.OK)
    {
        using var db = new AppDbContext();
        db.Customers.Add(dialog.Customer);
        db.SaveChanges();
        LoadData();
    }
}

private void EditClick(object sender, EventArgs e)
{
    if (bs.Current is not Customer customer) return;
    var dialog = new CustomerDialog(customer);
    if (dialog.ShowDialog() == DialogResult.OK)
    {
        using var db = new AppDbContext();
        db.Entry(dialog.Customer).State = EntityState.Modified;
        db.SaveChanges();
        LoadData();
    }
}

private void DeleteClick(object sender, EventArgs e)
{
    if (bs.Current is not Customer customer) return;
    var result = MessageBox.Show("Delete this customer?", "Confirm",
        MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
    if (result == DialogResult.Yes)
    {
        using var db = new AppDbContext();
        db.Customers.Remove(db.Customers.Find(customer.Id));
        db.SaveChanges();
        LoadData();
    }
}

private void SaveClick(object sender, EventArgs e)
{
    bs.EndEdit();
    using var db = new AppDbContext();
    foreach (var item in bs.List)
    {
        if (item is Customer c)
            db.Entry(c).State = c.Id == 0 ? EntityState.Added : EntityState.Modified;
    }
    db.SaveChanges();
    LoadData();
}
```

### Step 4: Validation with ErrorProvider
```csharp
// Forms/CustomerDialog.cs
public partial class CustomerDialog : Form
{
    private ErrorProvider errorProvider;
    private TextBox txtName, txtEmail;
    private Button btnOk, btnCancel;

    public Customer Customer { get; private set; }

    public CustomerDialog(Customer existing = null)
    {
        InitializeComponent();
        SetupLayout();
        errorProvider = new ErrorProvider();

        if (existing != null)
        {
            txtName.Text = existing.Name;
            txtEmail.Text = existing.Email;
            Customer = existing;
        }
    }

    private void OnOkClick(object sender, EventArgs e)
    {
        if (!ValidateForm()) return;

        Customer ??= new Customer();
        Customer.Name = txtName.Text;
        Customer.Email = txtEmail.Text;
        DialogResult = DialogResult.OK;
        Close();
    }

    private bool ValidateForm()
    {
        var valid = true;

        if (string.IsNullOrWhiteSpace(txtName.Text))
        {
            errorProvider.SetError(txtName, "Name is required");
            valid = false;
        }
        else errorProvider.SetError(txtName, "");

        if (!txtEmail.Text.Contains('@'))
        {
            errorProvider.SetError(txtEmail, "Valid email required");
            valid = false;
        }
        else errorProvider.SetError(txtEmail, "");

        return valid;
    }
}
```

## Rules
- TableLayoutPanel or FlowLayoutPanel for responsive layout — never absolute positioning.
- BindingSource for all data-binding to controls.
- Event handlers never contain business logic — delegate to service layer.
- ErrorProvider for form validation feedback.
- StatusStrip for user-facing status messages.
- async/await for all I/O operations to keep UI responsive.
- Dispose database contexts (using pattern) after each operation.

## References

### Reference Files
- `references/winforms-architecture.md` — Event-driven model, custom controls, data binding, MDI, GDI+ drawing, designer patterns
- `references/winforms-controls.md` — Controls reference, customization, events
- `references/winforms-modernization.md` — High DPI support, theming, async/await patterns, interop with WPF, .NET Core migration
- `references/winforms-setup.md` — Project setup, layout, data binding, deployment

### Related Skills
- `desktop/wpf/SKILL.md` — WPF for richer XAML-based Windows UIs
- `desktop/winui3/SKILL.md` — Modern Windows UI with Fluent Design

## Handoff
Hand off to `desktop/wpf/SKILL.md` when need MVVM architecture, XAML templates, or richer UI capabilities. Hand off to `desktop/winui3/SKILL.md` when Fluent Design required.
