import { distanceInWords, isWithinRange, subMonths } from 'date-fns';
import { MenuItemConstructorOptions, shell } from 'electron'; // tslint:disable-line no-implicit-dependencies
import IncidentFeed, { IFeedItem } from './incidentFeed';
import { IAppDeploys, IAppSettings } from './menubar';
import { INetlifySite } from './netlify';
import { shortenString } from './util';

interface IDeployMenuOptions {
  currentSite: INetlifySite;
  deploys: IAppDeploys;
  onItemClick: (deployId: string) => void;
}

const isOlderThanAMonth = (incident: IFeedItem): boolean => {
  const pubDate = new Date(incident.pubDate);
  const today = new Date();
  const aMonthAgo = subMonths(today, 1);
  return isWithinRange(pubDate, aMonthAgo, today);
};

const SEPARATOR: MenuItemConstructorOptions = { type: 'separator' };

export const getIncidentsMenu = (
  incidentFeed: IncidentFeed
): MenuItemConstructorOptions[] => {
  const recentIncidents = incidentFeed
    .getFeed()
    .filter(isOlderThanAMonth)
    // create menu option objects from incidents
    .map(incident => {
      return {
        click: () => shell.openExternal(incident.link),
        label: `${shortenString(incident.title, 60)} | ${distanceInWords(
          new Date(incident.pubDate),
          new Date()
        )} ago`
      };
    });
  // if there are no recent incidents, replace with message
  const renderedItems = recentIncidents.length
    ? recentIncidents
    : [
        {
          enabled: false,
          label: 'no recent incidents'
        }
      ];
  return [
    {
      click: () => shell.openExternal('https://www.netlifystatus.com/history'),
      label: 'History'
    },
    SEPARATOR,
    ...renderedItems
  ];
};

export const getDeploysMenu = ({
  currentSite,
  deploys,
  onItemClick
}: IDeployMenuOptions): MenuItemConstructorOptions[] => {
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
      click: () => onItemClick(id),
      label: `${context}: ${state} → ${branch} (${distanceInWords(
        new Date(created_at),
        new Date()
      )} ago ${deploy_time ? `in ${deploy_time}s` : ''})`
    };
  };

  return [
    {
      click: () => shell.openExternal(`${currentSite.admin_url}/deploys`),
      label: 'Overview'
    },
    SEPARATOR,
    ...pendingDeploys.map(mapDeployToMenuItem),
    ...(pendingDeploys.length ? [{ label: '—', enabled: false }] : []),
    ...doneDeploys.map(mapDeployToMenuItem)
  ].slice(0, 20);
};

interface ISiteMenuOptions {
  sites: INetlifySite[];
  currentSite: INetlifySite;
  onItemClick: (siteId: string) => void;
}

export const getSitesMenu = ({
  sites,
  currentSite,
  onItemClick
}: ISiteMenuOptions): MenuItemConstructorOptions[] => {
  return sites.map(
    ({ id, url }): MenuItemConstructorOptions => ({
      checked: currentSite.id === id,
      click: () => onItemClick(id),
      label: `${url.replace(/https?:\/\//, '')}`,
      type: 'radio'
    })
  );
};

interface ICheckboxMenuOptions {
  items: Array<{ key: string; label: string }>;
  settings: IAppSettings;
  onItemClick: (key: string, value: boolean) => void;
}

export const getCheckboxMenu = ({
  items,
  settings,
  onItemClick
}: ICheckboxMenuOptions): MenuItemConstructorOptions[] => {
  return items.map(
    ({ label, key }): MenuItemConstructorOptions => ({
      checked: settings[key],
      click: () => onItemClick(key, settings[key]),
      label,
      type: 'checkbox'
    })
  );
};
