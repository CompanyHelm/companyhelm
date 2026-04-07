// build.prod.ts
import 'dotenv/config';
import { Template, defaultBuildLogger } from 'e2b';


const template = Template()
  .fromBaseImage()
  .aptInstall('gh')
  .runCmd('curl -fsSL https://get.docker.com | sudo sh')

async function main() {
  await Template.build(template, 'small', {
    cpuCount: 1,
    memoryMB: 1024,
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch(console.error);
