import { INetlifyDeploy } from './netlify';
import {
  getFormattedDeploys,
  getNotificationOptions,
  getSuspendedDeployCount
} from './util';

const getDeploy = (deploy: any): INetlifyDeploy => ({
  ...{
    branch: 'master',
    context: '...',
    created_at: 'createdAt',
    deploy_time: 'deploytime',
    error_message: '',
    id: '123',
    state: 'pending'
  },
  ...deploy
});

describe('utils', () => {
  describe(':getNotificationOptions', () => {
    test('returns correct notification for different deploys', () => {
      expect.assertions(2);
      const previousDeploy = getDeploy({ id: '123' });
      const currentDeploy = getDeploy({ id: '234', state: 'skipped' });

      const notificationOptions = getNotificationOptions(
        previousDeploy,
        currentDeploy
      );

      if (notificationOptions) {
        expect(notificationOptions.title).toBe('New deploy started');
        expect(notificationOptions.body).toBe('New deploy state: skipped');
      }
    });

    test('returns correct notification for same deploys but with different state', () => {
      expect.assertions(2);
      const previousDeploy = getDeploy({ id: '123', state: 'pending' });
      const currentDeploy = getDeploy({ id: '1123', state: 'ready' });

      const notificationOptions = getNotificationOptions(
        previousDeploy,
        currentDeploy
      );

      if (notificationOptions) {
        expect(notificationOptions.title).toBe('New deploy started');
        expect(notificationOptions.body).toBe('New deploy state: ready');
      }
    });

    test('returns correct notification for different deploys', () => {
      const previousDeploy = getDeploy({ id: '123', state: 'same' });
      const currentDeploy = getDeploy({ id: '123', state: 'same' });

      const notificationOptions = getNotificationOptions(
        previousDeploy,
        currentDeploy
      );

      expect(notificationOptions).toBeNull();
    });
  });
  describe(':getFormattedDeploys', () => {
    test('groups deploys correctly', () => {
      const deploys = [
        getDeploy({ state: 'new', error_message: null, id: '1' }),
        getDeploy({ state: 'building', error_message: null, id: '2' }),
        getDeploy({ state: 'error', error_message: '', id: '3' }),
        getDeploy({ state: 'error', error_message: 'Skipped', id: '4' }),
        getDeploy({ state: 'ready', error_message: null, id: '5' }),
        getDeploy({ state: 'ready', error_message: null, id: '6' })
      ];

      const {
        pending: pendingDeploys,
        ready: readyDeploys
      } = getFormattedDeploys(deploys);
      expect(pendingDeploys.length).toBe(2);
      expect(readyDeploys.length).toBe(4);
    });
  });

  describe(':getSuspendedDeployCount', () => {
    test('returns correct string if in range', () => {
      const suspendedCount = getSuspendedDeployCount(5);

      expect(suspendedCount).toBe('₅');
    });

    test('returns correct string if out of range', () => {
      const suspendedCount = getSuspendedDeployCount(11);

      expect(suspendedCount).toBe('₉₊');
    });

    test('returns empty string if number of builds is 0', () => {
      const suspendedCount = getSuspendedDeployCount(0);

      expect(suspendedCount).toBe('');
    });
  });
});
