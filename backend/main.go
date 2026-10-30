package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"donetick.com/core/config"
	docs "donetick.com/core/docs"
	"donetick.com/core/frontend"
	auth "donetick.com/core/internal/auth"
	"donetick.com/core/internal/auth/apple"
	"donetick.com/core/internal/bridge"
	"donetick.com/core/internal/calendar"
	calRepo "donetick.com/core/internal/calendar/repo"
	"donetick.com/core/internal/chore"
	chRepo "donetick.com/core/internal/chore/repo"
	"donetick.com/core/internal/circle"
	cRepo "donetick.com/core/internal/circle/repo"
	"donetick.com/core/internal/database"
	"donetick.com/core/internal/device"
	dRepo "donetick.com/core/internal/device/repo"
	"donetick.com/core/internal/email"
	"donetick.com/core/internal/events"
	label "donetick.com/core/internal/label"
	lRepo "donetick.com/core/internal/label/repo"
	"donetick.com/core/internal/mfa"
	"donetick.com/core/internal/project"
	pjRepo "donetick.com/core/internal/project/repo"
	reward "donetick.com/core/internal/reward"
	rwRepo "donetick.com/core/internal/reward/repo"

	notifier "donetick.com/core/internal/notifier"
	"donetick.com/core/internal/notifier/push"
	nRepo "donetick.com/core/internal/notifier/repo"
	nps "donetick.com/core/internal/notifier/service"
	"donetick.com/core/internal/notifier/service/bridgenotifier"
	discord "donetick.com/core/internal/notifier/service/discord"
	"donetick.com/core/internal/notifier/service/fcm"
	"donetick.com/core/internal/notifier/service/pushover"
	telegram "donetick.com/core/internal/notifier/service/telegram"
	pRepo "donetick.com/core/internal/points/repo"
	"donetick.com/core/internal/realtime"
	"donetick.com/core/internal/resource"
	"donetick.com/core/internal/storage"
	storageRepo "donetick.com/core/internal/storage/repo"
	spRepo "donetick.com/core/internal/subtask/repo"
	dsync "donetick.com/core/internal/sync"
	"donetick.com/core/internal/thing"
	tRepo "donetick.com/core/internal/thing/repo"
	"donetick.com/core/internal/translation"
	"donetick.com/core/internal/user"
	uRepo "donetick.com/core/internal/user/repo"
	"donetick.com/core/internal/utils"
	"donetick.com/core/logging"
	"donetick.com/core/migrations"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/fx"
	"gorm.io/gorm"

	"donetick.com/core/internal/filter"
	fRepo "donetick.com/core/internal/filter/repo"
)

func main() {
	if len(os.Args) > 1 && os.Args[1] == "backup" {
		os.Exit(runBackup(os.Args[2:]))
	}
	if isWindowsService() {
		runWindowsService()
		return
	}

	app := newApp()
	if err := app.Err(); err != nil {
		log.Fatal(err)
	}
	app.Run()
}

