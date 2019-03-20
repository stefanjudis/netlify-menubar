import {
  getCheckboxMenu,
  getDeploysMenu,
  getIncidentsMenu,
  getSitesMenu
} from '../menus';
import IncidentFeed from '../incidentFeed';

describe('menu helper functions', () => {
  describe('getCheckboxMenu', () => {
    test('should render a correct checkbox settings menu', () => {
      const result = getCheckboxMenu({
        items: [
          { label: 'Launch at start label', key: 'launchAtStart' },
          { label: 'Show notifications label', key: 'showNotifications' }
        ],
        settings: {
          updateAutomatically: true,
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
      const getToday = () => new Date();
      const getYday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
      };

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
              created_at: getToday().toISOString(),
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
              created_at: getYday().toISOString(),
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

  describe('getSitesMenu', () => {
    test('should render a correct sites menu', () => {
      const result = getIncidentsMenu(({
        getFeed: () => [
          {
            link: 'https://example.com',
            title: 'incident 1',
            pubDate: '2019-11-02',
            content: ''
          }
        ]
        // // tslint:disable-next-line
        // onItemClick: id => {}
      } as unknown) as IncidentFeed);

      expect(result).toMatchSnapshot();
    });
  });
});
