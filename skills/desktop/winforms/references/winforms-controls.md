# Windows Forms Controls Reference

## Common Controls

| Control | Namespace | Purpose | Key Property |
|---------|-----------|---------|--------------|
| Button | System.Windows.Forms | Click action | Click event |
| TextBox | System.Windows.Forms | Text input | Text |
| RichTextBox | System.Windows.Forms | Rich text editing | Rtf |
| MaskedTextBox | System.Windows.Forms | Patterned input | Mask |
| NumericUpDown | System.Windows.Forms | Numeric spinner | Value |
| ComboBox | System.Windows.Forms | Dropdown selection | SelectedItem |
| ListBox | System.Windows.Forms | Item list | SelectedItem |
| CheckedListBox | System.Windows.Forms | Multi-select list | CheckedItems |
| DateTimePicker | System.Windows.Forms | Date picker | Value |
| MonthCalendar | System.Windows.Forms | Calendar | SelectionRange |
| DataGridView | System.Windows.Forms | Tabular data | DataSource |
| ListView | System.Windows.Forms | Icon/list view | Items |
| TreeView | System.Windows.Forms | Hierarchical tree | Nodes |
| TabControl | System.Windows.Forms | Tab pages | TabPages |
| SplitContainer | System.Windows.Forms | Split panels | Panel1/Panel2 |
| Panel | System.Windows.Forms | Container | Controls |
| GroupBox | System.Windows.Forms | Grouped container | Text |
| FlowLayoutPanel | System.Windows.Forms | Flow layout | Controls |
| TableLayoutPanel | System.Windows.Forms | Grid layout | Controls |
| PictureBox | System.Windows.Forms | Image display | Image |
| ProgressBar | System.Windows.Forms | Progress bar | Value |
| TrackBar | System.Windows.Forms | Slider | Value |
| CheckBox | System.Windows.Forms | Toggle | Checked |
| RadioButton | System.Windows.Forms | Option button | Checked |
| Label | System.Windows.Forms | Text label | Text |
| LinkLabel | System.Windows.Forms | Clickable link | Links |
| NotifyIcon | System.Windows.Forms | System tray | Icon |
| ToolStrip | System.Windows.Forms | Toolbar | Items |
| MenuStrip | System.Windows.Forms | Menu bar | Items |
| StatusStrip | System.Windows.Forms | Status bar | Items |
| ErrorProvider | System.Windows.Forms | Validation icon | SetError() |
| ToolTip | System.Windows.Forms | Hover tooltip | SetToolTip() |
| HelpProvider | System.Windows.Forms | Help system | SetHelpString() |
| Timer | System.Windows.Forms | Interval timer | Tick event |
| FolderBrowserDialog | System.Windows.Forms | Folder picker | SelectedPath |
| OpenFileDialog | System.Windows.Forms | File open | FileName |
| SaveFileDialog | System.Windows.Forms | File save | FileName |
| PrintDialog | System.Windows.Forms | Print setup | PrinterSettings |
| PrintPreviewDialog | System.Windows.Forms | Print preview | Document |
| PageSetupDialog | System.Windows.Forms | Page setup | PageSettings |

## DataGridView Customization

```csharp
// Columns setup
dgv.AutoGenerateColumns = false;
dgv.Columns.Clear();

dgv.Columns.Add(new DataGridViewTextBoxColumn
{
    HeaderText = "ID",
    DataPropertyName = "Id",
    Width = 60,
    ReadOnly = true,
    DefaultCellStyle = new DataGridViewCellStyle { Alignment = DataGridViewContentAlignment.MiddleRight }
});

dgv.Columns.Add(new DataGridViewTextBoxColumn
{
    HeaderText = "Name",
    DataPropertyName = "Name",
    Width = 200,
    AutoSizeMode = DataGridViewAutoSizeColumnMode.Fill
});

dgv.Columns.Add(new DataGridViewTextBoxColumn
{
    HeaderText = "Created",
    DataPropertyName = "CreatedDate",
    Width = 120,
    DefaultCellStyle = new DataGridViewCellStyle { Format = "yyyy-MM-dd" }
});

dgv.Columns.Add(new DataGridViewCheckBoxColumn
{
    HeaderText = "Active",
    DataPropertyName = "IsActive",
    Width = 60
});

// Cell formatting
dgv.CellFormatting += (s, e) =>
{
    if (dgv.Columns[e.ColumnIndex].DataPropertyName == "Status" && e.Value != null)
    {
        var status = e.Value.ToString();
        e.CellStyle.BackColor = status == "Active" ? Color.LightGreen : Color.LightPink;
        e.CellStyle.ForeColor = status == "Active" ? Color.DarkGreen : Color.DarkRed;
    }
};

// Row selection styling
dgv.RowPrePaint += (s, e) =>
{
    if (e.State.HasFlag(DataGridViewElementStates.Selected))
    {
        e.PaintParts &= ~DataGridViewPaintParts.Background;
        using var brush = new SolidBrush(Color.FromArgb(60, 0, 120, 215));
        e.Graphics.FillRectangle(brush, e.RowBounds);
    }
};
```

