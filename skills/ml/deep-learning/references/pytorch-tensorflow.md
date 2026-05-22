# PyTorch and TensorFlow Reference

## PyTorch Complete Training Script

```python
import torch, torch.nn as nn, torch.optim as optim
from torch.utils.data import Dataset, DataLoader

device = "cuda" if torch.cuda.is_available() else "cpu"

class CustomDataset(Dataset):
    def __init__(self, data, labels):
        self.data = torch.FloatTensor(data)
        self.labels = torch.LongTensor(labels)
    def __len__(self): return len(self.labels)
    def __getitem__(self, idx): return self.data[idx], self.labels[idx]

class MLP(nn.Module):
    def __init__(self, input_dim, hidden_dims, num_classes):
        super().__init__()
        layers = []
        prev = input_dim
        for h in hidden_dims:
            layers.extend([nn.Linear(prev, h), nn.BatchNorm1d(h), nn.ReLU(inplace=True), nn.Dropout(0.2)])
            prev = h
        layers.append(nn.Linear(prev, num_classes))
        self.net = nn.Sequential(*layers)
    def forward(self, x): return self.net(x)

model = MLP(128, [256, 128, 64], 10).to(device)
optimizer = optim.AdamW(model.parameters(), lr=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=10)

train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True, num_workers=8, pin_memory=True)
for epoch in range(10):
    model.train()
    for inputs, targets in train_loader:
        inputs, targets = inputs.to(device), targets.to(device)
        optimizer.zero_grad()
        loss = nn.CrossEntropyLoss()(model(inputs), targets)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
    scheduler.step()
```

## TensorFlow Keras

```python
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

model = keras.Sequential([
    layers.Dense(256, activation="relu", input_shape=(128,)),
    layers.BatchNormalization(),
    layers.Dropout(0.2),
    layers.Dense(128, activation="relu"),
    layers.Dense(10, activation="softmax"),
])
model.compile(optimizer=keras.optimizers.AdamW(1e-4), loss="sparse_categorical_crossentropy")

dataset = tf.data.Dataset.from_tensor_slices((X_train, y_train))
dataset = dataset.shuffle(10000).batch(64).prefetch(tf.data.AUTOTUNE)
model.fit(dataset, validation_data=(X_val, y_val), epochs=50, callbacks=[
    keras.callbacks.ModelCheckpoint("best.keras", save_best_only=True),
    keras.callbacks.EarlyStopping(patience=5),
])
```

## CNN (ResNet Block)

```python
class ResidualBlock(nn.Module):
    def __init__(self, in_ch, out_ch, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, 1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_ch)
        self.shortcut = nn.Sequential()
        if stride != 1 or in_ch != out_ch:
            self.shortcut = nn.Sequential(nn.Conv2d(in_ch, out_ch, 1, stride, bias=False), nn.BatchNorm2d(out_ch))
    def forward(self, x):
        out = torch.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out += self.shortcut(x)
        return torch.relu(out)
```

## LSTM + Transformer

```python
class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes, bidirectional=True):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, bidirectional=bidirectional, dropout=0.2 if num_layers > 1 else 0)
        d = 2 if bidirectional else 1
        self.classifier = nn.Linear(hidden_size * d, num_classes)
    def forward(self, x):
        output, (hn, cn) = self.lstm(x)
        last = hn[-2:] if self.lstm.bidirectional else hn[-1:]
        last = last.transpose(0, 1).reshape(x.size(0), -1)
        return self.classifier(last)

class TransformerEncoder(nn.Module):
    def __init__(self, d_model=256, nhead=8, num_layers=4, dim_feedforward=1024, dropout=0.1):
        super().__init__()
        self.transformer = nn.TransformerEncoder(nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward, dropout, activation="gelu"), num_layers)
    def forward(self, x, mask=None): return self.transformer(x, src_key_padding_mask=mask)
```

## Transfer Learning

```python
model = models.resnet50(weights="DEFAULT")
for p in model.parameters(): p.requires_grad = False
model.fc = nn.Linear(model.fc.in_features, 10)
optimizer = optim.Adam(model.fc.parameters(), lr=1e-3)
for p in model.parameters(): p.requires_grad = True
optimizer = optim.Adam(model.parameters(), lr=1e-5)
```

## References
- PyTorch: https://pytorch.org/docs/stable/
- TensorFlow: https://www.tensorflow.org/api_docs
