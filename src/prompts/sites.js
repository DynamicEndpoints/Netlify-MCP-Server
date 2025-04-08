import { z } from "zod";

export const createSitePrompt = {
  name: "create-site",
  schema: {
    name: z.string().describe("Site name"),
    customDomain: z.string().optional().describe("Custom domain for the site")
  },
  handler: ({ name, customDomain }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please create a new Netlify site with the following details:
Name: ${name}
${customDomain ? `Custom Domain: ${customDomain}` : ''}`
      }
    }]
  })
};