// newApp loads the configuration and wires the server; the caller starts it.
func newApp() *fx.App {
	// Load configuration first
	cfg := config.LoadConfig()

	// Configure logging from application config
	logging.SetConfigFromAppConfig(
		cfg.Logging.Level,
		cfg.Logging.Encoding,
		cfg.Logging.Development,
	)
	return fx.New(
		// Startup runs DB migrations synchronously in an OnStart hook. On large
		// datasets the backfill migrations take well over fx's 15s default,
		// which would abort startup and crash-loop. Give them room to finish.
		fx.StartTimeout(15*time.Minute),
		fx.Supply(cfg),
		fx.Supply(logging.DefaultLogger().Desugar()),

		// fx.Provide(config.NewConfig),
		fx.Provide(auth.NewAuthMiddleware),
		fx.Provide(auth.APITokenMiddleware),
		fx.Provide(auth.NewMultiAuthMiddleware),
		fx.Provide(auth.NewIdentityProvider),
		fx.Provide(resource.NewHandler),

		// fx.Provide(NewBot),
		fx.Provide(database.NewDatabase),
		fx.Provide(chRepo.NewChoreRepository),
		fx.Provide(chore.NewHandler),
		fx.Provide(calendar.NewHandler),
		fx.Provide(calRepo.NewCalendarRepository),
		fx.Provide(uRepo.NewUserRepository),
		fx.Provide(user.NewDeletionService),
		fx.Provide(user.NewHandler),
		fx.Provide(cRepo.NewCircleRepository),
		fx.Provide(circle.NewHandler),

		// Device management:
		fx.Provide(dRepo.NewDeviceRepository),
		fx.Provide(device.NewHandler),

		// Donetick Bridge (hosted push-notification relay):
		fx.Provide(func(cfg *config.Config) bridge.CoreConfig {
			return bridge.CoreConfig{
				Enabled:        cfg.Bridge.Enabled,
				BaseURL:        cfg.Bridge.BaseURL,
				InstanceID:     cfg.Bridge.InstanceID,
				InstanceToken:  cfg.Bridge.InstanceToken,
				TimeoutSeconds: cfg.Bridge.TimeoutSeconds,
			}
		}),
		fx.Provide(bridge.NewSettingsRepository),
		fx.Provide(bridge.NewService),
		fx.Provide(bridge.NewHandler),

		fx.Provide(nRepo.NewNotificationRepository),
		fx.Provide(nps.NewNotificationPlanner),

		// add notifier
		fx.Provide(pushover.NewPushover),
		fx.Provide(telegram.NewTelegramNotifier),
		fx.Provide(discord.NewDiscordNotifier),
		fx.Provide(bridgenotifier.NewBridgeNotifier),
		fx.Provide(notifier.NewNotifier),
		fx.Provide(events.NewEventsProducer),
		fx.Provide(fcm.NewFCMNotifier),
		fx.Provide(push.NewSender),

		// Rate limiter
		fx.Provide(utils.NewRateLimiter),

		// add email sender (implementation selected by email.provider config):
		fx.Provide(email.NewSender),

		// MFA services
		fx.Provide(mfa.NewService),
		fx.Provide(mfa.NewCleanupService),

		// Auth services
		fx.Provide(auth.NewTokenService),
		fx.Provide(auth.NewCleanupService),

		fx.Provide(apple.NewAppleService),

		// add handlers also
		fx.Provide(newServer),
		fx.Provide(notifier.NewScheduler),

		// things
		fx.Provide(tRepo.NewThingRepository),

		// points
		fx.Provide(pRepo.NewPointsRepository),
		fx.Provide(spRepo.NewSubTasksRepository),

		// Labels:
		fx.Provide(lRepo.NewLabelRepository),
		fx.Provide(label.NewHandler),

		// Rewards:
		fx.Provide(rwRepo.NewRewardRepository),
		fx.Provide(reward.NewHandler),

		// Projects:
		fx.Provide(pjRepo.NewProjectRepository),
		fx.Provide(project.NewHandler),

		// Filters:
		fx.Provide(fRepo.NewFilterRepository),
		fx.Provide(filter.NewHandler),

		fx.Provide(thing.NewAPI),
		fx.Provide(thing.NewHandler),

		// translation of chore names and details (task 023)
		fx.Provide(translation.NewService),
		fx.Provide(translation.NewHandler),

		// External Only:
		fx.Provide(chore.NewAPI),

		// Sync:
		fx.Provide(dsync.NewHandler),

		// Frontend
		fx.Provide(frontend.NewHandler),
		fx.Provide(frontend.NewDownloadHandler),

		// Docs
		fx.Provide(docs.NewHandler),

		// storage: factory selects local vs S3 based on config.Storage.StorageType.
		// Set storage_type: "local" in config for local dev, leave blank for S3.
		fx.Provide(storage.NewStorage),
		fx.Provide(storage.NewURLSigner),
		fx.Provide(storage.NewHandler),
		fx.Provide(storage.NewDraftCleanupService),
		fx.Provide(storageRepo.NewStorageRepository),

		// backup service
		// fx.Provide(backup.NewService),
		// fx.Provide(backup.NewHandler),

		// Real-time service and components
		fx.Provide(realtime.NewRealTimeService),
		fx.Provide(realtime.NewTicketStore),
		fx.Provide(realtime.NewAuthMiddleware),
		fx.Provide(realtime.NewPollingHandler),

		// MCP server

		// fx.Invoke(RunApp),
		fx.Invoke(
			chore.Routes,
			calendar.Routes,
			chore.APIs,
			user.Routes,
			circle.Routes,
			device.Routes,
			bridge.Routes,
			thing.Routes,
			translation.Routes,
			thing.APIs,
			label.Routes,
			reward.Routes,
			project.Routes,
			filter.Routes,

			storage.Routes,
			frontend.DownloadRoutes,
			frontend.Routes,
			docs.Routes,
			resource.Routes,
			// backup.Routes,

			dsync.Routes,
			realtime.Routes, // (router, rtAuthMiddleware, pollingHandler, jwtAuth)

			func(r *gin.Engine) {},
		),
	)
}

