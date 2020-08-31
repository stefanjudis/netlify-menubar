import AutoLaunch from 'auto-launch';
import { app, powerMonitor } from 'electron'; // tslint:disable-line no-implicit-dependencies
import isDev from 'electron-is-dev';
import settings from 'electron-settings';
import { autoUpdater } from 'electron-updater';
import Connection from './connection';
import IncidentFeed from './incidentFeed';
import MenuUI from './menubar';
import Netlify from './netlify';

const OAUTH_CLIENT_ID =
  '38a923fc70a44fce96c3ad5abd41c732a3c33d3cdb134c0d32c577181671e077';

const getNetlifyClient = async (accessToken: string): Promise<Netlify> => {
  const apiClient = new Netlify(accessToken);
  return apiClient.authorize(OAUTH_CLIENT_ID);
};

const getOnlineConnection = (): Promise<Connection> => {
  return new Promise((resolve) => {
    const connection = new Connection();

    connection.on('status-changed', (conn) => {
      if (conn.isOnline) {
        resolve(connection);
      }
    });
  });
};

const configureAutoLauncher = (
  autoLauncher: AutoLaunch,
  { shouldAutoLaunch }
): void => {
  if (shouldAutoLaunch) {
    autoLauncher.enable();
  } else {
    autoLauncher.disable();
  }
};

/**
 *
 *
 * @returns {Promise<void>}
 */
const onAppReady = async (): Promise<void> => {
  const connection = await getOnlineConnection();
  const incidentFeed = new IncidentFeed();
  const apiClient = await getNetlifyClient(
    settings.get('accessToken') as string
  );

  settings.set('accessToken', apiClient.accessToken);

  if (!isDev) {
    const autoLauncher = new AutoLaunch({
      name: 'Netlify Menubar',
      path: '/Applications/Netlify Menubar.app',
    });

    configureAutoLauncher(autoLauncher, {
      shouldAutoLaunch: settings.get('launchAtStart'),
    });

    settings.watch('launchAtStart', (launchAtStart) => {
      configureAutoLauncher(autoLauncher, { shouldAutoLaunch: launchAtStart });
    });
  }

  const ui = new MenuUI({
    apiClient,
    connection,
    incidentFeed,
  });

  // only hide dock icon when everything's running
  // otherwise the auth prompt disappears in MacOS
  app.dock.hide();

  if (
    settings.get('updateAutomatically') ||
    // it defaults to true but is not stored initially
    settings.get('updateAutomatically') === undefined
  ) {
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('update-downloaded', () => {
      ui.on('ready-to-update', () => autoUpdater.quitAndInstall());
      ui.setState({ updateAvailable: true });
    });
    powerMonitor.on('unlock-screen', () =>
      autoUpdater.checkForUpdatesAndNotify()
    );
  }
};

export const start = () => {
  app.on('ready', onAppReady);
};
