# Windows Forms Setup Reference

## Project Structure

```
MyApp/
├── Program.cs              # Entry point, Application.Run()
├── Forms/
│   ├── MainForm.cs / .Designer.cs / .resx
│   ├── CustomerDialog.cs / .Designer.cs / .resx
│   └── SettingsForm.cs / .Designer.cs / .resx
├── Controls/
│   └── DataGridViewExtensions.cs
├── Data/
│   ├── AppDbContext.cs
│   └── Migrations/
├── Models/
│   ├── Customer.cs
│   └── Order.cs
├── Services/
│   ├── ICustomerService.cs
│   └── CustomerService.cs
├── Helpers/
│   ├── ValidationHelper.cs
│   └── UIHelper.cs
└── appsettings.json
```

## Program.cs Entry Point

```csharp
// .NET 6+ style
using MyApp.Forms;

ApplicationConfiguration.Initialize();
Application.Run(new MainForm());

// With DI
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices(services =>
    {
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddTransient<MainForm>();
        services.AddTransient<CustomerDialog>();
    })
    .Build();

var form = host.Services.GetRequiredService<MainForm>();
Application.Run(form);
```

## Form Designer File

```csharp
// MainForm.Designer.cs — auto-generated, edit via designer
partial class MainForm
{
    private System.ComponentModel.IContainer components = null;
    private DataGridView dgvItems;
    private Button btnAdd, btnEdit, btnDelete;
    private TextBox txtSearch;
    private BindingSource bsItems;
    private ErrorProvider errorProvider;
    private StatusStrip statusStrip;
    private ToolStripStatusLabel statusLabel;
    private TableLayoutPanel tableLayout;

    protected override void Dispose(bool disposing)
    {
        if (disposing && (components != null))
            components.Dispose();
        base.Dispose(disposing);
    }

    private void InitializeComponent()
    {
        components = new System.ComponentModel.Container();

        dgvItems = new DataGridView();
        btnAdd = new Button();
        btnEdit = new Button();
        btnDelete = new Button();
        txtSearch = new TextBox();
        bsItems = new BindingSource(components);
        errorProvider = new ErrorProvider(components);
        statusStrip = new StatusStrip();
        statusLabel = new ToolStripStatusLabel();
        tableLayout = new TableLayoutPanel();

        // TableLayoutPanel
        tableLayout.Dock = DockStyle.Fill;
        tableLayout.ColumnCount = 1;
        tableLayout.RowCount = 3;
        tableLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 40F)); // search row
        tableLayout.RowStyles.Add(new RowStyle(SizeType.Absolute, 48F)); // button row
        tableLayout.RowStyles.Add(new RowStyle(SizeType.Percent, 100F)); // grid

        // Search TextBox
        txtSearch.Dock = DockStyle.Fill;
        txtSearch.TextChanged += TxtSearch_TextChanged;

        // Buttons
        btnAdd.Text = "Add";
        btnAdd.Click += BtnAdd_Click;
        btnEdit.Text = "Edit";
        btnEdit.Click += BtnEdit_Click;
        btnDelete.Text = "Delete";
        btnDelete.Click += BtnDelete_Click;

        // DataGridView
        dgvItems.Dock = DockStyle.Fill;
        dgvItems.SelectionMode = DataGridViewSelectionMode.FullRowSelect;
        dgvItems.MultiSelect = false;
        dgvItems.AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill;
        dgvItems.AllowUserToAddRows = false;
        dgvItems.AllowUserToDeleteRows = false;

        // StatusStrip
        statusStrip.Items.Add(statusLabel);

        // Compose
        tableLayout.Controls.Add(txtSearch, 0, 0);
        tableLayout.Controls.Add(btnAdd, 0, 1); // Simplified; use FlowPanel for buttons
        tableLayout.Controls.Add(dgvItems, 0, 2);

        Controls.Add(tableLayout);
        Controls.Add(statusStrip);

        Text = "My Application";
        Size = new Size(1000, 700);
        StartPosition = FormStartPosition.CenterScreen;
    }
}
```

## Data Binding with BindingSource

```csharp
// Form code-behind
private void MainForm_Load(object sender, EventArgs e)
{
    using var db = new AppDbContext();
    bsItems.DataSource = db.Customers.ToList();
    dgvItems.DataSource = bsItems;
}

// Filter with BindingSource.Filter
private void TxtSearch_TextChanged(object sender, EventArgs e)
{
    if (string.IsNullOrWhiteSpace(txtSearch.Text))
        bsItems.RemoveFilter();
    else
        bsItems.Filter = $"Name LIKE '%{txtSearch.Text}%'";
}

// Navigate
private void BtnFirst_Click(object sender, EventArgs e) => bsItems.MoveFirst();
private void BtnPrev_Click(object sender, EventArgs e) => bsItems.MovePrevious();
private void BtnNext_Click(object sender, EventArgs e) => bsItems.MoveNext();
private void BtnLast_Click(object sender, EventArgs e) => bsItems.MoveLast();
```

## Layout Containers

| Container | Behavior | Use |
|-----------|----------|-----|
| TableLayoutPanel | Grid of cells with row/column sizing | Form-level layout |
| FlowLayoutPanel | Wrapping row or column | Toolbars, dynamic lists |
| SplitContainer | Resizable split panels | Master-detail |
| Panel | Simple container with scroll | Grouping |
| TabControl | Tabbed pages | Multi-page dialogs |
| GroupBox | Grouped with title border | Section grouping |

## ClickOnce Deployment

```bash
# Publish via CLI
dotnet publish -f net8.0-windows -p:PublishProfile=ClickOnceProfile

# Or configure in .csproj:
```

```xml
<PropertyGroup>
  <Configuration>Release</Configuration>
  <Platform>Any CPU</Platform>
  <PublishProtocol>ClickOnce</PublishProtocol>
  <InstallUrl>https://appserver.mycompany.com/app/</InstallUrl>
  <ProductName>MyApp</ProductName>
  <PublisherName>MyCompany</PublisherName>
  <ApplicationVersion>1.0.0.*</ApplicationVersion>
  <MapFileExtensions>true</MapFileExtensions>
  <UpdateEnabled>true</UpdateEnabled>
  <UpdateMode>Background</UpdateMode>
  <UpdateInterval>1</UpdateInterval>
  <UpdateIntervalUnits>Days</UpdateUpdateIntervalUnits>
</PropertyGroup>
```

## High DPI Support

```csharp
// Program.cs
Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);

// app.manifest
<application xmlns="urn:schemas-microsoft-com:asm.v3">
  <windowsSettings>
    <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true</dpiAware>
    <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
  </windowsSettings>
</application>
```

## Common .csproj Settings

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <ApplicationHighDpiMode>PerMonitorV2</ApplicationHighDpiMode>
    <ApplicationManifest>app.manifest</ApplicationManifest>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>
```
