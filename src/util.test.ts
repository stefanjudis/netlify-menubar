import { getFormattedDeploys, getSuspendedDeployCount } from './util';

describe('utils', () => {
  describe(':getFormattedDeploys', () => {
    test('groups deploys correctly', () => {
      const getDeploy = ({ state, error_message, id }) => ({
        branch: 'master',
        context: '...',
        created_at: 'createdAt',
        deploy_time: 'deploytime',
        error_message,
        id,
        state
      });

      const deploys = [
        getDeploy({ state: 'new', error_message: null, id: '1' }),
        getDeploy({ state: 'building', error_message: null, id: '2' }),
        getDeploy({ state: 'error', error_message: 'Skipped', id: '3' }),
        getDeploy({ state: 'ready', error_message: null, id: '4' }),
        getDeploy({ state: 'ready', error_message: null, id: '5' })
      ];

      const {
        pending: pendingDeploys,
        ready: readyDeploys
      } = getFormattedDeploys(deploys);
      expect(pendingDeploys.length).toBe(2);
      expect(readyDeploys.length).toBe(3);
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
