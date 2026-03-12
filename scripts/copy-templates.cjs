#!/usr/bin/env node

const { cpSync, existsSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const repositoryRoot = join(__dirname, "..");
const sourceTemplatesDirectory = join(repositoryRoot, "src", "templates");
const distTemplatesDirectory = join(repositoryRoot, "dist", "templates");

if (!existsSync(sourceTemplatesDirectory)) {
  throw new Error(`Template source directory was not found at ${sourceTemplatesDirectory}`);
}

mkdirSync(distTemplatesDirectory, { recursive: true });
cpSync(sourceTemplatesDirectory, distTemplatesDirectory, { recursive: true });
