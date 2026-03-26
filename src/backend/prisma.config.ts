import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  databases: [
    {
      url: process.env.DATABASE_URL!,
    },
  ],
});
