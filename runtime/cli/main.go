package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	_ "github.com/juancavallotti/eip-go/connectors/noop"
	"github.com/juancavallotti/eip-go/core"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	configPath := flag.String("config", "", "path to the runtime config")
	flag.Parse()

	if *configPath == "" {
		return errors.New("config path is required")
	}

	config, err := core.LoadConfig(*configPath)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	service := core.NewService(config, core.DefaultRegistry())
	if err := service.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}

	return nil
}
