export const CLI_HELP = `treactui - serve a terminal program to a web page

Usage
  treactui serve [options] -- <program> [arguments...]

Options
  --port <n>        port to listen on; 0 picks a free one (default 8080)
  --host <address>  address to listen on (default 127.0.0.1; anything else
                    exposes a program-running endpoint to the network)
  --path <path>     WebSocket path (default /term)
  --origin <page>   a page allowed to connect, as a host (localhost:4200) or a
                    full origin; repeat for several. Pages on the same host
                    always may.
  --cwd <folder>    working directory of the program
  -h, --help        show this help
  -v, --version     show the version

Everything after -- is the program and its arguments, passed as a list (never
through a shell). Each browser that connects gets its own copy of the program.

Example
  treactui serve --origin localhost:4200 -- python app.py
`
