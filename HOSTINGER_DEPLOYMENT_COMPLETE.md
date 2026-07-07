# Complete Hostinger Deployment Guide for Finova Workspace

## Important: Your Project Requirements

Your Finova Workspace project uses:
- **Supabase** as the database
- **Next.js API Routes** for server-side operations (user management, calendar, sessions)
- **Client-side authentication** with Supabase Auth

## Choose Your Deployment Path

### Option A: Hostinger with Node.js Support (Recommended)
**Requirements:** VPS or Cloud hosting plan (Business or higher with Node.js)
**Pros:** Full functionality, all API routes work
**Cons:** More expensive, requires more setup

### Option B: Static Deployment (Current Config - Limited Functionality)
**Requirements:** Any Hostinger plan
**Pros:** Cheaper, simpler
**Cons:** API routes won't work (user create/update/delete, email features)

---

## OPTION A: Full Deployment (VPS/Cloud Hosting)

### Step 1: Check Your Hostinger Plan

1. Log into Hostinger hPanel
2. Check if you have **Node.js Selector** or **SSH Access**
3. If yes → Continue with this guide
4. If no → You need to upgrade to VPS or use Option B

### Step 2: Update Configuration for Server Deployment

#### 2.1 Remove Static Export from next.config.mjs

Current config has `output: 'export'` which won't work with API routes. Update it:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Remove: output: 'export',
  // Remove: trailingSlash: true,
}

export default nextConfig
```

#### 2.2 Set Up Environment Variables

You'll need your Supabase credentials. Create a `.env.production` file (DO NOT COMMIT THIS):

```env
# Supabase Configuration (Get these from Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Step 3: Build Your Application

Run locally to test the production build:

```bash
npm install
npm run build
npm start
```

Verify everything works at `http://localhost:3000`

### Step 4: Deploy to Hostinger VPS

#### 4.1 Connect via SSH

1. In hPanel, go to VPS → SSH Access
2. Note your SSH credentials
3. Connect using terminal:

```bash
ssh root@your_vps_ip
```

#### 4.2 Install Node.js (if not installed)

```bash
# Install Node.js 18 or higher
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 4.3 Upload Your Project

**Option 1: Using Git (Recommended)**

```bash
# On VPS
cd /home/username
git clone your-repository-url
cd finova-workspace
npm install
npm run build
```

**Option 2: Using FTP**

1. Compress your entire project (except node_modules and .next)
2. Upload via FTP to `/home/username/finova-workspace`
3. SSH in and run:

```bash
cd /home/username/finova-workspace
npm install
npm run build
```

#### 4.4 Set Up Environment Variables on Server

```bash
# On VPS
cd /home/username/finova-workspace
nano .env.production
```

Paste your environment variables, save (Ctrl+X, Y, Enter)

#### 4.5 Install PM2 to Keep App Running

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your app with PM2
cd /home/username/finova-workspace
pm2 start npm --name "finova-workspace" -- start

# Make PM2 restart on server reboot
pm2 startup
pm2 save
```

#### 4.6 Configure Nginx as Reverse Proxy

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4.7 Set Up SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 5: Update Supabase Settings

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your domain to **Site URL**: `https://yourdomain.com`
3. Add to **Redirect URLs**: `https://yourdomain.com/**`

### Step 6: Test Your Deployment

1. Visit `https://yourdomain.com`
2. Test login functionality
3. Test creating/updating users (admin features)
4. Check that all pages load correctly

---

## OPTION B: Static Deployment (Shared Hosting - Limited)

⚠️ **Warning:** This approach disables API routes. Features that won't work:
- User creation via admin panel (must use Supabase dashboard)
- User updates/deletion via admin panel
- Email notifications for meetings
- Google Calendar integration

### Step 1: Move API Functionality to Supabase Edge Functions

This requires significant refactoring. Each API route needs to be converted to a Supabase Edge Function. This is beyond the scope of this guide but is the proper way to make the app fully static.

### Step 2: Use Current Static Export

If you're okay with limited functionality:

#### 2.1 Build Static Site

```bash
npm run build
```

This creates an `out/` directory with static files.

#### 2.2 Upload to Hostinger

1. Log into hPanel → File Manager
2. Navigate to `public_html` (or your domain's folder)
3. Upload all files from the `out/` directory
4. Create `.htaccess` file:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### 2.3 Add Environment Variables to Build

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
}

export default nextConfig
```

---

## Troubleshooting

### App won't start after deployment
```bash
# Check PM2 logs
pm2 logs finova-workspace

# Check if port 3000 is already in use
sudo lsof -i :3000
```

### Environment variables not loading
```bash
# Verify .env.production exists
ls -la /home/username/finova-workspace/.env.production

# Restart app
pm2 restart finova-workspace
```

### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew --dry-run
```

### Can't connect via SSH
- Check firewall settings in hPanel
- Ensure SSH is enabled for your VPS
- Verify IP whitelist if configured

---

## Recommended Path

**For Full Functionality:** Use Option A (VPS/Cloud hosting)
- Costs more but everything works
- Professional deployment
- Scalable for growth

**For Budget/Simple Needs:** 
- Consider upgrading to VPS (starts ~$4/month)
- OR migrate to Vercel (free for most use cases, optimized for Next.js)
- OR refactor API routes to Supabase Edge Functions

---

## Next Steps

1. Determine your Hostinger plan type
2. If VPS: Follow Option A
3. If Shared: Consider upgrading or using Vercel
4. Test thoroughly after deployment
5. Set up monitoring and backups

## Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify Supabase connection in browser console
4. Ensure environment variables are set correctly
