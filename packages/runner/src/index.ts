#!/usr/bin/env node
import { RunnerCli } from "./runner_cli.js";

await new RunnerCli().run(process.argv);
