# WinForms Modernization Reference

## High DPI Support

```xml
<!-- app.manifest -->
<application xmlns="urn:schemas-microsoft-com:asm.v3">
  <windowsSettings>
    <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">
      PerMonitorV2
    </dpiAwareness>
    <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">
      true
    </dpiAware>
  </windowsSettings>
</application>
```

```csharp
// Program.cs
Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
Application.EnableVisualStyles();
Application.SetCompatibleTextRenderingDefault(false);

// Handle DPI changes at runtime
protected override void OnDpiChanged(DpiChangedEventArgs e)
{
    base.OnDpiChanged(e);
    ScaleControls(e.DeviceDpiNew, e.DeviceDpiOld);
    PerformLayout();
}

// Use TableLayoutPanel for auto-scaling layouts
// Avoid absolute positioning
```

## Theming

```csharp
// Programmatic dark mode
public static class ThemeManager
{
    public static void ApplyDarkMode(Form form)
    {
        form.BackColor = Color.FromArgb(32, 32, 32);
        form.ForeColor = Color.FromArgb(240, 240, 240);

        foreach (Control ctl in form.Controls)
        {
            ApplyDarkModeToControl(ctl);
        }
    }

    private static void ApplyDarkModeToControl(Control ctl)
    {
        switch (ctl)
        {
            case Button btn:
                btn.FlatStyle = FlatStyle.Flat;
                btn.FlatAppearance.BorderColor = Color.FromArgb(64, 64, 64);
                btn.BackColor = Color.FromArgb(60, 60, 60);
                btn.ForeColor = Color.White;
                break;
            case TextBox tb:
                tb.BackColor = Color.FromArgb(45, 45, 45);
                tb.ForeColor = Color.White;
                tb.BorderStyle = BorderStyle.FixedSingle;
                break;
            case DataGridView dgv:
                dgv.BackgroundColor = Color.FromArgb(32, 32, 32);
                dgv.DefaultCellStyle.BackColor = Color.FromArgb(45, 45, 45);
                dgv.DefaultCellStyle.ForeColor = Color.White;
                dgv.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(60, 60, 60);
                dgv.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
                break;
        }
    }
}
```

## Async/Await Patterns

```csharp
// Modern async event handlers
private async void OnLoadClick(object sender, EventArgs e)
{
    btnLoad.Enabled = false;
    statusLabel.Text = "Loading...";

    try
    {
        var data = await Task.Run(() => _service.FetchData());
        dataGridView.DataSource = data;
        statusLabel.Text = $"Loaded {data.Count} records";
    }
    catch (Exception ex)
    {
        MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }
    finally
    {
        btnLoad.Enabled = true;
    }
}

// Async data validation
private async void TxtEmail_Validating(object sender, CancelEventArgs e)
{
    if (string.IsNullOrWhiteSpace(txtEmail.Text)) return;
    var exists = await _service.CheckEmailExistsAsync(txtEmail.Text);
    errorProvider.SetError(txtEmail, exists ? "Email already in use" : "");
}
```

## Interop with WPF

```csharp
// Host WPF control in WinForms
using System.Windows.Forms.Integration;

public partial class MainForm : Form
{
    private ElementHost _wpfHost;
    private WpfChartControl _chart;

    public MainForm()
    {
        _wpfHost = new ElementHost { Dock = DockStyle.Fill };
        _chart = new WpfChartControl();
        _wpfHost.Child = _chart;
        splitContainer.Panel2.Controls.Add(_wpfHost);
    }
}

// Host WinForms control in WPF
// <WindowsFormsHost>
//   <winforms:DataGridView x:Name="dataGrid"/>
// </WindowsFormsHost>
```

## .NET Core Migration

```csharp
// Project file (.csproj) for .NET 8+
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>

// Configuration via Microsoft.Extensions
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSingleton<MainForm>();
builder.Services.AddDbContext<AppDbContext>();

var host = builder.Build();
var form = host.Services.GetRequiredService<MainForm>();
Application.Run(form);
```

## Modernization Checklist

- PerMonitorV2 DPI awareness declared in manifest
- All event handlers async where I/O involved
- Dark/light theme support via ThemeManager
- WPF interop for modern controls (charts, date pickers)
- Migrated to .NET 8+ with nullable enabled
- DI via Microsoft.Extensions.Hosting
- Entity Framework Core instead of DataSet/DataTable
- FluentValidation or similar for validation
- Serilog/NLog for structured logging
- Task.Run for CPU-bound, async for I/O-bound
