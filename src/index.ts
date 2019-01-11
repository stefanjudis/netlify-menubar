import { app } from 'electron'; // tslint:disable-line no-implicit-dependencies
import settings from 'electron-settings';
import MenuUI from './menu-ui';
import Netlify from './netlify';

const OAUTH_CLIENT_ID =
  '95d3a5f15e46699275056966ec5467073e27cfe13ab1dd29deb5825a483f3d44';

/**
 *
 *
 * @param {JsonValue} accessToken
 * @returns {Promise<{ accessToken: JsonValue }>}
 */
const getNetlifyClient = async (accessToken: string): Promise<Netlify> => {
  const apiClient = new Netlify(accessToken);
  await apiClient.authorize(OAUTH_CLIENT_ID);
  return apiClient;
};

/**
 *
 *
 * @returns {Promise<void>}
 */
const onAppReady = async (): Promise<void> => {
  app.dock.hide();

  const apiClient = await getNetlifyClient(settings.get(
    'accessToken'
  ) as string);
  settings.set('accessToken', apiClient.accessToken);

  const ui = new MenuUI({
    apiClient,
    electronSettings: settings
  });
};

export const start = () => {
  app.on('ready', onAppReady);
};
