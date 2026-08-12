# Marstek Firmware Checker

[![Netlify Status](https://api.netlify.com/api/v1/badges/464bc73e-9763-45eb-afd5-502cb19dbe8b/deploy-status)](https://app.netlify.com/projects/marstek-fw-checker/deploys)

🔋 **Modern web-based firmware checker and archive system for Marstek solar/battery devices**

A comprehensive tool that checks firmware updates for Marstek equipment and maintains a community-driven firmware archive.

## ✨ Features

### Core Functionality
- **Device Authentication**: Login with your Marstek account credentials
- **Device Discovery**: Visual grid display of all registered devices with product images
- **Multi-Device Support**: Venus E V1/V2 (HMG-50), Venus E V3 (VNSE3-0), CT002/CT003 devices
- **Firmware Availability**: Check what firmware versions Marstek servers are offering
- **Direct Downloads**: Download firmware files directly from the interface
- **Release Notes**: View and translate firmware release notes from Chinese to English

> **Note**: This tool shows firmware available from Marstek servers, not whether your device specifically needs an update. It uses baseline version "100" to retrieve all available firmware versions.

### Archive System 🗃️
- **Community Archive**: Automated firmware preservation in GitHub repository
- **Archive Status**: Real-time checking if firmware versions are already archived
- **One-Click Submission**: Submit missing firmware versions to the community archive
- **Duplicate Prevention**: Smart detection to prevent multiple submissions of same firmware
- **GitHub Integration**: Issues and workflows for automated firmware downloading

### Technical Features
- **No CORS Issues**: Built-in Netlify Functions proxy - no external CORS services needed
- **Debug Console**: Raw API response viewer with interactive API tester
- **Dark Theme**: Modern interface with device-specific product images
- **Mobile Responsive**: Works on all devices and screen sizes
- **Session Storage**: Persistent device data for debugging and development

## 🚀 Live Demo

Visit: **[https://marstek-fw-checker.netlify.app](https://marstek-fw-checker.netlify.app)**

## 📱 Supported Devices

| Device Type | Model | Archive Support |
|-------------|-------|-----------------|
| Venus E V1/V2 | HMG-50 | ✅ Full (BMS, Control, MPPT) |
| Venus E V3 | VNSE3-0 | ✅ Full (BMS, Control, MPPT) |
| CT Devices | CT002/CT003 | ✅ Simplified (Single firmware) |
| B2500D | HMJ-2 | ✅ Simplified (Single firmware) |

## 🗃️ Community Firmware Archive

The tool integrates with a community-driven firmware archive system:

- **Repository**: [rweijnen/marstek-firmware-archive](https://github.com/rweijnen/marstek-firmware-archive)
- **Structure**: Organized by device type and firmware version
- **Automated**: GitHub Actions automatically download and archive firmware
- **Secure**: Bot account with minimal permissions, rate limiting, and validation

### Archive Structure
```
firmwares/
├── HMG-50/
│   ├── BMS/1.2.3/
│   ├── Control/2.1.0/
│   └── MPPT/1.5.1/
├── VNSE3-0/
│   ├── BMS/2.0.1/
│   └── Control/3.1.2/
├── CT002/1.4.5/
└── CT003/1.4.5/
```

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Run local development server (required)
netlify dev
```

> **Important**: You must use `netlify dev` (not a plain static server such as
> `python -m http.server`). All Marstek API calls go through the Netlify
> Functions proxy at `/.netlify/functions/marstek-proxy`. A plain static server
> does not serve those functions, so login fails with
> `Authentication failed: 404 Not Found`. If you just want to use the tool
> without running it locally, use the hosted site:
> [marstek-fw-checker.netlify.app](https://marstek-fw-checker.netlify.app).

### Environment Variables
- `GITHUB_TOKEN`: GitHub personal access token for archive operations

### Architecture

**Frontend (Static)**:
- `index.html` - Main interface with modals and forms
- `script.js` - Core functionality, archive integration, API handling
- `styles.css` - Dark theme with device-specific styling

**Backend (Netlify Functions)**:
- `marstek-proxy.js` - CORS proxy for Marstek APIs and firmware downloads
- `check-firmware-archive.js` - Archive status checking with rate limiting
- `submit-firmware-metadata.js` - Archive submission with security validation

**GitHub Integration**:
- `.github/workflows/firmware-archiver.yml` - Automated firmware download workflow
- Bot account: `marstek-fw-bot` with minimal permissions

## 🔌 API Endpoints

### Marstek APIs (via proxy)
- **Authentication**: `https://eu.hamedata.com/app/Solar/v2_get_device.php`
- **Standard Devices**: `https://eu.hamedata.com/ems/api/v2/checkSmallBalconyOTA`
- **CT Devices**: `https://eu.hamedata.com/ems/api/v1/checkAcCoupleOta`
- **B2500D (HMJ-2)**: `https://eu.hamedata.com/app/neng/v2_get_otadevice_b2500.php`
- **B2500D Communication Module**: `https://eu.hamedata.com/ems/api/v1/getCheckWifiOta`

### Archive APIs
- **Status Check**: `/.netlify/functions/check-firmware-archive`
- **Submit Firmware**: `/.netlify/functions/submit-firmware-metadata`

## 🔧 Usage

1. **Visit the site** and login with your Marstek account credentials
2. **View your devices** in the visual grid layout with product images
3. **Click any device** to see what firmware versions are available from Marstek
4. **Compare with your device** to determine if you want to update (manual comparison required)
5. **View archive status** for each firmware version in the modal
6. **Submit missing firmware** to the community archive with one click
7. **Download firmware** directly or from the archive

> **Important**: This tool doesn't compare your current firmware version with available versions. You need to manually check if the available firmware is newer than what you currently have installed.

## 🔒 Security & Privacy

- **Credentials**: Only used for API authentication, never stored
- **HTTPS**: All communication encrypted
- **Rate Limiting**: 100 archive checks/hour, 20 submissions/hour per IP
- **Bot Security**: Minimal permissions (triage only) with AWS S3 URL validation
- **No Data Collection**: No user data stored or transmitted to third parties

## 🎯 Key Improvements from Original

- ✅ **No CORS Issues**: Built-in proxy eliminates need for external CORS services
- ✅ **Archive System**: Community-driven firmware preservation
- ✅ **Modern UI**: Dark theme with device images and responsive design
- ✅ **Multi-Device**: Support for CT devices with dedicated API endpoints
- ✅ **Debug Tools**: Console mode for API response inspection
- ✅ **Translation**: Chinese to English release notes translation
- ✅ **Mobile Support**: Responsive design works on all devices

## ⚠️ Important Notes

- **Unofficial Tool**: Not affiliated with, endorsed by, or supported by Marstek
- **Use at Own Risk**: Always verify firmware compatibility before installation
- **Community Project**: Archive maintained by community volunteers
- **Version 100 Baseline**: Uses version "100" to query all available firmware from Marstek servers
- **No Version Comparison**: Tool shows available firmware but doesn't compare with your current version

## 🆘 Troubleshooting

### Login Issues
- Verify your Marstek account credentials
- Check if your devices are registered and online
- Try refreshing the page and logging in again

### Archive Issues
- **"Failed to submit"**: Check browser console for detailed error messages
- **Rate limited**: Wait and try again (100 checks/hour limit)
- **Invalid metadata**: Ensure firmware contains valid AWS S3 URLs

### General Issues
- **No firmware found**: Normal if Marstek has no firmware available for your device type
- **"Up to Date" message**: Means no firmware data returned from Marstek servers (not that your device is current)
- **Debug mode**: Use console buttons (▢) to view raw API responses
- **Network errors**: Check internet connection and try again

## 📄 License

MIT License - See repository for details

## 🙏 Credits

- **Author**: [Remko Weijnen](https://github.com/rweijnen)
- **Original Inspiration**: PowerShell firmware checking scripts
- **Community**: Contributors to the firmware archive project

---

**⚠️ Disclaimer**: This tool is provided as-is. Neither Marstek nor the tool author are responsible for any issues arising from its use. Always verify firmware compatibility before installation.
