/**
 * How many lines the terminal keeps above the visible rows. Older output is discarded, which bounds the page's
 * memory however long a program prints (xterm.js's default, stated here so the limit is ours to document).
 */
export const SCROLLBACK_LINES = 1000
