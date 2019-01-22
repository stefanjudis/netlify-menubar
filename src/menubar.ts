import AutoLaunch from 'auto-launch';
import { distanceInWords } from 'date-fns';
import {
  app,
  Menu,
  MenuItemConstructorOptions,
  Notification,
  shell,
  Tray
} from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';
import Connection from './connection';
import ICONS from './icons';
import Netlify, { INetlifyDeploy, INetlifySite, INetlifyUser } from './netlify';
import { getFormattedDeploys, getSuspendedDeployCount } from './util';

interface IJsonObject {
  [x: string]: JsonValue;
}

interface IJsonArray extends Array<JsonValue> {} // tslint:disable-line no-empty-interface
type JsonValue = string | number | boolean | null | IJsonArray | IJsonObject;

interface IAppSettings {
  launchAtStart: boolean;
  pollInterval: number;
  showNotifications: boolean;
  showPendingBuilds: boolean;
  currentSiteId: string | null;
}

interface IAppState {
  menuIsOpen: boolean;
  previousDeploy: INetlifyDeploy | null;
}

export interface IAppDeploys {
  pending: INetlifyDeploy[];
  ready: INetlifyDeploy[];
}

interface IAppNetlifyData {
  deploys: IAppDeploys;
  sites: INetlifySite[];
  user?: INetlifyUser;
}

const DEFAULT_SETTINGS: IAppSettings = {
  currentSiteId: null,
  launchAtStart: false,
  pollInterval: 10000,
  showNotifications: false,
  showPendingBuilds: true
};

export default class UI {
  private apiClient: Netlify;
  private autoLauncher: AutoLaunch;
  private connection: Connection;
  private state: IAppState;
  private tray: Tray;
  private settings: IAppSettings;
  private netlifyData: IAppNetlifyData;

  public constructor({
    apiClient,
    autoLauncher,
    connection
  }: {
    apiClient: Netlify;
    autoLauncher: AutoLaunch;
    connection: Connection;
  }) {
    this.tray = new Tray(ICONS.loading);
    this.apiClient = apiClient;
    this.autoLauncher = autoLauncher;
    this.connection = connection;

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(settings.getAll() as {})
    };

    this.netlifyData = {
      deploys: { pending: [], ready: [] },
      sites: []
    };

    this.state = {
      menuIsOpen: false,
      previousDeploy: null
    };

