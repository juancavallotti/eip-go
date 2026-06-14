module github.com/juancavallotti/eip-go/cli

go 1.22

require (
	github.com/juancavallotti/eip-go/connectors v0.0.0
	github.com/juancavallotti/eip-go/core v0.0.0
)

replace github.com/juancavallotti/eip-go/connectors => ../connectors
replace github.com/juancavallotti/eip-go/core => ../core