func newServer(lc fx.Lifecycle, cfg *config.Config, db *gorm.DB, notifier *notifier.Scheduler, eventProducer *events.EventsProducer, mfaCleanup *mfa.CleanupService, authCleanup *auth.CleanupService, rts *realtime.RealTimeService, draftCleanup *storage.DraftCleanupService, ticketStore *realtime.TicketStore) *gin.Engine {
	// Set Gin mode based on logging configuration
	if cfg.Logging.Development || strings.ToLower(cfg.Logging.Level) == "debug" {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// log when http request is made:

	r := gin.New()

	srv := &http.Server{
		Addr:         cfg.Server.ListenAddr(),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	corsConfig := cors.DefaultConfig()
	allowOrigins := make(map[string]bool)
	for _, origin := range cfg.Server.CorsAllowOrigins {
		allowOrigins[origin] = true
	}
	corsConfig.AllowOriginFunc = func(origin string) bool {
		return allowOrigins[origin]
	}

	corsConfig.AllowCredentials = true
	// Add all headers that browsers commonly send
	corsConfig.AddAllowHeaders(
		"Authorization",
		"secretkey",
		"Cache-Control",
		"Content-Type",
		"Accept",
		"Sec-Ch-Ua",
		"Sec-Ch-Ua-Mobile",
		"Sec-Ch-Ua-Platform",
		"User-Agent",
		"Referer",
		"X-Impersonate-User-ID",
		"refresh_token",
	)
	// Expose headers that the frontend might need
	corsConfig.AddExposeHeaders("Content-Type")
	r.Use(cors.New(corsConfig))

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if cfg.Database.Migration {
				database.Migration(db)
				migrations.Run(context.Background(), db)
				err := database.MigrationScripts(db, cfg)
				if err != nil {
					panic(err)
				}
			}
			notifier.Start(context.Background())
			eventProducer.Start(context.Background())
			mfaCleanup.Start(context.Background())
			authCleanup.Start(context.Background())
			draftCleanup.Start(context.Background())

			// Start real-time service
			if err := rts.Start(ctx); err != nil {
				log.Printf("Failed to start real-time service: %v", err)
			}

			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					log.Fatalf("listen: %s\n", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			// Stop real-time service first with timeout
			done := make(chan error, 1)
			go func() {
				done <- rts.Stop()
			}()

			select {
			case err := <-done:
				if err != nil {
					log.Printf("Failed to stop real-time service: %v", err)
				}
			case <-time.After(5 * time.Second):
				log.Printf("Real-time service shutdown timeout, forcing shutdown")
			}

			mfaCleanup.Stop()
			authCleanup.Stop()
			draftCleanup.Stop()

			// Stop the SSE ticket store cleanup goroutine
			ticketStore.Stop()

			// Shutdown HTTP server with timeout
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			if err := srv.Shutdown(shutdownCtx); err != nil {
				log.Printf("Server shutdown timeout: %s", err)
				// Force close
				srv.Close()
			}
			return nil
		},
	})

	// Simple health-check endpoint
	r.GET("/api/v1/health", func(c *gin.Context) {
		c.Status(http.StatusOK) // 200 - OK if server started
	})

	return r
}
