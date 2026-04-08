// build.prod.ts
import 'dotenv/config';


async function main() {

  const templates = new E2BTemplatesManager();

  for (const template of templates.builds()) {
    await template.build();
  }
}

main().catch(console.error);
