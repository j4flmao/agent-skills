# Go CLI Application Patterns

## CLI Structure

### Application Layout
```
cmd/myapp/
    main.go
internal/
    cli/
        root.go
        commands/
            serve.go
            migrate.go
            seed.go
        flags.go
    config/
        config.go
```

### Root Command
```go
package cli

import (
    "log"
    "os"

    "github.com/urfave/cli/v2"
)

func NewApp(cfg *config.Config) *cli.App {
    app := &cli.App{
        Name:     "myapp",
        Usage:    "Application CLI",
        Version:  "1.0.0",
        Commands: []*cli.Command{
            NewServeCommand(cfg),
            NewMigrateCommand(cfg),
            NewSeedCommand(cfg),
        },
        Flags: []cli.Flag{
            &cli.StringFlag{
                Name:    "config",
                Aliases: []string{"c"},
                Usage:   "Config file path",
                EnvVars: []string{"MYAPP_CONFIG"},
            },
            &cli.StringFlag{
                Name:    "env",
                Usage:   "Environment (development, staging, production)",
                EnvVars: []string{"APP_ENV"},
                Value:   "development",
            },
        },
        Before: func(ctx *cli.Context) error {
            log.SetFlags(log.LstdFlags | log.Lshortfile)
            return nil
        },
    }
    return app
}

func Execute() {
    cfg := config.Load()
    app := NewApp(cfg)
    if err := app.Run(os.Args); err != nil {
        log.Fatal(err)
    }
}
```

## Command Patterns

### Serve Command
```go
package commands

import (
    "context"
    "log"
    "os/signal"
    "syscall"

    "github.com/urfave/cli/v2"
)

func NewServeCommand(cfg *config.Config) *cli.Command {
    return &cli.Command{
        Name:    "serve",
        Aliases: []string{"s"},
        Usage:   "Start the HTTP server",
        Flags: []cli.Flag{
            &cli.IntFlag{
                Name:  "port",
                Usage: "Server port",
                Value: 8080,
            },
            &cli.StringFlag{
                Name:  "host",
                Usage: "Server host",
                Value: "0.0.0.0",
            },
        },
        Action: func(ctx *cli.Context) error {
            port := ctx.Int("port")
            host := ctx.String("host")

            srv := server.New(cfg, host, port)

            ctx2, cancel := signal.NotifyContext(
                context.Background(),
                syscall.SIGINT,
                syscall.SIGTERM,
            )
            defer cancel()

            log.Printf("Server starting on %s:%d", host, port)
            if err := srv.Start(ctx2); err != nil {
                return err
            }

            <-ctx2.Done()
            log.Println("Shutting down server...")
            return srv.Shutdown(context.Background())
        },
    }
}
```

### Migration Command
```go
package commands

import (
    "fmt"
    "log"

    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    "github.com/urfave/cli/v2"
)

func NewMigrateCommand(cfg *config.Config) *cli.Command {
    return &cli.Command{
        Name:  "migrate",
        Usage: "Database migrations",
        Subcommands: []*cli.Command{
            {
                Name:  "up",
                Usage: "Run all pending migrations",
                Action: func(ctx *cli.Context) error {
                    m, err := migrate.New(
                        "file://migrations",
                        cfg.DatabaseURL,
                    )
                    if err != nil {
                        return err
                    }
                    defer m.Close()

                    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
                        return err
                    }
                    log.Println("Migrations completed")
                    return nil
                },
            },
            {
                Name:  "down",
                Usage: "Rollback last migration",
                Flags: []cli.Flag{
                    &cli.IntFlag{
                        Name:  "steps",
                        Usage: "Number of migrations to rollback",
                        Value: 1,
                    },
                },
                Action: func(ctx *cli.Context) error {
                    m, err := migrate.New(
                        "file://migrations",
                        cfg.DatabaseURL,
                    )
                    if err != nil {
                        return err
                    }
                    defer m.Close()

                    if err := m.Steps(-ctx.Int("steps")); err != nil {
                        return err
                    }
                    log.Println("Migration rolled back")
                    return nil
                },
            },
            {
                Name:  "create",
                Usage: "Create a new migration",
                Action: func(ctx *cli.Context) error {
                    name := ctx.Args().First()
                    if name == "" {
                        return fmt.Errorf("migration name is required")
                    }

                    // Create migration files
                    timestamp := time.Now().Format("20060102150405")
                    upFile := fmt.Sprintf("migrations/%s_%s.up.sql", timestamp, name)
                    downFile := fmt.Sprintf("migrations/%s_%s.down.sql", timestamp, name)

                    if err := os.WriteFile(upFile, []byte("-- Migration up\n"), 0644); err != nil {
                        return err
                    }
                    if err := os.WriteFile(downFile, []byte("-- Migration down\n"), 0644); err != nil {
                        return err
                    }

                    log.Printf("Created migration: %s", upFile)
                    return nil
                },
            },
        },
    }
}
```

