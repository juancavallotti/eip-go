package types

type Config struct {
	Service    ServiceConfig    `yaml:"service"`
	Connectors []ConnectorConfig `yaml:"connectors"`
}

type ServiceConfig struct {
	Name        string `yaml:"name"`
	Environment string `yaml:"environment,omitempty"`
}

type ConnectorConfig struct {
	Name     string        `yaml:"name"`
	Type     string        `yaml:"type"`
	Settings map[string]any `yaml:"settings,omitempty"`
}
