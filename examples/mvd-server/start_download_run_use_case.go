package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/runner"
	"youtube-downloader/libs/mvd-core/tui"
)

// engineRun is a download run the app model can close: Close cancels it and
// waits until the engine has stopped, as mvd's own main does.
type engineRun struct {
	tui.Controller
	cancel context.CancelFunc
	events <-chan interface{}
	done   chan struct{}
}

func (r engineRun) Close() {
	r.cancel()
	for range r.events {
	}
	<-r.done
}

// startDownloadRun builds mvd's engine for the settings and list and runs it.
// It needs yt-dlp on the PATH; without it, the app model shows the error on the
// setup screen.
func startDownloadRun(parent context.Context) tui.RunStarter {
	return func(cfg config.Config, urls []string) (tui.Run, error) {
		ytDlp, err := exec.LookPath("yt-dlp")
		if err != nil {
			return nil, fmt.Errorf("yt-dlp was not found on the PATH")
		}
		if err := os.MkdirAll(cfg.OutputDir, 0o755); err != nil {
			return nil, fmt.Errorf("cannot create %s: %w", cfg.OutputDir, err)
		}
		ctx, cancel := context.WithCancel(parent)
		eng, err := runner.BuildEngine(ctx, ytDlp, cfg, urls, nil)
		if err != nil {
			cancel()
			return nil, err
		}
		done := make(chan struct{})
		go func() { eng.Run(ctx); close(done) }()
		return engineRun{Controller: eng, cancel: cancel, events: eng.Events(), done: done}, nil
	}
}