### Seed Command
```go
package commands

import (
    "log"

    "github.com/urfave/cli/v2"
)

func NewSeedCommand(cfg *config.Config) *cli.Command {
    return &cli.Command{
        Name:  "seed",
        Usage: "Seed the database with test data",
        Action: func(ctx *cli.Context) error {
            db := connectDB(cfg.DatabaseURL)
            defer db.Close()

            log.Println("Seeding database...")

            seeders := []func(*sql.DB) error{
                seedUsers,
                seedProducts,
                seedOrders,
            }

            for _, seeder := range seeders {
                if err := seeder(db); err != nil {
                    return err
                }
            }

            log.Println("Database seeded successfully")
            return nil
        },
    }
}

func seedUsers(db *sql.DB) error {
    users := []struct {
        Email string
        Name  string
    }{
        {"admin@example.com", "Admin"},
        {"user@example.com", "User"},
    }

    for _, u := range users {
        _, err := db.Exec(
            `INSERT INTO users (email, name, password_hash)
             VALUES ($1, $2, $3)
             ON CONFLICT (email) DO NOTHING`,
            u.Email, u.Name, hashPassword("password123"),
        )
        if err != nil {
            return err
        }
    }
    return nil
}
```

## Config Loading

### Configuration from CLI
```go
package config

import (
    "os"

    "gopkg.in/yaml.v3"
)

type Config struct {
    DatabaseURL string `yaml:"database_url"`
    RedisURL    string `yaml:"redis_url"`
    JWTSecret   string `yaml:"jwt_secret"`
    Server      ServerConfig `yaml:"server"`
}

type ServerConfig struct {
    Host string `yaml:"host"`
    Port int    `yaml:"port"`
}

func Load() *Config {
    cfg := &Config{
        Server: ServerConfig{Host: "0.0.0.0", Port: 8080},
    }

    // Load from file if specified
    if path := os.Getenv("MYAPP_CONFIG"); path != "" {
        data, err := os.ReadFile(path)
        if err == nil {
            yaml.Unmarshal(data, cfg)
        }
    }

    // Environment overrides
    if v := os.Getenv("DATABASE_URL"); v != "" {
        cfg.DatabaseURL = v
    }
    if v := os.Getenv("JWT_SECRET"); v != "" {
        cfg.JWTSecret = v
    }

    return cfg
}
```

## Subcommand Hierarchies

