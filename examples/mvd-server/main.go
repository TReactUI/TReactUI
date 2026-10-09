// Command mvd-server serves the real mvd app (the setup screens and the
// download screen) to the @treactui/tty React component at ws://<addr>/term.
//
// It uses a scratch config in a temporary folder, so trying it never touches
// your real MVD settings or list.
package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	ttygo "github.com/meta-tui/treactui/packages/tty-go"

	"youtube-downloader/libs/mvd-core/config"
	"youtube-downloader/libs/mvd-core/tui"
)

func main() {
	addr := flag.String("addr", "localhost:8080", "address to listen on")
	origins := flag.String("origins", "localhost:4200", "comma-separated page origins allowed to connect")
	flag.Parse()

	scratch, err := os.MkdirTemp("", "mvd-web-")
	if err != nil {
		log.Fatal(err)
	}
	defer func() { _ = os.RemoveAll(scratch) }()

	cfg := config.Default(scratch, scratch)
	start := startDownloadRun(context.Background())
	newModel := func() tea.Model {
		return accessibleApp{tui.NewAppModel(tui.AppInput{
			Setup: tui.SetupInput{
				Cfg:      cfg,
				URLs:     []string{"https://www.youtube.com/playlist?list=PL-example", "https://www.youtube.com/watch?v=example"},
				CfgPath:  scratch + "/config.conf",
				ListPath: scratch + "/list.txt",
			},
			Start: start,
		})}
	}

	mux := http.NewServeMux()
	mux.Handle("/term", ttygo.SharedHandler(newModel, ttygo.Options{AllowedOrigins: strings.Split(*origins, ","), Mouse: true}))
	log.Printf("serving the mvd screens at ws://%s/term (scratch config in %s)", *addr, scratch)
	log.Fatal(http.ListenAndServe(*addr, mux))
}