## ComboBox Binding

```csharp
// Data source
var categories = new List<Category>
{
    new() { Id = 1, Name = "Electronics" },
    new() { Id = 2, Name = "Books" },
    new() { Id = 3, Name = "Clothing" }
};

cmbCategory.DataSource = categories;
cmbCategory.DisplayMember = "Name";
cmbCategory.ValueMember = "Id";
cmbCategory.SelectedValue = 2; // Default selection

// Get selected value
int categoryId = (int)cmbCategory.SelectedValue;
```

## ListView with Details View

```csharp
listView.View = View.Details;
listView.FullRowSelect = true;
listView.GridLines = true;

listView.Columns.Add("Name", 200);
listView.Columns.Add("Size", 80);
listView.Columns.Add("Modified", 150);

var item = new ListViewItem(new[] { "report.pdf", "1.2 MB", "2026-05-20" });
item.Tag = fileInfo;
listView.Items.Add(item);

// Sorting
listView.ListViewItemSorter = new ListViewColumnSorter();

// Custom drawing
listView.OwnerDraw = true;
listView.DrawItem += (s, e) => { /* custom render */ };
```

## ErrorProvider Validation

```csharp
private bool ValidateForm()
{
    bool valid = true;

    if (string.IsNullOrWhiteSpace(txtName.Text))
    {
        errorProvider.SetError(txtName, "Name is required");
        valid = false;
    }
    else
        errorProvider.SetError(txtName, "");

    if (!decimal.TryParse(txtPrice.Text, out decimal price))
    {
        errorProvider.SetError(txtPrice, "Invalid price");
        valid = false;
    }
    else if (price < 0)
    {
        errorProvider.SetError(txtPrice, "Price cannot be negative");
        valid = false;
    }
    else
        errorProvider.SetError(txtPrice, "");

    return valid;
}
```

## BackgroundWorker for Async

```csharp
var worker = new BackgroundWorker
{
    WorkerReportsProgress = true,
    WorkerSupportsCancellation = true
};

worker.DoWork += (s, e) =>
{
    for (int i = 0; i <= 100; i++)
    {
        if (worker.CancellationPending) { e.Cancel = true; return; }
        Thread.Sleep(50); // Simulate work
        worker.ReportProgress(i);
    }
};

worker.ProgressChanged += (s, e) =>
{
    progressBar.Value = e.ProgressPercentage;
    statusLabel.Text = $"{e.ProgressPercentage}%";
};

worker.RunWorkerCompleted += (s, e) =>
{
    if (e.Cancelled) statusLabel.Text = "Cancelled";
    else if (e.Error != null) statusLabel.Text = $"Error: {e.Error.Message}";
    else statusLabel.Text = "Complete";
};
```

## Owner-Drawn Controls

```csharp
// Owner-drawn ListBox
listBox.DrawMode = DrawMode.OwnerDrawFixed;
listBox.ItemHeight = 40;

listBox.DrawItem += (s, e) =>
{
    e.DrawBackground();
    if (e.Index < 0) return;

    var item = listBox.Items[e.Index].ToString();
    var isSelected = (e.State & DrawItemState.Selected) == DrawItemState.Selected;

    using var backBrush = new SolidBrush(isSelected ? Color.FromArgb(0, 120, 215) : Color.White);
    using var foreBrush = new SolidBrush(isSelected ? Color.White : Color.Black);
    using var font = new Font("Segoe UI", 11);

    e.Graphics.FillRectangle(backBrush, e.Bounds);
    e.Graphics.DrawString(item, font, foreBrush, e.Bounds.X + 8, e.Bounds.Y + 8);

    e.DrawFocusRectangle();
};
```
