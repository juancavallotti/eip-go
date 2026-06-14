package noop

import (
	"context"

	"github.com/juancavallotti/eip-go/core"
	"github.com/juancavallotti/eip-go/types"
)

type Connector struct{}

func init() {
	core.MustRegisterConnector("noop", func() core.Connector {
		return &Connector{}
	})
}

func (c *Connector) Start(context.Context, types.ConnectorConfig) error {
	return nil
}

func (c *Connector) Stop(context.Context) error {
	return nil
}
