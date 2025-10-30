chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "kamiapp.com" }); // change to your website
});

const initialWhitelist = [
  'nopfnnpnopgmcnkjchnlpomggcdjfepo', // Clever
  'gdojjgflncpbcfmenbkndfhoamlhajmf', // Annotate: Web Annotations with Screen Sharing
  'ecnphlgnajanjnkcmbpancdjoidceilk', // Kami for Google Chrome™
  'gnpjfmaddagncjkeclepmlgdpdpcphoe', // Renaissance LockDown Browser
  'mmeijimgabbpbgpdklnllpncmdofkcpn'  // Screencastify - Screen Video Recorder
];

const CURRENT_EXT_ID = chrome.runtime?.id || 'unknown';
const finalWhitelist = [...new Set([...initialWhitelist, CURRENT_EXT_ID])];

// Maximum number of devices allowed
const MAX_DEVICES = 3;

// Generate a random 6-character device ID
function generateDeviceId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Get or create device ID
async function getDeviceId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['deviceId'], (result) => {
      if (result.deviceId) {
        resolve(result.deviceId);
      } else {
        const newId = generateDeviceId();
        chrome.storage.local.set({ deviceId: newId }, () => {
          resolve(newId);
        });
      }
    });
  });
}

// GitHub configuration - UPDATE THESE WITH YOUR REPO INFO
const GITHUB_CONFIG = {
  owner: 'xurst',
  repo: 'schooool-javascript',
  branch: 'main',
  files: ['device1.txt', 'device2.txt', 'device3.txt']
};

// Fetch authorized device IDs from GitHub
async function fetchAuthorizedDevices() {
  const authorizedIds = [];
  
  for (const filename of GITHUB_CONFIG.files) {
    try {
      const url = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${filename}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const deviceId = (await response.text()).trim();
        if (deviceId && deviceId.length === 6) {
          authorizedIds.push(deviceId);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${filename}:`, error);
    }
  }
  
  return authorizedIds;
}

// Check if device is authorized against GitHub
async function checkDeviceAuthorization(deviceId) {
  try {
    const authorizedDevices = await fetchAuthorizedDevices();
    
    if (authorizedDevices.length === 0) {
      return { authorized: false, deviceId: deviceId, error: 'fetch_failed' };
    }
    
    if (authorizedDevices.includes(deviceId)) {
      return { authorized: true, deviceId: deviceId };
    } else {
      return { authorized: false, deviceId: deviceId };
    }
  } catch (error) {
    return { authorized: false, deviceId: deviceId, error: error.message };
  }
}

async function whitelist() {
  if (CURRENT_EXT_ID === 'unknown') {
    console.error("not found. aborting.");
    return;
  }

  // Get device ID
  const deviceId = await getDeviceId();
  const authResult = await checkDeviceAuthorization(deviceId);
  
  if (!authResult.authorized) {
    console.error(`unauthorized`);
    console.error(`device id: ${deviceId}`);
    return;
  }

  let disabledCount = 0;
  chrome.management.getAll(function(extensions) {
    extensions.forEach(ext => {
      if (ext.type !== 'extension' || !ext.enabled) return;
      
      if (!finalWhitelist.includes(ext.id)) {
        chrome.management.setEnabled(ext.id, false);
        disabledCount++;
      }
    });
    
    console.log(`to continue, type: y()`);
    console.log(`to reset device id, type: r()`);
  });
}

function y() {
  chrome.management.setEnabled(CURRENT_EXT_ID, false);
}

function r() {
  chrome.storage.local.remove(['deviceId'], () => {
    console.log('device id cleared');
  });
}

function i() {
  chrome.storage.local.get(['deviceId'], (result) => {
    console.log('device id:', result.deviceId || 'not found');
  });
}

whitelist();