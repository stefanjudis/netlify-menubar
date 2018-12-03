const path = require('path');
const settings = require('electron-settings');
const { app, Notification } = require('electron');
const { getDeploys, getSites, triggerDeploy } = require('./lib/netlify');
const { editAccessToken } = require('./lib/ui');
const { Tray } = require('./lib/tray');

let tray = null;
let runningTimer = null;
let state = null;

const setState = (key, value, options = { save: true }) => {
  if (options.save) {
    settings.set(key, value);
  }
  state[key] = value;
  update(state);
};

app.on('ready', async () => {
  state = {
    ...settings.getAll(),
    deploys: [],
    sites: [],
    menuIsOpen: false,
    isOnline: true,
    pollInterval: 10000
  };

  tray = new Tray({
    editAccessToken: async _ =>
      setState('accessToken', await editAccessToken(state.accessToken)),
    setState,
    triggerDeploy: async _ => {
      // these can not be moved out because they
      // always have to read the latest state
      const { accessToken, currentSiteId } = state;
      await triggerDeploy({
        siteId: currentSiteId,
        accessToken: accessToken
      });
      update(state);
    },
    update
  });
  tray.setToolTip('Netlify');

  if (state.accessToken) {
    update(state);
  } else {
    setState('accessToken', await editAccessToken());
  }
});

const update = async () => {
  console.log('Updating UI...');
  const {
    accessToken,
    currentSiteId,
    menuIsOpen,
    pollInterval,
    showNotifications,
    deployState: prevDeployState
  } = state;

  let sites, deploys;

  try {
    [sites, deploys] = await Promise.all([
      getSites({ accessToken }),
      // for the very first run there is
      // no currentSiteId
      currentSiteId
        ? getDeploys({
            siteId: currentSiteId,
            accessToken
          })
        : []
    ]);
    state.isOnline = true;
  } catch (e) {
    console.log(e);
    state.isOnline = false;
  }

  const deployState = deploys[0] ? deploys[0].state : '';
  if (showNotifications && prevDeployState && deployState !== prevDeployState) {
    new Notification({
      title: 'New deploy status',
      body: `Last deploy in the queue switched to ${deployState}`
    }).show();
  }

  state = { ...state, sites, deploys, deployState };

  if (!menuIsOpen) tray.render(state);
  if (runningTimer) clearTimeout(runningTimer);

  runningTimer = setTimeout(() => {
    update(state);
  }, pollInterval);
};