### Nested Commands
```go
func NewAuthCommand() *cli.Command {
    return &cli.Command{
        Name:  "auth",
        Usage: "Authentication management",
        Subcommands: []*cli.Command{
            {
                Name:  "create-key",
                Usage: "Create a new API key",
                Flags: []cli.Flag{
                    &cli.StringFlag{
                        Name:     "name",
                        Usage:    "Key name",
                        Required: true,
                    },
                    &cli.StringSliceFlag{
                        Name:  "scope",
                        Usage: "Key scopes",
                    },
                },
                Action: func(ctx *cli.Context) error {
                    name := ctx.String("name")
                    scopes := ctx.StringSlice("scope")
                    key, err := generateAPIKey(name, scopes)
                    if err != nil {
                        return err
                    }
                    fmt.Printf("API Key: %s\n", key)
                    return nil
                },
            },
            {
                Name:  "revoke-key",
                Usage: "Revoke an API key",
                Flags: []cli.Flag{
                    &cli.StringFlag{
                        Name:     "key",
                        Usage:    "Key ID to revoke",
                        Required: true,
                    },
                },
                Action: func(ctx *cli.Context) error {
                    keyID := ctx.String("key")
                    if err := revokeAPIKey(keyID); err != nil {
                        return err
                    }
                    fmt.Printf("Key %s revoked\n", keyID)
                    return nil
                },
            },
        },
    }
}
```

## Output Formatting

### Table Output
```go
package output

import (
    "fmt"
    "os"
    "text/tabwriter"
    "text/template"
)

func PrintTable(headers []string, rows [][]string) {
    w := tabwriter.NewWriter(os.Stdout, 0, 0, 3, ' ', 0)

    // Headers
    for i, h := range headers {
        if i > 0 {
            fmt.Fprint(w, "\t")
        }
        fmt.Fprint(w, h)
    }
    fmt.Fprintln(w)

    // Separator
    for i := range headers {
        if i > 0 {
            fmt.Fprint(w, "\t")
        }
        fmt.Fprint(w, "------")
    }
    fmt.Fprintln(w)

    // Rows
    for _, row := range rows {
        for i, cell := range row {
            if i > 0 {
                fmt.Fprint(w, "\t")
            }
            fmt.Fprint(w, cell)
        }
        fmt.Fprintln(w)
    }

    w.Flush()
}

func PrintJSON(data interface{}) error {
    encoder := json.NewEncoder(os.Stdout)
    encoder.SetIndent("", "  ")
    return encoder.Encode(data)
}

func PrintTemplate(tmpl string, data interface{}) error {
    t, err := template.New("output").Parse(tmpl)
    if err != nil {
        return err
    }
    return t.Execute(os.Stdout, data)
}
```

## Dry Run Mode

### Dry Run Pattern
```go
type Runner struct {
    dryRun bool
}

func (r *Runner) Execute(action string, fn func() error) error {
    if r.dryRun {
        log.Printf("[DRY RUN] Would execute: %s", action)
        return nil
    }
    log.Printf("Executing: %s", action)
    return fn()
}

// Usage in command
func NewDeployCommand() *cli.Command {
    return &cli.Command{
        Name: "deploy",
        Flags: []cli.Flag{
            &cli.BoolFlag{
                Name:  "dry-run",
                Usage: "Show what would be deployed without actually deploying",
            },
        },
        Action: func(ctx *cli.Context) error {
            runner := &Runner{dryRun: ctx.Bool("dry-run")}

            if err := runner.Execute("pulling latest images", pullImages); err != nil {
                return err
            }
            if err := runner.Execute("running migrations", runMigrations); err != nil {
                return err
            }
            if err := runner.Execute("restarting services", restartServices); err != nil {
                return err
            }

            if !ctx.Bool("dry-run") {
                log.Println("Deployment completed")
            }
            return nil
        },
    }
}
```

## Key Points
- CLI application structure separates commands into focused files
- urfave/cli provides command hierarchy, flags, and argument parsing
- Subcommands organize related operations (migrate up/down/create)
- Commands can start long-running processes (serve) or one-shot tasks (seed, migrate)
- Config loading combines file-based defaults with environment overrides
- Dry run mode allows previewing destructive operations
- Table and JSON output formatters support scriptable CLI usage
- Signal handling enables graceful shutdown of server commands
- Migration commands integrate with golang-migrate for database versioning
