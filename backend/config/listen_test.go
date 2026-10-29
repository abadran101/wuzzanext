package config

import (
	"net"
	"strings"
	"testing"

	"github.com/spf13/viper"
)

func TestListenAddr(t *testing.T) {
	cases := []struct {
		host string
		want string
	}{
		{"", ":2021"},                     // every interface, as upstream
		{"127.0.0.1", "127.0.0.1:2021"},   // this machine only
		{" 127.0.0.1 ", "127.0.0.1:2021"}, // stray spaces from the file
		{"::1", "[::1]:2021"},
	}
	for _, c := range cases {
		if got := (ServerConfig{Host: c.host, Port: 2021}).ListenAddr(); got != c.want {
			t.Errorf("host %q: got %q, want %q", c.host, got, c.want)
		}
	}
}

func TestServerHostFromConfigFile(t *testing.T) {
	load := func(t *testing.T, yaml string) ServerConfig {
		t.Helper()
		v := viper.New()
		v.SetConfigType("yaml")
		if err := v.ReadConfig(strings.NewReader(yaml)); err != nil {
			t.Fatalf("read config: %v", err)
		}
		var cfg Config
		if err := v.Unmarshal(&cfg); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		return cfg.Server
	}

	if got := load(t, "server:\n  port: 2021\n").ListenAddr(); got != ":2021" {
		t.Errorf("no host: got %q, want every interface", got)
	}
	if got := load(t, "server:\n  host: \"\"\n  port: 2021\n").ListenAddr(); got != ":2021" {
		t.Errorf("empty host: got %q, want every interface", got)
	}
	if got := load(t, "server:\n  host: \"127.0.0.1\"\n  port: 2021\n").ListenAddr(); got != "127.0.0.1:2021" {
		t.Errorf("127.0.0.1: got %q", got)
	}
}

func TestLoopbackHostListensOnLoopbackOnly(t *testing.T) {
	ln, err := net.Listen("tcp", ServerConfig{Host: "127.0.0.1", Port: 0}.ListenAddr())
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer ln.Close()
	addr := ln.Addr().(*net.TCPAddr)
	if !addr.IP.IsLoopback() {
		t.Fatalf("listening on %v, want loopback only", addr.IP)
	}
}
