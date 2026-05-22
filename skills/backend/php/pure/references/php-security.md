# PHP Security

## OWASP Top 10 for PHP

### 1. SQL Injection

```php
// ❌ UNSAFE
$sql = "SELECT * FROM users WHERE id = " . $_GET['id'];
$pdo->query($sql);

// ✅ SAFE — prepared statements
$stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt->execute([$_GET['id']]);

// ✅ SAFE — named parameters
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email AND status = :status");
$stmt->execute(['email' => $_POST['email'], 'status' => 'active']);
```

### 2. XSS (Cross-Site Scripting)

```php
// ❌ UNSAFE — direct output
echo $_GET['name'];

// ✅ SAFE — escaped output
echo htmlspecialchars($_GET['name'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
echo e($_GET['name']); // custom helper

// ❌ UNSAFE — JSON without context
echo json_encode(['name' => $_GET['name']]); // safe in JSON context

// Content-Security-Policy header
header("Content-Security-Policy: default-src 'self'; script-src 'self' https://trusted.cdn.com");
```

### 3. CSRF (Cross-Site Request Forgery)

```php
// Generate token
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

// Include in forms
echo '<input type="hidden" name="_token" value="' . $_SESSION['csrf_token'] . '">';

// Verify
if (!hash_equals($_SESSION['csrf_token'], $_POST['_token'] ?? '')) {
    throw new HttpException(403, 'Invalid CSRF token');
}

// Double-submit cookie pattern
setcookie('csrf_token', $token, [
    'secure' => true,
    'httponly' => false, // must be accessible to JS
    'samesite' => 'Lax',
]);
```

### 4. Password Security

```php
// ✅ Hashing
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

// ✅ Verification
if (password_verify($password, $hash)) {
    // login success
}

// ✅ Rehash if needed
if (password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 14])) {
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 14]);
    // update stored hash
}

// ❌ UNSAFE
$hash = md5($password);  // never
$hash = sha1($password); // never
$hash = hash('sha256', $password); // never without salt + iterations
```

### 5. Session Security

```php
// Before session_start()
ini_set('session.cookie_httponly', '1');    // JS cannot access
ini_set('session.cookie_secure', '1');       // HTTPS only
ini_set('session.cookie_samesite', 'Lax');   // CSRF protection
ini_set('session.use_strict_mode', '1');     // reject uninitialized session IDs
ini_set('session.use_only_cookies', '1');    // no URL-based sessions
ini_set('session.sid_length', '48');         // longer session ID
ini_set('session.sid_bits_per_character', '6'); // more entropy

// Regenerate on login
session_regenerate_id(true);

// Session timeout (15 min inactivity)
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > 900)) {
    session_unset();
    session_destroy();
    header('Location: /login');
    exit;
}
$_SESSION['last_activity'] = time();
```

### 6. File Upload Security

```php
// Validate file type (check content, not extension)
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $_FILES['file']['tmp_name']);

$allowed = ['image/jpeg', 'image/png', 'application/pdf'];
if (!in_array($mime, $allowed, true)) {
    throw new HttpException(400, 'Invalid file type');
}

// Validate file size
$maxSize = 10 * 1024 * 1024; // 10MB
if ($_FILES['file']['size'] > $maxSize) {
    throw new HttpException(400, 'File too large');
}

// Store outside document root
$path = __DIR__ . '/../storage/uploads/' . bin2hex(random_bytes(16)) . '.pdf';
move_uploaded_file($_FILES['file']['tmp_name'], $path);

// Never use user-supplied filename
// ❌ move_uploaded_file($_FILES['file']['tmp_name'], '/var/www/html/' . $_FILES['file']['name']);
```

### 7. File Inclusion

```php
// ❌ UNSAFE — remote file inclusion
include $_GET['page'] . '.php';

// ✅ SAFE — whitelist
$allowed = ['home', 'about', 'contact'];
$page = in_array($_GET['page'], $allowed) ? $_GET['page'] : 'home';
include __DIR__ . '/../pages/' . $page . '.php';
```

### 8. Command Injection

```php
// ❌ UNSAFE
shell_exec('ping ' . $_GET['ip']);

// ✅ SAFE — escapeshellarg
shell_exec('ping ' . escapeshellarg($_GET['ip']));

// ✅ SAFER — no shell at all
use Symfony\Component\Process\Process;
$process = new Process(['ping', '-c', '4', $_GET['ip']]);
$process->run();
```

### 9. Directory Traversal

```php
// ❌ UNSAFE
$content = file_get_contents(__DIR__ . '/../pages/' . $_GET['file']);

// ✅ SAFE — realpath check
$base = realpath(__DIR__ . '/../pages/');
$file = realpath($base . '/' . $_GET['file']);
if (!$file || !str_starts_with($file, $base)) {
    throw new HttpException(403, 'Access denied');
}
$content = file_get_contents($file);
```

### 10. Deserialization

```php
// ❌ UNSAFE — arbitrary code execution
$user = unserialize($_GET['data']);

// ✅ SAFE — JSON instead
$user = json_decode($_GET['data'], true, 512, JSON_THROW_ON_ERROR);

// If serialization required: signed payload
$payload = base64_encode(serialize($data));
$sig = hash_hmac('sha256', $payload, $_ENV['APP_SECRET']);
$token = $payload . '.' . $sig;

// Verify
$parts = explode('.', $token);
if (!hash_equals(hash_hmac('sha256', $parts[0], $_ENV['APP_SECRET']), $parts[1])) {
    throw new HttpException(403, 'Invalid token');
}
$data = unserialize(base64_decode($parts[0]));
```

## HTTP Security Headers

```php
// Set all security headers
header('Strict-Transport-Security: max-age=63072000; includeSubDomains');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 0');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'");
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
```

## Input Validation

```php
// Filter by type
filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
filter_var($_POST['age'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 150]]);
filter_var($_POST['url'], FILTER_VALIDATE_URL);

// Sanitize
filter_var($_POST['name'], FILTER_SANITIZE_STRING); // strips tags
filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);

// UUID validation
function isValidUuid(string $uuid): bool
{
    return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $uuid) === 1;
}
```

## Rate Limiting (Application Level)

```php
$ip = $_SERVER['REMOTE_ADDR'];
$key = "rate_limit:$ip:" . date('YmdH');
$current = (int) $redis->get($key);

if ($current >= 100) {
    http_response_code(429);
    header('Retry-After: 3600');
    echo json_encode(['error' => 'Rate limit exceeded']);
    exit;
}

$redis->incr($key);
$redis->expire($key, 3600);
```

## Encryption

```php
// Symmetric encryption (AES-256-GCM)
function encrypt(string $data, string $key): string
{
    $iv = random_bytes(12); // GCM uses 12-byte IV
    $encrypted = openssl_encrypt($data, 'aes-256-gcm', hex2bin($key), OPENSSL_RAW_DATA, $iv, $tag);
    return base64_encode($iv . $encrypted . $tag);
}

function decrypt(string $data, string $key): string
{
    $decoded = base64_decode($data);
    $iv = substr($decoded, 0, 12);
    $tag = substr($decoded, -16);
    $encrypted = substr($decoded, 12, -16);
    return openssl_decrypt($encrypted, 'aes-256-gcm', hex2bin($key), OPENSSL_RAW_DATA, $iv, $tag);
}
```
