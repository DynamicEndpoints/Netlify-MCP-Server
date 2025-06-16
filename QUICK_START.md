# 🚀 Quick Start Guide - Netlify MCP Server

Get up and running with the Netlify MCP Server in under 5 minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Netlify account with sites to manage
- [ ] MCP client (Claude Desktop recommended)
- [ ] Git for cloning the repository

## 1. Installation

```bash
# Clone and setup
git clone <repository-url>
cd Netlify-MCP-Server
npm install
npm run build
```

## 2. Get Your Netlify Token

1. Go to [Netlify Personal Access Tokens](https://app.netlify.com/user/applications#personal-access-tokens)
2. Click "New access token"
3. Give it a name like "MCP Server"
4. Copy the token (save it safely!)

## 3. Configure Claude Desktop

Add this to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "netlify": {
      "command": "node",
      "args": ["C:\\path\\to\\Netlify-MCP-Server\\build\\index.js"],
      "env": {
        "NETLIFY_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

## 4. Test It Works

Restart Claude Desktop and try this:

```
List my Netlify sites
```

You should see your sites listed!

## 5. Common First Tasks

### Deploy a Site
```
Deploy my site from the ./dist folder to production with the message "Initial deployment"
```

### Manage Environment Variables
```
Set environment variables for my site:
- API_URL: https://api.example.com
- NODE_ENV: production
```

### Check Deployment Status
```
Show me the recent deploys for my site
```

## Troubleshooting Quick Fixes

### "netlify: command not found"
```bash
npm install -g netlify-cli@latest
```

### "Authentication required"
- Check your token is correct in the config file
- Verify the token has the right permissions

### "Site not found"  
- Get your site ID: run `netlify sites:list` in terminal
- Use the exact site ID in your requests

## Next Steps

- 📖 Read the [full README](README.md) for all features
- 🛠️ Explore all [23 available tools](README.md#tools)
- 💡 Try the [smart prompts](README.md#smart-prompts)
- 🐛 Report issues using our [issue templates](.github/ISSUE_TEMPLATE/)

## Need Help?

- 💬 [Start a Discussion](https://github.com/owner/Netlify-MCP-Server/discussions)
- 🐛 [Report a Bug](.github/ISSUE_TEMPLATE/bug_report.yml)
- ❓ [Ask a Question](.github/ISSUE_TEMPLATE/question.yml)

**Time to first deployment: ~5 minutes** ⚡
