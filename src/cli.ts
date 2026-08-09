#!/usr/bin/env node
/** Implements the command-line entry point and top-level error boundary. */
import { main } from "./cli-entrypoint.js";

export type { ParsedArgs } from "./cli-arguments.js";

void main(process.argv.slice(2));
