#!/usr/bin/env node
import { CompanyHelmCli } from "./companyhelm_cli.js";

process.exitCode = await new CompanyHelmCli().run(process.argv);
