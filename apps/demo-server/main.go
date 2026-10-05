// Command demo-server serves a Bubble Tea to-do list to the @treactui/tty
// React component over a WebSocket at /term.
package main

import (
	"flag"
	"log"
	"net/http"
	"strings"

	ttygo "github.com/TReactUI/TReactUI/packages/tty-go"
)

func main() {
	addr := flag.String("addr", "localhost:8080", "address to listen on")
	origins := flag.String("origins", "localhost:4200", "comma-separated page origins allowed to connect")
	flag.Parse()

	mux := http.NewServeMux()
	mux.Handle("/term", ttygo.Handler(newTasksModel, ttygo.Options{AllowedOrigins: strings.Split(*origins, ",")}))

	log.Printf("serving the terminal at ws://%s/term", *addr)
	log.Fatal(http.ListenAndServe(*addr, mux))
}
