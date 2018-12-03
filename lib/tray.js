const path = require('path');
const distanceInWords = require('date-fns/distance_in_words');
const { shell, Menu, Tray: ElectronTray } = require('electron');

const { menu: menuConfig } = require('./config');

const ICONS = {
  booting: path.join(__dirname, '..', 'media', 'tray', 'booting.png'),
  building: path.join(__dirname, '..', 'media', 'tray', 'building.png'),
  enqueued: path.join(__dirname, '..', 'media', 'tray', 'building.png'),
  processing: path.join(__dirname, '..', 'media', 'tray', 'building.png'),
  ready: path.join(__dirname, '..', 'media', 'tray', 'ready.png'),
  new: path.join(__dirname, '..', 'media', 'tray', 'building.png')
};

class Tray extends ElectronTray {
  constructor({ editAccessToken, setState, update, triggerDeploy }) {
    super(ICONS.booting);

    this.editAccessToken = editAccessToken;
    this.setState = setState;
    this.triggerDeploy = triggerDeploy;
    this.update = update;
  }

  render(state) {
    this.renderMenu(state);
    this.renderIcon(state);
  }

  renderMenu({
    accessToken,
    currentSiteId,
    deploys,
    sites,
    isOnline,
    menuIsOpen,
    pollInterval,
    showNotifications
  }) {
    if (!isOnline) {
      return this.setContextMenu(
        Menu.buildFromTemplate([
          { label: "Couldn't reach Netlify...", enabled: false },
          { role: 'quit' }
        ])
      );
    }

    let currentSite = sites.find(({ id }) => id === currentSiteId);

    if (!currentSite) {
      currentSite = sites[0];
    }

    // todo is this creating memory leaks?
    const contextMenu = Menu.buildFromTemplate([
      {
        label: currentSite.name,
        enabled: false
      },
      {
        label: 'Preview site',
        click: _ => shell.openExternal(currentSite.url)
      },
      {
        label: 'Choose other site:',
        submenu: sites.map(({ id, name }) => ({
          label: name,
          type: 'radio',
          checked: currentSite.id === id,
          click: _ => this.setState('currentSiteId', id)
        }))
      },
      { type: 'separator' },
      {
        label: `Current state: ${deploys[0] ? deploys[0].state : '...'}`,
        click: _ =>
          shell.openExternal(
            `https://app.netlify.com/sites/${currentSite.name}/deploys/${
              deploys[0].id
            }`
          )
      },
      {
        label: 'Deploys',
        submenu: deploys
          .slice(0, 20)
          .map(({ context, created_at, state, branch, deploy_time, id }) => {
            return {
              label: `${context}: ${state} → ${branch} | ${distanceInWords(
                new Date(created_at),
                new Date()
              )} ago ${deploy_time ? `in ${deploy_time}s` : ''}`,
              click: _ =>
                shell.openExternal(
                  `https://app.netlify.com/sites/${
                    currentSite.name
                  }/deploys/${id}`
                )
            };
          })
      },
      {
        label: 'Trigger deploy',
        click: async _ => {
          this.triggerDeploy();
        }
      },
      { type: 'separator' },
      {
        label: `${accessToken ? 'Edit' : 'Add'} access token`,
        click: _ => this.editAccessToken()
      },
      { type: 'separator' },
      {
        label: 'Settings',
        submenu: [
          {
            label: 'Show notifications',
            type: 'checkbox',
            checked: showNotifications,
            click: _ => this.setState('showNotifications', !showNotifications)
          },
          {
            label: 'Poll interval',
            submenu: menuConfig.pollDurations.map(({ label, value }) => ({
              label,
              type: 'radio',
              click: _ => this.setState('pollInterval', value),
              checked: pollInterval === value
            }))
          }
        ]
      },
      { type: 'separator' },
      { role: 'quit' }
    ]);

    contextMenu.on('menu-will-show', _ =>
      this.setState('menuIsOpen', true, { save: false })
    );
    contextMenu.on('menu-will-close', _ =>
      this.setState('menuIsOpen', false, { save: false })
    );

    // don't trigger re-build of the menu
    // when the user looks at it in the moment
    if (!menuIsOpen) {
      this.setContextMenu(contextMenu);
    }
  }

  renderIcon({ deploys }) {
    const image = deploys[0] ? ICONS[deploys[0].state] : ICONS.booting;
    this.setImage(image);
  }
}

module.exports = {
  Tray
};
