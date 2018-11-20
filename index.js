const menubar = require('menubar');
const path = require('path');
const fetch = require('cross-fetch');
const notifier = require('node-notifier');
const mb = menubar({
  index: path.join('file://', __dirname, 'index.html')
});

const TOKEN = '...';
const SITE_ID = 'a73a67dc-83ab-41a7-ad25-9bd46d809a19';

const ICONS = {
  building: path.join(__dirname, 'media', 'building.png'),
  enqueued: path.join(__dirname, 'media', 'building.png'),
  ready: path.join(__dirname, 'media', 'ready.png')
};

let lastDeployStatus;
let currentDeploys = [];

const getDeploys = async () => {
  return await (await fetch(
    `https://api.netlify.com/api/v1/sites/${SITE_ID}/deploys`,
    {
      headers: {
        authorization: `Bearer ${TOKEN}`
      }
    }
  )).json();
};

const updateTray = (tray, { state: status }) => {
  console.log('setting tray image', status, ICONS[status]);
  tray.setImage(ICONS[status]);
};

const updateOverview = (window, deploys) => {
  window.webContents.send('updateDeploys', deploys);
};

const notify = ({ state: status }) => {
  if (status !== lastDeployStatus) {
    notifier.notify({
      title: 'New build status',
      message: `Status changed to ${status}`
    });

    lastDeployStatus = status;
  }
};

mb.on('ready', async () => {
  const update = async () => {
    const deploys = await getDeploys();
    const lastDeploy = deploys[0];
    console.log(lastDeploy);
    updateTray(mb.tray, lastDeploy);
    notify(lastDeploy);

    currentDeploys = deploys;
  };

  setInterval(async _ => {
    await update();
  }, 5000);

  mb.on('after-show', _ => {
    mb.window.webContents.send('updateDeploys', currentDeploys);
  });
});
