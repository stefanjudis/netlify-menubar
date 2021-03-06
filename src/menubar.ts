import { isToday, isYesterday } from 'date-fns';
import { app, Menu, MenuItemConstructorOptions, shell, Tray } from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';
import { EventEmitter } from 'events';
import { POLL_DURATIONS } from './config';
import Connection from './connection';
import ICONS from './icons';
import IncidentFeed from './incidentFeed';
import {
  getCheckboxMenu,
  getDeploysMenu,
  getIncidentsMenu,
  getSitesMenu
} from './menus';
import Netlify, { INetlifyDeploy, INetlifySite, INetlifyUser } from './netlify';
import notify from './notify';
import scheduler from './scheduler';
import {
  getFormattedDeploys,
  getNotificationOptions,
  getSuspendedDeployCount
} from './util';

interface IJsonObject {
  [x: string]: JsonValue;
}

interface IJsonArray extends Array<JsonValue> {} // tslint:disable-line no-empty-interface
type JsonValue = string | number | boolean | null | IJsonArray | IJsonObject;

export interface IAppSettings {
  updateAutomatically: boolean;
  launchAtStart: boolean;
  pollInterval: number;
  showNotifications: boolean;
  currentSiteId: string | null;
}

interface IAppState {
  currentSite?: INetlifySite;
  menuIsOpen: boolean;
  previousDeploy: INetlifyDeploy | null;
  updateAvailable: boolean;
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
  updateAutomatically: true
};

export default class UI extends EventEmitter {
  private apiClient: Netlify;
  private incidentFeed: IncidentFeed;
  private connection: Connection;
  private state: IAppState;
  private tray: Tray;
  private settings: IAppSettings;
  private netlifyData: IAppNetlifyData;

  public constructor({
    apiClient,
    connection,
    incidentFeed
  }: {
    apiClient: Netlify;
    connection: Connection;
    incidentFeed: IncidentFeed;
  }) {
    super();

    this.incidentFeed = incidentFeed;
    this.tray = new Tray(ICONS.loading);
    this.apiClient = apiClient;
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
      previousDeploy: null,
      updateAvailable: false
    };

