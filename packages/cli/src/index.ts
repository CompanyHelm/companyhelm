#!/usr/bin/env node
import { CompanyHelmCli } from "./companyhelm_cli.js";

await new CompanyHelmCli().run(process.argv);
