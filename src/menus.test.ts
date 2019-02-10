import { getCheckboxMenu, getDeploysMenu, getSitesMenu } from './menus';

describe('menu helper functions', () => {
  describe('getCheckboxMenu', () => {
    test('should render a correct checkbox settings menu', () => {
      const result = getCheckboxMenu({
        items: [
          { label: 'Launch at start label', key: 'launchAtStart' },
          { label: 'Show notifications label', key: 'showNotifications' }
        ],
        settings: {
          currentSiteId: 'jooooooo',
          launchAtStart: true,
          pollInterval: 10000,
          showNotifications: false
        },

        // tslint:disable-next-line
        onItemClick: id => {}
      });

      expect(result).toMatchSnapshot();
    });
  });

  describe('getDeploysMenu', () => {
    test('should render a correct deploy menu', () => {
      const result = getDeploysMenu({
        currentSite: {
          admin_url: 'https://foo-admin.com',
          id: 'foo',
          name: 'Foo',
          url: 'https://foo.com'
        },
        deploys: {
          pending: [
            {
              branch: 'master',
              context: 'production',
              created_at: '2018-11-09',
              deploy_time: '123',
              error_message: '',
              id: '2',
              state: 'building'
            }
          ],
          ready: [
            {
              branch: 'master',
              context: 'production',
              created_at: '2018-11-08',
              deploy_time: '126',
              error_message: '',
              id: '1',
              state: 'ready'
            }
          ]
        },
        // tslint:disable-next-line
        onItemClick: id => {}
      });

      expect(result).toMatchSnapshot();
    });
  });

  describe('getSitesMenu', () => {
    test('should render a correct sites menu', () => {
      const result = getSitesMenu({
        currentSite: {
          admin_url: 'https://current-admin.com',
          id: 'current-id',
          name: 'current-name',
          url: 'https://current.com'
        },
        sites: [
          {
            admin_url: 'https://foo-admin.com',
            id: 'foo-id',
            name: 'foo-name',
            url: 'https://foo.com'
          },
          {
            admin_url: 'https://current-admin.com',
            id: 'current-id',
            name: 'current-name',
            url: 'https://current.com'
          },
          {
            admin_url: 'https://bar-admin.com',
            id: 'bar-id',
            name: 'bar-name',
            url: 'https://bar.com'
          }
        ],
        // tslint:disable-next-line
        onItemClick: id => {}
      });

      expect(result).toMatchSnapshot();
    });
  });
});