    this.setup().then(() => this.setupScheduler());
  }

  public setState(state: Partial<IAppState>) {
    this.state = { ...this.state, ...state };
    this.render();
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

      this.state.currentSite = this.getSite(this.settings.currentSiteId);
    });
  }

  private async setupScheduler(): Promise<void> {
    scheduler.repeat([
      {
        fn: async () => {
          await this.updateDeploys();
        },
        interval: this.settings.pollInterval
      },
      {
        fn: async ({ isFirstRun }) => {
          await this.updateFeed();
          if (isFirstRun) {
            this.notifyForIncidentsPastTwoDays();
          } else {
            this.notifyForNewAndUpdatedIncidents();
          }
        },
        // going with a minute for now
        interval: 60000
      }
    ]);

    this.connection.on('status-changed', connection => {
      if (connection.isOnline) {
        scheduler.resume();
      } else {
        scheduler.stop();
        console.error('Currently offline, unable to get updates...'); // tslint:disable-line no-console
        this.tray.setImage(ICONS.offline);
      }
    });
  }

  private getSite(siteId: string): INetlifySite {
    return (
      this.netlifyData.sites.find(({ id }) => id === siteId) ||
      this.netlifyData.sites[0]
    );
  }

  private async getFallbackSiteId(): Promise<string> {
    const sites = await this.apiClient.getSites();
    return sites[0].id;
  }

  private async fetchData(fn: () => void): Promise<void> {
    if (this.connection.isOnline) {
      this.tray.setImage(ICONS.loading);
      // catch possible network hickups
      try {
        await fn();
        this.evaluateDeployState();
        if (this.state.previousDeploy) {
          this.tray.setImage(ICONS[this.state.previousDeploy.state]);
        }
      } catch (e) {
        console.error(e); // tslint:disable-line no-console
        this.tray.setImage(ICONS.offline);
      }
    }

    this.render();
  }

  private updateFeed(): Promise<void> {
    return this.fetchData(async () => {
      await this.incidentFeed.update();
    });
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

  private notifyForIncidentsPastTwoDays(): void {
    const recentIncidents = this.incidentFeed.getFeed().filter(item => {
      const publicationDate = new Date(item.pubDate);
      return isToday(publicationDate) || isYesterday(publicationDate);
    });
    if (recentIncidents.length) {
      this.notifyIncident(recentIncidents[0], 'Recently reported incident');
    }
  }

  private notifyForNewAndUpdatedIncidents(): void {
    const newIncidents = this.incidentFeed.newIncidents();
    const updatedIncidents = this.incidentFeed.updatedIncidents();
    if (newIncidents.length) {
      this.notifyIncident(newIncidents[0], 'New incident reported');
    }
    if (updatedIncidents.length) {
      this.notifyIncident(updatedIncidents[0], 'Incident report updated');
    }
  }

  private notifyIncident(
    incident: { title: string; link: string },
    title: string
  ): void {
    notify({
      body: incident.title,
      onClick: () => {
        shell.openExternal(incident.link);
      },
      title
    });
  }

  private evaluateDeployState(): void {
    const { deploys } = this.netlifyData;
    const { previousDeploy, currentSite } = this.state;

    let currentDeploy: INetlifyDeploy | null = null;

    if (deploys.pending.length) {
      currentDeploy = deploys.pending[deploys.pending.length - 1];
    } else if (deploys.ready.length) {
      currentDeploy = deploys.ready[0];
    }

    // cover edge case for new users
    // who don't have any deploys yet
    if (currentDeploy === null) {
      return;
    }

    if (previousDeploy) {
      const notificationOptions = getNotificationOptions(
        previousDeploy,
        currentDeploy
      );

      if (notificationOptions) {
        notify({
          ...notificationOptions,
          onClick: () => {
            if (currentSite && currentDeploy) {
              shell.openExternal(
                `https://app.netlify.com/sites/${currentSite.name}/deploys/${
                  currentDeploy.id
                }`
              );
            }
          }
        });
      }
    }

    this.state.previousDeploy = currentDeploy;
  }

  private saveSetting(key: string, value: JsonValue): void {
    settings.set(key, value);
    this.settings[key] = value;
    this.render();
  }

  private async render(): Promise<void> {
    if (!this.state.currentSite) {
      console.error('No current site found'); // tslint:disable-line no-console
      return;
    }

    this.tray.setTitle(
      getSuspendedDeployCount(this.netlifyData.deploys.pending.length)
    );

    this.renderMenu(this.state.currentSite);
  }

  private async renderMenu(currentSite: INetlifySite): Promise<void> {
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
    const { pollInterval } = this.settings;

    const menu = Menu.buildFromTemplate([
      {
        enabled: false,
        label: `Netlify Menubar ${app.getVersion()}`
      },
      { type: 'separator' },
      {
        label: 'Reported Incidents',
        submenu: getIncidentsMenu(this.incidentFeed)
      },
      { type: 'separator' },
      {
        enabled: false,
        label: user && user.email
      },
      { type: 'separator' },
      {
        label: 'Choose site:',
        submenu: getSitesMenu({
          currentSite,
          onItemClick: siteId => {
            this.saveSetting('currentSiteId', siteId);
            this.state.previousDeploy = null;
            this.state.currentSite = this.getSite(siteId);
            this.updateDeploys();
          },
          sites
        })
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
        click: () => shell.openExternal(currentSite.admin_url),
        label: 'Go to Admin'
      },
      {
        enabled: false,
        label: '—'
      },
      {
        label: 'Deploys',
        submenu: getDeploysMenu({
          currentSite,
          deploys,
          onItemClick: deployId =>
            shell.openExternal(
              `https://app.netlify.com/sites/${
                currentSite.name
              }/deploys/${deployId}`
            )
        })
      },
      {
        click: async () => {
          this.fetchData(async () => {
            await this.apiClient.createSiteBuild(currentSite.id);
            this.updateDeploys();
          });
        },
        label: 'Trigger new deploy'
      },
      { type: 'separator' },
      {
        label: 'Settings',
        submenu: [
          ...getCheckboxMenu({
            items: [
              {
                key: 'updateAutomatically',
                label: 'Receive automatic updates'
              },
              { key: 'launchAtStart', label: 'Launch at Start' },
              { key: 'showNotifications', label: 'Show notifications' }
            ],
            onItemClick: (key, value) => this.saveSetting(key, !value),
            settings: this.settings
          }),
          {
            label: 'Poll interval',
            submenu: POLL_DURATIONS.map(
              ({ label, value }): MenuItemConstructorOptions => ({
                checked: pollInterval === value,
                click: () => this.saveSetting('pollInterval', value),
                label,
                type: 'radio'
              })
            )
          }
        ]
      },
      { type: 'separator' },
      {
        click: () =>
          shell.openExternal(
            `https://github.com/stefanjudis/netlify-menubar/releases/tag/v${app.getVersion()}`
          ),
        label: 'Changelog'
      },
      {
        click: () =>
          shell.openExternal(
            'https://github.com/stefanjudis/netlify-menubar/issues/new'
          ),
        label: 'Give feedback'
      },
      { type: 'separator' },
      {
        click: () => {
          settings.deleteAll();
          app.exit();
        },
        label: 'Logout'
      },
      { type: 'separator' },
      ...(this.state.updateAvailable
        ? [
            {
              click: () => this.emit('ready-to-update'),
              label: 'Restart and update...'
            }
          ]
        : []),
      { label: 'Quit Netlify Menubar', role: 'quit' }
    ]);

    menu.on('menu-will-show', () => (this.state.menuIsOpen = true));
    menu.on('menu-will-close', () => {
      this.state.menuIsOpen = false;
      // queue it behind other event handlers because otherwise
      // the menu-rerender will cancel ongoing click handlers
      setImmediate(() => this.render());
    });

    // avoid the menu to close in case the user has it open
    if (!this.state.menuIsOpen) {
      // tslint:disable-next-line
      console.log('UI: rerending menu');
      this.tray.setContextMenu(menu);
    }
  }
}