    this.setup().then(() => {
      const repeat = () => {
        setTimeout(async () => {
          await this.updateDeploys();
          repeat();
        }, this.settings.pollInterval);
      };

      repeat();
    });
  }

  private async setup(): Promise<void> {
    await this.fetchData(async () => {
      if (!this.settings.currentSiteId) {
        this.settings.currentSiteId = await this.getFallbackSiteId();
      }

      const [currentUser, sites, deploys] = await Promise.all([
        this.apiClient.getCurrentUser(),
        this.apiClient.getSites(),
        this.apiClient.getSiteDeploys(this.settings.currentSiteId)
      ]);

      this.netlifyData = {
        deploys: getFormattedDeploys(deploys),
        sites,
        user: {
          email: currentUser.email
        }
      };
    });
  }

  private getSite(siteId: string): INetlifySite {
    return (
      this.netlifyData.sites.find(
        ({ id }) => id === this.settings.currentSiteId
      ) || this.netlifyData.sites[0]
    );
  }

  private async getFallbackSiteId(): Promise<string> {
    const sites = await this.apiClient.getSites();
    return sites[0].id;
  }

  private getDeploysSubmenu(
    deploys: IAppDeploys,
    currentSite: INetlifySite
  ): MenuItemConstructorOptions[] {
    const { pending: pendingDeploys, ready: doneDeploys } = deploys;
    const mapDeployToMenuItem = ({
      context,
      created_at,
      state,
      branch,
      deploy_time,
      id
    }) => {
      return {
        click: () =>
          shell.openExternal(
            `https://app.netlify.com/sites/${currentSite.name}/deploys/${id}`
          ),
        label: `${context}: ${state} → ${branch} | ${distanceInWords(
          new Date(created_at),
          new Date()
        )} ago ${deploy_time ? `in ${deploy_time}s` : ''}`
      };
    };

    return [
      ...pendingDeploys.map(mapDeployToMenuItem),
      ...(pendingDeploys.length ? [{ label: '—', enabled: false }] : []),
      ...doneDeploys.map(mapDeployToMenuItem)
    ].slice(0, 20);
  }

  private getSitesSubmenu(sites: INetlifySite[]): MenuItemConstructorOptions[] {
    return sites.map(
      ({ id, url }): MenuItemConstructorOptions => ({
        checked: this.settings.currentSiteId === id,
        click: async () => {
          this.saveSetting('currentSiteId', id);
          this.state.previousDeploy = null;
          this.updateDeploys();
        },
        label: `${url.replace(/https?:\/\//, '')}`,
        type: 'radio'
      })
    );
  }

  private getSettingsSubmenu(): MenuItemConstructorOptions[] {
    const {
      pollInterval,
      showNotifications,
      showPendingBuilds,
      launchAtStart
    } = this.settings;
    const pollDurations = [
      { value: 10000, label: '10sec' },
      { value: 30000, label: '30sec' },
      { value: 60000, label: '1min' },
      { value: 180000, label: '3min' },
      { value: 300000, label: '5min' }
    ];

    return [
      {
        checked: launchAtStart,
        click: () => {
          this.saveSetting('launchAtStart', !launchAtStart);
          if (!launchAtStart) {
            this.autoLauncher.enable();
          } else {
            this.autoLauncher.disable();
          }
        },
        label: 'Launch at start',
        type: 'checkbox'
      },
      {
        checked: showNotifications,
        click: () => this.saveSetting('showNotifications', !showNotifications),
        label: 'Show notifications',
        type: 'checkbox'
      },
      {
        checked: showPendingBuilds,
        click: () => this.saveSetting('showPendingBuilds', !showPendingBuilds),
        label: 'Show pending deploys',
        type: 'checkbox'
      },
      {
        label: 'Poll interval',
        submenu: pollDurations.map(
          ({ label, value }): MenuItemConstructorOptions => ({
            checked: pollInterval === value,
            click: () => this.saveSetting('pollInterval', value),
            label,
            type: 'radio'
          })
        )
      }
    ];
  }

  private async fetchData(fn: () => void): Promise<void> {
    if (this.connection.isOnline) {
      this.tray.setImage(ICONS.loading);

      // catch possible network hickups
      try {
        await fn();
        if (this.state.previousDeploy) {
          this.tray.setImage(ICONS[this.state.previousDeploy.state]);
        }
      } catch (e) {
        this.tray.setImage(ICONS.offline);
      }
    } else {
      this.tray.setImage(ICONS.offline);
    }

    this.render();
    this.evaluateCurrentDeployState();
  }

  private updateDeploys(): Promise<void> {
    return this.fetchData(async () => {
      if (this.settings.currentSiteId) {
        const deploys = await this.apiClient.getSiteDeploys(
          this.settings.currentSiteId
        );

        this.netlifyData.deploys = getFormattedDeploys(deploys);
      }
    });
  }

  private evaluateCurrentDeployState(): void {
    const { deploys } = this.netlifyData;
    let currentDeploy: INetlifyDeploy | undefined;

    if (deploys.pending.length) {
      currentDeploy = deploys.pending[deploys.pending.length - 1];
    } else if (deploys.ready.length) {
      currentDeploy = deploys.ready[0];
    }

    if (!currentDeploy) {
      return;
    }

    const { previousDeploy } = this.state;
    const isDifferentDeploy = (prev: INetlifyDeploy, current: INetlifyDeploy) =>
      prev.id !== current.id;
    const isDifferentState = (prev: INetlifyDeploy, current: INetlifyDeploy) =>
      prev.state !== current.state;
    let notification;

    if (previousDeploy) {
      if (isDifferentDeploy(previousDeploy, currentDeploy)) {
        notification = {
          body: `New deploy status: ${currentDeploy.state}`,
          title: 'New deploy started'
        };
      } else if (isDifferentState(previousDeploy, currentDeploy)) {
        notification = {
          body: `Deploy status: ${currentDeploy.state}`,
          title: 'Deploy progressed'
        };
      }
    }

    if (notification && this.settings.showNotifications) {
      new Notification(notification).show();
    }

    this.state.previousDeploy = currentDeploy;
  }

  private saveSetting(key: string, value: JsonValue): void {
    settings.set(key, value);
    this.settings[key] = value;
    this.render();
  }

  private async render(): Promise<void> {
    if (!this.settings.currentSiteId) {
      console.error('No current site id found'); // tslint:disable-line no-console
      return;
    }

    this.tray.setTitle(
      getSuspendedDeployCount(
        this.settings.showPendingBuilds
          ? this.netlifyData.deploys.pending.length
          : 0
      )
    );

    this.renderMenu(this.settings.currentSiteId);
  }

  private async renderMenu(currentSiteId: string): Promise<void> {
    if (!this.connection.isOnline) {
      return this.tray.setContextMenu(
        Menu.buildFromTemplate([
          {
            enabled: false,
            label: "Looks like you're offline..."
          }
        ])
      );
    }

    const { sites, deploys, user } = this.netlifyData;

    const currentSite = this.getSite(currentSiteId);
    const menu = Menu.buildFromTemplate([
      {
        enabled: false,
        label: `Netlify Menubar ${app.getVersion()}`
      },
      { type: 'separator' },
      {
        enabled: false,
        label: user && user.email
      },
      { type: 'separator' },
      {
        label: 'Choose site:',
        submenu: this.getSitesSubmenu(sites)
      },
      { type: 'separator' },
      {
        enabled: false,
        label: `${currentSite.url.replace(/https?:\/\//, '')}`
      },
      {
        click: () => shell.openExternal(currentSite.url),
        label: 'Go to Site'
      },
      {
        click: () => {
          shell.openExternal(currentSite.admin_url);
        },
        label: 'Go to Admin'
      },
      {
        enabled: false,
        label: '—'
      },
      {
        label: 'Deploys',
        submenu: this.getDeploysSubmenu(deploys, currentSite)
      },
      {
        click: async () => {
          this.fetchData(async () => {
            await this.apiClient.createSiteBuild(currentSiteId);
          });
        },
        label: 'Trigger new deploy'
      },
      { type: 'separator' },
      {
        label: 'Settings',
        submenu: this.getSettingsSubmenu()
      },
      { type: 'separator' },
      {
        click: () => {
          shell.openExternal(
            'https://github.com/stefanjudis/netlify-menubar/issues/new'
          );
        },
        label: 'Give feedback'
      },
      { type: 'separator' },
      { label: 'Quit Netlify Menubar', role: 'quit' }
    ]);

    menu.on('menu-will-show', () => (this.state.menuIsOpen = true));
    menu.on('menu-will-close', () => {
      this.state.menuIsOpen = false;
      // this needs a round on the main thread otherwise
      // the menu-reset will cancel click handlers
      setTimeout(() => this.render(), 0);
    });

    // avoid the menu to close in case the user has it open
    if (!this.state.menuIsOpen) {
      // tslint:disable-next-line
      console.log('UI: rerending menu');
      this.tray.setContextMenu(menu);
    }
  }
}
